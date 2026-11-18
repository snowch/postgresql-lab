# Your server laboratory

Extend the browser lessons with a disposable PostgreSQL server and independent sessions.

Chapters 12–18 have a named disclosure under **Optional server extension**. Open it to find
the commands for independent sessions, server diagnostics, logical backup, or replication.
Select **Copy** on a panel and paste it into the session on its label. The Docker database is
separate from your browser database.

## Start the isolated server

Install Docker with Compose. In a terminal, run the panel below to clone the repository, enter
it, and start and populate the lab database. The image uses PostgreSQL 17. Record
`SELECT version()` when comparing results across setups because patch releases can change. The service has no published network ports.

```sh
git clone https://github.com/snowch/postgresql-lab.git
cd postgresql-lab
docker compose -f server/compose.yml up -d --wait
docker compose -f server/compose.yml exec -T db psql -U postgres -d lab -f /lab/server/reset.sql
```

The fixture lives in the `lab` schema, separate from `public`. Reset drops only that teaching
schema and recreates it, including its 60,000 orders. It discards your exercises. It does not reset
extension-wide statistics or remove restore databases and standby files created in later lessons.

The container uses trust authentication for this local, disposable exercise. Do not expose it on a
network or reuse this configuration for an application. Ordinary database commands run as a lab
superuser so the operations lessons can inspect statistics and create backups.

## Open three sessions

Open three terminals at the repository root. In the first, run:

```sh
docker compose -f server/compose.yml exec -e PGAPPNAME=lab-a db psql -X -U postgres -d lab
```

Copy the same command into the second terminal and replace `lab-a` with `lab-b`. In the third
terminal, replace `lab-a` with `lab-observer`. Each invocation creates an
independent connection. In each psql session, run:

```sql-server
SET search_path = lab, public;
SELECT current_database(), current_schema(), pg_backend_pid(), version();
```

Check that `current_schema` is `lab` and each `pg_backend_pid` differs. Run each chapter's
panels in page order. Use terminal A for **Session A**, terminal B for **Session B**, and the
third terminal for **Observer session**. If a panel says **leave running**, move to the next
terminal while the statement waits. The lesson names the statement that releases it.

`BEGIN` opens a transaction; `COMMIT` saves it; `ROLLBACK` abandons it. After an expected SQL error,
use the shown rollback before continuing. Ctrl+C cancels a waiting statement in psql. `\q` exits the
client. Exiting with an open transaction rolls it back.

## Reconnect and reset between lessons

Finish or roll back open transactions and exit the psql sessions before resetting. From the
repository root, run the last command in [Start the isolated server](#start-the-isolated-server)
to recreate the teaching schema. Reopen the named sessions and set their search path again.

## Stop and clean up

```sh
docker compose -f server/compose.yml down
```

The named volume retains the primary database. To discard that lab volume too, use `down --volumes`
when you have finished with your exercises. Standby and dump files under the container's `/tmp` are
not durable backups and disappear when the container is removed.

## Automated verification

With Node 24 and dependencies installed, `npm run test:server` starts this Compose project, resets
the teaching schema, executes published server-session schedules, and verifies logical restore and
streaming replication. It changes only the isolated lab service. It leaves the service running for
inspection; use the stop command afterward. Review [the test](https://github.com/snowch/postgresql-lab/blob/main/tests/server.mjs)
for the exact assertions and expected errors.

Begin with [choose an isolation level](./transactions.html).
