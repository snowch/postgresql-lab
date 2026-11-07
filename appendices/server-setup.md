# Your server laboratory

Run the concurrency and operations lessons against a disposable PostgreSQL server with independent sessions.

The browser remains useful for plans and storage experiments. Chapters 12–18 use real server processes
because one embedded connection cannot reproduce blocking, independent snapshots, or replication.
Their code panels have **Copy**, not a browser Run button. No remote database is connected to this site.

## Start the isolated server

Install Docker with Compose, clone this repository, and run these commands from its root in a terminal.
The image uses PostgreSQL 17. Its major version is fixed; record `SELECT version()` when comparing
results because image patch releases can change. The service has no published network ports.

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

In the second, change `lab-a` to `lab-b`; in the third, use `lab-observer`. Each invocation creates an
independent connection. In each psql session, run:

```sql-server
SET search_path = lab, public;
SELECT current_database(), current_schema(), pg_backend_pid(), version();
```

A panel labelled **Session a** goes into terminal A, **Session b** into B, and **Session observer**
into the third terminal. Run panels in page order. A panel marked **leave running** deliberately
blocks; move to the next terminal without waiting. The lesson names the statement that releases it.

`BEGIN` opens a transaction; `COMMIT` saves it; `ROLLBACK` abandons it. After an expected SQL error,
use the shown rollback before continuing. Ctrl+C cancels a waiting statement in psql. `\q` exits the
client. Exiting with an open transaction rolls it back.

## Reconnect and reset between lessons

Finish or roll back both working sessions before resetting the fixture. Otherwise their locks can
block reset. Chapter-specific tables use different names, but replaying CREATE statements on a
previously used page can still conflict. Reset and reopen sessions for an exact replay.

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
