# What the browser can tell you

The lab runs real PostgreSQL through PGlite, an embedded build compiled to WebAssembly. Its SQL results
and query plans come from the engine, not scripted demonstrations.

## What you can investigate here

The completed lessons exercise filtering, sorting, B-tree indexes, index-only access, manual vacuum,
column statistics, extended statistics, transactions, lock ownership, staged migrations,
sort memory pressure, checkpoint recovery, WAL positions, and a statistics/index incident. The SQL runs inside a Web Worker so execution does not
block page controls. Reset terminates the worker and starts a new database.

The database files live in memory. The page ships its own engine assets; a CDN is not required at
runtime. First startup downloads a substantial WASM engine and filesystem image, so loading can take
longer on a slow connection. The browser needs current JavaScript, WebAssembly, and Worker support.

## What needs a server

The browser database has one connection and does not reproduce independent PostgreSQL backend
processes. It cannot demonstrate multi-session blocking, realistic deadlocks, connection pooling,
streaming replication, failover, continuous WAL recovery, server background maintenance, or operating-system tuning.
Seven chapters keep those additional behaviors in optional [server extensions](./server-setup.html),
with copied commands and independent sessions. Browser snapshot recovery is implemented separately.

All eighteen chapters include runnable browser SQL. Some PostgreSQL extensions depend on native libraries or facilities unavailable in PGlite. A new
lesson must verify extension availability before promising a browser experiment.

## Browser recovery checkpoints

The recovery chapter uses PGlite's data-directory export API to create a compressed database archive.
Restoring creates a new worker and engine instance using those saved files; the fixture seed is not
replayed. The SQL verification checks recovered rows and the absence of later committed work.
Saving requires a completed transaction. A failed checkpoint save rolls back an open transaction,
as other operation errors do in this lab.

Reset clears the in-page checkpoint; navigation or reload discards it too. Downloading preserves an
archive, but this release has no uploaded-archive import control. The archive is tied to the PGlite
version and database format, not a portable pg_dump backup. It does not demonstrate continuous WAL
archiving, point-in-time recovery, replication, or off-device durability.

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
