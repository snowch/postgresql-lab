# Your browser laboratory

Run a query, inspect the result, and learn how to recover before you investigate a plan.

Each investigation opens a fresh, in-memory PostgreSQL database with the same synthetic order table.
The database loads automatically on pages with SQL experiments. Wait for the **Ready** message at the
bottom of the page, then select **Run SQL** or press Ctrl+Enter (⌘+Enter on macOS) in an editor.

## Check your connection

```sql
SELECT version();
SELECT count(*) AS orders, count(DISTINCT tenant_id) AS tenants
FROM orders;
```

The result should identify PostgreSQL and report 60,000 orders across 100 tenants. A tenant is a
customer organization sharing the application's database. These row counts define the fixture;
they are not performance measurements. See [dataset and reproducibility](./dataset.html) for its schema.

## Change one thing

Before running this query, predict how many orders tenant 42 owns. Each tenant has the same count.

```sql
SELECT tenant_id, count(*) AS orders
FROM orders
WHERE tenant_id = 42
GROUP BY tenant_id;
```

Change `42` to another integer between 1 and 100. Check whether the count changes. Then try `101`
and explain why the query returns no rows rather than one row with a zero count.

<details>
<summary>Check your explanation</summary>

Each tenant owns 600 orders. The filter for tenant 101 produces no input rows. With `GROUP BY`, there
is no tenant group to return. A plain `SELECT count(*) FROM orders WHERE tenant_id = 101` returns
one aggregate row containing zero because it has no grouping key.

</details>

## Know what persists

All SQL editors **on the same page share one database**. Run the experiments in order. A new index
created in one editor affects the next editor. **Restore SQL** restores only that editor's original
text; it does not undo database changes.

**Reset database** immediately stops any running query, discards database changes, clears outputs,
and reloads the original fixture. Your edited SQL remains in its editor. To replay a lesson exactly,
restore edited SQL as well. Navigation or a reload starts fresh and discards edits and database changes.
Copy anything you want to keep before leaving the page.

## Read results safely

SQL errors appear beneath the editor. Any open transaction is rolled back after an error, so later
experiments can run. Correct the statement and retry, or reset if your schema has changed.

The output shows up to 100 rows per result. Use aggregates or `LIMIT` when exploring. This display
limit does not limit the work PostgreSQL performs. Queries running longer than 30 seconds stop the
worker; use Reset database to recover. The reset button also stops a query immediately.

The engine and its data files are shipped with the site. No SQL or fixture data is sent to a database
service. The database is temporary, so use this lab for experiments, not durable storage.

## Take the SQL with you

Use **Copy SQL** on an editor or **Download SQL** at the bottom to save all the page's current SQL,
including your edits. Load the [fixture](./dataset.html) into an isolated server database before
running downloaded examples with `psql`. Browser cells accept SQL; they do not implement psql's
backslash commands or a Unix shell.

## Extend a lesson when you need another session

Every chapter has runnable browser SQL. Chapters 12–18 also include an optional, collapsed
server extension. Open it only when you want the additional independent-session or
server-tool experiment. Those copied commands run in a separate Docker/psql database, not the
browser engine. The recovery chapter's checkpoint controls restore the actual in-browser database.

## Begin the investigation

[Read a query plan →](./reading-plans.html). Keep a scratchpad for predictions and explanations;
the lab does not score or save progress.
