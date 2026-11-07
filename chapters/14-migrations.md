# Change a busy database

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
