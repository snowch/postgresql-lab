# Follow a row version

An UPDATE changes the value an application sees, but it also changes the row's physical identity. Follow that difference before explaining vacuum.

**You will learn to** distinguish logical identity from tuple location, connect updates to visibility,
and understand the conditions behind HOT updates. Prerequisite: transactions and indexes.
This single-connection investigation observes row versions indirectly; independent snapshots follow
in [the isolation lesson](./transactions.html).

## Separate identity from location

PostgreSQL's **multiversion concurrency control**, or MVCC, lets transactions see appropriate row
versions. The `ctid` system column locates a tuple version by page and item position. It is not a
stable application identifier.

```sql
CREATE TABLE version_demo (
  id integer PRIMARY KEY, balance integer, note text
) WITH (fillfactor = 70);
INSERT INTO version_demo SELECT g, 100, 'new' FROM generate_series(1, 500) g;
SELECT id, ctid, xmin, xmax, balance FROM version_demo WHERE id = 1;
```

`xmin` identifies the inserting transaction of a tuple version. `xmax` participates in deletion,
update, and locking information and needs interpretation with tuple status flags; treating every
nonzero value as a committed delete is wrong. Neither is a permanent audit field.

## Observe the update

Predict whether the primary key changes, whether the tuple location changes, and whether a normal
SELECT returns both old and new versions.

```sql
UPDATE version_demo SET balance = balance + 50 WHERE id = 1;
SELECT id, ctid, xmin, xmax, balance FROM version_demo WHERE id = 1;
SELECT count(*) AS visible_rows FROM version_demo;
```

The key remains the same while the visible version's location changes. An ordinary query applies
transaction visibility rules; it is not a listing of all physical versions. The old version may still
occupy storage until no relevant snapshot needs it. A later update, vacuum, or rewrite can move or
remove tuples, so save the primary key rather than `ctid` in application references.

## Give HOT an opportunity

A **heap-only tuple update**, or HOT update, can avoid new entries in ordinary indexes when relevant
indexed values do not change and the new tuple fits on the same page. Fillfactor leaves room on
pages during insertion; it does not guarantee every future update will qualify.

```sql
UPDATE version_demo SET note = 'changed without an indexed key' WHERE id <= 100;
SELECT relname, n_tup_upd, n_tup_hot_upd, n_dead_tup
FROM pg_stat_user_tables WHERE relname = 'version_demo';
CREATE INDEX version_balance ON version_demo (balance);
UPDATE version_demo SET balance = balance + 1 WHERE id <= 100;
SELECT id, ctid, balance FROM version_demo WHERE id IN (1, 100, 101) ORDER BY id;
```

The first update changes a non-indexed value. The later balance update changes an indexed value,
so it cannot use the same ordinary HOT opportunity. Statistics counters are asynchronous estimates
and may not update immediately in this embedded runtime; a zero counter is not proof no update ran.
Use the resulting values and documented HOT conditions here. A server offers richer cumulative
statistics, page inspection, and independent sessions for deeper verification.

## Clean up without deleting logical rows

Predict whether vacuum changes the visible row count or reverses the balance update.

```sql
VACUUM (ANALYZE) version_demo;
```

```sql
SELECT count(*) AS visible_rows, sum(balance) AS total_balance FROM version_demo;
SELECT pg_size_pretty(pg_relation_size('version_demo')) AS heap_size;
```

Vacuum can reclaim obsolete versions when visibility permits. It does not undo committed business
updates. Page space can become reusable without shrinking the relation file.

## Explain the evidence

<details><summary>Hint</summary>

A primary key identifies the logical entity. A tuple address identifies a particular stored version.
Normal SELECT output is filtered by visibility, not by whether bytes still exist.

</details>

<details><summary>Worked explanation</summary>

The update preserved ID 1 but produced a new visible tuple location and value. Only one version per
logical row is visible to the ordinary statements used here. HOT depends on indexed attributes and
same-page space; it is an optimization within the versioning system. Vacuum removes eligible old
versions and leaves the current logical rows intact. These observations do not reproduce two
concurrent snapshots or measure production bloat.

</details>

## Transfer the idea

Add an index on `note`, then repeat a note update. Predict which HOT condition has changed. Explain
why reducing the number of indexes can affect writes even when the updated application's key never changes.

**Takeaway:** Logical updates create physical version-management work.
Next: [reclaim space with vacuum](./vacuum.html).

Primary sources: [System columns](https://www.postgresql.org/docs/current/ddl-system-columns.html),
[MVCC](https://www.postgresql.org/docs/current/mvcc.html), and
[HOT](https://www.postgresql.org/docs/current/storage-hot.html).
