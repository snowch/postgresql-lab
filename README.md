# PostgreSQL Lab

An advanced, hands-on journey through PostgreSQL, for developers growing into operators.

[Read the lab](https://snowch.github.io/postgresql-lab/) · [Curriculum](scripts/catalog.mjs)

## Available now

Three complete investigations run genuine PostgreSQL in the browser through PGlite:

1. **Read a query plan:** estimates, execution, filtering, sorting, limits, and buffers.
2. **Design for the query:** single-column, composite, and covering indexes, visibility, and storage cost.
3. **Diagnose an estimate:** correlated predicates, dependency statistics, and multicolumn MCV statistics.

Each includes editable SQL, real output, predictions, hints, worked explanations, and transfer tasks.
A disposable 60,000-row fixture loads per page. Reset stops execution and recreates it. Examples share
a database within a page; navigation starts fresh. Copy and download preserve edited SQL.

The remaining fifteen chapters are explicitly labelled outlines, covering data modeling, advanced SQL,
JSONB, partitioning, MVCC, vacuum, maintenance, isolation, locks, migrations, observability, recovery,
replication, and a final incident. Start, dataset, glossary, and runtime reference pages are also included.

The browser uses one connection. Independent-session and operational scenarios are planned for a real
PostgreSQL server. This initial release has no server backend, Jupyter dependency, or progress storage.

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
```

`check` builds all pages, verifies local links and outline structure, runs every published SQL block
in order, and checks fixture invariants and estimate improvement. Browser tests execute every example
through the real WASM worker under `/postgresql-lab/`, then test error recovery, reset, mobile
navigation, and overflow. They save desktop and mobile screenshots in `test-results/`.

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
| `chapters/` | Three full investigations and fifteen honest outlines, in Markdown. |
| `appendices/` | Home, onboarding, dataset, glossary, and runtime boundaries. |
| `scripts/catalog.mjs` | Ordered curriculum and publication status. |
| `scripts/build.mjs` | Markdown renderer and static Vite build. |
| `web/` | Accessible lesson UI, SQL cells, database worker, and fixture. |
| `tests/` | Content, SQL semantics, and real-browser checks. |
| `.agents/skills/` | Required UX and learning design reviews. |

When adding a SQL block, ensure it runs in sequence from that page's fresh fixture. Keep VACUUM in
its own execution. Explain all mutable state and cite primary PostgreSQL documentation. Avoid
fabricated output and timing claims. Unfinished content stays explicitly marked as an outline.
