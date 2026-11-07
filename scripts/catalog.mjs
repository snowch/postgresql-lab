export const groups = [
  { title: 'Start here', pages: [
    ['index', 'PostgreSQL Lab', 'appendices/index.md', 'ready'],
    ['getting-started', 'Your browser laboratory', 'appendices/getting-started.md', 'ready'],
  ]},
  { title: 'I · Plans and indexes', pages: [
    ['reading-plans', '01 · Read a query plan', 'chapters/01-reading-plans.md', 'ready'],
    ['designing-indexes', '02 · Design for the query', 'chapters/02-designing-indexes.md', 'ready'],
    ['planner-estimates', '03 · Diagnose an estimate', 'chapters/03-planner-estimates.md', 'ready'],
    ['index-tradeoffs', '04 · Pay for your indexes', 'chapters/04-index-tradeoffs.md', 'ready'],
  ]},
  { title: 'II · Data and queries', pages: [
    ['constraints', '05 · Make invalid data impossible', 'chapters/05-constraints.md', 'ready'],
    ['advanced-sql', '06 · Work with sets and windows', 'chapters/06-advanced-sql.md', 'ready'],
    ['jsonb', '07 · Give JSONB a job', 'chapters/07-jsonb.md', 'ready'],
    ['partitioning', '08 · Divide a growing table', 'chapters/08-partitioning.md', 'ready'],
  ]},
  { title: 'III · Storage and maintenance', pages: [
    ['mvcc', '09 · Follow a row version', 'chapters/09-mvcc.md', 'ready'],
    ['vacuum', '10 · Reclaim space with vacuum', 'chapters/10-vacuum.md', 'ready'],
    ['maintenance', '11 · Keep plans healthy', 'chapters/11-maintenance.md', 'ready'],
  ]},
  { title: 'IV · Reliable applications', pages: [
    ['transactions', '12 · Choose an isolation level', 'chapters/12-transactions.md', 'ready', 'server'],
    ['locks', '13 · Investigate a blocked checkout', 'chapters/13-locks.md', 'ready', 'server'],
    ['migrations', '14 · Change a busy database', 'chapters/14-migrations.md', 'ready', 'server'],
  ]},
  { title: 'V · Operate PostgreSQL', pages: [
    ['observability', '15 · Find the expensive workload', 'chapters/15-observability.md', 'ready', 'server'],
    ['backup-recovery', '16 · Prove you can recover', 'chapters/16-backup-recovery.md', 'ready', 'server'],
    ['replication', '17 · Understand replication lag', 'chapters/17-replication.md', 'ready', 'server'],
    ['production-incident', '18 · Resolve a production incident', 'chapters/18-production-incident.md', 'ready', 'server'],
  ]},
  { title: 'Reference', pages: [
    ['server-setup', 'Your server laboratory', 'appendices/server-setup.md', 'ready', 'server'],
    ['dataset', 'Dataset and reproducibility', 'appendices/dataset.md', 'ready'],
    ['glossary', 'Plan vocabulary', 'appendices/glossary.md', 'ready'],
    ['runtime', 'What the browser can tell you', 'appendices/runtime.md', 'ready'],
  ]},
];
export const pages = groups.flatMap(g => g.pages);
