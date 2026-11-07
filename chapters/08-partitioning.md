# Divide a growing table

A February report should avoid January's rows. Use partition boundaries to remove whole relations from the search, then inspect the remaining work.

**You will learn to** separate pruning from index access, choose half-open time boundaries, and
account for uniqueness and retention. Prerequisite: query plans and indexes.

## Build time partitions

A partitioned table routes rows to child tables according to a key. A range partition includes its
lower bound and excludes its upper bound. Predict where a row at exactly February 1 belongs.

```sql
CREATE TABLE orders_by_month (
  id integer NOT NULL,
  created_at timestamp NOT NULL,
  tenant_id integer NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
CREATE TABLE orders_jan PARTITION OF orders_by_month
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE orders_feb PARTITION OF orders_by_month
FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
INSERT INTO orders_by_month SELECT id, created_at, tenant_id FROM orders;
ANALYZE orders_by_month;
SELECT tableoid::regclass AS partition, count(*)
FROM orders_by_month GROUP BY tableoid ORDER BY tableoid::regclass::text;
```

`tableoid` identifies the physical relation containing a row. The fixture ends during February,
so both partitions contain data. No default partition is present; an out-of-range insert fails until
an appropriate partition exists.

## Prune before scanning

**Partition pruning** eliminates children whose bounds cannot match the query. Predict which
relations remain for the February range and inspect the plan.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT count(*) FROM orders_by_month
WHERE created_at >= timestamp '2025-02-01'
  AND created_at < timestamp '2025-03-01';
EXPLAIN (ANALYZE, TIMING OFF)
SELECT count(*) FROM orders_by_month
WHERE date_trunc('month', created_at) = timestamp '2025-02-01';
```

The direct range exposes the partition bounds. Wrapping the key in a function can prevent that
proof, so inspect whether both children appear in the second plan. A semantically equivalent
predicate need not be equally useful to pruning. PostgreSQL can also prune during execution when
parameter values become known; a static plan alone may not show all runtime pruning.

## Index inside the surviving partition

Pruning does not make the remaining rows free to search. Predict what an index changes for a
tenant-specific newest-first report bounded to February.

```sql
CREATE INDEX orders_month_tenant_time ON orders_by_month (tenant_id, created_at DESC);
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at FROM orders_by_month
WHERE tenant_id = 42
  AND created_at >= timestamp '2025-02-01'
  AND created_at < timestamp '2025-03-01'
ORDER BY created_at DESC LIMIT 20;
```

The parent index definition creates corresponding child indexes. Bounds can remove January, while
the surviving child's index can narrow the tenant and supply time order. These are distinct savings.
The composite primary key includes the partition key because uniqueness across partitions must be
compatible with the partition scheme. It does not enforce globally unique `id` by itself.

## Make retention a table operation

Predict whether detaching January deletes its rows, and whether parent queries still include them.

```sql
ALTER TABLE orders_by_month DETACH PARTITION orders_jan;
SELECT count(*) AS still_in_detached_table FROM orders_jan;
SELECT count(*) AS still_in_parent FROM orders_by_month;
```

Detachment leaves an independent table. Archival or deletion can follow as a separate decision.
The command needs locks; the browser does not demonstrate its blocking behavior on a busy server.
More partitions add planning and maintenance overhead, so partitioning every small category is not
a universal improvement.

## Explain the boundaries

<details><summary>Hint</summary>

Separate three questions: which relations can contain a match, how a surviving relation finds rows,
and what keys the database can prove unique.

</details>

<details><summary>Worked explanation</summary>

Half-open February bounds let PostgreSQL eliminate January. The tenant/time index can reduce work
inside February. The function-wrapped predicate can leave more children in the plan. Detaching
January changes the parent's membership without removing the detached data. The primary key
protects `(id, created_at)` rather than `id` alone.

</details>

## Go deeper: how the engine works

How does eliminating whole files before opening them compare with eliminating PostgreSQL partitions? Read [Where work happens](https://snowch.github.io/query-engine-book/where-work-happens.html)
in Query Engine Book. Its DuckDB examples and teaching engine explain the general principle;
PostgreSQL's operators and implementation details can differ. This reading is optional.

## Transfer the idea

Add a March partition and insert a row at its lower boundary. Predict both the routing and a query's
pruning behavior. Write a retention procedure that distinguishes detach, verify/archive, and drop.
Explain what you would measure before moving a small unpartitioned table to this layout.

**Takeaway:** Partitioning narrows relations; indexes narrow access inside those relations.
Next: [follow a row version](./mvcc.html).

Primary source: [Table partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html).
