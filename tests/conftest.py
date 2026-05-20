import pytest
import openpyxl
import pandas as pd


@pytest.fixture
def kofia_primary_xlsx(tmp_path):
    """
    Primary fixture: KOFIA 표준 구조.
    - 상위 3행: 메타데이터 (빈 행 또는 임의 텍스트)
    - 4행(index=3): 헤더 — '합계(A)', '표준코드' 포함 (D-05)
    - 5~7행(index=4~6): 데이터 3개 (D-06)
      - index=4: KR7360750004 → 총보수 0.07%, 기타비용 0.01%, 매매수수료 0.02%
      - index=5: KR7133690008 → 총보수 0.12%, 기타비용 0.02%, 매매수수료 0.01%
      - index=6: KR9999999999 → 매칭 안 되는 더미 행
    """
    wb = openpyxl.Workbook()
    ws = wb.active

    # 메타데이터 행 (row 1~3)
    ws.append(["KOFIA 펀드 보수·비용 현황", None, None, None, None])
    ws.append(["기준일: 2026-05-01", None, None, None, None])
    ws.append([None, None, None, None, None])

    # 헤더 행 (row 4, index=3) — '합계(A)'와 '표준코드' 포함 (primary 감지 조건)
    ws.append(["표준코드", "펀드명", "합계(A)", "기타비용(B)", "매매·중개수수료율(D)"])

    # 데이터 행 (row 5~7)
    ws.append(["KR7360750004", "미래에셋 TIGER 미국S&P500", "0.07", "0.01", "0.02"])
    ws.append(["KR7133690008", "미래에셋 TIGER 미국나스닥100", "0.12", "0.02", "0.01"])
    ws.append(["KR9999999999", "더미펀드", "0.50", "0.05", "0.03"])

    path = tmp_path / "kofia_primary.xlsx"
    wb.save(str(path))
    return str(path)


@pytest.fixture
def kofia_fallback_xlsx(tmp_path):
    """
    Fallback fixture: '합계(A)' 없이 '매매·수수료' 포함 헤더 (D-05 fallback 검증).
    - 상위 3행: 메타데이터
    - 4행(index=3): 헤더 — '합계(A)' 없음, '매매수수료' 포함
    - 5~6행(index=4~5): 데이터 2개 (D-06)
    """
    wb = openpyxl.Workbook()
    ws = wb.active

    # 메타데이터 행 (row 1~3)
    ws.append(["KOFIA 펀드 보수·비용 현황 (구형식)", None, None, None, None])
    ws.append(["기준일: 2026-05-01", None, None, None, None])
    ws.append([None, None, None, None, None])

    # 헤더 행 (row 4) — '합계(A)' 없고 '매매수수료' 포함 (fallback 감지 조건)
    ws.append(["표준코드", "펀드명", "총보수", "기타비용", "매매수수료율"])

    # 데이터 행 (row 5~6)
    ws.append(["KR7360750004", "미래에셋 TIGER 미국S&P500", "0.07", "0.01", "0.02"])
    ws.append(["KR7133690008", "미래에셋 TIGER 미국나스닥100", "0.12", "0.02", "0.01"])

    path = tmp_path / "kofia_fallback.xlsx"
    wb.save(str(path))
    return str(path)


@pytest.fixture
def managed_df_primary():
    """
    process_data() 테스트용 managed_df.
    primary fixture의 KR7360750004, KR7133690008과 매칭되고,
    KR9999999999은 매칭 안 되도록 설계.
    """
    return pd.DataFrame([
        {
            '구분': '국내주식형',
            '종목코드': '360750',
            '종목명': 'TIGER 미국S&P500',
            '표준코드': 'KR7360750004',
            '펀드명': '미래에셋 TIGER 미국S&P500증권상장지수투자신탁(주식)',
        },
        {
            '구분': '국내주식형',
            '종목코드': '133690',
            '종목명': 'TIGER 미국나스닥100',
            '표준코드': 'KR7133690008',
            '펀드명': '미래에셋 TIGER 미국나스닥100증권상장지수투자신탁(주식)',
        },
    ])
