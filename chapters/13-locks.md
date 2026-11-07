# Investigate a blocked checkout

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
