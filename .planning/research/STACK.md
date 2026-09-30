# Technology Stack: v1.3 Fee History Graph

**Researched:** 2026-09-30
**Verdict:** No new dependencies. Stdlib and platform-native only. Confidence: HIGH for the recommendations, which rest on the existing code and workflow. `<dialog>` support is from training knowledge, so treat it as MEDIUM.

## Additions (all stdlib or native)

| Need | Use | Version | Why / Integration |
|------|-----|---------|-------------------|
| Backfill from git history | `subprocess` calling `git log --format=%H%x09%cI --reverse -- data.json`, then `git show <sha>:data.json` | Python 3.9+ stdlib | `scripts/build_changelog.py` already uses `subprocess.run(["git","show","HEAD:data.json"], encoding="utf-8")`. Reuse that pattern. Do not add GitPython or pygit2. |
| Snapshot store | `json` stdlib, new file such as `fee-history.json`, shaped `{code: {field: [[date, value], ...]}}` | n/a | Append a point only when the value differs from the last stored value (step semantics). Keep the Korean field keys. Use `ensure_ascii=False` and `indent=None` or compact separators to keep the file small. |
| Daily incremental update | New `scripts/build_fee_history.py`, run after ETL and after Build Changelog | n/a | Compares current `data.json` with the last stored point per code and field. It needs no git history. |
| Modal | Native `<dialog>` with `showModal()` and `::backdrop` | Baseline in all modern browsers | Provides focus trap, Esc to close and top-layer rendering for free. No modal library. |
| Chart | Inline SVG built with `document.createElementNS` and a `<path>` using H/V step segments | n/a | Only ~100 lines: linear x scale by date, y scale by min/max padding, axis ticks, hover `<circle>` and `<title>` tooltips. |
| Fetch of history in browser | `fetch('fee-history.json')`, lazy, on first cell click | n/a | Keeps the initial page load unchanged. |

## CI / workflow changes

- **Daily job: keep `actions/checkout@v4` default (`fetch-depth: 1`).** The incremental script only reads the working tree, so no deep fetch is needed.
- **Backfill is a one-off run locally** (`python scripts/backfill_fee_history.py`), with the resulting `fee-history.json` committed. Do not run it in CI. Local clones have full history. If it ever has to run in CI, use `fetch-depth: 0` for that one-time workflow only. The daily job would pay clone cost every day for nothing.
- **Update `file_pattern`** in `git-auto-commit-action` to `"data.json changelog.json update-meta.json fee-history.json"`. Without this the new file is never committed. This is the most likely integration miss.
- **Add the step** `python scripts/build_fee_history.py` after "Build Changelog" and before the commit.
- **`requirements.txt`: no change.**
- **pytest gate:** add tests for the diff-only-on-change logic and for the backfill parser, and keep them in the `tests/` gate.

## What NOT to add

| Avoid | Why |
|-------|-----|
| Chart.js, D3, uPlot | Decided against a chart library. A single step line needs no library. |
| SQLite | Decided against it. JSON is diffable in git and static-hostable. |
| GitPython / pygit2 | The subprocess `git` calls are enough, and the repo already uses them. |
| Modal libraries or a `<dialog>` polyfill | Native `<dialog>` is baseline in current browsers. |
| Build tooling (bundlers, npm) | The site is static vanilla JS with no build step. |

## Data caveats that affect the stack

- **Per-commit `data.json` shape may differ (~156 commits).** The commit history includes column-remap corrections; see `BULK_CORRECTION_*` in `build_changelog.py`. The backfill must reuse `to_float`, `row_key` and the bulk-correction detection so that bad commits do not become false steps. Skip a commit that fails to parse and log it.
- **Key by 종목코드.** Names can change, so do not key on 종목명.
- **Cost of backfill:** roughly 156 `git show` calls, a few seconds. Fine.
- **Windows encoding:** pass `encoding="utf-8"` to `subprocess.run`, as `build_changelog.py` does. Otherwise cp949 breaks Korean text on the local Windows machine.
- **Step chart end point:** add a final point at the latest date, so a flat, unchanged series still draws a line to the present.

## Sources

- Existing code: `scripts/build_changelog.py` (subprocess git pattern), `.github/workflows/daily_update.yml` (checkout default depth, `file_pattern`).
- `<dialog>` baseline support: training knowledge, not re-verified (MEDIUM).
