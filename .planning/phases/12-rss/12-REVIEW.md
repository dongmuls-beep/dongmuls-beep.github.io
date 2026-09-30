---
phase: 12-rss
reviewed: 2026-09-30T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - scripts/build_rss.py
  - tests/test_rss.py
  - .github/workflows/daily_update.yml
  - feed.xml
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 12: Code Review Report

**Reviewed:** 2026-09-30
**Depth:** standard
**Files Reviewed:** 4 (feed.xml spot-checked)
**Status:** issues_found

## Summary

`scripts/build_rss.py` does what the plan requires on well-formed input. It uses only ElementTree to build XML, so values are escaped correctly. It uses no wall-clock time, pubDate is fixed at 09:00 +09:00, and the atom namespace prefix is registered. `tests/test_rss.py` passes (15 passed). In the committed `feed.xml`, `&amp;` escaping, LF line endings, the `atom:` prefix and the tag-URI guids all look correct. The workflow change (commit 2f4445c) only adds the `Build RSS Feed` step and adds `feed.xml` to `file_pattern`. Both are correct.

The weak points are the defensive paths the threat model claims to cover. I ran each probe below against the code and confirmed it:

- The control-character sanitiser is not applied to the guid, so the feed can come out invalid.
- XML-illegal characters other than C0 controls are not stripped.
- Some malformed rows raise an unhandled exception.
- Because the RSS step runs before the commit step with no failure isolation, any such exception also stops that day's `data.json` / `changelog.json` from being committed.

None of these happens with the current real data, which is why there are no BLOCKERs.

## Warnings

### WR-01: guid (and `code`) not sanitised, so control characters produce an invalid feed

**File:** `scripts/build_rss.py:87-88, 112`
**Issue:** `clean_text()` is applied to `name` and to `code` in the title, but the guid uses the raw `code` (`"tag:etfsave.life,%s:%s" % (updated_at, code)`). Probe: a row with `code: "A\x01"` makes `ET.fromstring(build_feed_bytes(...))` fail with `ParseError: not well-formed (invalid token)`. That means mitigation T-12-02 is incomplete. The grouping key also uses the raw `str(row["code"])`, so `"A"` and `"A\x01"`/`" A "` become separate items.
**Fix:** Normalise the code once when grouping:
```python
code = clean_text(row["code"])
if not code: continue
key = (updated_at, code)
```
Then use that value for both the guid and the title.

### WR-02: XML-illegal characters beyond C0 controls are not stripped

**File:** `scripts/build_rss.py:29, 47-48`
**Issue:** `CONTROL_RE` covers only `[\x00-\x08\x0b\x0c\x0e-\x1f]`. XML 1.0 also forbids U+FFFE, U+FFFF and lone surrogates (U+D800-DFFF). JSON can legally carry all of these (for example `"\ud800"`). Probe: a name containing `"x￾"` produces bytes that `ET.fromstring` rejects (`ParseError`). A lone surrogate is written out as `&#55296;`, which is also not well-formed XML. Feed readers will reject the whole feed.
**Fix:**
```python
CONTROL_RE = re.compile("[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff￾￿]")
```
Add a test case with `￾` next to `test_control_chars_stripped`.

### WR-03: Malformed rows crash the generator instead of being skipped

**File:** `scripts/build_rss.py:37, 61`
**Issue:** The module's stated design is to skip anything invalid, but two inputs raise instead:
- `math.isfinite(10**400)` raises `OverflowError` (confirmed). `json.load` produces arbitrary-size ints.
- `{r.get("code") for r in rows ...}` raises `TypeError: unhashable type: 'list'` when `code` is a list or dict (confirmed).

Neither is caught anywhere up to `main()`.
**Fix:** In `valid_number`, wrap the conversion: `try: f = float(v) except OverflowError: return None; return f if math.isfinite(f) else None`. In `valid_change` (or in a row pre-filter), require `isinstance(row.get("code"), (str, int))` and not bool.

### WR-04: A failure in the RSS step prevents the daily data commit

**File:** `.github/workflows/daily_update.yml:58-68`
**Issue:** `Build RSS Feed` sits between `Build Changelog` and `Commit and Push changes`, and has no `continue-on-error`. `main()` also has no top-level exception guard. Any unexpected exception in the feed generator therefore skips `Build Fee History` and the auto-commit. The day's scraped `data.json` / `changelog.json` / `update-meta.json` are then lost, even though they have nothing to do with the RSS feed. WR-01 does not raise; it writes a broken but committed feed. WR-03 does raise. So a non-critical derived artifact can currently block the primary data pipeline.
**Fix:** Isolate the step:
```yaml
      - name: Build RSS Feed
        run: python scripts/build_rss.py
        continue-on-error: true
```
Alternatively, wrap `build_items`/`build_feed_bytes` in `main()` with `try/except Exception`: log to stderr, leave the existing `feed.xml` untouched, and return 0.

### WR-05: `DATE_RE` with `$` accepts a trailing newline, which leaks into the guid

**File:** `scripts/build_rss.py:28, 102`
**Issue:** `re.match(r"^\d{4}-\d{2}-\d{2}$", "2026-03-11\n")` succeeds, because `$` also matches before a final newline. `int("11\n")` also succeeds, so `pub_date` does not reject it either. Probe: the resulting guid is `'tag:etfsave.life,2026-03-11\n:A'`. That guid differs from the clean-date guid, so readers see a duplicate item, and the `updatedAt` sort key is corrupted too.
**Fix:** `if not isinstance(updated_at, str) or not DATE_RE.fullmatch(updated_at):` and drop the `^`/`$` anchors, or use `\Z`.

## Info

### IN-01: Duplicate rows for the same (date, code, field) are not deduplicated

**File:** `scripts/build_rss.py:112-115, 77-84`
**Issue:** Assumption A4 says duplicate (code, updatedAt) pairs across entries merge into one item. They do merge, but the rows are concatenated as they are. Probe: two identical 총보수 rows give the title `n (A) 총보수 인상, 총보수 인상` and a duplicated description line. `build_changelog.py` currently replaces the same-day entry, so this does not happen in practice today. No test covers the merge path.
**Fix:** Deduplicate on `(field)` inside each group, keeping the last row. Add a `test_duplicate_entries_merge` test.

### IN-02: `format(v, "g")` truncates to 6 significant digits and can switch to exponent form

**File:** `scripts/build_rss.py:83`
**Issue:** `format(0.1234567, "g")` returns `0.123457`, and `format(0.00001, "g")` returns `1e-05`. Current KOFIA values have at most 4 decimal places, so the output is fine today, but the formatting is not faithful for other values.
**Fix:** Use `repr(float)` stripped of a trailing `.0`, or `f"{v:.4f}".rstrip("0").rstrip(".")`, to match the site's precision.

### IN-03: Bulk-guard semantics differ from `build_changelog.py`

**File:** `scripts/build_rss.py:56-64` vs `scripts/build_changelog.py:133-170`
**Issue:** The changelog guard counts every row in the field (None transitions included) and uses `total = max(total_hint, distinct)`. The RSS guard counts only valid rows and uses `len(data.json)` directly. The two "mirrored" constants can therefore reach different verdicts on the same entry. That is harmless now, because the changelog filter runs first and is the stricter of the two. But the comment "Constants mirrored" suggests the two guards are equivalent, and they are not.
**Fix:** Document the difference in a comment, or mirror the `max(total, distinct)` rule and the counting of all rows.

### IN-04: Determinism tests are weaker than the claims they back

**File:** `tests/test_rss.py:101-105, 122-127, 137-145`
**Issue:**
- `test_byte_identical_rerun` compares two in-process calls on the same `items` list, which can only fail on randomness. The wall-clock check greps only for `"datetime.now"`, although the plan's gate also bans `date.today` and `time.time`.
- `test_control_chars_stripped` covers only `name`, which is why WR-01 in `code`/guid went unnoticed.
- `test_cap_50` checks date order but not the code-ascending tiebreak.
**Fix:** Call `main()` twice on tmp files and compare the output bytes. Extend the source grep to `date.today|time.time`. Add a control-character case for `code`. Add a same-date multi-code ordering assertion.

### IN-05: No `.gitattributes` pin for feed.xml line endings; leftover `.tmp` on failure

**File:** `scripts/build_rss.py:158-165`, repo root
**Issue:**
- Locally `core.autocrlf=true`, and the 12-02 summary already notes that git warns feed.xml LF will become CRLF. After a checkout, a local run sees CRLF bytes different from the LF output and rewrites the file.
- `write_if_changed` leaves `feed.xml.tmp` behind if `write_bytes`/`os.replace` raises.

Both are minor.
**Fix:** Add `feed.xml text eol=lf` to `.gitattributes`. In `write_if_changed`, wrap the write in `try/finally` that unlinks `tmp` on failure.

---

_Reviewed: 2026-09-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
