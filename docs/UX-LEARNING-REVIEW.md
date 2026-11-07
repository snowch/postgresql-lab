# Initial UX and learning design review

## Sources reviewed

- `snowch/parquet-book`: STYLE.md, AUTHORING_GUIDE.md, README and Pages workflow.
- `snowch/video-lab`: README, `src/notebook/Cell.tsx`, `src/notebook/Notebook.tsx`.

Video Lab's current implementation describes itself as a browser notebook running FFmpeg/ffprobe
in WASM, not a Jupyter backend. Its useful patterns are editable command cells, adjacent real output,
explicit observations, independent practice, and honest boundaries between browser commands and a
native shell. It also tracks stale results and supports copying commands for native use.

## Applied to PostgreSQL Lab

- SQL is the primary learner interface. Every displayed SQL experiment is editable and executable.
- Output follows its editor, with tables for rows and unmodified text for EXPLAIN output.
- Copy SQL and download the page's SQL connect examples to native psql use. Browser cells execute SQL,
  not psql backslash commands or shell commands.
- Editing marks earlier output as coming from different SQL. Earlier executions retain their output
  for comparison; a notice explains when subsequent statements may have changed database state.
- A single shared database per page supports before/after investigations. Reset and page transitions
  have explicit state semantics. Reset remains available during execution.
- Each full lesson has prerequisites, an incident, prediction prompts, concrete observations,
  progressive explanation, a transfer task, and primary references.
- Outlines name intended evidence and success criteria without claiming executable work exists.
- Desktop and mobile browser checks cover the actual WASM worker, loading, SQL failure recovery,
  navigation, editor/result overflow, and execution under the Pages subpath.

## Deliberate limits

There is no progress score or stored notebook in this initial slice. Downloads preserve edited SQL,
not database state. Cross-session operational exercises remain outlines. Performance assertions use
semantic outcomes and broad estimate improvements, not fixed timings or exact plan strings.

## Validation evidence

- All 23 static pages build and all local navigation/asset links resolve.
- Every published SQL block executes sequentially from its page's fresh fixture.
- Semantic checks confirm result preservation across indexing and improved estimates for correlated predicates.
- Real Chromium runs the four runnable pages through their WebAssembly worker under the Pages subpath.
- Desktop and 390px mobile screenshots were inspected for readability and overflow. Results scroll inside
  their own regions; SQL remains editable at narrow widths; the mobile chapter menu works.
- Failure recovery, reset, edited-output notices, SQL download, and interrupting a running query are covered.
- The initial run caught VACUUM inside a multi-statement implicit transaction. The lesson now teaches
  that restriction and runs VACUUM in its own cell.

The initial review was performed in one agent session. It does not claim an independent audit.
