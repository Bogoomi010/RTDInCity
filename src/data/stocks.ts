import type { CityEventId } from "./events";

/**
 * 📈 미니 주식 (v3.10) — 도시 증권거래소.
 * 설계 원칙 (밸런스):
 * - 기대수익(드리프트)은 라운드당 +0.5%로 미미 — 진짜 수익은 변동성 타이밍(저점 매수)에서 나온다
 * - 이론상 유저 엣지 상한 ≈ 판당 수입의 2~3% (완벽한 저점/급등 트레이딩 가정) — 시뮬 봇은 미투자,
 *   밴드(40~60%)에 영향 없음을 v3.10에서 검증
 * - 기회비용이 본체: 주식에 묻은 골드는 뽑기(유닛 복리)를 포기한 돈이다 — "지금 뽑을까, 모을까"
 * - 게임 종료 시 잔여 주식은 소멸 (골드는 판이 끝나면 무의미 — 중간에 팔아야 의미가 있다)
 */

export interface StockDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  vol: number; // 라운드당 변동폭 (±균등)
  jumpChance: number; // 급등/급락 확률
  eventBoost?: CityEventId; // 📰 속보 이벤트 연동 — 해당 이벤트 시 급등
  mutatorBoost?: "rush"; // 🎲 러시 아워 연동
}

export const STOCKS: StockDef[] = [
  {
    id: "fish",
    name: "붕어빵F&B",
    icon: "🐟",
    desc: "안정주 — 겨울마다 배당 같은 존재감",
    vol: 0.08,
    jumpChance: 0.06,
    eventBoost: "fishbread",
  },
  {
    id: "rider",
    name: "배달로켓",
    icon: "🛵",
    desc: "성장주 — 러시 아워에 강하다",
    vol: 0.12,
    jumpChance: 0.1,
    mutatorBoost: "rush",
  },
  {
    id: "redev",
    name: "재개발홀딩스",
    icon: "🏗",
    desc: "테마주 — 하이리스크 하이리턴",
    vol: 0.18,
    jumpChance: 0.14,
  },
];

export const STOCK_START_PRICE = 100;
export const STOCK_DRIFT = 0.005; // 라운드당 기대 +0.5%
export const STOCK_JUMP = 0.3; // 급등/급락 ±30%
export const STOCK_EVENT_BOOST = 0.18; // 속보/변이 연동 급등 +18%
export const STOCK_MIN = 20; // 상장폐지 없음 — 바닥
export const STOCK_MAX = 400; // 과열 상한 (도달 시 자연 조정)
export const STOCK_HISTORY = 9; // 스파크라인 길이

export interface StockState {
  price: number;
  history: number[]; // 최근 가격 (스파크라인)
  shares: number;
  avgCost: number; // 평단
}

export function initStocks(): Record<string, StockState> {
  return Object.fromEntries(
    STOCKS.map((s) => [
      s.id,
      { price: STOCK_START_PRICE, history: [STOCK_START_PRICE], shares: 0, avgCost: 0 },
    ])
  );
}

/**
 * 라운드 클리어마다 가격 갱신. 반환: 급등/급락한 종목의 변동률 (알림용).
 * boostId: 이번에 발동한 속보/변이와 연동된 종목 급등.
 */
export function tickStocks(
  stocks: Record<string, StockState>,
  boostId: string | null,
  rand: () => number = Math.random
): Array<{ def: StockDef; pct: number }> {
  const alerts: Array<{ def: StockDef; pct: number }> = [];
  for (const def of STOCKS) {
    const st = stocks[def.id];
    let mul = 1 + STOCK_DRIFT + (rand() * 2 - 1) * def.vol;
    if (rand() < def.jumpChance) mul += rand() < 0.5 ? STOCK_JUMP : -STOCK_JUMP;
    if (def.id === boostId) mul += STOCK_EVENT_BOOST;
    // 과열/바닥 자연 조정 — 소프트 평균회귀
    if (st.price > STOCK_MAX * 0.8) mul -= 0.05;
    if (st.price < STOCK_MIN * 2) mul += 0.05;
    const next = Math.max(STOCK_MIN, Math.min(STOCK_MAX, Math.round(st.price * mul)));
    const pct = (next - st.price) / st.price;
    st.price = next;
    st.history.push(next);
    if (st.history.length > STOCK_HISTORY) st.history.shift();
    if (Math.abs(pct) >= 0.2) alerts.push({ def, pct });
  }
  return alerts;
}

/** 텍스트 스파크라인 — 최근 가격을 ▁▂▃▄▅▆▇로 */
export function sparkline(history: number[]): string {
  const bars = "▁▂▃▄▅▆▇";
  const min = Math.min(...history);
  const max = Math.max(...history);
  const span = Math.max(1, max - min);
  return history
    .map((p) => bars[Math.min(6, Math.floor(((p - min) / span) * 6.99))])
    .join("");
}
