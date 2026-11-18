# Resolve a production incident

A report becomes expensive after a data batch. Diagnose and repair its statistics and access path entirely in the browser, then optionally investigate a separate blocking incident on a server.

**You will learn to** test competing estimate and access-path hypotheses, verify business results,
and compare work before declaring recovery. Prerequisites: plans, statistics, and indexes.
This case uses synthetic orders and a single browser connection. The optional server case adds a blocked session.

## Browser: reproduce the incident

A new tenant appears in a batch after statistics were collected. Predict how well the planner
estimates that tenant and which work is needed for its newest orders.

```sql
CREATE TABLE incident_orders WITH (autovacuum_enabled = false) AS
SELECT id, tenant_id, created_at, total_cents FROM orders;
ANALYZE incident_orders;
INSERT INTO incident_orders
SELECT id + 60000, 999, created_at, total_cents FROM orders WHERE id <= 15000;
SELECT count(*) AS tenant_rows, sum(total_cents) AS tenant_total FROM incident_orders WHERE tenant_id = 999;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents FROM incident_orders
WHERE tenant_id = 999 ORDER BY created_at DESC LIMIT 20;
```

In the first plan, record the scan's estimated and actual rows and **Rows Removed by Filter**.
Does the planner know the new tenant's frequency? Does the scan still filter many orders and
pass its matches to a sort? The next two experiments test those questions separately.

## Browser: repair the missing information

Predict which plan values change after targeted analysis, and which work must remain without a
suitable index.

```sql
ANALYZE incident_orders (tenant_id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents FROM incident_orders
WHERE tenant_id = 999 ORDER BY created_at DESC LIMIT 20;
```

Compare estimated matching rows with the actual count. The estimate should become more useful,
but a better estimate does not create a new way to find the tenant's rows in time order.

## Browser: repair the access path

SQL 03 saves the baseline in a temporary table before adding the index. Two `EXCEPT ALL`
comparisons find missing, extra, or repeated rows in the new result.

```sql
CREATE TEMP TABLE incident_expected AS
SELECT id, created_at, total_cents FROM incident_orders
WHERE tenant_id = 999 ORDER BY created_at DESC LIMIT 20;
CREATE INDEX incident_tenant_time ON incident_orders (tenant_id, created_at DESC);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents FROM incident_orders
WHERE tenant_id = 999 ORDER BY created_at DESC LIMIT 20;
WITH actual AS (
  SELECT id, created_at, total_cents FROM incident_orders
  WHERE tenant_id = 999 ORDER BY created_at DESC LIMIT 20
), differences AS (
  (SELECT * FROM actual EXCEPT ALL SELECT * FROM incident_expected)
  UNION ALL
  (SELECT * FROM incident_expected EXCEPT ALL SELECT * FROM actual)
)
SELECT count(*) AS changed_result_rows FROM differences;
ALTER TABLE incident_orders RESET (autovacuum_enabled);
```

Look for the index name, the number of rows the scan emits, and whether a sort remains.
Check that `changed_result_rows` is zero. Compare the
tenant's count and total with your first observation if you experiment further. A speedup that
changes the endpoint's answer is not a valid recovery.

## Explain the browser evidence

Which result showed a better estimate? Which showed less access work? What did you check
to confirm that the endpoint still returned the expected orders?

<details><summary>Hint: test the hypotheses independently</summary>

ANALYZE changes information about data. CREATE INDEX changes available access paths. Identify which
observation each intervention explains, and which uncertainty remains afterward.

</details>

<details><summary>Worked explanation</summary>

The batch introduced a frequent tenant absent from the initial summaries. ANALYZE improved that
estimate while leaving the search-and-sort problem. The composite index supplied a tenant search
in time order and allowed early stopping. The result comparison verified logical equivalence.
Neither step proves production capacity, cures a held lock, or establishes an application latency
percentile. The optional extension adds a genuine blocking investigation with independent sessions.

</details>

## Go deeper: how the engine works

Which operator counters distinguish the work a plan predicts from the work execution performs? Read [The plan is the map](https://snowch.github.io/query-engine-book/the-plan-is-the-map.html)
in Query Engine Book. Its DuckDB examples and teaching engine explain the general principle;
PostgreSQL's operators and implementation details can differ. This reading is optional.

## Transfer the idea

After the original investigation, replace [SQL 02](#sql-2) with the following and select
**Run SQL**. The composite index is already present. This query asks for all 15,000 orders
from the new tenant instead of the newest 20.

```text
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents FROM incident_orders
WHERE tenant_id = 999 ORDER BY created_at DESC;
```

Compare the scan, any sort, and actual rows with the indexed plan for 20 orders. Does the
index still supply the order? Can the plan stop after 20 matches now? In your incident
record, distinguish estimates, access work, and correctness checks.

## Optional server extension

To run this extension, follow [server setup](./server-setup.html). Copy each panel to the
labelled terminal or psql session. These commands use the Docker database.

<details class="server-extension" id="server-extension">
<summary>Separate a blocked write from an expensive report</summary>

A release adds an order report and a long-lived transaction. Diagnose two independent sources of delay, apply bounded interventions, and verify the resulting state.

**You will learn to** separate waiting from execution work, test competing hypotheses, and produce an
evidence-backed incident report. Prerequisites: the preceding plan, statistics, lock, and operations
lessons. Use fresh [server sessions](./server-setup.html) and the reset fixture.
This controlled exercise models incident mechanics, not production traffic volume.

## Record competing hypotheses

The symptoms are a slow tenant report and delayed order updates. Write two hypotheses before running
the experiment. Predict which scan and sort work an index could remove, and what evidence in
`pg_stat_activity` would show that a transaction is blocking another.

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
repeat from the reset fixture. In Observer, check `wait_event_type` and `blockers` for `lab-b`.

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

Check that B's `blockers` is empty and that the final `total_cents` includes both increments. A connection merely returning to
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

<details><summary>A hint for explaining the server results</summary>

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

Design a follow-up report with two correlated filters, such as `country = 'GB'` and
`currency = 'GBP'`. State which estimate and actual row count you would compare to choose
between fresh statistics, extended statistics, and a new access path. Which observation would
still require a separate lock investigation?

Return to the [curriculum](./index.html) or use the [dataset](./dataset.html) to design your own case.

Primary sources: [Performance tips](https://www.postgresql.org/docs/current/performance-tips.html) and
[monitoring](https://www.postgresql.org/docs/current/monitoring.html).

</details>
