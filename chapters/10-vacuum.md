# Reclaim space with vacuum

A table keeps growing after a batch deletes most rows. Distinguish visible rows, reusable space, and the physical file before choosing maintenance.

**You will learn to** explain ordinary vacuum, visibility-map benefits, and why a rewrite is a
separate operation. Prerequisite: MVCC and index-only scans. Run VACUUM cells on their own.

## Remove logical rows

Create a disposable copy so this investigation cannot change the shared fixture. Predict whether
removing most rows immediately returns most file space.

```sql
CREATE TABLE vacuum_demo AS SELECT * FROM orders;
CREATE INDEX vacuum_demo_id ON vacuum_demo (id);
SELECT count(*) AS live_rows,
       pg_relation_size('vacuum_demo') AS heap_bytes FROM vacuum_demo;
DELETE FROM vacuum_demo WHERE id <= 50000;
SELECT count(*) AS live_rows,
       pg_relation_size('vacuum_demo') AS heap_bytes FROM vacuum_demo;
```

DELETE makes rows invisible to later transactions while preserving versions potentially needed by
older snapshots. The count and relation size answer different questions. The size includes storage
that may contain dead tuples or free space.

## Reclaim reusable space

An obsolete version is removable only when relevant transactions no longer need it. Predict whether
ordinary VACUUM must rewrite the table to pack every remaining row together.

```sql
VACUUM (ANALYZE) vacuum_demo;
```

```sql
SELECT count(*) AS live_rows,
       pg_relation_size('vacuum_demo') AS heap_bytes FROM vacuum_demo;
```

Ordinary vacuum makes eligible space reusable and updates visibility information. It may truncate
empty pages at the physical end of a relation, but does not generally compact every interior hole.
Here the newest rows remain near the end, so deleting early rows leaves interior space rather than
an empty suffix. File size alone cannot reveal how much interior space is reusable.

## Observe the visibility benefit

Predict whether the index can answer a count over its ID range without fetching heap tuples after
vacuum. Then compare after an update.

```sql
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT count(*) FROM vacuum_demo WHERE id > 59000;
UPDATE vacuum_demo SET total_cents = total_cents + 1 WHERE id > 59000;
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
SELECT count(*) FROM vacuum_demo WHERE id > 59000;
```

An index-only path can use all-visible bits before the update. Updating clears affected visibility
bits, potentially causing heap fetches or another plan choice. Vacuum supports reads as well as
space reuse. Inspect actual heap fetches when the plan exposes them; do not infer them from elapsed time.

## Compare a rewrite

`VACUUM FULL` rewrites a relation into a compact file and requires an exclusive lock. It needs working
space and can block normal use. It is a deliberately separate experiment, not routine advice for a
busy production table.

```sql
VACUUM (FULL, ANALYZE) vacuum_demo;
```

```sql
SELECT count(*) AS live_rows,
       pg_relation_size('vacuum_demo') AS heap_bytes FROM vacuum_demo;
```

Compare the visible count and file size with the previous observations. The row count is preserved;
the fixture's file is generally smaller after compaction. That does not measure lock duration or
available disk headroom on a production server.

## Explain the maintenance choice

<details><summary>Hint</summary>

Ask whether the need is reusable space for future writes, improved visibility metadata, or returning
allocated storage to the filesystem. Those needs do not all require the same operation.

</details>

<details><summary>Worked explanation</summary>

DELETE changes visibility. Ordinary vacuum removes eligible dead versions, helps index-only access,
and makes space available for future writes without a general compaction rewrite. VACUUM FULL can
compact the relation but brings an exclusive lock and extra storage needs. Long transactions can
prevent cleanup even when a dead-row estimate is high. Autovacuum automates ordinary maintenance;
its scheduling and blockers require a real server to investigate.

</details>

## Transfer the idea

Reset and delete the newest rows instead of the oldest. Compare the file size after ordinary vacuum.
Explain why end-of-file truncation makes that layout different. A good answer avoids claiming
ordinary vacuum always shrinks a table or never shrinks one.

**Takeaway:** Space reuse, visibility maintenance, and compaction are separate outcomes.
Next: [keep plans healthy](./maintenance.html).

Primary source: [Routine vacuuming](https://www.postgresql.org/docs/current/routine-vacuuming.html).
