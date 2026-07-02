/** 런 전체에 적용되는 누적 보정치 */
export interface Mods {
  atkMul: number;
  cdMul: number; // 낮을수록 빠름
  rangeMul: number;
  physMul: number;
  magicMul: number;
  mobSpeedMul: number; // 낮을수록 느림
  gachaDiscount: number;
}

export function defaultMods(): Mods {
  return {
    atkMul: 1,
    cdMul: 1,
    rangeMul: 1,
    physMul: 1,
    magicMul: 1,
    mobSpeedMul: 1,
    gachaDiscount: 0,
  };
}

export type CardEffect =
  | { kind: "atkMul"; mul: number }
  | { kind: "cdMul"; mul: number }
  | { kind: "rangeMul"; mul: number }
  | { kind: "physMul"; mul: number }
  | { kind: "magicMul"; mul: number }
  | { kind: "mobSpeedMul"; mul: number }
  | { kind: "gold"; amount: number }
  | { kind: "gachaDiscount"; amount: number }
  | { kind: "death"; amount: number }
  | { kind: "freeUnit"; grade: "special" };

export interface CardDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  effect: CardEffect;
}

export const CARDS: CardDef[] = [
  { id: "atk", name: "화력 증강", icon: "🔥", desc: "모든 유닛 공격력 +15%", effect: { kind: "atkMul", mul: 1.15 } },
  { id: "spd", name: "신속 대응", icon: "⚡", desc: "모든 유닛 공격 주기 -8%", effect: { kind: "cdMul", mul: 0.92 } },
  { id: "rng", name: "광학 조준", icon: "🔭", desc: "모든 유닛 사거리 +10%", effect: { kind: "rangeMul", mul: 1.1 } },
  { id: "gold", name: "도시 예산", icon: "💰", desc: "즉시 150G 획득", effect: { kind: "gold", amount: 150 } },
  { id: "disc", name: "뽑기 보조금", icon: "🎟️", desc: "뽑기 비용 -5G (최소 5G)", effect: { kind: "gachaDiscount", amount: 5 } },
  { id: "phys", name: "철갑탄", icon: "⚔️", desc: "물리 데미지 +25%", effect: { kind: "physMul", mul: 1.25 } },
  { id: "magic", name: "증폭 코일", icon: "🔮", desc: "마법 데미지 +25%", effect: { kind: "magicMul", mul: 1.25 } },
  { id: "barri", name: "바리케이드", icon: "🚧", desc: "모든 몹 이동속도 -8%", effect: { kind: "mobSpeedMul", mul: 0.92 } },
  { id: "backup", name: "긴급 지원", icon: "🚁", desc: "즉시 [특별함] 랜덤 유닛 1기", effect: { kind: "freeUnit", grade: "special" } },
  { id: "insure", name: "보험 처리", icon: "🛡️", desc: "데스 카운트 +3", effect: { kind: "death", amount: 3 } },
];

/** 카드가 제시되는 라운드 (클리어 직후) */
export const CARD_ROUNDS = new Set([5, 10, 15, 20, 25, 30, 35]);

export function drawCards(
  n = 3,
  rand: () => number = Math.random
): CardDef[] {
  const pool = [...CARDS];
  const picked: CardDef[] = [];
  while (picked.length < n && pool.length > 0) {
    const i = Math.floor(rand() * pool.length);
    picked.push(pool.splice(i, 1)[0]);
  }
  return picked;
}
