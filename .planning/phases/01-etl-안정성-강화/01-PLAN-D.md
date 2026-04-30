---
phase: 1
plan: D
type: execute
wave: 1
depends_on: []
gap_closure: true
files_modified:
  - etl_process.py
autonomous: true
requirements:
  - ETL-03
must_haves:
  truths:
    - "etl_process.py의 모든 bare except: 블록이 구체적 예외 타입으로 교체된다"
    - "p_float() 헬퍼가 (ValueError, TypeError, AttributeError)를 잡아 0.0을 반환한다"
    - "Excel 버튼 탐색 fallback이 NoSuchElementException을 잡는다"
    - "스크린샷 저장 오류 핸들러가 except Exception: pass 형태가 된다"
  artifacts:
    - path: "etl_process.py"
      provides: "bare except: 완전 제거"
      contains: "ValueError, TypeError, AttributeError"
---

<objective>
etl_process.py에 잔존하는 4개 bare except: 블록을 구체적 예외 타입으로 교체한다.
VERIFICATION.md gap: ETL-03 truth 1 ("bare except 대신 구체적 예외 타입") 완전 충족.

Gap locations (from 01-VERIFICATION.md):
- line 142: Excel XPATH fallback → except NoSuchElementException
- line 145: Excel CSS fallback → except NoSuchElementException
- line 167: Screenshot save → except Exception
- line 333: p_float() fee parser → except (ValueError, TypeError, AttributeError)
</objective>

<tasks>

<task type="auto">
  <name>Task 1: 잔존 bare except: 4개 교체</name>
  <files>etl_process.py</files>
  <read_first>
    - etl_process.py (line 138-170 — Excel 버튼 탐색 + 스크린샷, line 325-340 — p_float)
  </read_first>
  <action>
다음 4곳의 bare `except:` 블록을 교체한다.

**변경 1: Excel XPATH/CSS 버튼 탐색 (line 142/145)**

교체 전:
```python
        try:
            excel_btn = driver.find_element(By.XPATH, "//img[contains(@alt, '엑셀') or contains(@alt, 'Excel')]/parent::*")
        except:
            try:
                excel_btn = driver.find_element(By.CSS_SELECTOR, "#btnExcel, #excelDown")
            except:
                 print("Excel button not found!")
                 return None
```

교체 후:
```python
        try:
            excel_btn = driver.find_element(By.XPATH, "//img[contains(@alt, '엑셀') or contains(@alt, 'Excel')]/parent::*")
        except NoSuchElementException:
            try:
                excel_btn = driver.find_element(By.CSS_SELECTOR, "#btnExcel, #excelDown")
            except NoSuchElementException:
                print("Excel button not found!")
                return None
```

**변경 2: 스크린샷 저장 오류 핸들러 (line 167)**

교체 전:
```python
        except:
            pass
```
(driver.save_screenshot 호출 바로 다음 except 블록)

교체 후:
```python
        except Exception:
            pass
```

**변경 3: p_float() 수수료 파싱 헬퍼 (line 333)**

교체 전:
```python
            def p_float(v):
                try: 
                    return float(str(v).replace(',', '').replace('%',''))
                except: 
                    return 0.0
```

교체 후:
```python
            def p_float(v):
                try:
                    return float(str(v).replace(',', '').replace('%', ''))
                except (ValueError, TypeError, AttributeError):
                    return 0.0
```
  </action>
  <verify>
    <automated>python -c "content=open('etl_process.py',encoding='utf-8').read(); print('bare except count:', content.count('except:')); print('syntax ok') if __import__('ast').parse(content) else None"</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "except:" etl_process.py` 결과가 0이어야 한다
    - `grep -c "ValueError, TypeError, AttributeError" etl_process.py` 결과가 1이어야 한다
    - `grep -c "except NoSuchElementException" etl_process.py` 결과가 2 이상이어야 한다
    - Python syntax: ok
  </acceptance_criteria>
  <done>etl_process.py에 bare except: 블록이 없다. p_float(), Excel 버튼 탐색, 스크린샷 저장 모두 구체적 예외 타입을 사용한다.</done>
</task>

</tasks>

<success_criteria>
- etl_process.py에 bare except: 가 0개다
- p_float() 가 (ValueError, TypeError, AttributeError) 를 잡는다
- Python 문법 오류 없음
</success_criteria>

<output>
완료 후 `.planning/phases/01-etl-안정성-강화/01-D-SUMMARY.md` 생성.
</output>
