# 랜덤 조합 디펜스 in City

랜덤 뽑기로 얻는 도시 수비대를 조합해 40라운드 동안 도시를 지키는 싱글 플레이 디펜스 게임.

기술 스택: TypeScript + Vite + Phaser 3 + Tauri 2

## 개발 환경 준비 (Windows, 최초 1회)

1. [Node.js LTS](https://nodejs.org/) 설치
2. [Rust](https://www.rust-lang.org/tools/install) 설치 (rustup-init.exe)
3. Microsoft C++ Build Tools + WebView2 (대부분 Windows 11에 기본 포함.
   빌드 에러 시 [Tauri 사전 요구사항](https://tauri.app/start/prerequisites/) 참고)
4. 프로젝트 폴더에서:
   ```
   yarn
   ```

## 실행

| 명령 | 설명 |
| --- | --- |
| `yarn dev` | 브라우저에서 게임 실행 (http://localhost:1420) — 개발 중 기본 |
| `yarn typecheck` | 타입 검사 |
| `yarn tauri dev` | 데스크톱 창으로 실행 (최초 실행 시 Rust 컴파일로 수 분 소요) |
| `yarn tauri build` | Windows 설치본(msi/nsis) 빌드 → `src-tauri/target/release/bundle/` |

## 조작

- **유닛 뽑기** 버튼: 20G로 랜덤 유닛 획득 (자동 배치)
- 유닛 클릭: 선택 & 정보 확인 / 선택 후 빈 칸 클릭: 이동
- **합성**: 같은 유닛 2기 보유 시 패널의 합성 버튼 → 상위 등급 랜덤 유닛 획득
- **초월 조합**: 패널의 레시피대로 재료 3기를 모으면 초월 유닛 제작 (재료 소모)
- **데미지 타입**: ⚔물리는 몹 방어력에 감소, 🔮마법은 방어 무시. 방깎 유닛(폭발물 처리반·국정원 요원·아마겟돈 드론)으로 물리 화력 극대화
- **지원 카드**: 5/10/15/20/25/30/35 라운드 클리어 시 카드 3장 중 1장 선택 (공격력·공속·사거리 증가, 물리/마법 특화, 골드, 데스 회복 등 10종 — 누적 적용)
- 몹이 50마리를 넘으면 데스 카운트 감소, 0이 되면 패배
- 10/20/30/40 라운드 보스는 제한 시간 내 처치 필수 (20R 장갑 수송차는 고방어 — 마법/방깎 필요)

## 데스크톱 기능

- **세이브**: 최고 라운드/승리/판수 기록이 자동 저장 (Tauri: 앱 데이터 폴더 JSON, 브라우저: localStorage)
- **설정(⚙)**: 볼륨 슬라이더, 전체화면 전환 — 타이틀 우상단 / 게임 중 상단바
- Windows 빌드: `yarn tauri build` → `src-tauri/target/release/bundle/msi` 및 `nsis`

## 밸런스 검증

`node --experimental-strip-types scripts/balance-sim.ts` — 무난한 플레이어 봇 400판 시뮬레이션.
현재 밸런스 기준 봇 승률 약 57% (실제 플레이어는 배치·타이밍 최적화로 더 높음).
밸런스 수치는 전부 `src/data/`에 있으므로 수정 후 시뮬레이터로 재검증하면 된다.

## 구조

```
src/
├─ scenes/    # Boot(텍스처 생성) → Title → Game
├─ entities/  # Mob(경로 순환), Unit(자동 공격)
├─ systems/   # WaveSystem(라운드/스폰/승패)
├─ data/      # config, units, waves — 밸런스 수치 전부 여기
├─ ui/        # DOM 오버레이 HUD
└─ core/      # PathLoop 등 유틸
src-tauri/    # Rust: 세이브 파일 I/O(save_data/load_data), 창 설정
```
