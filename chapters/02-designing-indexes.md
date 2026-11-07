# Design for the query

The endpoint filters by tenant and orders by creation time. Build an index that supports both operations, then check what it costs.

**You will learn to** compare an index's search condition with a residual filter, choose useful
column order for an equality-and-sort workload, and distinguish index access from index-only access.
Read [query plans](./reading-plans.html) first. This page starts with its own fresh database.

## Establish the baseline

Run the plan before creating any indexes. Keep the output visible so you can compare the scan,
sort, and rows inspected with the next experiment.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

An index is useful when its organization matches the work a query needs. It can narrow a search,
supply ordering, or contain the values the query must return. One index need not do all three.

## Index the filter

**Predict:** If the index contains only `tenant_id`, which work disappears and which work remains?

```sql
CREATE INDEX orders_tenant ON orders (tenant_id);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

Look for `Index Cond` identifying the tenant. An **index condition** constrains the entries read
through the index. A **filter** tests candidate rows after retrieval. A bitmap index scan may locate
matching tuple positions, then a bitmap heap scan obtains their table pages. An ordinary index scan
is another valid path. The planner chooses between them using its estimates.

The index helps find the tenant, but it does not store that tenant's rows in creation-time order.
Look for the remaining sort. PostgreSQL still needs the qualifying rows before choosing the newest twenty.

## Match the filter and order

A B-tree stores entries in key order. In a multicolumn B-tree, the first key orders groups and the
next key orders entries within each group. With equality on `tenant_id`, the following index puts
that tenant's orders in the requested creation-time order.

**Predict:** Where can execution stop now? Compare the rows emitted by the access node before and
after creating the index.

```sql
DROP INDEX orders_tenant;
CREATE INDEX orders_tenant_created
ON orders (tenant_id, created_at DESC);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

Look for the tenant in `Index Cond`, no explicit sort, and an index scan stopped by the limit.
Those observations explain the improvement without depending on a timing threshold. If your
output differs, inspect indexes and restore a fresh database before replaying the steps.

The `DESC` spelling documents the intended order. For this query, an ascending index on both
columns can also work: PostgreSQL can scan a B-tree backward within the equality-constrained tenant.
Mixed sort directions across multiple unconstrained keys require more care.

Column order is a workload decision. An index beginning with creation time could provide global
time order, then filter out other tenants. That can inspect many entries before finding enough
matches. Later PostgreSQL versions can use additional strategies, including skip scans in suitable
cases; the useful question remains how much work the observed plan performs.

## Try a covering index

An ordinary index scan usually retrieves table rows to return columns missing from the index.
`INCLUDE` adds non-key columns as payload without changing the index's search order. An index with
all the query's columns is often called a **covering index**.

**Predict:** Is containing every selected column sufficient to avoid every heap visit? The heap is
the table storage holding row versions. Index entries do not carry all transaction visibility information.

```sql
DROP INDEX orders_tenant_created;
CREATE INDEX orders_tenant_created_cover
ON orders (tenant_id, created_at DESC) INCLUDE (id, total_cents);
```

Run vacuum separately. PostgreSQL prohibits `VACUUM` inside a transaction block; sending several
statements in one SQL execution can create an implicit transaction block.

```sql
VACUUM (ANALYZE) orders;
```

Now inspect the plan against the vacuumed table.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

`VACUUM` can mark heap pages all-visible when their row versions are visible to all relevant
transactions. This information lives in the **visibility map**. An index-only scan uses those bits
to decide when it can skip heap visibility checks. Find `Heap Fetches` in the output if the planner
chooses an index-only scan. On the fresh, vacuumed fixture, heap fetches should be absent or low.
The next experiment shows why that can change.

```sql
UPDATE orders
SET total_cents = total_cents + 1
WHERE tenant_id = 42;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at, total_cents
FROM orders
WHERE tenant_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

Updates create row versions and clear all-visible bits on affected pages. An index-only plan may
now need heap fetches. A planner may also switch paths. Containing all returned columns makes
index-only access possible; visibility and cost determine how much table access it avoids.

## Inspect the storage bill

Every extra index occupies space and must be maintained when its indexed values change. Including
`total_cents` makes updates to that value update the index too. It can also prevent HOT updates,
a PostgreSQL optimization that avoids new index entries under particular conditions.

```sql
SELECT pg_size_pretty(pg_relation_size('orders')) AS heap_size,
       pg_size_pretty(pg_relation_size('orders_tenant_created_cover')) AS covering_index_size,
       pg_size_pretty(pg_indexes_size('orders')) AS all_indexes_size;
```

These values describe your current fixture, including the primary-key index in the total. They
are not a production capacity estimate. Compare the index's purpose with its storage and write cost
before recommending it.

## Explain the recommendation

Recommend an index for the support endpoint. State the equality predicate, required ordering,
expected early stop, and whether the extra payload is worth testing on the real write workload.
Then explain why the tenant-only index left a sort in the plan.

<details>
<summary>Hint: separate three jobs</summary>

Ask which keys find the tenant, which keys order its matches, and where the selected values live.
Then ask how PostgreSQL knows those values are visible to the transaction.

</details>

<details>
<summary>Worked recommendation</summary>

The `(tenant_id, created_at DESC)` index supports the equality search and requested order. The
executor can return twenty entries and stop without sorting all the tenant's orders. The tenant-only
index narrows the input but leaves ordering work.

Including `id` and `total_cents` allows index-only access because all selected columns are present.
The vacuumed fixture can skip heap fetches where visibility-map bits permit it. Frequent updates
can reduce that benefit while increasing index maintenance, so a covering index needs workload
validation. Keep the smaller composite index as a candidate rather than assuming the larger one wins.

</details>

## Transfer the idea

Change the predicate to `status = 'pending'` and remove the tenant predicate. Does the current index
organize the pending orders together in newest-first order? Write a candidate index for that workload
and inspect a plan. A useful answer considers `(status, created_at DESC)` or a partial index with
`WHERE status = 'pending'`, and explains the additional write cost. Do not force a plan by disabling scans.

## What this cannot tell you

A single-user browser experiment does not measure lock contention, write throughput, cache pressure
across many queries, or production disk behavior. The next chapter, [Pay for your indexes](./index-tradeoffs.html),
investigates index alternatives and maintenance in more depth.

**Takeaway:** Match an index to the query's search and ordering requirements, then account for visibility,
storage, and writes. A useful index still depends on useful estimates. [Diagnose an estimate →](./planner-estimates.html).

Primary sources: [Multicolumn indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html),
[indexes and ordering](https://www.postgresql.org/docs/current/indexes-ordering.html), and
[index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html).
