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

- Browser experiments appear before the optional server extension. The menu explains once that all
  chapters run in the browser and that server exercises extend chapters 12–18.
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

## Navigation wording follow-up

The + server badges appeared on chapters containing substantial browser exercises and did not
clearly communicate that the server content was optional. The UX review removes those per-chapter badges and uses one explanatory menu footer.
The genuine server setup reference retains its Server label. The learning review keeps the page's
browser-first label and the explicit optional extension boundary. No exercise behavior changes.

The existing responsive navigation and hybrid-extension browser checks passed, all 24 pages and
links were checked, and open phone and desktop menus were inspected. The existing full CI checks
remain required before Pages deployment.

## Query-plan transfer and editor recovery

Applied the learning-design and UX reviews to the query-plan transfer and the
shared browser workbench. The transfer names the measured query and keeps its
tenant and limit fixed. It asks the learner to record the scan type and
filter rejections before changing the sort key. A Chromium run against the
synthetic fixture observed a sequential scan before the edit and a backward
primary-key index scan after it. The exercise asks learners to inspect their own
plan. [PostgreSQL EXPLAIN documentation](https://www.postgresql.org/docs/current/using-explain.html)

The database status and tools precede the first editor. Each cell shows the
reason for waiting beside Run SQL. Keyboard activation keeps focus at the cell,
and a SQL error appears separately from the last successful result. A visible
note identifies results produced by earlier SQL or before later database
activity. Query plans have a plan label, so the number of displayed plan lines
cannot be confused with a query's returned rows.

Recover edit brings back the last replaced SQL in that editor for the current
page. Reset database keeps edited SQL and its recovery copy while rebuilding
the fixture. Copy SQL and Download SQL remain the portable options. Phone and
desktop Chromium walkthroughs exercised the original and edited plan, readiness,
keyboard focus, error and plan retention, SQL recovery after database reset,
and download. These are functional and author checks. Learning effectiveness
remains unmeasured.

## Full wording and interface review

This pass started at `382271d`. It covered all 24 learner routes, the shared editor, and seven
optional real-server extensions. The opening pass read headings, explanatory prose, prompts,
examples, controls, and feedback in lesson order. The baseline learner knows `SELECT`, `WHERE`,
`ORDER BY`, and basic table and index definitions. Chapter prerequisites cover later topics.
The opening findings included unclear differences between automatic state and fixture DDL,
transfer questions without runnable edits, server evidence described as browser activity, and
a checkpoint error that rolled back the transaction it asked the learner to finish. Retrying
unchanged SQL could also leave a prior result labelled as a successful execution with no note
about the failure. Earlier reviews in this document covered narrower tasks.

The closing pass reread the intended learner progression from its normal entry points with optional
sections closed. The table records the main clarity changes and the evidence checked for each route.

| Route | Wording, progression, and evidence |
| --- | --- |
| Home | Prerequisites and browser onboarding precede the chapter map. The curriculum separates browser chapters from additional Docker exercises. |
| Getting started | SQL 01 verifies the version, 60,000 orders, and 100 tenants. In SQL 02, tenant 43 has 600 orders and tenant 101 returns zero rows. Reset, Restore SQL, Recover edit, navigation, and Download SQL have distinct descriptions. |
| Read a query plan | Order rows, estimated plan, and measured plan have separate jobs. The unchanged query and sort-key edit compare the scan type and filter rejections. |
| Design for the query | The baseline names the scan, removed rows, and sort. The new pending-order predicate and partial index test whether the sort disappears. A separate vacuum editor supports the covering-index comparison. |
| Diagnose an estimate | Actual rows and estimated scan rows support the compatible and contradictory cases. The transfer is a design question about applying the comparison to another pair of columns. |
| Pay for your indexes | The partial and full status indexes have named size and membership evidence. The editable tenant-first partial index compares tenant and global query plans and storage. |
| Make invalid data impossible | The temporary helper's messages and surviving rows distinguish expected violations from editor errors. The reservation transfer distinguishes an empty interval from a missing start. |
| Work with sets and windows | The join, event-count results, and two window totals make row multiplicity visible. Adding a fifth order changes the row table and leaves the event-qualified total at 300. |
| Give JSONB a job | JSON value and extracted text have separate type fields. The transfer uses the editor to classify missing, explicit JSON null, and numeric zero. |
| Divide a growing table | The table name identifies routing and plan pruning. Detach preserves the child-table count. A March boundary insert and plan check the new partition. |
| Follow a row version | ID, tuple location, and value have distinct roles. Adding a note index and changing a note preserves ID 1 and changes the tuple location. Asynchronous HOT counters have no required value. |
| Reclaim space with vacuum | Live row counts, heap bytes, and heap fetches test different questions. Replaying with the newest rows deleted retains 10,000 rows and tests end-of-file truncation. |
| Keep plans healthy | Tenant 999's actual rows and the most-common-values summary connect the batch and targeted ANALYZE. The transfer compares this evidence with the correlated-filter chapter. |
| Choose an isolation level | The account fixture is committed only after SQL 01 runs. An intentional insufficient-balance error leaves balances 80 and 120. The Docker extension verifies write skew, serialization failure, and full transaction retry. |
| Investigate a blocked checkout | This connection acquires and releases real lock modes. The transfer acquires AccessShareLock and observes zero matching locks after rollback. The Docker extension identifies B's blocker by PID and bounds a wait. |
| Change a busy database | The browser separates new-write enforcement, backfill, and catalog validation. The Docker sequence verifies a held reader, bounded ALTER wait, and valid concurrent index. The transfer asks learners to plan a rollout. |
| Find the expensive workload | Scan rows, sort method, and temporary work stay separate. The 64 kB LIMIT edit produces a top-N sort and still reads the order fixture. The Docker extension checks cumulative calls and sampled activity. |
| Prove you can recover | Checkpoint controls link from the damage step. Restore brings back the baseline markers and order total, then a second checkpoint tests marker 3. A rejected save preserves both the transaction and the previous checkpoint. The server extension restores a logical dump separately. |
| Understand replication lag | The role and WAL position fields describe a single instance. The transfer asks which standby evidence is missing. The Docker extension checks received and replayed WAL, catches up, and promotes. |
| Resolve a production incident | The browser case independently tests estimates, access, and equivalent endpoint results. Removing LIMIT exposes all 15,000 matches. The Docker case verifies blocking and report work independently. |
| Server setup | Copy labels name the terminal or psql session. Setup identifies the teaching schema and distinct backend PIDs, and exact replay closes sessions and reloads the fixture. |
| Dataset | The table inputs and fixed settings define a repeatable synthetic fixture. Real timings can vary with engine and host. |
| Plan vocabulary | Definitions link back to the query-plan output and distinguish PostgreSQL buffer activity from physical I/O. |
| Runtime boundaries | Single-connection behavior, snapshot scope, server features, and result limits have separate descriptions. |

The page now states what is seeded and what the numbered editors do. Chapter contents and worked
answers are optional. Visible instructions name the action and output needed for each experiment.
Run SQL is the primary action. Plans and returned rows have distinct labels. Provenance notes
appear when the edited text, a subsequent execution, or a failed attempt makes them useful.
Previous results, existing SQL editing and recovery behavior, saved checkpoints, exports, and
published anchors remain available.

### Functional verification

- `npm run check` verifies 24 generated routes and local links and runs the 20 native PGlite tests.
- `npm run test:browser` runs each original editor in Chromium through the Pages subpath and
  follows the concrete edited transfers. It also checks the intentional SQL error, same-source
  failure, checkpoint guard, restore, edited-text recovery, keyboard focus, and navigation.
- Browser widths include 320, 390, 820, 1024, and 1280 CSS pixels. Both system color preferences
  were tested at 320 pixels. The lab uses its existing light palette under both preferences.
- `npm run test:server` runs the published seven server schedules on PostgreSQL 17.12 in a
  disposable Docker Compose project. The repository-only bind mount was readable by the
  container's postgres user.
- The runtime verification and author walkthrough establish that these actions work and return the
  reported evidence. No observation of learner understanding was collected.
