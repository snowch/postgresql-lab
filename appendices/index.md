# Understand PostgreSQL by experimenting

Investigate slow queries, changes to stored data, and transaction behavior with PostgreSQL running
in your browser. You should already know `SELECT`, `WHERE`, `ORDER BY`, and basic table and index definitions.

[Open your browser laboratory](./getting-started.html) to run a query and learn what your edits change.

## The first investigation

Your application's order history gets slower as the table grows. Read its plan, design an index
for its access pattern, then investigate an estimate that statistics cannot explain one column at a time.

1. [Read a query plan](./reading-plans.html): distinguish work the planner predicts from work the executor performs.
2. [Design for the query](./designing-indexes.html): combine filtering and ordering, then inspect the cost of an index.
3. [Diagnose an estimate](./planner-estimates.html): find correlated columns and test extended statistics.

## A journey from developer to operator

The full curriculum has five parts. Plans and indexes lead into data modeling and advanced SQL.
Storage and maintenance explain why updates change the database over time. Transactions and
production operations connect query behavior to reliable applications.

Open **Chapters** to jump to any investigation.

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
