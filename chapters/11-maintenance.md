# Keep plans healthy

A batch adds a large customer, but the planner still expects almost no orders for that tenant. Choose maintenance based on the missing evidence.

**You will learn to** recognize stale statistics, test targeted ANALYZE, and distinguish it from
vacuum and index rebuilds. Prerequisite: row estimates, MVCC, and vacuum.

## Record the original distribution

This teaching copy disables automatic vacuum/analyze so background work cannot repair the estimate
between steps on a server. This setting isolates the experiment; it is not a production recommendation.

```sql
CREATE TABLE orders_growth WITH (autovacuum_enabled = false) AS
SELECT id, tenant_id, created_at FROM orders;
CREATE INDEX growth_tenant ON orders_growth (tenant_id);
ANALYZE orders_growth;
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM orders_growth WHERE tenant_id = 999;
```

In SQL 01, find estimated and actual rows for tenant 999. It starts with zero actual rows.
SQL 02 adds 15,000 matching orders using the old statistics.

```sql
INSERT INTO orders_growth
SELECT id + 60000, 999, created_at FROM orders WHERE id <= 15000;
SELECT count(*) AS new_tenant_rows FROM orders_growth WHERE tenant_id = 999;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id FROM orders_growth WHERE tenant_id = 999;
```

Predict which scan estimate is most wrong. Compare estimated and actual output rows. The table grew,
and the new tenant's value was not represented when statistics were collected. PostgreSQL may adjust
some table-size estimates independently; that does not automatically teach it the new value frequency.

## Refresh the relevant column

ANALYZE samples the current data. Predict whether refreshing tenant statistics will move the estimate
closer to the observed count, even if the chosen scan changes.

```sql
ANALYZE orders_growth (tenant_id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id FROM orders_growth WHERE tenant_id = 999;
SELECT attname, n_distinct, most_common_vals, most_common_freqs
FROM pg_stats WHERE tablename = 'orders_growth' AND attname = 'tenant_id';
```

Look for 999 in `most_common_vals`. Compare the scan's estimated and actual rows before and
after the refresh to see whether it learned the new tenant frequency. The estimate need not be exact
because the collection process samples. Compare the error before and after; do not require a fixed
plan node or execution-time improvement.

## Change detail only when needed

A statistics target controls summary detail and sampling effort. A higher target can help represent
skew or a richer distribution, but collection and planning have costs. Predict whether this simple
large-tenant fixture needs a very high target before trying it.

```sql
ALTER TABLE orders_growth ALTER COLUMN tenant_id SET STATISTICS 500;
ANALYZE orders_growth (tenant_id);
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM orders_growth WHERE tenant_id = 999;
```

The frequent value may already have been represented well at the default target. Increasing every
column's target is not a substitute for finding the source of an estimate error. The correlated
country/currency investigation needed extended statistics, not only fresher single-column summaries.

## Restore automatic maintenance

```sql
ALTER TABLE orders_growth RESET (autovacuum_enabled);
```

On a server, inspect analyze timestamps, modification estimates, autovacuum settings, and long-running
transactions before choosing a remedy. Statistics views can lag, and timestamps can be NULL. The
embedded lab demonstrates manual actions rather than the server's background scheduling.

## Explain the intervention

Which observation points to stale statistics? What changed after analyzing `tenant_id` alone?

<details><summary>A hint for explaining the results</summary>

Identify whether the problem is obsolete row versions, obsolete statistical summaries, missing
relationship information, or damaged/inefficient index storage. These are different hypotheses.

</details>

<details><summary>Worked explanation</summary>

The batch introduced a frequent tenant absent from the original statistics. Targeted ANALYZE teaches
the planner its frequency and improves the row estimate. Vacuum reclaims eligible tuple versions;
reindex rebuilds index storage. Neither should be chosen as the primary explanation for missing
value-frequency knowledge. A larger target is justified only if the current summary lacks useful detail.

</details>

## Go deeper: how the engine works

Why can fresher estimates improve later join choices even when this scan remains unchanged? Read [Statistics, cost and join order](https://snowch.github.io/query-engine-book/statistics-cost-and-join-order.html)
in Query Engine Book. Its DuckDB examples and teaching engine explain the general principle;
PostgreSQL's operators and implementation details can differ. This reading is optional.

## Transfer the idea

Compare estimated and actual scan rows after the batch here and after combining the two filters
in [Diagnose an estimate](./planner-estimates.html#combine-the-filters). Which mismatch followed a
data change? Use the before-and-after ANALYZE results in both chapters to decide whether fresher
single-column statistics are sufficient.

Next: [choose an isolation level](./transactions.html).

Primary sources: [ANALYZE](https://www.postgresql.org/docs/current/sql-analyze.html) and
[planner statistics](https://www.postgresql.org/docs/current/planner-stats.html).
