# Prove you can recover

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
