# PostgreSQL Lab

An advanced, hands-on journey through PostgreSQL, for developers growing into operators.

[Read the lab](https://snowch.github.io/postgresql-lab/) · [Curriculum](scripts/catalog.mjs)

## Available now

All eighteen chapters include genuine PostgreSQL investigations running in the browser through
PGlite. The final seven now cover transaction/savepoint behavior, real lock inspection, staged
migrations, per-query workload and spill evidence, database checkpoint recovery, WAL-position
inspection, and an end-to-end statistics/index incident.

Optional collapsed server extensions add independent snapshots, contention, concurrent DDL,
server-wide statistics, pg_dump/restore, and streaming replication. Separate PGlite workers are
not presented as clients of a shared database or as a replication system. The replication browser
lesson inspects actual WAL metadata; genuine replay lag and promotion require its server extension.

Every lesson includes predictions, editable SQL or copyable session commands, evidence to inspect,
hints, worked explanations, and transfer tasks. A disposable 60,000-row fixture loads per browser
page. Reset recreates it; navigation starts fresh. Copy/download preserve edited SQL.

Use **Chapters** to show or hide navigation. Tablets and phones start with a closed drawer; wide
desktops use an optional narrower rail. The site has no hosted database backend or progress storage.

## Optional server investigations

[Read the server setup](https://snowch.github.io/postgresql-lab/server-setup.html). With Docker Compose:

```sh
docker compose -f server/compose.yml up -d --wait
docker compose -f server/compose.yml exec -T db psql -U postgres -d lab -f /lab/server/reset.sql
```

Open independent psql sessions with `PGAPPNAME=lab-a`, `lab-b`, and `lab-observer` as documented in
the setup page. The service uses PostgreSQL 17, publishes no ports, and keeps its fixture in the `lab`
schema. It uses trust authentication for this isolated exercise; do not expose it or reuse it for
an application. The server suite can be run with `npm run test:server` and leaves the service running.
Stop it using `docker compose -f server/compose.yml down`.

The recovery browser lesson saves and restores a PGlite data-directory checkpoint. It can download
the archive but does not import uploaded archives. The optional server extension tests a logical
pg_dump restore, not a complete PITR installation. Streaming replication uses two
server processes in one container and does not claim production failover safety.

## Build and run

Use Node.js 24 and npm:

```sh
npm ci
npm run build
npm run preview
```

Open the URL printed by Vite, normally `http://localhost:4173`. The build outputs static HTML and
self-hosted engine assets into `dist/`. Relative links support both domain-root and GitHub Pages
project hosting. The engine's first download is substantial; no database service is needed.

## Verify

```sh
npm run check
npx playwright install chromium
npm run test:browser
npm run test:server  # requires Docker Compose
```

`check` builds all pages, verifies local links and outline structure, runs every published browser SQL block
in order, and checks fixture invariants and estimate improvement. Browser tests execute every browser example
through the real WASM worker under `/postgresql-lab/`, then test error recovery, reset, mobile
navigation, tablet/desktop collapse, and overflow. They save desktop and mobile screenshots in `test-results/`.

To use a system Chromium, set `CHROMIUM_PATH=/path/to/chromium` for the browser command. CI installs
Playwright's pinned Chromium. Tests do not grade exact costs, plan strings, or timing thresholds.

## Publish

In repository **Settings → Pages**, choose **GitHub Actions** as the source. The included
[workflow](.github/workflows/pages.yml) checks every push to `main` and deploys `dist/` after all checks
pass. Pull requests run the same checks without deploying. The Pages environment must permit `main`.

## Contribute

Read [AGENTS.md](AGENTS.md). Every change must apply the repository's [UX skill](.agents/skills/ux/SKILL.md)
and [learning design skill](.agents/skills/learning-design/SKILL.md). The initial
[review notes](docs/UX-LEARNING-REVIEW.md) record patterns reviewed from Parquet Book and Video Lab.

| Path | Purpose |
| --- | --- |
| `chapters/` | Eighteen full investigations, in Markdown. |
| `appendices/` | Home, browser/server onboarding, dataset, glossary, and runtime boundaries. |
| `scripts/catalog.mjs` | Ordered curriculum and publication status. |
| `scripts/build.mjs` | Markdown renderer and static Vite build. |
| `web/` | Accessible lesson UI, SQL cells, database worker, and fixture. |
| `server/` | Isolated PostgreSQL Compose service, schema reset, and standby helper. |
| `tests/` | Content, SQL semantics, real-browser checks, and published real-server schedules. |
| `.agents/skills/` | Required UX and learning design reviews. |

When adding a SQL block, ensure it runs in sequence from that page's fresh fixture. Keep VACUUM in
its own execution. Explain all mutable state and cite primary PostgreSQL documentation. Avoid
fabricated output and timing claims. Unfinished content stays explicitly marked as an outline.
