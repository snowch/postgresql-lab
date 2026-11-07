# Resolve a production incident

A report becomes expensive after a data batch. Diagnose and repair its statistics and access path entirely in the browser, then optionally investigate a separate blocking incident on a server.

**You will learn to** test competing estimate and access-path hypotheses, verify business results,
and compare work before declaring recovery. Prerequisites: plans, statistics, and indexes.
This browser capstone requires no external backend or invented production traffic.

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

Record the scan estimate, actual matching rows, filtering, and sort. Write two hypotheses: the
planner lacks the new tenant's frequency, and the available storage path requires inspecting and
ordering too many candidates. These claims need separate tests.

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

Capture the baseline result in a temporary table before adding the index, then check the candidate
preserves that result. EXCEPT ALL compares row multiplicities as well as values.

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

Look for early stopping and the removed sort, then require zero changed result rows. Compare the
tenant's count and total with your first observation if you experiment further. A speedup that
changes the endpoint's answer is not a valid recovery.

## Explain the browser evidence

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

Repeat the incident with a tenant that owns most rows and a query without LIMIT. Predict whether
the same index remains useful. Write an incident record containing evidence, competing hypotheses,
interventions, verification, and one observation that would invalidate your preferred explanation.

## Optional server extension

The browser investigation above is complete on its own. Use the [server setup](./server-setup.html)
for the additional behavior below. Its copied commands run in a separate database and do not
change your browser database.

<details class="server-extension" id="server-extension">
<summary>Open the independent-session server exercise</summary>

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

</details>
