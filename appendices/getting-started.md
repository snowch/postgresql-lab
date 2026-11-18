# Your browser laboratory

Run a query, inspect the result, and learn how to recover before you investigate a plan.

Each investigation opens a fresh, in-memory PostgreSQL database with the same synthetic order table.
The database loads automatically on pages with SQL experiments. The database status appears
above the first editor. When **Run SQL** becomes available, select it or press Ctrl+Enter
(⌘+Enter on macOS) in an editor.

## Check your connection

```sql
SELECT version();
SELECT count(*) AS orders, count(DISTINCT tenant_id) AS tenants
FROM orders;
```

In SQL 01, select **Run SQL** and look for the PostgreSQL version, `orders = 60000`, and
`tenants = 100`. A tenant is a customer organization sharing the application's database. The
[dataset reference](./dataset.html) describes how the synthetic orders are generated.

## Change one thing

Before running this query, predict how many orders tenant 42 owns. Each tenant has the same count.

```sql
SELECT tenant_id, count(*) AS orders
FROM orders
WHERE tenant_id = 42
GROUP BY tenant_id;
```

Run SQL 02 as written and record `orders`. In that editor, change `42` to `43` and select
**Run SQL**. Compare `tenant_id` and `orders`. Then change `43` to `101` and run again.
Why does the result say **0 rows returned** instead of showing an `orders` value of zero?

<details>
<summary>Check your explanation</summary>

Each tenant owns 600 orders. The filter for tenant 101 produces no input rows. With `GROUP BY`, there
is no tenant group to return. A plain `SELECT count(*) FROM orders WHERE tenant_id = 101` returns
one aggregate row containing zero because it has no grouping key.

</details>

## Know what persists

All SQL editors **on the same page share one database**. Run the experiments in order. A new index
created in one editor affects the next editor. **Restore SQL** replaces that editor's text with the
published SQL. **Recover edit** brings back the last replaced text on this page. These controls
edit SQL text. Use **Reset database** to recreate the original database.

**Reset database** stops a running query, clears outputs and database changes, and loads the
original order dataset. It keeps the SQL in your editors. To replay a lesson as published, also
select **Restore SQL** in every editor you changed. Navigation or reload clears edits and database
changes. Use **Download SQL** to keep your work before leaving.

## Read results safely

SQL errors appear below **Run SQL** and roll back any open transaction. The execution note identifies
any earlier result still displayed, and tells you when your edit or a later statement may make it
out of date. Edit the SQL and run again, or select **Reset database** when you need the original schema.

The output shows up to 100 rows per result. Use aggregates or `LIMIT` when exploring. This display
limit does not limit the work PostgreSQL performs. Queries running longer than 30 seconds stop the
worker. Select **Reset database** to run more SQL.

The engine and its data files are shipped with the site. No SQL or fixture data is sent to a database
service. The database is temporary, so use this lab for experiments, not durable storage.

## Take the SQL with you

Use **Copy SQL** on an editor or **Download SQL** above the first editor to save all the page's current SQL,
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
