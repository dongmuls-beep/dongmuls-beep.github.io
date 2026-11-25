# 홈 서버 운영 문서

일일 ETL과 시세 수집을 집 Ubuntu 서버에서 실행한다. 사이트 자체는 GitHub Pages가 서빙한다.
비밀 값과 주소는 이 문서에 적지 않는다 (`<server>`, `<tailscale-ip>` 표기).

## 구성

| 항목 | 위치 / 방식 |
|------|-------------|
| 접속 | 키 로그인만 허용(비밀번호·root 차단). 집 밖은 Tailscale: `ssh <user>@<tailscale-ip>` (접속 기기에도 Tailscale 필요) |
| 사이트 clone | `/var/www/etfsave` (+ `.venv`) |
| 일일 ETL | `~/etf-deploy/run-etl.sh`, system timer `etf-etl.timer` (09:00 KST), 결과를 deploy key로 `main`에 push |
| 시세 수집 | `~/etf-deploy/run-prices.sh`, user timer `etf-prices.timer` (14:30 KST), `prices/*.json`·`prices-meta.json`을 deploy key로 `main`에 push (ETL과 같은 lock 사용) |
| 비밀 값 | `~/.etf-env` (권한 600): `GAS_WEB_APP_URL`, `DATA_GO_KR_KEY` — 저장소 커밋 금지 |
| 유닛·스크립트 원본 | 이 저장소 `deploy/` |

GitHub Actions `Daily ETF Data Update`와 `Daily ETF Price Update`는 비활성화 상태다. 다시 켜면 서버와 이중 실행되어 커밋이 충돌한다.

## 자주 쓰는 명령 (서버에서)

```bash
systemctl list-timers etf-etl.timer                 # 다음 ETL 시각
journalctl -u etf-etl.service -n 50 --no-pager      # ETL 로그
systemctl --user list-timers etf-prices.timer       # 시세 타이머
journalctl --user -u etf-prices.service -n 50 --no-pager
sudo systemctl start etf-etl.service                # ETL 수동 실행
~/etf-deploy/run-prices.sh                          # 시세 수집 수동 실행
DRY_RUN=1 ~/etf-deploy/run-etl.sh                   # push 없이 ETL 전체 시험
cat /var/www/etfsave/prices-meta.json               # 시세 기준일·누락
```

## 복구

- **정전/재부팅**: BIOS가 전원 복구 시 자동 부팅. ssh, nginx, tailscaled, timer는 부팅 시 자동 시작. `Persistent=true`라 놓친 실행은 부팅 후 보정된다.
- **ETL 실패**: 로그 확인 → `DRY_RUN=1`로 재현. 흔한 원인: KOFIA 화면 변경(Selenium), `GAS_WEB_APP_URL` 오류, git push 충돌(`git pull --rebase` 후 재실행).
- **비밀 값 교체**: `ssh -t`로 접속해 `nano ~/.etf-env` (파일 권한 600 유지, 값 끝에 공백·한글 안내문 남기지 말 것).
- **Tailscale 끊김**: 관리 화면에서 기기 `Disable key expiry`가 켜져 있는지 확인.
- **deploy key 교체**: 서버에서 `~/.ssh/id_ed25519_deploy` 재생성 후 GitHub 저장소 Settings → Deploy keys에 쓰기 권한으로 등록.

## 주의

- 서버 `sudo`는 비밀번호가 필요하다(임시 NOPASSWD 제거됨).
- 로컬 개발 PC에서 push할 때는 먼저 `git pull --rebase origin main` (서버가 매일 커밋한다).
- 시세 데이터(`prices/`, `prices-meta.json`)는 2026-11-25부터 비공개: KRX 재배포 허용 확인 전까지 저장소에서 제거하고 `.gitignore`에 넣었다. 서버 `run-prices.sh`는 `git add` 단계에서 실패해 push하지 않는다(타이머는 그대로라 매일 실패 로그가 남음). 포트폴리오 페이지(`/portfolio/`)는 시세를 못 불러와 계산이 비는 상태.
