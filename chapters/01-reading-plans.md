# Read a query plan

The order history endpoint slows down as the table grows. Find where PostgreSQL spends its work before changing the query.

**You will learn to** read a plan from its children upward, distinguish estimates from observations,
and explain why a selective query can still inspect every row. You need basic filtering and sorting.
Start from a fresh database and run the editors in order.

## The incident

A support agent opens the newest orders for tenant 42. The application needs twenty rows containing
an order ID, creation time, and total. The table has a primary-key index on `id`, but no index on
`tenant_id` or `created_at`.

First inspect the table's indexes. An index is a separate structure PostgreSQL can use to locate
rows without searching the whole table. A primary key creates a unique index automatically.

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'orders';
```

**Predict:** Does an index on `id` help locate one tenant's newest orders? Write down what PostgreSQL
must do to find and order the rows before you run the query.

```sql
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

This result shows the endpoint's answer. It does not reveal how much work produced that answer.

## Ask for the plan

`EXPLAIN` prints the planner's chosen execution strategy without running the query. A plan is a tree:
each node consumes rows from a child, or obtains rows directly from storage.

```sql
EXPLAIN
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

Read the deepest indented node first. On the fresh fixture, look for a sequential scan, then a sort,
then a limit. A **sequential scan** visits the table's pages and tests rows against the filter.
The **sort** puts matching rows into creation-time order. The **limit** returns at most twenty.

A node's `cost=startup..total` values are planner units, not milliseconds. Startup cost estimates
work before the node can emit its first row; total cost estimates work if it runs to completion.
The parent cost includes its children's work. Do not add all node costs together.

`rows` estimates the rows emitted by a node, not necessarily the rows it inspects. `width` estimates
the average size in bytes of an output row at that node.

## Measure the work

**Predict:** The limit returns twenty orders. Will the scan inspect twenty, all of this tenant's
orders, or the whole table? Now let the executor run the plan.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

`ANALYZE` in `EXPLAIN` executes the statement. `actual rows` and `loops` report observations.
For a node executed multiple times, actual rows is an average per loop; multiply by loops when
reasoning about total rows. `TIMING OFF` avoids per-node clock measurements while retaining row
counts and overall execution time.

Find the scan's `actual rows` and `Rows Removed by Filter`. On this fixture, their sum accounts for
the whole table when the scan runs once. The filter emits one tenant's orders and rejects the rest.
The limit does not let the scan stop early because the executor still needs to find the newest orders.

Look for `Sort Method`. PostgreSQL can use a top-N sort to retain a small set of candidates.
Keeping fewer candidates saves sort memory; the sort still consumes all qualifying input rows.
An implementation or version may choose another sort strategy, so use the actual output as evidence.

`BUFFERS` describes PostgreSQL buffer activity. A shared hit means the needed block was already in
PostgreSQL's shared buffer cache. A shared read means PostgreSQL loaded it into that cache. Neither
is a direct measurement of physical device I/O. Parent buffer figures include descendants; do not
sum them across the tree. Browser memory and host caching make server I/O comparisons especially weak.

## Change the selectivity

**Selectivity** is the fraction of rows a predicate matches. Predict the plan if the predicate matches
almost the entire table instead of one tenant. Compare the scan's emitted and rejected rows.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id BETWEEN 1 AND 99
ORDER BY created_at DESC
LIMIT 20;
```

A similar plan can do different amounts of downstream work. Both scans inspect the table, but the
broad predicate sends more rows to the sort. A plan's node names alone are not enough to diagnose it.

Run the plan again. The execution time may change as caches warm or browser scheduling changes.
That variation does not prove the SQL became better. Prefer row counts, filters, ordering work,
and buffer activity when explaining a change.

## Explain your evidence

Before opening the explanation, answer these questions in your own words:

1. Which node first obtains rows, and which node establishes the requested order?
2. Why does returning twenty rows still require inspecting the table?
3. Which values were predictions, and which came from execution?
4. If the query returns no rows for tenant 101, does that make the scan cheap?

<details>
<summary>Hint: start at the leaves</summary>

A scan must prove a row matches or fails its filter. A sort cannot identify the newest matching rows
until it has seen its input. A limit controls what its parent receives, not every child's work.

</details>

<details>
<summary>Worked explanation</summary>

The sequential scan obtains and filters rows. The sort establishes creation-time order, and the
limit takes the first twenty. No existing index groups a tenant's orders in that order, so the scan
cannot stop after finding twenty matches.

The `cost`, estimated `rows`, and `width` values come from planning. Actual rows, loops, removed rows,
and buffers describe execution. The estimate can differ from observation because statistics sample
the data. Tenant 101 still requires a full scan in this plan: PostgreSQL must check the table to
prove no rows match. A small output does not imply a small search.

</details>

## Go deeper: how the engine works

How do logical plans, physical operators, and execution profiles fit together? Read [The plan is the map](https://snowch.github.io/query-engine-book/the-plan-is-the-map.html)
in Query Engine Book. Its DuckDB examples and teaching engine explain the general principle;
PostgreSQL's operators and implementation details can differ. This reading is optional.

## Transfer the idea

Change the query to `ORDER BY id DESC`. The primary-key index can supply that order. Predict whether
a plan using that index can stop before reaching the beginning of the table. Run it and inspect any
rows removed by the tenant filter. A useful answer distinguishes **supplying order** from **locating
the tenant**; the index can do the first even when it cannot do the second.

## What this cannot tell you

This fixture is deliberately small and uniform across tenants. It does not model concurrent users,
production storage latency, or a workload larger than memory. A sequential scan is often the right
choice when many rows match. The goal is to explain the work, not to remove every sequential scan.

**Takeaway:** A limit bounds returned rows. The chosen access path determines how much work is needed
to find them. [Design an index for this query →](./designing-indexes.html).

Primary sources: [Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html) and
[EXPLAIN reference](https://www.postgresql.org/docs/current/sql-explain.html).
