# Choose an isolation level

A failed request must leave balances unchanged. Test atomicity and savepoints in this browser, then optionally investigate independent snapshots on a server.

**You will learn to** distinguish commit, rollback, and partial rollback, and explain what a single
connection reveals about transactions. Prerequisites: MVCC and basic transactions.

## Browser: make the change atomic

A transfer moves money between two accounts. Predict what remains after both updates are rolled back.
A **transaction** groups statements so their changes commit together or are abandoned together.

```sql
CREATE TABLE transfer_accounts (id integer PRIMARY KEY, balance integer NOT NULL CHECK (balance >= 0));
INSERT INTO transfer_accounts VALUES (1, 100), (2, 100);
```

Once SQL 01 finishes, the two initial balances are committed. Select **Run SQL** in SQL 02
to test a rollback that affects only the transfer.

```sql
BEGIN;
UPDATE transfer_accounts SET balance = balance - 30 WHERE id = 1;
UPDATE transfer_accounts SET balance = balance + 30 WHERE id = 2;
SELECT * FROM transfer_accounts ORDER BY id;
ROLLBACK;
SELECT * FROM transfer_accounts ORDER BY id;
```

Compare `balance` for each `id` in the two tables. The first SELECT reads the transfer's uncommitted
changes on this connection. After ROLLBACK, the second SELECT shows the original balances.

## Browser: recover to a savepoint

A **savepoint** marks a point inside a transaction to which you can roll back without abandoning
its earlier work. Predict which update survives the following sequence.

```sql
BEGIN;
UPDATE transfer_accounts SET balance = balance - 20 WHERE id = 1;
SAVEPOINT before_credit;
UPDATE transfer_accounts SET balance = balance + 200 WHERE id = 2;
ROLLBACK TO SAVEPOINT before_credit;
UPDATE transfer_accounts SET balance = balance + 20 WHERE id = 2;
COMMIT;
SELECT * FROM transfer_accounts ORDER BY id;
SELECT sum(balance) AS total_balance FROM transfer_accounts;
```

The incorrect credit is undone, while the debit before the savepoint remains and the corrected
credit commits. Verify `balance` for IDs 1 and 2 and the preserved `total_balance`. Total alone would not
prove the money reached the intended account.

## Browser: identify the isolation boundary

```sql
SHOW transaction_isolation;
BEGIN ISOLATION LEVEL REPEATABLE READ;
SHOW transaction_isolation;
ROLLBACK;
```

Selecting an isolation level is real SQL, but one connection cannot interleave independent
transactions. Two PGlite instances have separate databases, so they do not reproduce two writers
contending for the same rows. The extension below uses a real shared server for that experiment.

## Explain the browser evidence

Which results prove that a full rollback undoes both changes? Which show that a savepoint keeps
the earlier debit?

<details><summary>Hint: trace the rollback boundary</summary>

Mark the start of the transaction, the savepoint, and the commit. Ask which version each SELECT can
see on this connection before reasoning about any other session.

</details>

<details><summary>Worked explanation</summary>

Full rollback abandons both transfer updates. Rolling back to the savepoint abandons only the
incorrect credit; the earlier debit remains, and the corrected credit can commit with it. These
results establish transaction boundaries and read-your-own-writes behavior. They do not establish
protection against concurrent write skew. That requires the independent-session schedule below.

</details>

## Transfer the idea

After the original experiments, replace `balance - 30` with `balance - 101` in
[SQL 02](#sql-2) and select **Run SQL**. Account 1 now has 80, so its debit should trigger the
nonnegative balance check. Read the SQL error. If an earlier successful result is still shown,
it describes that earlier execution.

Replace the same editor with `SELECT id, balance FROM transfer_accounts ORDER BY id;` and
run it again. Check for balances 80 and 120. Why must a retry read the current balances again?

## Optional server extension

To run this extension, follow [server setup](./server-setup.html). Copy each panel to the
labelled terminal or psql session. These commands use the Docker database.

<details class="server-extension" id="server-extension">
<summary>Test write skew with independent transactions</summary>

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

A snapshot determines which committed row versions a transaction can see. In Repeatable Read,
that view stays stable from the first query. Run the Session A and Session B read panels in
order before either session writes.

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

In the Observer result, check how many rows have `available = true`. Both commits can succeed
because the transactions changed different rows. The combined result breaks
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

The next Session B panel should report that PostgreSQL could not serialize the transaction.
This error has SQLSTATE `40001`. In another schedule it could appear at a different statement or at commit.

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

<details><summary>A hint for explaining the server results</summary>

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

Next: [investigate a blocked checkout](./locks.html).

Primary source: [Transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

</details>
