# Browser-first chapters: UX and learning review

## Scope

All eighteen chapters now begin with genuine PostgreSQL SQL in PGlite. Chapters 12–18 retain their
existing independent-session or server-tool investigations as optional, collapsed extensions. The
browser work does not claim to reproduce every extension's behavior. No second PGlite instance is
presented as a competing client or streaming replica of the first.

## Capabilities verified before writing

The installed PGlite 0.5.15 supports transaction/savepoint statements, pg_locks inspection, staged
constraints, ordinary index creation, EXPLAIN buffers and sort memory settings, WAL role/position
functions, dumpDataDir, and loading a data-directory archive into a new instance. The open-transaction
flag was checked with BEGIN and ROLLBACK before using it to guard checkpoint creation.

WAL receive/replay functions return NULL on this non-standby instance. The lesson explains that
result rather than replacing it with synthetic lag. A standalone transaction cannot demonstrate
write skew, and a granted relation lock does not demonstrate a second session waiting.

## UX review

- Browser experiments appear before the server extension. A + server badge means additional optional
  behavior, not a requirement to provision infrastructure before starting.
- Server copy-only panels stay inside a collapsed disclosure. Browser Run buttons never dispatch
  their contents to Docker or a remote backend.
- On-page navigation lists the browser sections and the optional extension entry, without flooding
  the list with every server section. Heading IDs remain unique. Links into a hidden server section
  open the appropriate disclosure before scrolling.
- Recovery controls appear next to the step that needs them. Save, restore, and download are disabled
  while incompatible work is running. Status messages report the actual operation.
- Reset stops the worker, clears checkpoints and output, and preserves SQL edits. Restoring retains
  the checkpoint and SQL edits while clearing outputs. Navigation/reload discard in-page checkpoints.
- Checkpoint archives are downloadable, but this release does not import uploaded archives. They are
  tied to the engine/database format and are not advertised as portable pg_dump archives.
- Initialization, query, and snapshot operations have bounded recovery paths. Reset remains available.

## Learning review

Every new browser investigation has a concrete question, predictions, observed output, an explanation,
a hint, and a transfer task. Each names the additional evidence its server extension supplies.
The recovery exercise captures database files, commits a destructive change, then loads the snapshot
into a fresh worker and engine without replaying the fixture generator. Tests verify both recovered
rows and exclusion of the post-checkpoint marker. Guard tests reject snapshots of open transactions.

Setup for the transaction and lock lessons runs in a separate SQL execution, so a subsequent
ROLLBACK cannot undo their fixtures through an implicit multi-statement transaction.

Query Engine Book links are placed beside the relevant reasoning question and explicitly identify
DuckDB/teaching-engine examples as distinct from PostgreSQL's implementation. Companion reading
opens in a labelled new tab so the temporary experiment state is retained. Linked topics include
plans, top-k sorting, estimate-driven join order, joins/aggregation, file pruning, and spilling.

## Remaining boundaries

Independent-session write skew, contention, concurrent DDL, server-wide workload counters, pg_dump,
streaming replication, and promotion still use real server extensions. Browser snapshots establish
state recovery, not off-device durability, PITR, or a replication protocol. Browser temporary-file
spilling does not measure production disk I/O. A browser-hosted operating-system emulator has not
been implemented or claimed as part of this change.

## Validation evidence

- All 24 pages build; internal links, fragment targets, unique IDs, and full browser lesson structure pass.
- All 20 SQL tests pass, including snapshot restoration, transaction balances, staged validation,
  committed row counts, WAL-position advancement, and capstone result equivalence.
- All 25 Chromium tests pass through the real WASM worker under the Pages subpath.
- After the final rendering and recovery-status refinements, the three focused recovery/extension
  browser checks pass again. Desktop and phone checkpoint-control screenshots were inspected.
- All seven independent-server extension schedules still pass unchanged on real PostgreSQL.

These reviews were performed within one agent session; no independent audit is claimed.
