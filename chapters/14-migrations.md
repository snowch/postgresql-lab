# Change a busy database

Roll out a new rule in stages: protect new writes, repair old data, and validate. Run that process in the browser, with concurrent DDL behavior available as an optional server extension.

**You will learn to** distinguish enforcement from validation, perform a bounded backfill, and
verify an index's catalog state. Prerequisites: constraints and indexes. This browser investigation
uses a small dedicated table and needs no server setup.

## Browser: introduce a compatible schema

An older application allowed negative amounts. Predict whether adding a NOT VALID check immediately
rejects the existing bad row.

```sql
CREATE TABLE migration_orders (id integer PRIMARY KEY, amount integer NOT NULL);
INSERT INTO migration_orders VALUES (1, 100), (2, -10), (3, 200);
ALTER TABLE migration_orders ADD COLUMN reviewed boolean;
ALTER TABLE migration_orders ADD CONSTRAINT migration_positive CHECK (amount >= 0) NOT VALID;
SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'migration_orders'::regclass ORDER BY conname;
SELECT * FROM migration_orders ORDER BY id;
```

The constraint is present but not yet validated against every existing row. It still enforces
new inserts and updates. `convalidated = false` describes the missing old-data proof, not a disabled rule.

## Browser: test enforcement and repair old rows

The temporary helper returns the expected constraint error without ending the lesson. Its exception
block rolls back the attempted insert; catching every error is only a teaching convenience here.

```sql
CREATE FUNCTION pg_temp.try_new_amount() RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO migration_orders VALUES (4, -1, false);
  RETURN 'unexpected acceptance';
EXCEPTION WHEN check_violation THEN RETURN SQLSTATE || ': ' || SQLERRM;
END;
$$;
SELECT pg_temp.try_new_amount() AS new_write_result;
UPDATE migration_orders SET amount = 0, reviewed = true WHERE id = 2;
SELECT count(*) AS violations FROM migration_orders WHERE amount < 0;
```

This tiny backfill names one key explicitly. A production backfill needs a bounded batch strategy,
progress tracking, and a business-approved repair value. Changing all negative amounts to zero is
fixture behavior, not a general accounting policy.

## Browser: validate and verify

Predict which catalog state changes after validation and whether an index name alone proves success.

```sql
ALTER TABLE migration_orders VALIDATE CONSTRAINT migration_positive;
CREATE INDEX migration_amount ON migration_orders (amount);
SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'migration_orders'::regclass AND conname = 'migration_positive';
SELECT indexrelid::regclass AS name, indisready, indisvalid FROM pg_index
WHERE indexrelid = 'migration_amount'::regclass;
```

Validation establishes the existing-data proof. The ordinary index build is real, but no competing
writer is running here. It therefore cannot establish production blocking duration or the behavior
of CREATE INDEX CONCURRENTLY. The server extension tests those distinct concerns.

## Explain the browser evidence

<details><summary>Hint: define a completion check per stage</summary>

Look separately at old rows, rejected new writes, remaining violations, constraint validation, and
index validity. One successful ALTER does not prove every stage has completed.

</details>

<details><summary>Worked explanation</summary>

NOT VALID let the old row remain while protecting new writes. Repairing that row allowed validation
to succeed, and the catalog recorded the validated constraint and valid index. A retry can inspect
those states to discover what already finished. The browser verified data and schema behavior;
it did not demonstrate coexistence with concurrent transactions.

</details>

## Transfer the idea

Design a staged required-column rollout. State when writers become compatible, how a backfill resumes,
and which query proves there are no missing values before final enforcement. Use the server
extension to investigate the locks that the same migration takes under active readers.

## Optional server extension

The browser investigation above is complete on its own. Use the [server setup](./server-setup.html)
for the additional behavior below. Its copied commands run in a separate database and do not
change your browser database.

<details class="server-extension" id="server-extension">
<summary>Open the independent-session server exercise</summary>

A schema deployment waits behind an ordinary transaction. Bound that wait and split validation from enforcement before retrying the migration.

**You will learn to** observe DDL blocking, stage a constraint, and build an index without wrapping
CONCURRENTLY in a transaction. Prerequisites: locks, constraints, and indexes. Use fresh
[server sessions](./server-setup.html). This lab has no browser Run controls.

## Reproduce the blocking change

A reads the fixture and keeps its transaction open. A plain SELECT takes a table lock that normally
coexists with writes but conflicts with many schema changes.

```sql-a
BEGIN;
SELECT count(*) FROM lab.orders;
```

B tries an ALTER with a short lock timeout. Predict whether this small metadata change must wait.

```sql-b
-- expect-error: 55P03
SET lock_timeout = '300ms';
ALTER TABLE lab.orders ADD COLUMN reviewed boolean;
```

```sql-observer
SELECT application_name, state, xact_start
FROM pg_stat_activity WHERE application_name = 'lab-a';
```

```sql-a
COMMIT;
```

```sql-b
ALTER TABLE lab.orders ADD COLUMN reviewed boolean;
RESET lock_timeout;
```

The timeout prevented an unbounded wait. A waiting DDL statement can also cause later requests to
queue behind it; inspecting only the original reader can miss the growing impact. Lock behavior is
operation-specific, so measure the actual command on a representative server version.

## Enforce new writes before scanning old rows

A CHECK added `NOT VALID` enforces future inserted or updated rows while deferring the initial scan
of existing rows. It does not mean the rule is disabled.

```sql-b
ALTER TABLE lab.orders ADD CONSTRAINT orders_positive
CHECK (total_cents >= 0) NOT VALID;
SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'lab.orders'::regclass AND conname = 'orders_positive';
ALTER TABLE lab.orders VALIDATE CONSTRAINT orders_positive;
SELECT conname, convalidated FROM pg_constraint
WHERE conrelid = 'lab.orders'::regclass AND conname = 'orders_positive';
```

Validation scans existing rows using a less restrictive lock than many ALTER operations. It still
uses resources and takes locks; it is not guaranteed free of application impact. A typical rollout
adds the rule, repairs old data in bounded batches if necessary, then validates. Plan how to resume
if validation fails.

## Build an index during writes

The next statement must run as its own command, outside an explicit transaction. Many migration
frameworks wrap files in transactions by default, so configure this step deliberately.

```sql-b
CREATE INDEX CONCURRENTLY orders_tenant_online ON lab.orders (tenant_id);
```

```sql-observer
SELECT indexrelid::regclass AS index_name, indisready, indisvalid
FROM pg_index WHERE indexrelid = 'lab.orders_tenant_online'::regclass;
```

Concurrent creation avoids blocking normal writes for the full build, but it can wait for transactions
and requires additional work. An interrupted or failed build can leave an invalid index. Verify
`indisvalid`; do not treat the existence of a name as success. Investigate the failure before dropping
an invalid artifact and retrying outside a transaction. Only one concurrent build can run on a given
table at a time.

## Explain a rollout

<details><summary>Hint</summary>

For each step, state its lock, its scan/work, the evidence of completion, and a safe retry state.

</details>

<details><summary>Worked explanation</summary>

The reader's open transaction blocked ALTER even though neither query was expensive. A lock timeout
bounded the deployment's wait. NOT VALID separated new-write enforcement from checking existing data.
A concurrent index build reduced write blocking but needed a standalone execution and validity check.
Rollback is not one universal command: a failed validation, a timed-out ALTER, and an invalid index
leave different states.

</details>

## Transfer the idea

Design a required-column rollout for a busy table: introduce a compatible column, deploy writers,
backfill in bounded batches, verify existing rows, then enforce the final rule. Name the failure
and resume condition for each stage. Explain why one large UPDATE inside a long migration transaction
can recreate the blocking problem you tried to avoid.

**Takeaway:** Treat schema changes as observable stages with bounded waits and explicit completion checks.
Next: [find the expensive workload](./observability.html).

Primary sources: [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html) and
[CREATE INDEX](https://www.postgresql.org/docs/current/sql-createindex.html).

</details>
