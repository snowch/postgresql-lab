# PostgreSQL Lab contributor instructions

Work directly on `main` when the user requests it. Preserve other contributors' changes.

## Required skills for every change

Read and apply both repository skills before changing content, functionality, navigation,
styles, or deployment behavior:

- [UX skill](.agents/skills/ux/SKILL.md): usability, accessibility, visual design, and beautiful content.
- [Learning design skill](.agents/skills/learning-design/SKILL.md): learning goals, experiments, progression, feedback, and accuracy.

Run every change through both reviews. For infrastructure-only work, explicitly assess its effect
on access, reliability, and reproducibility. Record the review and validation in the commit or
handoff. These skills require review and fixes, not user approval. Use your own review; additional
agents are optional only when the user authorizes them.

## Product and teaching rules

- This is an advanced, developer-led PostgreSQL journey with an operations track.
- Run genuine PostgreSQL through PGlite. Never fabricate plans or measured timings.
- Browser investigations must be runnable in order from a fresh reset, with editable SQL.
- Clearly mark unfinished chapters as outlines. Do not imply a planned exercise exists.
- Explain single-connection WASM limits. Every chapter starts with genuine browser work. Independent-session and server-tool exercises
  stay in optional Docker Compose extensions; do not simulate them as real behavior.
- Define terms when introduced. Prefer plain language, concrete causes, and short paragraphs.
- Keep shared dataset generation in `web/seed.sql` and navigation in `scripts/catalog.mjs`.
- Deploy a static site through GitHub Pages Actions, supporting the `/postgresql-lab/` base path.
- Before shipping: `npm run check`, `npm run test:browser`, and `npm run test:server` when server material changes. Inspect desktop and mobile screenshots
  when the rendered experience changes. Fix material usability or learning issues you find.
