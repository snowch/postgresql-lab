# Make invalid data impossible

Two application paths disagree about whether an order may have a negative total. Encode the rule where every writer must obey it.

**You will learn to** use checks, uniqueness, and foreign keys, reason about NULL, and distinguish
statement-time checks from deferred validation. Prerequisite: basic DDL and transactions.
This page creates small teaching tables beside the shared fixture.

## Put the invariant in the schema

An **invariant** is a condition that must remain true after valid changes. A CHECK rejects a row
when its expression is false. Predict whether a missing amount makes the following check false.

```sql
CREATE TABLE payments (
  id integer PRIMARY KEY,
  external_ref text UNIQUE,
  amount integer CHECK (amount >= 0)
);
INSERT INTO payments VALUES (1, NULL, NULL), (2, NULL, 100);
SELECT * FROM payments ORDER BY id;
```

Both rows are accepted. SQL has an unknown truth value for comparisons involving NULL; a CHECK
accepts true or unknown. Ordinary UNIQUE also allows multiple NULL values by default. Missing data
and invalid data need separate rules.

## Observe a rejected statement

For this exercise, a temporary helper executes a statement and returns its error as a query result.
The exception block rolls back that attempted statement. This makes failures visible without stopping
the lesson; catching every error is not a production validation strategy.

```sql
CREATE FUNCTION pg_temp.attempt(command text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE command;
  RETURN 'accepted';
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE || ': ' || SQLERRM;
END;
$$;
SELECT pg_temp.attempt('INSERT INTO payments VALUES (3, ''bad'', -1)') AS result;
SELECT count(*) AS saved_rows FROM payments;
```

Predict which existing row prevents adding NOT NULL. Repair that row and apply the stronger rule.

```sql
SELECT pg_temp.attempt('ALTER TABLE payments ALTER COLUMN amount SET NOT NULL') AS result;
UPDATE payments SET amount = 0 WHERE amount IS NULL;
ALTER TABLE payments ALTER COLUMN amount SET NOT NULL;
SELECT pg_temp.attempt('INSERT INTO payments VALUES (3, ''missing'', NULL)') AS result;
```

Check the returned error and verify the intended row was not stored. A CHECK plus NOT NULL expresses
the two parts of the amount invariant. If missing references should conflict too, PostgreSQL supports
`UNIQUE NULLS NOT DISTINCT`; choose that behavior explicitly instead of assuming all uniqueness works alike.

## Protect relationships

A **foreign key** requires a non-NULL reference to match a referenced unique key. Predict whether a
payment can refer to an account that does not exist yet.

```sql
CREATE TABLE billing_accounts (id integer PRIMARY KEY);
ALTER TABLE payments ADD COLUMN account_id integer;
ALTER TABLE payments ADD CONSTRAINT payments_account_fk
FOREIGN KEY (account_id) REFERENCES billing_accounts(id)
DEFERRABLE INITIALLY DEFERRED;
BEGIN;
INSERT INTO payments VALUES (3, 'deferred', 200, 9);
INSERT INTO billing_accounts VALUES (9);
COMMIT;
SELECT * FROM payments WHERE id = 3;
```

The transaction temporarily contains an unresolved reference. Because this constraint is deferred,
PostgreSQL checks it at commit, after the account exists. Deferral does not waive the rule. A
nondeferrable constraint would reject the insert immediately. `SET CONSTRAINTS ... IMMEDIATE` can
bring a deferred check forward within a transaction.

## Define deletion behavior

The default reference action prevents deleting a referenced account. Predict the error rather than
assuming the application can silently orphan the payment.

The helper catches statement errors, while an initially deferred foreign key can fail only when the
surrounding execution commits. Make this foreign key immediate by default before testing the delete,
so the helper can return that statement's error. Changing validation timing does not change the rule.

```sql
ALTER TABLE payments ALTER CONSTRAINT payments_account_fk INITIALLY IMMEDIATE;
SELECT pg_temp.attempt('DELETE FROM billing_accounts WHERE id = 9') AS result;
SELECT count(*) AS accounts_remaining FROM billing_accounts;
```

Choose `ON DELETE CASCADE` only when deleting the parent should delete its children. A foreign key
also does not automatically create an index on its referencing columns; check parent-delete and
join workloads separately before adding one.

## Explain the rule

Why did the first NULL amount pass? Why could the deferred insert refer to account 9 before it
existed? Which rule determines whether deleting an account deletes its payments?

<details><summary>Hint</summary>

Separate the truth value of a check, the timing of validation, and the action chosen for deletion.

</details>

<details><summary>Worked explanation</summary>

A NULL comparison is unknown, so the CHECK does not reject it. NOT NULL closes that gap. The deferred
foreign key permits temporary inconsistency inside the transaction, but the committed state must
contain the account. Deletion behavior comes from the declared foreign-key action; default protection
and cascading deletion encode different business rules.

</details>

## Transfer the idea

Model a reservation with a start and end timestamp. Express nonempty duration and required values.
Then explain why preventing overlapping reservations for the same resource needs more than that
row-local CHECK. Investigate a range type and an exclusion constraint for the cross-row rule.

**Takeaway:** A constraint states what must be true and when PostgreSQL must verify it.
Next: [work with sets and windows](./advanced-sql.html).

Primary sources: [Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html) and
[SET CONSTRAINTS](https://www.postgresql.org/docs/current/sql-set-constraints.html).
