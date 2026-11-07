# Work with sets and windows

A revenue dashboard doubles an order's amount after joining its two events. Repair the query's row multiplicity before tuning its plan.

**You will learn to** reason about join fan-out, aggregate at the correct grain, choose a window frame,
and use LATERAL for a per-row lookup. Prerequisite: joins, GROUP BY, and basic plans.

## Reproduce the double count

The **grain** of a relation describes what one row represents. An order row represents an order;
an event row represents an event. Predict the number of rows after joining these tables.

```sql
CREATE TABLE demo_orders (id integer PRIMARY KEY, amount integer NOT NULL);
CREATE TABLE demo_events (order_id integer, event_time integer, event text);
INSERT INTO demo_orders VALUES (1, 100), (2, 200), (3, 300);
INSERT INTO demo_events VALUES (1, 1, 'created'), (1, 2, 'paid'), (2, 1, 'created');
SELECT o.id, o.amount, e.event
FROM demo_orders o JOIN demo_events e ON e.order_id = o.id
ORDER BY o.id, e.event_time;
SELECT sum(o.amount) AS joined_total
FROM demo_orders o JOIN demo_events e ON e.order_id = o.id;
```

Order 1 appears twice; order 3 disappears. Neither behavior is an arithmetic bug in SUM. The query
aggregates the joined rows it receives. `SUM(DISTINCT amount)` is not a general repair: two different
orders may legitimately have the same amount.

## Match the intended grain

If events only determine whether an order qualifies, use an existence test. If the dashboard needs
event counts, aggregate events before joining. Predict whether the second query preserves order 3.

```sql
SELECT sum(o.amount) AS total_with_events
FROM demo_orders o
WHERE EXISTS (SELECT 1 FROM demo_events e WHERE e.order_id = o.id);
WITH event_counts AS (
  SELECT order_id, count(*) AS events FROM demo_events GROUP BY order_id
)
SELECT o.id, o.amount, coalesce(e.events, 0) AS events
FROM demo_orders o LEFT JOIN event_counts e ON e.order_id = o.id
ORDER BY o.id;
```

The grouped event relation has at most one row per order. The left join preserves orders without
events. A common table expression, or **CTE**, names a query result within the statement. It does
not universally force materialization: PostgreSQL may fold a suitable CTE into its parent. Inspect
`EXPLAIN` before using a CTE as a performance boundary.

## Choose a window frame

A **window function** computes across related rows without collapsing them into a single aggregate
row. Its frame chooses which rows contribute to a particular row's result. Predict whether two
orders with the same amount receive the same running total under the default frame.

```sql
INSERT INTO demo_orders VALUES (4, 200);
SELECT id, amount,
       sum(amount) OVER (ORDER BY amount) AS peer_total,
       sum(amount) OVER (ORDER BY amount, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS row_total
FROM demo_orders ORDER BY amount, id;
```

With ORDER BY, the default frame includes peers equal on the ordering keys. Both amount-200 rows
therefore share the peer total. The explicit ROWS frame with the unique ID tie-breaker advances one
row at a time in a deterministic order. Ordering inside OVER defines the computation; the final
ORDER BY defines the presentation.

## Ask a question for each row

A LATERAL subquery can refer to an earlier FROM item. Use it to get each order's newest event.
Predict why `LEFT JOIN` matters for order 3.

```sql
SELECT o.id, latest.event
FROM demo_orders o
LEFT JOIN LATERAL (
  SELECT e.event FROM demo_events e
  WHERE e.order_id = o.id
  ORDER BY e.event_time DESC LIMIT 1
) latest ON true
ORDER BY o.id;
```

The left join emits a NULL event for an order without one. An inner join would drop that order.
On a large event table, `(order_id, event_time DESC)` is a candidate index for repeated lookups.
A set-based alternative may be better when processing most orders; compare workload size and plans.

## Explain the result

<details><summary>Hint</summary>

Write the grain beneath each intermediate relation. Count rows before computing money.

</details>

<details><summary>Worked explanation</summary>

The original join repeats order 1's amount and omits order 3. EXISTS preserves one row per qualifying
order, while a grouped left join preserves every order with an event count. The window examples
answer different questions about equal-valued peers. LATERAL expresses a per-order lookup and the
left join retains orders without matches. Correct cardinality comes before choosing an index.

</details>

## Go deeper: how the engine works

After fixing row multiplicity, which side of a hash join is held in memory and why does that choice matter? Read [Joins](https://snowch.github.io/query-engine-book/joins.html)
in Query Engine Book. For GROUP BY state and group cardinality, also read [Hash aggregation](https://snowch.github.io/query-engine-book/hash-aggregation.html). Its DuckDB examples and teaching engine explain the general principle;
PostgreSQL's operators and implementation details can differ. This reading is optional.

## Transfer the idea

Add a fifth order with amount 100 and no events. Predict each total before rerunning it. Design a
query returning every order, its event count, and a running revenue total without duplicating amounts.
A good answer defines the grain, tie ordering, and NULL behavior explicitly.

**Takeaway:** Understand which rows an operation produces before optimizing how it produces them.
Next: [give JSONB a job](./jsonb.html).

Primary sources: [Table expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html),
[window functions](https://www.postgresql.org/docs/current/tutorial-window.html), and
[WITH queries](https://www.postgresql.org/docs/current/queries-with.html).
