# Understand PostgreSQL by experimenting.

An advanced, hands-on journey through PostgreSQL for people who build applications and keep them running.

A query slows down. An index changes nothing. A plan expects a handful of rows and finds thousands.
Here, you investigate those failures with real PostgreSQL running in your browser.

<div class="status-card">
<p><strong>Eighteen complete investigations.</strong></p>
<p>Every chapter includes genuine PostgreSQL experiments in your browser. Seven chapters offer optional server extensions for additional behavior.</p>
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

Every chapter is now available. Open **Chapters** to navigate; on wide desktops the optional rail can
stay open, while tablets and phones keep the lesson width until you request navigation.

| Part | Investigations |
| --- | --- |
| Plans and indexes | [Read plans](./reading-plans.html), [design indexes](./designing-indexes.html), [diagnose estimates](./planner-estimates.html), [index tradeoffs](./index-tradeoffs.html). |
| Data and queries | [Constraints](./constraints.html), [sets and windows](./advanced-sql.html), [JSONB](./jsonb.html), [partitioning](./partitioning.html). |
| Storage and maintenance | [Row versions](./mvcc.html), [vacuum](./vacuum.html), [healthy statistics](./maintenance.html). |
| Reliable applications | [Isolation](./transactions.html), [locks](./locks.html), [migrations](./migrations.html). |
| Operations | [Observability](./observability.html), [backup and restore](./backup-recovery.html), [replication](./replication.html), [incident investigation](./production-incident.html). |

Start every part in the browser. Use the [server laboratory setup](./server-setup.html) only for optional
independent-session, pg_dump, and streaming-replication extensions. Each chapter includes
predictions, ordered experiments, interpretation, hints, a worked explanation, and a transfer task.

## Evidence you can change

Every SQL experiment runs against PostgreSQL through [PGlite](https://pglite.dev/).
The output comes from your database. Edit a predicate, remove an index, or change the query's order
and ask whether your explanation still holds.

The browser runtime uses one connection and supports a real checkpoint/restore exercise. Multi-session
contention and streaming replication use the optional [server extensions](./server-setup.html). Read [the runtime boundaries](./runtime.html) before translating timings
or operational observations to a production server.
