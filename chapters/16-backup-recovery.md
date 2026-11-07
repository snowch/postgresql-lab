# Prove you can recover

Save a browser database checkpoint, delete its data, and restore it into a new engine instance. Verify both recovered rows and the later work the checkpoint cannot contain.

**You will learn to** test recovery against a captured state and state its data-loss boundary.
Prerequisite: transaction boundaries. No Docker or account is required. This uses PGlite's supported
data-directory snapshot API, not pg_dump, WAL archiving, or streaming replication.

## Browser: record the recovery point

Run this first. Predict whether a marker committed after your checkpoint will exist after restoration.

```sql
CREATE TABLE browser_recovery_marker (id integer PRIMARY KEY, note text);
INSERT INTO browser_recovery_marker VALUES (1, 'before checkpoint');
SELECT count(*) AS orders, sum(total_cents) AS total_cents FROM orders;
SELECT * FROM browser_recovery_marker ORDER BY id;
```

Write down the count and total, then select **Save checkpoint** below and wait for its confirmation.
The checkpoint captures the actual database files. Its download is optional; restoration uses the
saved in-page checkpoint. Save it after this editor completes, with no transaction left open.

<div class="snapshot-controls" aria-label="Recovery checkpoint">
<p><strong>Recovery checkpoint</strong></p>
<div><button id="save-checkpoint" type="button" disabled>Save checkpoint</button><button id="download-checkpoint" type="button" disabled>Download checkpoint</button><button id="restore-checkpoint" type="button" disabled>Restore checkpoint</button></div>
<p id="checkpoint-status" role="status">No checkpoint saved.</p>
</div>

## Browser: damage the working database

Predict which marker and order count remain after these committed statements. The data is synthetic
and disposable; this is an intentional loss inside your local browser database.

```sql
INSERT INTO browser_recovery_marker VALUES (2, 'after checkpoint');
DELETE FROM browser_recovery_marker WHERE id = 1;
DELETE FROM orders;
SELECT count(*) AS orders FROM orders;
SELECT * FROM browser_recovery_marker ORDER BY id;
```

Select **Restore checkpoint**, then wait for Ready. The lab stops the damaged worker and initializes
a fresh PostgreSQL instance from the saved files. It does not replay the INSERT and DELETE statements
or construct replacement rows from a lesson script. Restoration clears output panels, so keep your
baseline notes for comparison. Your SQL edits remain.

## Browser: verify the restored state

```sql
SELECT count(*) AS orders, sum(total_cents) AS total_cents FROM orders;
SELECT * FROM browser_recovery_marker ORDER BY id;
SELECT indexname FROM pg_indexes WHERE tablename = 'orders' ORDER BY indexname;
```

The original order count and total should match your notes. Marker 1 should return and marker 2
should be absent. The index listing checks another part of the recovered schema. These checks
establish more than a successful restore command, but a real application needs its own integrity
and representative-query checks too.

Saving again replaces the previous in-page checkpoint. Download a checkpoint first if you want to keep it.

The checkpoint belongs to this PGlite version and database format. It is not a portable pg_dump
archive for an arbitrary server. Navigation, reload, or Reset database discards the in-page checkpoint.
Downloading preserves the archive; this lesson does not implement importing uploaded archives.

## Explain the browser evidence

<details><summary>Hint: distinguish restore from replay</summary>

The saved database state predates both the later marker and the accidental delete. Which changes
can a snapshot alone recover, and which newer legitimate work would need another source?

</details>

<details><summary>Worked explanation</summary>

The fresh instance loads the checkpoint, recovering marker 1 and the orders while excluding marker 2.
That shows the captured recovery boundary. It does not selectively undo only the bad DELETE while
preserving every later good change. Snapshots need durable storage and rehearsed restore procedures;
PITR needs a base backup and the required WAL history. The optional server extension uses pg_dump
and an isolated restore database to test a different backup format.

</details>

## Transfer the idea

Restore, add another legitimate marker, and save a new checkpoint. Damage the database again and
predict which markers the newer snapshot contains. Explain the additional evidence needed before
calling this a durable off-device backup strategy.

## Optional server extension

The browser investigation above is complete on its own. Use the [server setup](./server-setup.html)
for the additional behavior below. Its copied commands run in a separate database and do not
change your browser database.

<details class="server-extension" id="server-extension">
<summary>Open the pg_dump and restore server exercise</summary>

An accidental delete removes an important record. Restore a logical backup into a separate database and establish exactly which later changes it cannot contain.

**You will learn to** distinguish a backup artifact from a tested restore, validate recovered data,
and explain logical backup versus point-in-time recovery. Prerequisite: the [server setup](./server-setup.html).
Finish open transactions and reset the fixture first. Terminal panels run at the repository root.

## Create a recovery marker

In observer, create one row whose presence you can verify after restoration. A backup's useful recovery
point is the database snapshot it captures, not the time someone notices the file exists.

```sql-observer
CREATE TABLE lab.recovery_marker (id integer PRIMARY KEY, note text);
INSERT INTO lab.recovery_marker VALUES (1, 'before backup');
SELECT count(*) AS orders, sum(total_cents) AS total_cents FROM lab.orders;
```

Write down the count and sum. Predict whether a transaction committed after the dump snapshot can
appear in this archive.

## Take a logical backup

```sh
docker compose -f server/compose.yml exec -T db pg_dump -U postgres -d lab -Fc -f /tmp/pg-lab-backup.dump
docker compose -f server/compose.yml exec -T db pg_restore --list /tmp/pg-lab-backup.dump
```

`-Fc` creates a custom-format logical archive. It records schema definitions and row data, not a
physical copy of the cluster's page files. Listing it checks that the archive can be read; it does
not prove restoration works. The file lives inside a disposable container's `/tmp`, so this is a
restore exercise, not an off-host backup policy.

## Change and damage the source

```sql-observer
INSERT INTO lab.recovery_marker VALUES (2, 'committed after backup');
DELETE FROM lab.recovery_marker WHERE id = 1;
SELECT * FROM lab.recovery_marker ORDER BY id;
```

The live source now contains only the later marker. Predict which markers a new restored database
will contain. Do not restore over the source to answer that question.

## Restore elsewhere

The `--if-exists` command below resets only the exercise's `lab_restore` database. Close any connections
to that database before replaying the lesson.

```sh
docker compose -f server/compose.yml exec -T db dropdb -U postgres --if-exists lab_restore
docker compose -f server/compose.yml exec -T db createdb -U postgres lab_restore
docker compose -f server/compose.yml exec -T db pg_restore -U postgres -d lab_restore --exit-on-error /tmp/pg-lab-backup.dump
docker compose -f server/compose.yml exec -T db psql -X -U postgres -d lab_restore -c 'SELECT * FROM lab.recovery_marker ORDER BY id; SELECT count(*) AS orders, sum(total_cents) AS total_cents FROM lab.orders;'
```

The restored marker should be ID 1, with no ID 2. The order count and sum should match your recorded
baseline. Check constraints, indexes, roles/privileges, extensions, and representative application
queries before treating a real restore as ready. `pg_dump` is database-scoped; cluster-wide roles
and some other configuration need separate capture and recovery procedures.

## State the recovery boundary

**RPO**, recovery point objective, is the acceptable data-loss window. **RTO**, recovery time objective,
is the acceptable time to restore service. This dump restores one snapshot. It cannot selectively
replay source transactions committed afterward, including the later marker.

Physical base backups plus a complete required WAL sequence can support point-in-time recovery.
That requires a tested archive, retention, recovery target, and isolated restore procedure. This
lesson does not configure continuous archiving or perform PITR. A stream replica alone is not a
substitute: it can faithfully replay the accidental delete too.

## Explain the evidence

<details><summary>Hint</summary>

Separate archive readability, restore execution, restored logical correctness, and application readiness.
A success exit status answers only part of the recovery question.

</details>

<details><summary>Worked explanation</summary>

The logical restore recreates the pre-delete marker and excludes the post-backup marker. Count and
sum give additional checks against the captured fixture. The source remains available for comparison
because recovery used another database. The archive's snapshot bounds recoverable data; a newer
legitimate transaction cannot be recovered from this dump alone. Production recovery also needs
off-host durability, access control, complete dependencies, and rehearsed service validation.

</details>

## Transfer the idea

Write a recovery checklist for an accidental delete discovered an hour after the last dump. Identify
what the dump can recover, what later writes would be missing, and what a WAL-backed strategy would
need to recover a more recent target. Record restore duration as an observation; do not label it a
production RTO without a representative database and environment.

**Takeaway:** A backup is a recovery hypothesis until you restore and verify it.
Next: [understand replication lag](./replication.html).

Primary sources: [SQL dump](https://www.postgresql.org/docs/current/backup-dump.html) and
[continuous archiving](https://www.postgresql.org/docs/current/continuous-archiving.html).

</details>
