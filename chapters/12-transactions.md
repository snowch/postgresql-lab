# Choose an isolation level

Two doctors each see someone else on call and both leave. Reproduce the anomaly with independent snapshots, then prevent the invalid committed state.

**You will learn to** reproduce write skew, distinguish Repeatable Read from Serializable, and define
a complete retry boundary. Prerequisites: transactions and MVCC. Use the [server setup](./server-setup.html),
reset the fixture, and open sessions A, B, and observer. These panels run in psql, not in the browser.

## State the invariant

At least one doctor must remain on call. Each request checks the roster before updating its own row.
Predict whether two updates to different rows must block each other.

```sql-observer
CREATE TABLE lab.on_call (name text PRIMARY KEY, available boolean NOT NULL);
INSERT INTO lab.on_call VALUES ('alice', true), ('bob', true);
```

## Interleave two snapshots

Repeatable Read uses a stable transaction snapshot after the transaction takes its first snapshot.
Run A's read, then B's read, before either writes.

```sql-a
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) AS available FROM lab.on_call WHERE available;
```

```sql-b
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) AS available FROM lab.on_call WHERE available;
```

Both requests see two available doctors. Predict the final roster if each decides it is safe to leave.

```sql-a
UPDATE lab.on_call SET available = false WHERE name = 'alice';
COMMIT;
```

```sql-b
UPDATE lab.on_call SET available = false WHERE name = 'bob';
COMMIT;
```

```sql-observer
SELECT * FROM lab.on_call ORDER BY name;
SELECT count(*) AS remaining FROM lab.on_call WHERE available;
UPDATE lab.on_call SET available = true;
```

Both commits can succeed because the transactions changed different rows. The combined result breaks
a rule each transaction checked. This is **write skew**. A stable snapshot alone does not serialize
decisions about a set of rows. A row-local CHECK cannot express this cross-row invariant either.

## Require a serializable result

Serializable tracks dependencies between reads and writes and can abort a transaction when the
execution cannot safely appear as a serial order. Predict where the second schedule fails.

```sql-a
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) AS available FROM lab.on_call WHERE available;
```

```sql-b
BEGIN ISOLATION LEVEL SERIALIZABLE;
SELECT count(*) AS available FROM lab.on_call WHERE available;
```

```sql-a
UPDATE lab.on_call SET available = false WHERE name = 'alice';
COMMIT;
```

The next panel deliberately raises SQLSTATE `40001`, a serialization failure, on this controlled
schedule. In a less controlled schedule, failure can occur at another statement or at commit.

```sql-b
-- expect-error: 40001
UPDATE lab.on_call SET available = false WHERE name = 'bob';
```

```sql-b
ROLLBACK;
BEGIN ISOLATION LEVEL SERIALIZABLE;
UPDATE lab.on_call SET available = false
WHERE name = 'bob'
  AND (SELECT count(*) FROM lab.on_call WHERE available) > 1;
COMMIT;
```

```sql-observer
SELECT * FROM lab.on_call ORDER BY name;
SELECT count(*) AS remaining FROM lab.on_call WHERE available;
```

The retry takes a new snapshot and reevaluates whether it may remove Bob. The conditional update
changes no row when only Bob remains. Retrying only the failed UPDATE using an old decision would
not be a complete transaction retry. External effects such as sending a message also need a strategy
that does not duplicate them when the transaction is retried.

## Explain the protection

<details><summary>Hint</summary>

Different written rows do not imply independent decisions. Identify what each transaction read that
the other transaction changed.

</details>

<details><summary>Worked explanation</summary>

Each request read the other's availability and then changed its own row. Repeatable Read preserved
each local view but allowed both decisions to commit. Serializable rejects an unsafe dependency
pattern. Retrying the whole transaction with a fresh read lets the application decide not to remove
the last doctor. All writers participating in the invariant need compatible protection; mixing an
unprotected writer into the system can invalidate the design.

</details>

## Transfer the idea

Model an inventory reservation that reads multiple stock rows. Compare Serializable with locking a
single invariant-owner row before checking availability. Explain the lock ordering, retry policy,
and which writers must follow the protocol. Do not describe an isolated row lock as protection for
arbitrary unseen rows.

**Takeaway:** Isolation protects transaction decisions, and retry logic is part of the design.
Next: [investigate a blocked checkout](./locks.html).

Primary source: [Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).
