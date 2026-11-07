# Diagnose an estimate

The reporting query finds far more rows than the planner expects. Check what PostgreSQL knows about the relationship between its filters.

**You will learn to** compare estimated and actual cardinality, separate stale statistics from missing
relationship information, and test multicolumn statistics without forcing a plan. Cardinality means
the number of rows at a point in a query. Read the first two investigations before starting.
This page has a fresh database, with only the primary-key index.

## The incident

Finance requests orders placed in Great Britain and charged in pounds. In this synthetic application,
every British order uses GBP and every US order uses USD. That relationship is a property of this
fixture, not a universal rule about commerce.

**Predict:** If ten percent of orders are British and ten percent use GBP, what fraction satisfy both
conditions? Your answer depends on whether those properties are independent.

```sql
SELECT country, currency, count(*) AS orders
FROM orders
GROUP BY country, currency
ORDER BY country, currency;
```

Only two country/currency pairs exist. If you know the country, you can infer the currency in this
dataset. The columns are correlated: knowing one changes what you expect about the other.

## Compare the single-column estimates

`ANALYZE orders` collects statistics about the table. By default, it samples rows and builds summaries
for individual columns, such as the fraction occupied by common values. It does not execute a query
plan; the `ANALYZE` option of `EXPLAIN` is a separate use of the word.

```sql
ANALYZE orders;
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM orders WHERE country = 'GB';
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id FROM orders WHERE currency = 'GBP';
```

At each scan, compare estimated `rows` before the actual-execution parentheses with `actual rows`
inside them. Each single-column estimate should be reasonably close to its observed count. Sampling
means the estimate need not equal the count exactly.

## Combine the filters

**Predict:** Will fresh individual-column statistics be sufficient to estimate their intersection?

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id
FROM orders
WHERE country = 'GB' AND currency = 'GBP';
```

Compare the scan's estimate with its actual rows. Without relationship information, the planner can
multiply the individual selectivities as though the predicates were independent. About one tenth
times about one tenth suggests about one hundredth of the table. In this fixture, the combination
still matches the British orders, about one tenth of the table.

That arithmetic explains the direction and approximate scale of the error. Calculate the ratio using
your displayed estimate and actual count. Do not expect a fixed numeric estimate across runs or versions.

Bad estimates matter even when a sequential scan remains the right choice. In a larger query,
cardinality affects join order, join algorithms, memory estimates, and whether an index looks cheap.
This experiment isolates the estimation mistake so you can inspect it without a complicated join.

## Test the stale-statistics hypothesis

A table that changed after its last analysis can have stale statistics. But this fixture has not
changed since the previous analysis. Test whether collecting the same type of statistics again
repairs the missing relationship.

```sql
ANALYZE orders;
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id
FROM orders
WHERE country = 'GB' AND currency = 'GBP';
```

The exact estimate may shift with the sample. The joint estimate should still substantially
underestimate the rows. Repeating a single-column summary cannot describe this cross-column dependency.

## Describe the dependency

**Extended statistics** summarize relationships between columns. Dependency statistics model how
strongly knowing one column constrains another. They help the planner avoid multiplying redundant
equality predicates as if those predicates were independent.

`CREATE STATISTICS` defines what PostgreSQL should collect. `ANALYZE` then populates the statistics.
These statistics help planning; they do not enforce a constraint on future data.

```sql
CREATE STATISTICS orders_country_currency (dependencies)
ON country, currency FROM orders;
ANALYZE orders;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT id
FROM orders
WHERE country = 'GB' AND currency = 'GBP';
```

Compare the scan estimate with the earlier plan. It should move closer to the actual row count.
The scan type may stay the same, and execution may not get faster in this isolated query. Improving
an estimate is a different result from proving an end-to-end speedup.

Inspect the definition you created. Catalog views describe database metadata; this one lists
extended-statistics definitions and their kinds.

```sql
SELECT statistics_name, attnames, kinds
FROM pg_stats_ext
WHERE tablename = 'orders';
```

## Check the limit of the model

The fixture has no British orders charged in USD. Predict how dependency statistics handle a query
for that nonexistent combination.

```sql
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id
FROM orders
WHERE country = 'GB' AND currency = 'USD';
```

Dependency statistics describe the strength of a relationship, not a complete list of allowed value
pairs. They can still produce a poor estimate for contradictory equalities. PostgreSQL usually
avoids estimating an ordinary scan as exactly zero rows; a nonzero estimate alone does not prove
the whole model is defective.

A multicolumn most-common-values list, called **MCV statistics**, stores frequent combinations.
Test that different statistical model on the same filters.

```sql
DROP STATISTICS orders_country_currency;
CREATE STATISTICS orders_country_currency (mcv)
ON country, currency FROM orders;
ANALYZE orders;
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id
FROM orders
WHERE country = 'GB' AND currency = 'GBP';
EXPLAIN (ANALYZE, TIMING OFF)
SELECT id
FROM orders
WHERE country = 'GB' AND currency = 'USD';
```

Compare both estimates with the dependency model. The MCV list can represent the common pairs and
recognize that the contradictory pair is absent from those combinations. In this small domain,
that is more informative. A large domain may need a larger statistics target and still have combinations
outside its list. Extended statistics also have planner restrictions, including limited support for
join selectivity; do not assume every correlated predicate benefits.

## Explain your diagnosis

1. What evidence shows the individual columns were already described reasonably well?
2. Why did another `ANALYZE` fail to fix the joint estimate?
3. What did dependency statistics improve, and what did they fail to describe?
4. Why is a better row estimate useful even if the plan still scans the table?

<details>
<summary>Hint: freshness and expressiveness are different</summary>

Fresh data can still be summarized by a model that omits a relationship. Check what each statistics
kind stores before expecting it to answer every question about two columns.

</details>

<details>
<summary>Worked diagnosis</summary>

Single-column plans estimate the two individual predicates reasonably well, while their intersection
is underestimated. The table did not change, and reanalysis leaves the same kind of mistake. Missing
relationship information explains that pattern better than stale statistics.

Dependency statistics describe redundancy between equalities, improving the compatible pair's estimate.
They do not store the mapping between countries and currencies. The MCV model stores frequent pairs
and can describe the contradictory pair more effectively in this fixture. Better cardinality estimates
can improve later join and access-path decisions, even when this isolated scan does not change.

</details>

## Transfer the idea

Imagine a table with postal code and city, or product category and supplier. Propose a query whose
filters might be correlated. State which evidence you would collect before adding statistics, which
statistics kind you would try, and how you would test the result. A strong answer checks data shape,
existing statistics, compatible and contradictory predicates, and the actual workload's plan.

## What this cannot tell you

This fixture has a deliberately strong, simple relationship. Real dependencies can be partial, drift
over time, or differ by tenant. More statistics add collection and planning costs. Measure the full
query and refresh statistics after meaningful data changes. Statistics are estimates, not integrity rules.

**Takeaway:** A planner can have fresh statistics and still lack the relationship your query needs.
Choose the summary that describes that relationship, then verify it against execution.

You have completed the first vertical slice. Continue exploring the editors or inspect the
[index tradeoffs investigation](./index-tradeoffs.html).

Primary sources: [Planner statistics](https://www.postgresql.org/docs/current/planner-stats.html),
[extended statistics examples](https://www.postgresql.org/docs/current/multivariate-statistics-examples.html),
and [CREATE STATISTICS](https://www.postgresql.org/docs/current/sql-createstatistics.html).
