# Resolve a production incident

A release adds an order report and a long-lived transaction. Diagnose two independent sources of delay, apply bounded interventions, and verify the resulting state.

**You will learn to** separate waiting from execution work, test competing hypotheses, and produce an
evidence-backed incident report. Prerequisites: the preceding plan, statistics, lock, and operations
lessons. Use fresh [server sessions](./server-setup.html) and the reset fixture.
This controlled exercise models incident mechanics, not production traffic volume.

## Record competing hypotheses

The symptoms are a slow tenant report and delayed order updates. Write two hypotheses before running
the experiment: one about access work and one about transaction blocking. State what evidence would
disprove each.

```sql-observer
SELECT count(*) AS rows, count(DISTINCT tenant_id) AS tenants FROM lab.orders;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents FROM lab.orders
WHERE tenant_id = 42 ORDER BY created_at DESC LIMIT 20;
```

Record rows inspected, filtering, ordering, and the access path. This baseline can explain the report's
work but cannot explain a blocked write by itself.

## Reproduce the held transaction

```sql-a
BEGIN;
UPDATE lab.orders SET total_cents = total_cents + 1 WHERE id = 42;
```

```sql-b-async
BEGIN;
SET LOCAL lock_timeout = '15s';
UPDATE lab.orders SET total_cents = total_cents + 1 WHERE id = 42;
```

Leave B running. If the timeout expires before you finish observing, roll B back, complete A, and
replay. Use observer to distinguish the wait from expensive query execution.

```sql-observer
SELECT application_name, state, wait_event_type, wait_event,
       pg_blocking_pids(pid) AS blockers, query
FROM pg_stat_activity
WHERE application_name IN ('lab-a', 'lab-b')
ORDER BY application_name;
```

A plan improvement does not release an existing lock. A blocked UPDATE also does not prove the
report needs another index. Keep the evidence for each hypothesis separate.

## Recover the transaction path

For this exercise A owns a legitimate completed business update, so commit it. In an actual incident,
verify ownership and business intent before choosing commit, rollback, cancellation, or termination.

```sql-a
COMMIT;
```

Wait for B, then finish it.

```sql-b
COMMIT;
```

```sql-observer
SELECT id, total_cents FROM lab.orders WHERE id = 42;
SELECT application_name, state, pg_blocking_pids(pid) AS blockers
FROM pg_stat_activity WHERE application_name IN ('lab-a', 'lab-b')
ORDER BY application_name;
```

Verify the wait is gone and both intended increments occurred. A connection merely returning to
idle is not a substitute for checking the affected business state.

## Improve the report path

Build the candidate outside an explicit transaction, then compare evidence with the baseline.

```sql-observer
CREATE INDEX CONCURRENTLY incident_tenant_time
ON lab.orders (tenant_id, created_at DESC) INCLUDE (id, total_cents);
```

```sql-observer
SELECT indisvalid FROM pg_index
WHERE indexrelid = 'lab.incident_tenant_time'::regclass;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents FROM lab.orders
WHERE tenant_id = 42 ORDER BY created_at DESC LIMIT 20;
```

Look for early stopping and removed sorting rather than a required timing ratio. Including total
adds write cost; the production decision would compare this candidate with the smaller composite
index under a representative read/write workload. Index-only access still depends on visibility.

## Write the incident record

Use a short timeline containing observation, hypothesis, intervention, and verification. Include
what remains unproven: this lesson has no load generator, latency percentile, or production resource
model. Prevention might include transaction-boundary fixes, latency budgets, query review, and
maintenance monitoring, each tied to the evidence it addresses.

<details><summary>Hint</summary>

If an intervention would address only one symptom, keep the other hypothesis alive. Write down
what you measured after each change rather than declaring victory after a successful command.

</details>

<details><summary>Worked incident explanation</summary>

Observer identifies A as the owner blocking B, while the report plan separately shows scanning and
sorting work. Completing A releases the write path; the final row verifies both increments. A valid
composite time index changes the report's access work. Neither intervention proves the other's
hypothesis, and neither establishes production capacity. The report should therefore recommend
transaction-lifetime prevention and workload validation for the index as distinct follow-ups.

</details>

## Transfer the idea

Replace the tenant report predicate with two correlated filters and repeat the diagnosis on a fresh
fixture. Explain when ANALYZE, extended statistics, or an index addresses the evidence, and when none
of them would fix a held lock. Then design a regression exercise that checks the invariant and access
work without asserting exact milliseconds.

**Takeaway:** An incident ends with verified behavior and a causal explanation, not only a changed setting.
Return to the [curriculum](./index.html) or use the [dataset](./dataset.html) to design your own case.

Primary sources: [Performance tips](https://www.postgresql.org/docs/current/performance-tips.html) and
[monitoring](https://www.postgresql.org/docs/current/monitoring.html).
