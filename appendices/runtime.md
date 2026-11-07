# What the browser can tell you

The lab runs real PostgreSQL through PGlite, an embedded build compiled to WebAssembly. Its SQL results
and query plans come from the engine, not scripted demonstrations.

## What you can investigate here

The completed lessons exercise filtering, sorting, B-tree indexes, index-only access, manual vacuum,
column statistics, and extended statistics. The SQL runs inside a Web Worker so execution does not
block page controls. Reset terminates the worker and starts a new database.

The database files live in memory. The page ships its own engine assets; a CDN is not required at
runtime. First startup downloads a substantial WASM engine and filesystem image, so loading can take
longer on a slow connection. The browser needs current JavaScript, WebAssembly, and Worker support.

## What needs a server

The browser database has one connection and does not reproduce independent PostgreSQL backend
processes. It cannot demonstrate multi-session blocking, realistic deadlocks, connection pooling,
replication, failover, backup recovery, server background maintenance, or operating-system tuning.
Those lessons are marked as planned server work in the curriculum.

Some PostgreSQL extensions depend on native libraries or facilities unavailable in PGlite. A planned
lesson must verify extension availability before promising a browser experiment.

## How to interpret measurements

Row counts, SQL semantics, and the relationship between a plan's nodes are useful evidence.
Absolute latency, throughput, memory pressure, and buffer behavior do not predict a production server.
Shared buffer reads do not establish physical disk reads. A warmed browser database and an active
server have different caches and scheduling behavior.

`EXPLAIN ANALYZE` executes a statement, including its writes. The completed labs use synthetic,
disposable data. Display truncation bounds output, not query execution memory: an enormous result
can still exhaust browser resources before it is displayed. Use `LIMIT` and aggregates.

## State and recovery

Editors on a page share one connection and database. Reset discards changes and outputs but keeps
SQL text. Navigation and reload discard both database state and edits. SQL errors trigger a rollback
of any open transaction. Reset can interrupt a query immediately; the execution timeout stops a
query after thirty seconds and requires a reset before continuing.

See the [PGlite documentation](https://pglite.dev/docs/) and
[PostgreSQL documentation](https://www.postgresql.org/docs/current/) for engine-specific details.
