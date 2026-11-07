# Understand replication lag

Identify the database's recovery role and inspect real WAL positions in the browser. Then optionally start a primary and standby to investigate actual replay lag.

**You will learn to** distinguish an engine's role, a WAL byte position, and a replica's visible state.
Prerequisites: transactions and recovery. This browser has one database instance; it does not
simulate a second database or claim to stream WAL between workers.

## Browser: identify the role

Predict whether this database is currently replaying another primary's log, and whether receive
and replay positions have meaningful values here.

```sql
SELECT pg_is_in_recovery() AS is_recovering,
       pg_current_wal_lsn() AS current_wal_position,
       pg_last_wal_receive_lsn() AS last_received,
       pg_last_wal_replay_lsn() AS last_replayed;
```

The embedded instance is not a streaming standby. A false recovery flag and NULL receive/replay
positions are real observations, not an error to replace with invented lag values. They identify
which replication questions this particular process can answer.

## Browser: compare byte positions

An **LSN**, log sequence number, is a position in the write-ahead log, not a timestamp. Capture a
position, make a committed change, and inspect the distance to the current position.

```sql
CREATE TABLE wal_observation (id integer PRIMARY KEY, captured pg_lsn NOT NULL);
INSERT INTO wal_observation VALUES (1, pg_current_wal_insert_lsn());
CREATE TABLE wal_payload (id integer PRIMARY KEY, note text);
INSERT INTO wal_payload SELECT g, repeat('logged change ', 20) FROM generate_series(1, 1000) g;
```

```sql
SELECT captured, pg_current_wal_insert_lsn() AS current_insert_position,
       pg_wal_lsn_diff(pg_current_wal_insert_lsn(), captured) AS wal_bytes_since_capture
FROM wal_observation;
SELECT count(*) AS committed_rows FROM wal_payload;
```

The distance describes WAL position advancement in this instance. It can include catalog and other
engine work, not only payload bytes. It does not measure network traffic, standby lag in seconds,
or a guarantee that another server has applied anything. Do not convert the number directly into
replication delay.

## Explain the browser evidence

<details><summary>Hint: identify the missing observation</summary>

A primary's insertion position and a standby's replay position come from different participants.
This page has only one participant until you start the optional server extension.

</details>

<details><summary>Worked explanation</summary>

The role functions show a non-standby instance with no received/replayed upstream positions.
Committed work advances its WAL insertion position, and pg_wal_lsn_diff compares byte positions.
That is useful preparation for inspecting a real primary and standby, but it is not a replication
experiment. The server extension supplies the missing second process and measures paused and resumed replay.

</details>

## Transfer the idea

Write down the observations needed to answer: has my order committed, has its WAL arrived on a
standby, and has that standby replayed it? Explain why a NULL receive position on this browser
instance cannot be interpreted as zero replication lag. Use the optional extension to test those
questions against two genuine server processes.

## Optional server extension

The browser investigation above is complete on its own. Use the [server setup](./server-setup.html)
for the additional behavior below. Its copied commands run in a separate database and do not
change your browser database.

<details class="server-extension" id="server-extension">
<summary>Open the streaming replication and promotion exercise</summary>

A user commits an order on the primary and cannot immediately read it from a replica. Pause replay to separate received WAL from visible state.

**You will learn to** inspect a standby, distinguish WAL receive and replay positions, and explain
promotion's data boundary. Prerequisites: transactions and recovery. Use the [server setup](./server-setup.html),
reset the fixture, and finish open transactions. This exercise starts a second PostgreSQL process
inside the disposable container on port 5433, without publishing that port.

## Seed the primary

```sql-observer
CREATE TABLE lab.replica_marker (id integer PRIMARY KEY, note text);
INSERT INTO lab.replica_marker VALUES (1, 'base backup');
SELECT pg_is_in_recovery() AS is_standby, pg_current_wal_lsn() AS primary_lsn;
```

An **LSN**, log sequence number, identifies a position in PostgreSQL's write-ahead log. WAL describes
changes needed for recovery. A streaming standby receives WAL and replays it against a base backup.
The one-container layout isolates server behavior, not machine-failure resilience.

## Start a standby

The helper refuses to overwrite an existing standby directory. If you have already used this lesson,
run `bash /lab/server/standby.sh stop` inside the container and reset the container before replaying,
or use the documented helper cleanup for this disposable standby only.

```sh
docker compose -f server/compose.yml exec -T -u postgres db bash /lab/server/standby.sh start
docker compose -f server/compose.yml exec -T db psql -X -h 127.0.0.1 -p 5433 -U postgres -d lab -c 'SELECT pg_is_in_recovery(); SELECT * FROM lab.replica_marker;'
```

The script uses `pg_basebackup -R -X stream` to initialize a standby and writes its connection
configuration. The primary must retain or provide the WAL it needs; this small exercise does not
establish a production retention policy or use a replication slot.

## Pause replay, not reception

Pause the standby before changing the primary. The helper command waits until replay is paused;
a pause request alone can precede the actual pause.

```sh
docker compose -f server/compose.yml exec -T -u postgres db bash /lab/server/standby.sh pause
```

```sql-observer
INSERT INTO lab.replica_marker VALUES (2, 'after pause');
SELECT pg_current_wal_lsn() AS committed_position;
SELECT application_name, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
FROM pg_stat_replication;
```

```sh
docker compose -f server/compose.yml exec -T db psql -X -h 127.0.0.1 -p 5433 -U postgres -d lab -c 'SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(), pg_get_wal_replay_pause_state(); SELECT * FROM lab.replica_marker ORDER BY id;'
```

Predict which marker is visible. WAL can arrive while replay is paused, so receive and replay positions
answer different questions. Position differences measure bytes, not a universal time-to-catch-up.
Time-based lag fields can be NULL or describe a sampled past acknowledgement rather than a future guarantee.

## Resume and fence the read

```sh
docker compose -f server/compose.yml exec -T -u postgres db bash /lab/server/standby.sh resume
docker compose -f server/compose.yml exec -T -u postgres db bash /lab/server/standby.sh caught-up
docker compose -f server/compose.yml exec -T db psql -X -h 127.0.0.1 -p 5433 -U postgres -d lab -c 'SELECT * FROM lab.replica_marker ORDER BY id;'
```

The helper captures a primary LSN and polls until the standby replays at least that position, with
a bounded timeout. It is a controlled read fence, not a promise that a replica is always current.
Routing read-after-write requests to the primary is another application strategy; synchronous
replication modes provide different acknowledgement guarantees depending on their configuration.

## Promote deliberately

```sh
docker compose -f server/compose.yml exec -T -u postgres db bash /lab/server/standby.sh promote
docker compose -f server/compose.yml exec -T db psql -X -h 127.0.0.1 -p 5433 -U postgres -d lab -c "SELECT pg_is_in_recovery(); INSERT INTO lab.replica_marker VALUES (3, 'promoted');"
```

After promotion, the standby becomes writable and stops following the original primary. This lab
leaves the old primary running for inspection; it does not demonstrate safe automatic failover.
A production failover must fence the previous primary and route writers consistently to avoid
split-brain. Never send application writes to both divergent primaries.

## Explain the visibility boundary

<details><summary>Hint</summary>

A successful primary commit, a received WAL record, a replayed record, and a promoted writer are
four different states. Name which state the application actually requires.

</details>

<details><summary>Worked explanation</summary>

Marker 2 is committed on the primary but absent from the paused standby's visible data. Receiving
its WAL is insufficient until replay applies it. Waiting for a captured LSN makes this controlled
read observe the required history. Promotion ends following and creates a writable timeline; it
does not by itself fence the old writer or guarantee all acknowledged asynchronous commits arrived.

</details>

## Transfer the idea

Design a read-after-write policy for an order confirmation page. Compare primary routing with waiting
for replay of a known position. State a timeout behavior and what happens during failover. Explain
why a replica cannot serve as protection from an accidental delete that it also replays.

Clean up the disposable secondary process and files after the lesson:

```sh
docker compose -f server/compose.yml exec -T -u postgres db bash /lab/server/standby.sh clean
```

**Takeaway:** Replication has separate transport, replay, consistency, and failover concerns.
Next: [resolve a production incident](./production-incident.html).

Primary source: [Warm standby and streaming replication](https://www.postgresql.org/docs/current/warm-standby.html).

</details>
