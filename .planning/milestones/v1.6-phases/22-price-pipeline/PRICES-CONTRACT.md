# Prices Data Contract (Phase 22)

Single reference for `scripts/build_price_history.py` and its workflow.

## prices/{code}.json

```json
{"version":1,"code":"360200","source":"data.go.kr getETFPriceInfo","dates":["2021-01-04","..."],"close":[12345,12350.5]}
```

- `code`: normalized code (see Normalization).
- `dates`: ascending, unique, `YYYY-MM-DD`. `close`: same length, raw `clpr` (not adjusted), int when integral else float.
- Window: last 5 years relative to the latest date (keep dates >= latest minus 5 years, same month/day).
- Short-history codes (listed < 5y) are normal.

## prices-meta.json

```json
{"version":1,"as_of":"YYYY-MM-DD","generated_at":"ISO UTC","expected":59,"collected":N,"missing":["code"],"missing_ratio":0.0,"threshold":0.1}
```

- `as_of` = max latest date across collected codes.

## Missing definition
A code with zero rows returned, or a fetch error after retries (or, in incremental mode, a corrupt existing file).

## Guard
If `missing_ratio` > `threshold` (default 0.10, override `--max-missing-ratio`), nothing in `prices/` nor `prices-meta.json` is written; exit code 2.

## Normalization
Digits-only -> `zfill(6)`; otherwise `upper()`. Same rule as data.json (`종목코드`, read utf-8).

## Withdrawal
Deleting `prices/` and `prices-meta.json` removes all redistributed data; no other file references them in this phase.

## Determinism
`json.dumps(ensure_ascii=False, separators=(",",":"), sort_keys=True) + "\n"`, utf-8, written only when bytes change. `prices-meta.json` is NOT rewritten when content differs only in `generated_at`.

## Write order and safety
Per-code files first, `prices-meta.json` LAST. A code missing in this run (under threshold) keeps its existing file untouched (never overwritten with an empty series). In incremental mode a corrupt/unparseable existing file is skipped (left as is) and counted as missing, not overwritten.
