/**
 * 도파민 시스템 (v3.9) — 킬 스트릭 · 뽑기 잭팟/천장 · 속보 이벤트 · 변이 라운드 · 부스터.
 * 원칙: ① 전부 인게임 재화만 ② 이벤트는 보너스만, 페널티 없음 (황금 비둘기 원칙)
 *      ③ 골드·뽑기에 닿는 수치는 전부 여기 두고 balance-sim.ts가 같은 값으로 기대값 검증.
 *
 * 경제 예산 (봇 기준 판당 수입 대비): 스트릭 ~+8% · 변이 ~+6% · 속보 ~+4% · 잭팟 뽑기 +8%
 * → 합산 인플레는 v3.9 시뮬 재검증으로 밴드(40~60%) 확인 후 확정.
 */

// ---------- 🔥 킬 스트릭 ----------
export const STREAK_WINDOW_MS = 3000; // 이 간격 안에 연속 처치 시 스트릭 유지
export const STREAK_MIN = 5; // 표시·보너스 시작 스트릭
export const STREAK_GOLD_PER = 0.01; // 1킬당 골드 보너스 +1%
export const STREAK_GOLD_CAP = 0.1; // 최대 +10%
/** 스트릭 골드 배율 */
export function streakGoldMul(streak: number): number {
  if (streak < STREAK_MIN) return 1;
  return 1 + Math.min(STREAK_GOLD_CAP, streak * STREAK_GOLD_PER);
}
/** 시뮬 기대값: 필드 킬의 평균 스트릭 가동 배율 */
export const STREAK_SIM_MUL = 1.04;

// ---------- 🎰 뽑기 잭팟 & 천장 ----------
export const JACKPOT_CHANCE = 0.025; // 유료 뽑기당 "서비스!" 확률
export const JACKPOT_ROLLS: [number, number] = [1, 2]; // 무료 연속 뽑기 수 (균등)
export const PITY_LIMIT = 60; // 이 횟수 동안 전설이 안 나오면 다음 뽑기 전설 확정
export const PITY_MIN_ROUND = 21; // 전설이 뽑기 풀에 있는 구간부터 카운트/발동
export const NEAR_MISS_CHANCE = 0.2; // 특별함/희귀함 결과에 한 등급 위 색 스치기 연출

// ---------- 📰 속보 이벤트 (라운드 사이 · 보너스만) ----------
export const EVENT_CHANCE = 0.08; // 5R+ 비보스 라운드 클리어 시 발동 확률
export const EVENT_MIN_ROUND = 5;

export type CityEventId = "rain" | "fishbread" | "goldenFlock" | "nightMarket";
export interface CityEventDef {
  id: CityEventId;
  name: string;
  desc: string;
}
export const CITY_EVENTS: CityEventDef[] = [
  { id: "rain", name: "게릴라 소나기", desc: "다음 라운드 몹 이동속도 -30% — 물 들어올 때 노 젓기" },
  { id: "fishbread", name: "붕어빵 트럭 출몰", desc: "사장님이 수비대를 응원한다 — 골드 +60" },
  { id: "goldenFlock", name: "황금 비둘기 떼", desc: "✨ 황금 비둘기 2마리가 도시를 가로지른다" },
  { id: "nightMarket", name: "야시장 개장", desc: "이번 판 뽑기 비용 -2G" },
];
export const EVENT_RAIN_SLOW = 0.3; // 다음 라운드 몹 감속률
export const EVENT_FISHBREAD_GOLD = 60;
export const EVENT_GOLDEN_COUNT = 2;
export const EVENT_MARKET_DISCOUNT = 2;
/** 시뮬 기대값: 이벤트 1회당 평균 골드 등가 */
export const EVENT_SIM_GOLD = 65;

// ---------- 🎲 변이 라운드 (비보스 라운드 시작 시) ----------
export const MUTATOR_CHANCE = 0.05;
export type MutatorId = "golden" | "rush";
export interface MutatorDef {
  id: MutatorId;
  name: string;
  desc: string;
  goldMul: number; // 이 라운드 몹 골드 배율
  speedMul: number; // 이 라운드 몹 이동속도 배율 (러시 아워 = 리스크&리턴)
}
export const MUTATORS: MutatorDef[] = [
  { id: "golden", name: "💰 황금 라운드", desc: "이 라운드 몹 골드 ×2!", goldMul: 2, speedMul: 1 },
  { id: "rush", name: "🚨 러시 아워", desc: "몹이 빨라진다 — 대신 골드 ×2!", goldMul: 2, speedMul: 1.5 },
];
/** 시뮬 기대값: 변이 라운드의 평균 몹 골드 배율 (확률 × (배율-1)) */
export const MUTATOR_SIM_GOLD_MUL = 1 + MUTATOR_CHANCE * 1.0;

// ---------- 🎟 다음 판 부스터 (패배 위로 — 판 간 유지) ----------
export const HIDDEN_BASE = 0.06; // 흔함 뽑기의 히든 기본 확률
export const BOOSTER_PER_LOSS = 0.01; // 패배 1회당 히든 확률 +1%p
export const BOOSTER_CAP = 0.03; // 최대 +3%p — 승리 시 리셋
