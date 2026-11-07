# Pay for your indexes

A support query becomes faster after an index rollout, but order imports now maintain several overlapping structures. Decide which indexes deserve their space.

**You will learn to** connect predicates to partial and expression indexes, compare index sizes, and
explain why read benefits carry write costs. Prerequisite: composite and covering indexes. Run the
editors in order from this page's fresh database.

## Establish the workload

The support queue asks for the newest pending orders across all tenants. Predict how many rows match
and whether the primary-key index groups them in the requested order.

```sql
SELECT status, count(*) FROM orders GROUP BY status;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at FROM orders
WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;
```

The filter selects a minority of the table. A full B-tree on status and time would include both
pending and shipped orders. A **partial index** contains only rows satisfying its predicate.

## Index the active subset

Predict which work this index removes. Compare the observed scan and sort with the baseline.

```sql
CREATE INDEX orders_pending ON orders (created_at DESC)
WHERE status = 'pending';
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id, created_at FROM orders
WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;
SELECT pg_size_pretty(pg_relation_size('orders_pending')) AS partial_size;
```

The index can provide the requested order among pending rows and stop at the limit. PostgreSQL must
be able to prove the query's predicate implies the index predicate. A query for shipped orders cannot
use this index to locate its rows.

```sql
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id, created_at FROM orders
WHERE status = 'shipped' ORDER BY created_at DESC LIMIT 20;
CREATE INDEX orders_status_time ON orders (status, created_at DESC);
SELECT indexrelid::regclass AS index_name,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_index WHERE indrelid = 'orders'::regclass;
```

Compare the two index sizes. The full index supports a wider set of status predicates and includes
more entries. This does not establish that its write latency is a fixed multiple of the partial index.
A prepared statement with a generic status parameter can also prevent the proof needed for the partial
index; inspect the plan your application's preparation strategy produces.

## Index a transformation

An index on a column does not automatically support every function of that column. An **expression
index** stores a computed key. Predict which expression the next query needs.

```sql
CREATE INDEX orders_country_lower ON orders (lower(country));
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM orders WHERE lower(country) = 'gb';
```

Inspect `Index Cond` if an index path is chosen. The expression matches the query, but a common value
can still make a table scan cheaper. Expression indexes require immutable expressions: a value must
not silently change because the clock or session setting changed. An index on `lower(country)` is not
a general replacement for modeling country codes consistently.

## Follow a row leaving the index

Predict what happens to the partial index when pending orders become shipped.

```sql
SELECT count(*) AS pending_before FROM orders WHERE status = 'pending';
UPDATE orders SET status = 'shipped' WHERE status = 'pending' AND id <= 10000;
SELECT count(*) AS pending_after FROM orders WHERE status = 'pending';
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id, created_at FROM orders
WHERE status = 'pending' ORDER BY created_at DESC LIMIT 20;
```

The update changes membership in the partial index and changes a key in the full status index. Old
versions can remain until maintenance can reclaim them. Index file size need not shrink immediately
when the live subset shrinks. Expression indexes also add maintenance when their input values change.

## Make the decision

Which index would you retain for a service that only reads the pending queue? What new requirement
would justify keeping the full status index too? Identify a column update that does not change either
index's logical keys, and explain why MVCC may still require physical maintenance.

<details><summary>Hint</summary>

Separate supported reads, live entries, and the work of creating and cleaning up row versions.
Two indexes serving one query are not automatically twice as useful.

</details>

<details><summary>Worked explanation</summary>

The partial time index fits the pending queue and omits shipped rows. A full status/time index may
be justified by newest-first queries for other statuses. Both add storage, and transitions between
statuses affect both. Updating only the payload does not change these index keys; whether PostgreSQL
can avoid new index entries depends on HOT eligibility and page space, not only logical key equality.
No timing in this single-user fixture establishes import throughput under production load.

</details>

## Transfer the idea

Design an index for `WHERE tenant_id = 42 AND status = 'pending' ORDER BY created_at DESC LIMIT 20`.
Try a partial index whose keys start with tenant ID. Explain which tenant-specific and global queue
queries it can efficiently serve. Compare storage before recommending the additional index.

**Takeaway:** An index has a supported workload and a maintenance bill. Name both.
Next: [make invalid data impossible](./constraints.html).

Primary sources: [Partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html) and
[expression indexes](https://www.postgresql.org/docs/current/indexes-expressional.html).
