# Investigate a blocked checkout

A transaction can retain a lock after its last statement finishes. Observe your own locks in the browser before optionally tracing another session's wait on a server.

**You will learn to** distinguish lock ownership from a blocking wait and connect lock release to
transaction completion. Prerequisite: transaction boundaries. The browser uses one connection; it
will not manufacture a second session or a deadlock.

## Browser: acquire a table lock

A relation lock protects a table against incompatible operations. Predict whether a lock acquired
inside this transaction remains visible after the LOCK statement finishes.

```sql
CREATE TABLE lock_inventory (sku text PRIMARY KEY, stock integer NOT NULL);
INSERT INTO lock_inventory VALUES ('book', 10);
```

The fixture is now committed. Run the transaction separately so rollback cannot undo its setup.

```sql
BEGIN;
LOCK TABLE lock_inventory IN ACCESS EXCLUSIVE MODE;
SELECT locktype, mode, granted
FROM pg_locks
WHERE relation = 'lock_inventory'::regclass;
```

Look for a granted `AccessExclusiveLock`. This strong table lock conflicts with other sessions'
ordinary table access, but there is no other session here. Seeing `granted = true` establishes
ownership, not a measured queue or a blocked client.

## Browser: release and inspect

Predict whether the relation lock remains after rollback. The predicate refers to the table's
catalog identity without reading rows from that table.

```sql
ROLLBACK;
SELECT locktype, mode, granted
FROM pg_locks
WHERE relation = 'lock_inventory'::regclass;
```

An empty result means this connection no longer holds that relation lock at the time of inspection.
Queries can acquire their own locks while they execute, so inspect a specific relation rather than
expecting the whole `pg_locks` view to become empty.

## Browser: observe a row-changing statement

Predict why updating one row also requires a table-level lock. Inspect ownership while the
transaction remains open, then commit and verify the value.

```sql
BEGIN;
UPDATE lock_inventory SET stock = stock - 1 WHERE sku = 'book';
SELECT locktype, mode, granted FROM pg_locks
WHERE relation = 'lock_inventory'::regclass;
COMMIT;
SELECT * FROM lock_inventory;
```

An UPDATE normally takes a `RowExclusiveLock` on the relation in addition to its row-version and
transaction locking behavior. `pg_locks` is not a simple list of every row lock held. A relation
lock's name does not mean the whole table is unavailable to every other writer.

## Explain the browser evidence

<details><summary>Hint: ownership is not contention</summary>

A lock can be held without anyone waiting for it. Its mode defines conflicts; competing sessions
and their requested modes determine whether those conflicts become waits.

</details>

<details><summary>Worked explanation</summary>

LOCK acquired a real relation lock retained until rollback. The UPDATE also held a relation lock
until commit, while the final query verified its business change. These observations explain
transaction lifetime and lock modes. They do not measure blocking, prove absence of deadlocks,
or show a second backend's row-lock wait. The optional extension adds that missing evidence.

</details>

## Transfer the idea

Change the explicit lock mode to `ACCESS SHARE` and compare the observed mode. Consult the lock
conflict table and predict which schema change would conflict with it. Verify that prediction
using the optional server setup, rather than making this connection wait on an invented competitor.

## Optional server extension

The browser investigation above is complete on its own. Use the [server setup](./server-setup.html)
for the additional behavior below. Its copied commands run in a separate database and do not
change your browser database.

<details class="server-extension" id="server-extension">
<summary>Open the independent-session server exercise</summary>

Checkout is waiting even though its UPDATE is small. Find the transaction holding the needed lock before changing the query.

**You will learn to** observe a blocking chain, connect waits to transaction lifetime, and bound a
wait without assuming cancellation rolls back everything. Prerequisite: isolation. Use a fresh
[server fixture](./server-setup.html) and the three named sessions.

## Hold a row lock

```sql-observer
CREATE TABLE lab.inventory (sku text PRIMARY KEY, stock integer NOT NULL);
INSERT INTO lab.inventory VALUES ('book', 10), ('pen', 20);
```

Session A updates an item and leaves its transaction open. Predict whether B's update to the same
item completes, fails immediately, or waits.

```sql-a
BEGIN;
UPDATE lab.inventory SET stock = stock - 1 WHERE sku = 'book';
```

```sql-b-async
BEGIN;
SET LOCAL lock_timeout = '15s';
UPDATE lab.inventory SET stock = stock - 1 WHERE sku = 'book';
```

Leave B waiting and move to observer. The timeout is a recovery bound: if you take longer than
fifteen seconds, B may report a lock timeout instead. In that case roll back B, commit A, and replay
the experiment from a fresh state to observe the blocking query.

## Find the blocker

```sql-observer
SELECT application_name, state, wait_event_type, wait_event,
       pg_blocking_pids(pid) AS blockers, query
FROM pg_stat_activity
WHERE application_name IN ('lab-a', 'lab-b')
ORDER BY application_name;
```

Look for B waiting on a lock and A **idle in transaction**. A's last SQL statement finished, but its
transaction still owns locks. A small UPDATE can therefore delay another small UPDATE indefinitely
without a suitable timeout or transaction completion.

`pg_locks` describes individual locks. `pg_blocking_pids` is often a clearer entry point because
blocking can involve transaction-ID locks and waiting queues rather than one obvious tuple row in
that view. A wait event is an observation at the time of sampling, not a complete incident history.

## Release and verify

```sql-a
COMMIT;
```

Wait for B's UPDATE to finish, then commit it.

```sql-b
COMMIT;
```

```sql-observer
SELECT * FROM lab.inventory ORDER BY sku;
```

Book stock falls twice if both updates completed. At Read Committed, B can update the version that
became available after A committed. Canceling B's statement or hitting its timeout would instead
require rollback of B's failed transaction before retrying.

## Bound a risky wait

Predict the error when a second blocked update has a short lock timeout. The lesson intentionally
observes the error, then rolls back the failed transaction.

```sql-a
BEGIN;
UPDATE lab.inventory SET stock = stock WHERE sku = 'pen';
```

```sql-b
-- expect-error: 55P03
BEGIN;
SET LOCAL lock_timeout = '300ms';
UPDATE lab.inventory SET stock = stock - 1 WHERE sku = 'pen';
```

```sql-b
ROLLBACK;
```

```sql-a
ROLLBACK;
```

`lock_timeout` bounds time acquiring each lock. `statement_timeout` bounds the statement more
broadly. Choose timeouts with the application's latency and retry budget; a timeout does not
establish the root cause of the blocker.

## Explain the intervention

<details><summary>Hint</summary>

Separate finishing a statement, finishing a transaction, canceling a statement, and terminating a
connection. Their effects and risks differ.

</details>

<details><summary>Worked explanation</summary>

A retained its row-related locks until commit. Observer linked B's wait to A's backend, so completing
A's transaction released B. A timeout on B canceled the waiting statement and left its explicit
transaction failed, requiring rollback. Prefer fixing long transaction boundaries and application
behavior before terminating sessions; terminating an owner's backend rolls back its work and can
have wider consequences.

</details>

## Transfer the idea

Plan a deadlock schedule where A locks book then pen and B locks pen then book. Explain why neither
can progress and why PostgreSQL aborts one transaction. Propose one consistent lock ordering for
both paths, plus transaction-level retries. The exercise's core invariant is ordering, not which
session the deadlock detector chooses as its victim.

**Takeaway:** Diagnose the owning transaction, not only the waiting statement.
Next: [change a busy database](./migrations.html).

Primary sources: [Explicit locking](https://www.postgresql.org/docs/current/explicit-locking.html) and
[activity statistics](https://www.postgresql.org/docs/current/monitoring-stats.html).

</details>
