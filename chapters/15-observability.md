# Find the expensive workload

One request looks cheap in isolation, but thousands of calls dominate the service's database time. Rank the workload before tuning one example.

**You will learn to** distinguish cumulative cost from per-call latency, inspect waits, and connect a
normalized statement to a concrete plan. Prerequisites: plans and lock diagnosis. Use a fresh
[server fixture](./server-setup.html), with the included `pg_stat_statements` preload configuration.

## Start a controlled observation window

`pg_stat_statements` aggregates execution statistics for normalized statements. Similar statements
with different literal constants can share an entry. Reset below affects statistics for the whole
isolated server; do not use this reset casually on a shared system.

```sql-observer
SELECT pg_stat_statements_reset();
SELECT count(*) FROM lab.orders WHERE tenant_id = 42;
SELECT count(*) FROM lab.orders WHERE tenant_id = 43;
SELECT count(*) FROM lab.orders WHERE tenant_id = 44;
```

Predict how many normalized entries these three counts create. The constants differ, but the query
shape is the same. Now add a different shape, executed once.

```sql-a
SELECT sum(total_cents) FROM lab.orders WHERE status = 'pending';
```

## Rank cumulative work

```sql-observer
SELECT calls, round(total_exec_time::numeric, 3) AS total_ms,
       round(mean_exec_time::numeric, 3) AS mean_ms,
       rows, shared_blks_hit, shared_blks_read, query
FROM pg_stat_statements
WHERE query LIKE '%lab.orders%'
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC;
```

Find the count shape and its call count. The sum and count statements may exchange rank across
machines. `total_exec_time` accumulates server execution time; `mean_exec_time` is an average, not
a tail-latency percentile. The `rows` field reports rows emitted or affected, not every row inspected.
A COUNT returning one result can still scan thousands of source rows.

These counters are cumulative since reset or entry creation. Real diagnosis needs a before/after
window, workload context, and awareness that entries may be evicted. Cumulative execution time is
not a direct measure of CPU time or elapsed wall time for the entire service.

## Connect the aggregate to a plan

Choose a representative parameter and inspect its plan. Predict whether another tenant with a much
larger population could need a different path.

```sql-observer
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT count(*) FROM lab.orders WHERE tenant_id = 42;
CREATE INDEX observability_tenant ON lab.orders (tenant_id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT count(*) FROM lab.orders WHERE tenant_id = 42;
```

A normalized entry can combine parameters with different selectivity. One sampled plan does not
explain every call. EXPLAIN ANALYZE adds its own execution and instrumentation; account for that
when interpreting a short observation window.

## Look for waiting, too

```sql-observer
SELECT application_name, state, wait_event_type, wait_event,
       clock_timestamp() - xact_start AS transaction_age,
       pg_blocking_pids(pid) AS blockers
FROM pg_stat_activity
WHERE datname = current_database() AND backend_type = 'client backend'
ORDER BY application_name;
```

An idle client waiting for its next command is different from an active statement waiting for a
lock. Sampled activity and wait events help distinguish them. A query with modest execution cost
can still participate in a latency incident through lock ownership and long transaction lifetime.

## Explain the next measurement

<details><summary>Hint</summary>

State the observation window, call count, work per call, and waiting separately. A single average
cannot stand in for all four.

</details>

<details><summary>Worked explanation</summary>

The literal tenant predicates normalize to one statement shape with multiple calls. Rank total cost
to find aggregate impact, then inspect representative plans and parameter distributions. Use activity
and blockers to investigate waits. Verify an intervention with comparable workload deltas rather
than comparing a warm one-off query with an earlier cumulative total.

</details>

## Transfer the idea

Design a five-minute measurement for a high-volume endpoint. Name the counters collected at both
boundaries, request counts from the application, and one tail-latency metric. Explain how you would
notice that a faster query is being called twice as often after a release.

**Takeaway:** Query shape, frequency, parameter distribution, and waits together explain workload cost.
Next: [prove you can recover](./backup-recovery.html).

Primary sources: [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html) and
[monitoring statistics](https://www.postgresql.org/docs/current/monitoring-stats.html).
