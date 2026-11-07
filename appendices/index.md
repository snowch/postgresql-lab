# Understand PostgreSQL by experimenting.

An advanced, hands-on journey through PostgreSQL for people who build applications and keep them running.

A query slows down. An index changes nothing. A plan expects a handful of rows and finds thousands.
Here, you investigate those failures with real PostgreSQL running in your browser.

<div class="status-card">
<p><strong>Start with three complete investigations.</strong></p>
<p>Editable SQL, a repeatable dataset, and the evidence behind every explanation. No database setup or account required.</p>
<p><a href="./getting-started.html">Open your laboratory →</a></p>
</div>

## The first investigation

Your application's order history gets slower as the table grows. Read its plan, design an index
for its access pattern, then investigate an estimate that statistics cannot explain one column at a time.

1. [Read a query plan](./reading-plans.html): distinguish work the planner predicts from work the executor performs.
2. [Design for the query](./designing-indexes.html): combine filtering and ordering, then inspect the cost of an index.
3. [Diagnose an estimate](./planner-estimates.html): find correlated columns and test extended statistics.

Allow roughly an hour for the three investigations, with more time to try your own queries.
You should already know `SELECT`, `WHERE`, `ORDER BY`, and basic table and index definitions.

## A journey from developer to operator

The full curriculum has five parts. Plans and indexes lead into data modeling and advanced SQL.
Storage and maintenance explain why updates change the database over time. Transactions and
production operations connect query behavior to reliable applications.

The sidebar links every planned chapter. **Outline** means the chapter describes a future experiment;
its full lesson and executable work are not available yet. The three investigations above are complete.

## Evidence you can change

Every SQL experiment runs against PostgreSQL through [PGlite](https://pglite.dev/).
The output comes from your database. Edit a predicate, remove an index, or change the query's order
and ask whether your explanation still holds.

The browser runtime uses one connection. Multi-session contention, recovery, and replication belong
to the planned server track. Read [the runtime boundaries](./runtime.html) before translating timings
or operational observations to a production server.
