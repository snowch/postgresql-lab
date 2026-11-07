# Dataset and reproducibility

Every runnable page starts with the same synthetic order table. Nothing comes from a customer database.

The source of truth is [`web/seed.sql`](https://github.com/snowch/postgresql-lab/blob/main/web/seed.sql).
It creates the schema, inserts deterministic data, disables JIT and parallel query execution for the
fixture, and analyzes the table. Those settings keep the plan examples focused; they are not production
configuration recommendations.

| Column | Meaning and fixture rule |
| --- | --- |
| `id` | Integer primary key, generated from 1 through 60,000. |
| `tenant_id` | Organization ID, cycling evenly through 1 to 100. |
| `status` | `pending` for selected blocks of rows, otherwise `shipped`. |
| `country` | `GB` when the ID is divisible by ten, otherwise `US`. |
| `currency` | `GBP` for GB orders, `USD` for US orders. |
| `created_at` | Timestamp starting after 2025-01-01, increasing by one minute per ID. |
| `total_cents` | Deterministic integer derived from the ID. Currency is stored separately. |
| `payload` | Repeated synthetic text that makes a table row wider than the selected output. |

The fixture has 600 orders per tenant and 6,000 British orders. The country/currency dependency is
intentional. Other correlations exist because the generator is deterministic; do not interpret it
as a realistic random population. The fixture isolates specific access-path and estimation questions.

## Reproducible behavior, variable measurements

The lockfile pins PGlite and the build dependencies. The startup page reports the actual PostgreSQL
version, also available as the runtime status tooltip. Statistics sampling, planner versions, browser
resources, and warm caches can change estimates, timings, and sometimes plans.

The tests check data invariants and semantic outcomes. They do not assert exact cost values or speedups.
The browser uses an in-memory database. Navigation, reload, or Reset database discards its changes.

## Run the same SQL on a server

Use an isolated PostgreSQL database with permission to create its own tables and indexes. Load the
fixture using `psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f web/seed.sql`, then copy the lesson SQL.
Reset between chapters by recreating the isolated database or dropping the fixture table and loading
it again. Do not load this schema into an application database: it uses an unqualified `orders` table.

The server's PostgreSQL version and settings may differ from PGlite. Record them when comparing results.
The [server laboratory](./server-setup.html) provides a Docker Compose setup and ordered multi-session exercises.
It loads the same fixture into the `lab` schema instead of `public`.
