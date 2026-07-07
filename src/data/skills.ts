import type { Family } from "./units";

/**
 * 스킬 시스템 (GDD 1.7) — 안흔함부터 등급별 스킬 보유.
 * 원칙: 스킬은 등급 DPS 예산 안에서 화력을 재분배한다 — 기본 공격력을 깎아 스킬로 옮겼다(v3.7).
 * 게임(Unit.ts)과 시뮬 봇(balance-sim.ts)이 이 파일의 데이터·기대값 수식을 공유한다.
 *
 * 기획 원본: docs/characters/*.md "🎭 스킬 기획" 표.
 * 구현 대체 매핑(엔진 단순화): 넉백→경직, 장판→광역 감속, 직선 관통/연쇄→근접 k대상.
 */

export type SkillKind = "passive" | "attack" | "active";

/** 패시브 발동 조건 */
export type PassiveWhen =
  | "always"
  | "day" // 낮 페이즈
  | "night" // 밤 페이즈
  | "boss" // 대상이 보스
  | "lowHp" // 대상 HP 50% 이하
  | "farHalf" // 대상이 사거리 바깥쪽 절반
  | "crowd" // 사거리 내 몹 crowdMin 이상
  | "stack" // 같은 대상 연속 공격 중첩 (stackMax)
  | "newTarget" // 직전과 다른 대상
  | "stunned" // 대상이 기절 중
  | "shredded" // 대상이 방깎 중
  | "armored" // 대상 방어력 50 이상
  | "swift" // 대상이 라운드 기준 속도보다 빠름 (비둘기 계열)
  | "golden" // 대상이 황금 비둘기
  | "lowDeath" // 데스 카운트 5 이하
  | "firstOfRound"; // 라운드 첫 공격

export interface SkillDef {
  kind: SkillKind;
  name: string;
  desc: string;

  // ----- 패시브 -----
  when?: PassiveWhen;
  atkMul?: number;
  cdMul?: number; // <1 = 빠름 (조건: always/day/night/crowd만 허용 — 대상 무관)
  rangeMul?: number; // always 전용
  stackMax?: number;
  crowdMin?: number;
  aura?: { family: Family | "all"; atkMul?: number; cdMul?: number }; // 필드 아군 전체(자신 포함)
  allyFamily?: Family | "common"; // 필드에 해당 계열 아군 존재 시 atkMul/cdMul 적용
  allyScaleAtk?: { per: number; cap: number }; // 아군 1기당 공격력 (t1·t6)
  killGoldMul?: number; // 자신이 처치한 몹 골드 배율
  roundClearGoldMul?: number; // 라운드 클리어 골드 배율 (필드 존재 시)
  dayStartGold?: number; // 낮 시작 시 골드
  storyDpsMul?: number; // 스토리 존 파견 DPS 배율
  moveSpeedMul?: number; // RTS 이동 속도 배율
  slowPct?: number; // 패시브: 모든 명중에 감속 / 공격 스킬: 스킬 명중에 감속
  slowMs?: number;
  killHaste?: number; // 처치 시 남은 쿨다운 ×값 (sn5)
  luckyReset?: number; // 공격마다 이 확률로 쿨다운 즉시 초기화 (t4)
  bossMagic?: boolean; // 보스 상대 물리→마법 판정 (t6)
  builtin?: boolean; // UnitDef 스탯(방깎·감속·기절·광역)의 재분류 — 표시 전용, 효과 중복 적용 금지

  // ----- 공격 스킬 (everyN회 공격마다 기본 공격을 대체) -----
  everyN?: number;
  pct?: number; // 대상당 피해 (기본 공격의 %, 0 = 효과만)
  hits?: number; // 연타 수 (기본 1)
  targets?: number; // 가까운 k대상 (-1 = 사거리 내 전체)
  radius?: number; // 대상 중심 광역 (targets보다 우선)
  crowdScalePct?: number; // 명중 대상 1기 초과당 pct 가산 (tf5)
  targetMode?: "strongest"; // 사거리 내 최대 HP 대상 우선
  magic?: boolean; // 이 스킬만 마법 판정
  stunMs?: number;
  shredAmt?: number;
  shredMs?: number;
  markMul?: number; // 받는 피해 증가 마킹
  markMs?: number;
  dotPctPerSec?: number; // 도트 (마법 판정)
  dotMs?: number;
  executePct?: number; // radius 내 HP 비율 이하 즉시 처치 (보스·황금 제외)
  buffMs?: number; // 자기 버프
  buffCdMul?: number;
  buffAtkMul?: number;
  buffSplashMul?: number;
  skipNext?: boolean; // 발동 후 다음 공격 1회 쉼 (sn4)

  // ----- 액티브 (유닛 선택 후 발동 버튼) -----
  cooldownSec?: number;
  freezeMs?: number; // 필드 몹 전체 정지
  teamCdMul?: number; // 아군 전체 버프
  teamAtkMul?: number;
  teamMs?: number;
  selfCdMul?: number;
  selfMs?: number;
}

const P = (s: Omit<SkillDef, "kind">): SkillDef => ({ kind: "passive", when: "always", ...s });
const A = (s: Omit<SkillDef, "kind">): SkillDef => ({ kind: "attack", ...s });
const ACT = (s: Omit<SkillDef, "kind">): SkillDef => ({ kind: "active", ...s });

/** 유닛 id → 스킬 목록. 흔함 등급은 스킬 없음 (GDD 1.7). */
export const SKILLS: Record<string, SkillDef[]> = {
  // ===== 안흔함 — 패시브 1 (연출 없음) =====
  dv2: [P({ name: "멀티 콜", desc: "사거리 내 몹 3마리↑면 공격 주기 -10%", when: "crowd", crowdMin: 3, cdMul: 0.9 })],
  pc2: [P({ name: "짬에서 나오는 바이브", desc: "같은 대상 연속 공격마다 피해 +3% (최대 5중첩)", when: "stack", stackMax: 5, atkMul: 1.03 })],
  sn2: [P({ name: "바람 계산", desc: "사거리 바깥쪽 절반의 적에게 피해 +20%", when: "farHalf", atkMul: 1.2 })],
  dr2: [P({ name: "완벽한 구도", desc: "체력 50% 이하 몹에게 피해 +15%", when: "lowHp", atkMul: 1.15 })],
  dm2: [P({ name: "약점 탐지", desc: "공격 시 방어력 -8 (3초)", builtin: true })],
  tf2: [P({ name: "수신호", desc: "공격 시 감속 25% (1.2초)", builtin: true })],

  // ===== 특별함 — 패시브 1 + 공격 스킬 1 (가벼운 이펙트) =====
  dv3: [
    P({ name: "콜 배정", desc: "필드의 배달 계열 공속 +5%", aura: { family: "delivery", cdMul: 0.95 } }),
    A({ name: "피크 타임", desc: "12회마다 3연속 투척 (각 100%)", everyN: 12, hits: 3, pct: 100 }),
  ],
  pc3: [
    P({ name: "강행 돌파", desc: "보스에게 피해 +15%", when: "boss", atkMul: 1.15 }),
    A({ name: "고무탄 3점사", desc: "10회마다 3점사 (각 70%)", everyN: 10, hits: 3, pct: 70 }),
  ],
  sn3: [
    P({ name: "집중 조준", desc: "같은 대상 2발째부터 피해 +25%", when: "stack", stackMax: 1, atkMul: 1.25 }),
    A({ name: "헤드샷", desc: "8회마다 크리티컬 250%", everyN: 8, pct: 250 }),
  ],
  dr3: [
    P({ name: "광역 정찰", desc: "범위 피해 (반경 60)", builtin: true }),
    A({ name: "선회 기총소사", desc: "9회마다 근접 3몹에게 각 80%", everyN: 9, targets: 3, pct: 80 }),
  ],
  dm3: [
    P({ name: "구조 해석", desc: "공격 시 방어력 -15 (3초)", builtin: true }),
    A({ name: "성형 작약", desc: "7회마다 반경 40 광역 120%", everyN: 7, radius: 40, pct: 120 }),
  ],
  tf3: [
    P({ name: "정지선", desc: "공격 시 감속 40% (1.5초)", builtin: true }),
    A({ name: "방패 밀치기", desc: "10회마다 100% + 경직 0.4초", everyN: 10, pct: 100, stunMs: 400 }),
  ],

  // ===== 희귀함 — 패시브 2 + 공격 스킬 2 (가벼운 모션+이펙트) =====
  dv4: [
    P({ name: "물류 최적화", desc: "공격 주기 -5%", cdMul: 0.95 }),
    P({ name: "새벽의 낭만", desc: "밤에 공격 주기 -5% 추가", when: "night", cdMul: 0.95 }),
    A({ name: "박스 3단 적재", desc: "8회마다 근접 3몹에게 각 120%", everyN: 8, targets: 3, pct: 120 }),
    A({ name: "파렛트 슛", desc: "15회마다 근접 6몹에게 각 90%", everyN: 15, targets: 6, pct: 90 }),
  ],
  pc4: [
    P({ name: "지휘 체계", desc: "필드의 경찰 계열 공격력 +8%", aura: { family: "police", atkMul: 1.08 } }),
    P({ name: "작전 성공률 100%", desc: "보스에게 피해 +20%", when: "boss", atkMul: 1.2 }),
    A({ name: "일제 사격 지시", desc: "10회마다 2연타 (각 100%)", everyN: 10, hits: 2, pct: 100 }),
    A({ name: "진입 명령", desc: "18회마다 마킹 — 받는 피해 +15% (3초)", everyN: 18, pct: 100, markMul: 1.15, markMs: 3000 }),
  ],
  sn4: [
    P({ name: "전자기 가속", desc: "사거리 바깥쪽 절반의 적에게 피해 +25%", when: "farHalf", atkMul: 1.25 }),
    P({ name: "첫인상", desc: "새 대상 첫 타격 피해 +30%", when: "newTarget", atkMul: 1.3 }),
    A({ name: "관통 레일샷", desc: "6회마다 근접 4몹에게 각 130%", everyN: 6, targets: 4, pct: 130 }),
    A({ name: "과부하 방출", desc: "20회마다 400% — 이후 1회 냉각", everyN: 20, pct: 400, skipNext: true }),
  ],
  dr4: [
    P({ name: "시스템 프리즈", desc: "공격 시 기절 0.8초", builtin: true }),
    P({ name: "백도어", desc: "기절 중인 대상에게 피해 +30%", when: "stunned", atkMul: 1.3 }),
    A({ name: "디도스", desc: "10회마다 반경 60 몹 기절 0.4초", everyN: 10, radius: 60, pct: 0, stunMs: 400 }),
    A({ name: "랜섬웨어", desc: "16회마다 도트 — 3초간 초당 40%", everyN: 16, pct: 100, dotPctPerSec: 40, dotMs: 3000 }),
  ],
  dm4: [
    P({ name: "취약점 사전 점검", desc: "공격 시 방어력 -30 (3초)", builtin: true }),
    P({ name: "기록 말소", desc: "자신이 처치한 몹 골드 +15%", killGoldMul: 1.15 }),
    A({ name: "무음 폭파", desc: "9회마다 반경 45 광역 110%", everyN: 9, radius: 45, pct: 110 }),
    A({ name: "침투 각인", desc: "14회마다 100% + 방깎 -60 (5초)", everyN: 14, pct: 100, shredAmt: 60, shredMs: 5000 }),
  ],
  tf4: [
    P({ name: "행정 처리", desc: "공격 시 감속 50% (1.8초)", builtin: true }),
    P({ name: "예산 배정", desc: "라운드 클리어 골드 +5%", roundClearGoldMul: 1.05 }),
    A({ name: "이면도로 지정", desc: "12회마다 반경 60 감속 60% (2초)", everyN: 12, radius: 60, pct: 0, slowPct: 0.6, slowMs: 2000 }),
    A({ name: "재개발 고시", desc: "20회마다 반경 70 감속 30% (4초)", everyN: 20, radius: 70, pct: 0, slowPct: 0.3, slowMs: 4000 }),
  ],

  // ===== 전설 — 패시브 3 + 공격 스킬 3 (+일부 액티브) =====
  dv5: [
    P({ name: "의전 프로토콜", desc: "필드의 배달 계열 공속 +10%", aura: { family: "delivery", cdMul: 0.9 } }),
    P({ name: "총알 결재", desc: "사거리 내 몹 5마리↑면 공격 주기 -12%", when: "crowd", crowdMin: 5, cdMul: 0.88 }),
    P({ name: "엘리베이터는 안 기다림", desc: "이동 속도 +50%", moveSpeedMul: 1.5 }),
    A({ name: "초음속 서류철", desc: "7회마다 근접 3몹에게 각 130%", everyN: 7, targets: 3, pct: 130 }),
    A({ name: "반려 처리", desc: "12회마다 2연타 (각 150%)", everyN: 12, hits: 2, pct: 150 }),
    A({ name: "회장님의 의중", desc: "25회마다 근접 5몹에게 각 200%", everyN: 25, targets: 5, pct: 200 }),
  ],
  pc5: [
    P({ name: "치안 장악", desc: "필드의 경찰 계열 공격력 +12%", aura: { family: "police", atkMul: 1.12 } }),
    P({ name: "베테랑의 눈", desc: "보스에게 피해 +25%", when: "boss", atkMul: 1.25 }),
    P({ name: "금요 야식 순찰", desc: "밤에 공격 주기 -10%", when: "night", cdMul: 0.9 }),
    A({ name: "일제 사격", desc: "8회마다 반경 60 광역 120%", everyN: 8, radius: 60, pct: 120 }),
    A({ name: "지휘봉 낙인", desc: "15회마다 마킹 — 받는 피해 +20% (4초)", everyN: 15, pct: 100, markMul: 1.2, markMs: 4000 }),
    A({ name: "무전 한 마디", desc: "20회마다 근접 8몹 80% + 감속 50% (1초)", everyN: 20, targets: 8, pct: 80, slowPct: 0.5, slowMs: 1000 }),
    ACT({ name: "총동원령", desc: "5초간 아군 전체 공속 +30% (쿨 60초)", cooldownSec: 60, teamCdMul: 0.7, teamMs: 5000 }),
  ],
  sn5: [
    P({ name: "존재 말소", desc: "같은 대상 연속 저격마다 피해 +15% (최대 3중첩)", when: "stack", stackMax: 3, atkMul: 1.15 }),
    P({ name: "별똥별 리듬", desc: "처치 시 남은 쿨다운 절반", killHaste: 0.5 }),
    P({ name: "새총 감각", desc: "사거리 +10%", rangeMul: 1.1 }),
    A({ name: "기록되지 않는 탄환", desc: "6회마다 방어 무시 250%", everyN: 6, pct: 250, magic: true }),
    A({ name: "이중 탄착", desc: "11회마다 근접 2몹 관통 (각 180%)", everyN: 11, targets: 2, pct: 180 }),
    A({ name: "밤하늘의 섬광", desc: "22회마다 최대 HP 대상 500%", everyN: 22, pct: 500, targetMode: "strongest" }),
  ],
  dr5: [
    P({ name: "광역 폭격 관제", desc: "범위 피해 (반경 80)", builtin: true }),
    P({ name: "마더의 총애", desc: "필드의 드론 계열 공격력 +10%", aura: { family: "drone", atkMul: 1.1 } }),
    P({ name: "신호 동기화", desc: "명중 시 감속 10% (1초)", slowPct: 0.1, slowMs: 1000 }),
    A({ name: "드론 편대 스윕", desc: "9회마다 반경 90 광역 140%", everyN: 9, radius: 90, pct: 140 }),
    A({ name: "CCTV 락온", desc: "14회마다 마킹 — 받는 피해 +10% (3초)", everyN: 14, pct: 100, markMul: 1.1, markMs: 3000 }),
    A({ name: "마더 프로토콜", desc: "24회마다 사거리 내 전체 60%", everyN: 24, targets: -1, pct: 60 }),
  ],
  dm5: [
    P({ name: "철거 반경", desc: "범위 피해 (반경 90)", builtin: true }),
    P({ name: "구조 붕괴", desc: "공격 시 방어력 -45 (3초)", builtin: true }),
    P({ name: "보상 협상", desc: "자신이 처치한 몹 골드 +10%", killGoldMul: 1.1 }),
    A({ name: "크레인볼 풀스윙", desc: "8회마다 반경 130 광역 160%", everyN: 8, radius: 130, pct: 160 }),
    A({ name: "이 구역, 갑니다", desc: "15회마다 근접 6몹에게 각 120%", everyN: 15, targets: 6, pct: 120 }),
    A({ name: "총회 선언", desc: "25회마다 5초간 스플래시 반경 +50%", everyN: 25, pct: 100, buffMs: 5000, buffSplashMul: 1.5 }),
  ],
  tf5: [
    P({ name: "도시 연설", desc: "범위 피해 (반경 100)", builtin: true }),
    P({ name: "시정 운영", desc: "필드 아군 전체 공격력 +5%", aura: { family: "all", atkMul: 1.05 } }),
    P({ name: "지하철 출근", desc: "낮 시작 시 골드 +20", dayStartGold: 20 }),
    A({ name: "신호등 연설", desc: "10회마다 반경 100 광역 140% + 감속 20%", everyN: 10, radius: 100, pct: 140, slowPct: 0.2, slowMs: 1000 }),
    A({ name: "보도블럭 교체", desc: "16회마다 반경 80 감속 30% (3초)", everyN: 16, radius: 80, pct: 0, slowPct: 0.3, slowMs: 3000 }),
    A({ name: "도시의 함성", desc: "22회마다 광역 100% — 명중 1기당 +20%", everyN: 22, radius: 100, pct: 100, crowdScalePct: 20 }),
    ACT({ name: "일단 멈춤", desc: "필드 몹 전체 1.5초 정지 (쿨 90초)", cooldownSec: 90, freezeMs: 1500 }),
  ],

  // ===== 초월 — 패시브 5 + 공격 스킬 5 (+일부 액티브) =====
  t1: [
    P({ name: "시민의 염원", desc: "필드 아군 1기당 공격력 +1% (최대 +20%)", allyScaleAtk: { per: 0.01, cap: 0.2 } }),
    P({ name: "보스 헌터", desc: "보스에게 피해 +40%", when: "boss", atkMul: 1.4 }),
    P({ name: "수호 본능", desc: "데스 5 이하일 때 공격력 +25%", when: "lowDeath", atkMul: 1.25 }),
    P({ name: "평범의 힘", desc: "흔함 아군이 있으면 공속 +10%", allyFamily: "common", cdMul: 0.9 }),
    P({ name: "불침번", desc: "공격력 +5%", atkMul: 1.05 }),
    A({ name: "응축 펀치", desc: "5회마다 200%", everyN: 5, pct: 200 }),
    A({ name: "가디언 러시", desc: "9회마다 근접 4몹에게 각 150%", everyN: 9, targets: 4, pct: 150 }),
    A({ name: "스카이라인 브레이커", desc: "14회마다 400%", everyN: 14, pct: 400 }),
    A({ name: "연쇄 충격파", desc: "18회마다 근접 3몹 연쇄 (각 180%)", everyN: 18, targets: 3, pct: 180 }),
    A({ name: "영웅의 표식", desc: "25회마다 최대 HP 대상 600%", everyN: 25, pct: 600, targetMode: "strongest" }),
    ACT({ name: "도시의 수호자", desc: "8초간 공속 2배 (쿨 90초)", cooldownSec: 90, selfCdMul: 0.5, selfMs: 8000 }),
  ],
  t2: [
    P({ name: "중장비 합체", desc: "범위 피해 (반경 120)", builtin: true }),
    P({ name: "유압 증폭", desc: "사거리 내 몹 5마리↑면 피해 +25%", when: "crowd", crowdMin: 5, atkMul: 1.25 }),
    P({ name: "현장 반장", desc: "필드 아군 전체 공격력 +8%", aura: { family: "all", atkMul: 1.08 } }),
    P({ name: "금일 작업 개시", desc: "라운드 첫 공격 300%", when: "firstOfRound", atkMul: 3 }),
    P({ name: "고철의 긍지", desc: "방어력 50 이상 적에게 피해 +30%", when: "armored", atkMul: 1.3 }),
    A({ name: "크레인 스윙 360", desc: "7회마다 반경 160 광역 180%", everyN: 7, radius: 160, pct: 180 }),
    A({ name: "덤프트럭의 심장", desc: "12회마다 3초간 공속 +40%", everyN: 12, pct: 100, buffMs: 3000, buffCdMul: 0.71 }),
    A({ name: "굴착 콤보", desc: "9회마다 3연타 (각 100%)", everyN: 9, hits: 3, pct: 100 }),
    A({ name: "파일 드라이버", desc: "16회마다 300% + 방깎 -20", everyN: 16, pct: 300, shredAmt: 20, shredMs: 3000 }),
    A({ name: "작업 종료 선언", desc: "25회마다 반경 200의 HP 20% 이하 몹 처치", everyN: 25, pct: 100, radius: 200, executePct: 0.2 }),
  ],
  t3: [
    P({ name: "프로세스 분산", desc: "같은 대상 연속 공격마다 +10% (최대 5중첩)", when: "stack", stackMax: 5, atkMul: 1.1 }),
    P({ name: "자수 유도", desc: "자신이 처치한 몹 골드 +15%", killGoldMul: 1.15 }),
    P({ name: "새벽 3시", desc: "밤에 공격 주기 -13%", when: "night", cdMul: 0.87 }),
    P({ name: "백신 우회", desc: "보스에게 피해 +30%", when: "boss", atkMul: 1.3 }),
    P({ name: "서버 상주", desc: "스토리 존 파견 DPS +20%", storyDpsMul: 1.2 }),
    A({ name: "데이터 스파이크", desc: "6회마다 근접 3몹 관통 (각 200%)", everyN: 6, targets: 3, pct: 200 }),
    A({ name: "글리치 텔레포트", desc: "10회마다 즉시 2연타 (각 100%)", everyN: 10, hits: 2, pct: 100 }),
    A({ name: "패킷 폭풍", desc: "15회마다 반경 80 광역 150%", everyN: 15, radius: 80, pct: 150 }),
    A({ name: "좀비 프로세스", desc: "18회마다 도트 — 4초간 초당 60%", everyN: 18, pct: 100, dotPctPerSec: 60, dotMs: 4000 }),
    A({ name: "시스템 셧다운", desc: "24회마다 350% + 기절 1.5초", everyN: 24, pct: 350, stunMs: 1500 }),
  ],
  t4: [
    P({ name: "뇌운", desc: "범위 피해 (반경 100)", builtin: true }),
    P({ name: "정전기", desc: "공격 시 감속 30% (1.5초)", builtin: true }),
    P({ name: "기상 오보", desc: "공격력 +5%", atkMul: 1.05 }),
    P({ name: "하늘의 라이벌", desc: "빠른 적(비둘기 계열)에게 피해 +30%", when: "swift", atkMul: 1.3 }),
    P({ name: "장마 전선", desc: "공격마다 5% 확률로 쿨다운 초기화", luckyReset: 0.05 }),
    A({ name: "낙뢰", desc: "5회마다 근접 3몹에게 각 160%", everyN: 5, targets: 3, pct: 160 }),
    A({ name: "체인 라이트닝", desc: "9회마다 근접 4몹 연쇄 (각 140%)", everyN: 9, targets: 4, pct: 140 }),
    A({ name: "우박", desc: "14회마다 반경 80 광역 100% + 감속 40% (3초)", everyN: 14, radius: 80, pct: 100, slowPct: 0.4, slowMs: 3000 }),
    A({ name: "스콜", desc: "18회마다 반경 120 광역 200%", everyN: 18, radius: 120, pct: 200 }),
    A({ name: "번개 대풍", desc: "26회마다 사거리 내 전체 100% + 감속 60%", everyN: 26, targets: -1, pct: 100, slowPct: 0.6, slowMs: 1000 }),
  ],
  t5: [
    P({ name: "융단 폭격", desc: "범위 피해 (반경 70)", builtin: true }),
    P({ name: "장갑 해체", desc: "광역 방깎 -60 (3초)", builtin: true }),
    P({ name: "마더 링크", desc: "드론 계열 아군이 있으면 공속 +13%", allyFamily: "drone", cdMul: 0.87 }),
    P({ name: '"정비용입니다"', desc: "방깎 상태의 적에게 피해 +25%", when: "shredded", atkMul: 1.25 }),
    P({ name: "급식소 순찰 루트", desc: "황금 비둘기에게 피해 +100%", when: "golden", atkMul: 2 }),
    A({ name: "포드 일제 사출", desc: "6회마다 반경 100 광역 130%", everyN: 6, radius: 100, pct: 130 }),
    A({ name: "조준 레이저 그리드", desc: "11회마다 근접 6몹 방깎 -80 (3초)", everyN: 11, targets: 6, pct: 0, shredAmt: 80, shredMs: 3000 }),
    A({ name: "선회 기총", desc: "9회마다 5연타 (각 60%)", everyN: 9, hits: 5, pct: 60 }),
    A({ name: "스텔스 폭격", desc: "16회마다 반경 90 광역 250%", everyN: 16, radius: 90, pct: 250 }),
    A({ name: "최종 정비 모드", desc: "24회마다 5초간 공속 +50%", everyN: 24, pct: 100, buffMs: 5000, buffCdMul: 0.67 }),
  ],
  t6: [
    P({ name: "도시 권능", desc: "범위 피해 (반경 110)", builtin: true }),
    P({ name: "행정+치안", desc: "필드 아군 전체 공격력 +10%", aura: { family: "all", atkMul: 1.1 } }),
    P({ name: "시민 함성", desc: "필드 아군 1기당 공격력 +1.5% (최대 +30%)", allyScaleAtk: { per: 0.015, cap: 0.3 } }),
    P({ name: "두 개의 인생", desc: "낮에 공격력 +15%", when: "day", atkMul: 1.15 }),
    P({ name: "마스터 키", desc: "보스 한정 방어 무시", bossMagic: true }),
    A({ name: "황금 호루라기", desc: "7회마다 반경 130 광역 170% + 감속 30%", everyN: 7, radius: 130, pct: 170, slowPct: 0.3, slowMs: 1500 }),
    A({ name: "이중 결재", desc: "12회마다 광역 2연발 (각 120%)", everyN: 12, hits: 2, radius: 110, pct: 120 }),
    A({ name: "도시 개조 명령", desc: "15회마다 반경 90 광역 120% + 감속 30% (2초)", everyN: 15, radius: 90, pct: 120, slowPct: 0.3, slowMs: 2000 }),
    A({ name: "치안 유지 사격", desc: "10회마다 근접 4몹에게 각 150%", everyN: 10, targets: 4, pct: 150 }),
    A({ name: "수도 이전급 한 방", desc: "28회마다 700%", everyN: 28, pct: 700 }),
    ACT({ name: '"퇴근들 하세요"', desc: "몹 전체 2.5초 정지 + 5초 아군 공속 +25% (쿨 120초)", cooldownSec: 120, freezeMs: 2500, teamCdMul: 0.8, teamMs: 5000 }),
  ],
};

export function skillsOf(unitId: string): SkillDef[] {
  return SKILLS[unitId] ?? [];
}

export function activeSkill(unitId: string): SkillDef | null {
  return skillsOf(unitId).find((s) => s.kind === "active") ?? null;
}

// ---------------------------------------------------------------------------
// 시뮬 봇용 기대값 수식 — 게임 데이터와 같은 파일에 두어 동기화를 강제한다.
// (스킬·수치를 바꾸면 이 근사도 같은 커밋에서 검증된다)
// ---------------------------------------------------------------------------

/** 패시브 조건별 평균 가동률 (필드전 / 보스전) */
const UPTIME: Record<PassiveWhen, [number, number]> = {
  always: [1, 1],
  day: [0.5, 0.5],
  night: [0.5, 0.5],
  boss: [0, 1],
  lowHp: [0.3, 0.3],
  farHalf: [0.35, 0.35],
  crowd: [0.7, 0],
  stack: [0.5, 1], // 보스전은 풀중첩 유지
  newTarget: [0.5, 0],
  stunned: [0.25, 0.1],
  shredded: [0.5, 0.5],
  armored: [0.33, 0.5],
  swift: [0.33, 0],
  golden: [0, 0],
  lowDeath: [0.2, 0.2],
  firstOfRound: [0.05, 0.02],
};

/** 공격 스킬의 평균 유효 대상 수 (필드는 라인이 뭉친다고 가정) */
function expectedTargets(s: SkillDef, forBoss: boolean): number {
  if (forBoss) return 1;
  if (s.radius) return Math.min(6, 1 + s.radius / 50);
  if (s.targets === -1) return 5;
  if (s.targets) return Math.min(s.targets, 3);
  return 1;
}

/**
 * 유닛 1기의 스킬 기대 DPS 배율 (오라 제외 — 오라는 팀 단위로 별도 적용).
 * 게임 엔진의 발동 규칙(everyN 대체 발동, 패시브 조건)을 기대값으로 접은 근사.
 */
export function skillDpsMul(unitId: string, forBoss: boolean): number {
  let atkMul = 1;
  let cdMul = 1;
  let cycleMul = 1;

  for (const s of skillsOf(unitId)) {
    if (s.builtin) continue;
    if (s.kind === "passive") {
      const up = UPTIME[s.when ?? "always"][forBoss ? 1 : 0];
      if (s.atkMul) {
        const stacks = s.when === "stack" ? (s.stackMax ?? 1) : 1;
        atkMul *= 1 + (s.atkMul - 1) * stacks * up;
      }
      if (s.cdMul) cdMul *= 1 - (1 - s.cdMul) * up;
      if (s.allyScaleAtk) atkMul *= 1 + Math.min(s.allyScaleAtk.cap, s.allyScaleAtk.per * 15);
      // allyFamily 조건은 대부분의 판에서 상시 충족(흔함·드론 상주) — always 가동률로 근사
      if (s.killHaste) cdMul *= forBoss ? 1 : 0.88;
      if (s.luckyReset) cdMul *= 1 - s.luckyReset * 0.9;
      continue;
    }
    if (s.kind === "attack" && s.everyN) {
      const n = s.everyN;
      const hits = s.hits ?? 1;
      const tg = expectedTargets(s, forBoss);
      let total = ((s.pct ?? 100) / 100) * hits * tg;
      if (s.crowdScalePct && !forBoss) total += ((s.crowdScalePct * (tg - 1)) / 100) * tg * 0.5;
      if (s.dotPctPerSec && s.dotMs) total += ((s.dotPctPerSec * s.dotMs) / 1000 / 100) * (forBoss ? 1 : 0.7);
      if (s.executePct && !forBoss) total += 1.5; // 막타 절약 근사
      if (s.markMul && s.markMs) atkMul *= 1 + (s.markMul - 1) * 0.4; // 팀 딜 증가를 자기 딜로 근사
      if (s.buffMs && s.buffCdMul) {
        const uptime = Math.min(1, s.buffMs / (n * 1500));
        cdMul *= 1 - (1 - s.buffCdMul) * uptime;
      }
      // everyN회 중 1회가 스킬로 대체: (n-1 + total) / n
      let cyc = (n - 1 + total) / n;
      if (s.skipNext) cyc *= n / (n + 1);
      cycleMul *= cyc;
    }
    // 액티브: 짧은 버프/정지 — 개별 DPS 기대값에서 제외 (팀 유틸)
  }
  return (atkMul * cycleMul) / cdMul;
}

/** 팀 오라 배율 — 대상 유닛에 적용되는 (atkMul, cdMul) 곱 */
export function teamAuraMul(
  teamIds: string[],
  targetFamily: Family | undefined
): { atkMul: number; cdMul: number } {
  let atkMul = 1;
  let cdMul = 1;
  for (const id of teamIds) {
    for (const s of skillsOf(id)) {
      if (s.kind !== "passive" || !s.aura) continue;
      if (s.aura.family === "all" || s.aura.family === targetFamily) {
        if (s.aura.atkMul) atkMul *= s.aura.atkMul;
        if (s.aura.cdMul) cdMul *= s.aura.cdMul;
      }
    }
  }
  return { atkMul, cdMul };
}

/** 공격 스킬의 방깎 기대치 (팀 최대 방깎 계산용 — 가동률 70% 근사) */
export function skillShredAmt(unitId: string): number {
  let best = 0;
  for (const s of skillsOf(unitId)) {
    if (s.kind === "attack" && s.shredAmt) best = Math.max(best, s.shredAmt * 0.7);
  }
  return best;
}

/** 보스 상대 마법 판정 여부 (t6 마스터 키) */
export function hasBossMagic(unitId: string): boolean {
  return skillsOf(unitId).some((s) => s.kind === "passive" && s.bossMagic);
}
