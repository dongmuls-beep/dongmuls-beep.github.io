# Phase 03 — UI Review

**Audited:** 2026-09-30
**Baseline:** abstract 6-pillar standards (no UI-SPEC.md)
**Screenshots:** not captured (no dev server on localhost:8080; 3000/5173 not running). Code-only audit.

Phase 03 changed very little UI: a comment (03-A), a guard clause in initSmartHeader (03-B), and the empty-changes branch of renderChangelog (03-C). Scores below cover the touched surfaces.

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | `changelog_no_changes` exists in all 5 locales, but the message is terse and gives no context |
| 2. Visuals | 2/4 | New `.changelog-no-changes` class has no CSS rule, so the empty state is unstyled |
| 3. Color | 3/4 | No new color usage and no hardcoded colors added. The empty-state text is unstyled and inherits the default text color |
| 4. Typography | 2/4 | The empty-state `<p>` gets browser-default type and does not match `.loading-text` or `.changelog-head p` |
| 5. Spacing | 2/4 | No margin or padding on the new `<p>`, so it sits flush under the card header |
| 6. Experience Design | 2/4 | The BUG-01 fix leaves a stuck-hidden header when the nav opens, and nothing in the phase was verified visually |

**Overall: 14/24**

## Top 3 Priority Fixes

1. **`.changelog-no-changes` has no style (WARNING)** — `grep` finds the class only in `script.js:1090`, and `style.css` has no rule for it. The BUG-02 fix removes the orphaned `<thead>` but leaves a bare paragraph with no spacing or muted color. Add a rule in `style.css` near `.changelog-head` (line ~894). Reuse `.loading-text` styling or use `color: var(--text-muted); padding: 1rem 0; font-size: .95rem;`.
2. **BUG-01 fix is incomplete (WARNING)** — the early return in `script.js:177-180` skips scroll handling while `nav-open` is set, but it does not remove `header-hidden`. If the header is already hidden after a downward scroll and the user opens the nav some other way, the header stays at `translateY(-100%)`. The hamburger normally sits in the header, so this is only reachable through a rare path. A defensive `header.classList.remove("header-hidden")` in the guard, or when `nav-open` is added in `initNavigation`, closes the gap. Also, `lastScroll` is not refreshed during nav-open. `body{overflow:hidden}` mostly prevents scrolling, but the first scroll after closing can compare against a stale value.
3. **No visual verification and no check of the mobile empty state (WARNING)** — none of the three plans ran a browser check. Start a static server (for example `python -m http.server 8080`) and screenshot `/changelog` at 375px, 768px and 1440px. Include an entry with `changes: []`, since the current `changelog.json` may have none, which leaves BUG-02 unexercised. Confirm the empty-state card looks intentional.

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- `changelog_no_changes` is present in en, ko, ja, th and km (for example `i18n/ko.json:252`, "변경된 항목이 없습니다."). Locale parity is good.
- Minor: the copy is a flat statement. Consider "No changes this period." with a reason.
- Minor: `changelog_updated_at` (`script.js:1085`) is interpolated without `escapeHtml`. This is consistent with the D-03 decision that translations are a trusted source, but it is inconsistent with line 1090, where the new string was escaped. `getTranslation` usage is therefore inconsistent within one template.

### Pillar 2: Visuals (2/4)
- The empty-state branch renders header plus a bare `<p>`. Without CSS the card reads as an incomplete entry. The card still has the shared `.changelog-card` frame (`style.css:871`), so the hierarchy is partly preserved.
- No icon or illustration is needed, but the message has no visual differentiation from the metadata line in `.changelog-head p`.

### Pillar 3: Color (3/4)
- The phase added no hardcoded colors and no new accent usage. The empty-state text inherits body color (`var(--text)`), so it competes with the card title instead of reading as secondary content.

### Pillar 4: Typography (2/4)
- The `.changelog-no-changes` class has no font-size, weight or color rules. The text uses the inherited 1rem and line-height 1.6, unlike `.loading-text` (`style.css:475`), which is the comparable existing pattern.

### Pillar 5: Spacing (2/4)
- The `<p>` has no margin or padding. The card sets no spacing between `<header class="changelog-head">` and following content beyond browser default paragraph margins. Table-branch cards get spacing from `.table-container`, so the two card variants are visually inconsistent.

### Pillar 6: Experience Design (2/4)
- Positive: the guard clause resets `rafPending = false` before returning, so the scroll handler cannot freeze (`script.js:177-180`). The empty array, empty `changes` and non-array `changes` cases are all handled (`script.js:1071, 1077`).
- Negative: `header-hidden` is not cleared on nav-open (see fix 2).
- Negative: the loading and error states of changelog fetch were not touched or verified in this phase.
- Negative: no screenshots or browser test for either bug fix. Verification was grep-based acceptance only.

## Files Audited
- `script.js` (initSmartHeader ~165-191, renderChangelog ~1050-1125)
- `style.css` (header, nav-open, changelog, loading-text rules)
- `i18n/*.json` (changelog_no_changes parity)
- `.planning/phases/03-보안-및-버그-수정/03-{A,B,C}-SUMMARY.md`, `03-PLAN-{A,B,C}.md`, `03-CONTEXT.md`
