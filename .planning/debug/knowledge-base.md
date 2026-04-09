# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## aum-none-yfinance-korean-etf — yfinance로 한국 ETF AUM 조회 시 AUM=None 반환
- **Date:** 2026-04-09
- **Error patterns:** AUM, None, yfinance, sharesOutstanding, marketCap, totalAssets, Korean ETF, .KS, KRX
- **Root cause:** Yahoo Finance(yfinance 백엔드)가 한국 KSE 상장 ETF(.KS)에 대해 fundamentals 데이터(sharesOutstanding, marketCap, totalAssets 등)를 제공하지 않음. Yahoo Finance v10 quoteSummary API가 "No fundamentals data found for symbol" 오류를 반환함. yfinance 라이브러리 버그가 아니라 Yahoo Finance의 한국 ETF 데이터 커버리지 한계임.
- **Fix:** fetch_market_data_batch()를 NAVER Finance ETF 리스트 API(https://finance.naver.com/api/sise/etfItemList.nhn) 기반으로 교체. 단일 요청으로 전체 ETF 목록(marketSum=억원, quant=거래량)을 받아와 코드별로 매핑. yfinance 의존성 제거.
- **Files changed:** etl_process.py
---
