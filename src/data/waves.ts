export interface MobStats {
  hp: number;
  speed: number; // px/s
  gold: number;
  armor: number; // 물리 피해 감소 (마법은 무시)
  boss: boolean;
  name?: string;
  color?: number; // 계열 색
  scale?: number; // 표시 크기 배율
  splits?: boolean; // 사망 시 분열 (쓰레기 상위)
  golden?: boolean; // 황금 비둘기 — 보너스 몹 (캡/데스 미적용, 1바퀴 후 소멸)
}

// ---------- 난이도 ----------
// 시뮬 봇 승률 = 초보자 기준. 숙련자는 ~1.5배 잘하므로 3단계로 나눈다.
export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTY_DEFS: Record<
  Difficulty,
  { name: string; hpMul: number; desc: string }
> = {
  easy: { name: "쉬움", hpMul: 0.85, desc: "몹 체력 -15% · 입문용" },
  normal: { name: "보통", hpMul: 1.0, desc: "표준 밸런스" },
  hard: { name: "어려움", hpMul: 1.2, desc: "몹 체력 +20% · 숙련자용" },
};

let currentDifficulty: Difficulty = "normal";

export function setDifficulty(d: Difficulty): void {
  currentDifficulty = d;
}

export function getDifficulty(): Difficulty {
  return currentDifficulty;
}

function diffMul(): number {
  return DIFFICULTY_DEFS[currentDifficulty].hpMul;
}

export function mobArmor(round: number): number {
  return Math.floor(round * 2.2);
}

function baseHp(round: number): number {
  return Math.round(18 * Math.pow(1.21, round - 1));
}

function baseSpeed(round: number): number {
  return 60 + round * 1.5;
}

/** 몹 계열 3종 × 3단계 — 하찮은 것들의 침공 (docs/mob-ideas.md) */
interface MobKind {
  name: string;
  hpMul: number;
  armorMul: number;
  speedMul: number;
  splits?: boolean;
}

const MOB_FAMILIES: Array<{ color: number; tiers: MobKind[] }> = [
  {
    // 🪨 돌 — 고방어 저속: 마법/방깎 체크
    color: 0x9e9e9e,
    tiers: [
      { name: "돌멩이", hpMul: 1.0, armorMul: 1.6, speedMul: 0.8 },
      { name: "매우 딱딱한 돌멩이", hpMul: 1.0, armorMul: 1.8, speedMul: 0.8 },
      { name: "슈퍼 돌멩이", hpMul: 1.0, armorMul: 2.0, speedMul: 0.85 },
    ],
  },
  {
    // 🕊 비둘기 — 저체력 고속: 감속/연타 체크
    color: 0x81d4fa,
    tiers: [
      { name: "비둘기", hpMul: 0.7, armorMul: 0.5, speedMul: 1.3 },
      { name: "화난 비둘기", hpMul: 0.7, armorMul: 0.5, speedMul: 1.4 },
      { name: "악마 비둘기", hpMul: 0.75, armorMul: 0.5, speedMul: 1.5 },
    ],
  },
  {
    // 🗑 쓰레기 — 고체력 분열: 광역 체크
    color: 0x8bc34a,
    tiers: [
      { name: "쓰레기 봉투", hpMul: 1.4, armorMul: 0.7, speedMul: 0.85 },
      { name: "큰 쓰레기", hpMul: 1.5, armorMul: 0.7, speedMul: 0.85, splits: true },
      { name: "쓰레기의 악마", hpMul: 1.6, armorMul: 0.7, speedMul: 0.85, splits: true },
    ],
  },
];

/** 라운드 → 계열 로테이션(r%3) + 단계(1~13/14~26/27~39) */
function mobKind(round: number): { kind: MobKind; color: number; tier: number } {
  const fam = MOB_FAMILIES[round % 3];
  const tier = round <= 13 ? 0 : round <= 26 ? 1 : 2;
  return { kind: fam.tiers[tier], color: fam.color, tier };
}

export function mobStats(round: number): MobStats {
  const { kind, color, tier } = mobKind(round);
  return {
    hp: Math.max(1, Math.round(baseHp(round) * kind.hpMul * diffMul())),
    speed: baseSpeed(round) * kind.speedMul,
    gold: 2 + Math.floor(round / 5), // 3기 합성 경제에 맞춰 상향 (v3.2)
    armor: Math.floor(mobArmor(round) * kind.armorMul),
    boss: false,
    name: kind.name,
    color,
    scale: 1 + tier * 0.2,
    splits: kind.splits,
  };
}

/** ✨ 황금 비둘기 — 잡으면 골드 ×10, 놓쳐도 벌 없음 */
export function goldenStats(round: number): MobStats {
  return {
    hp: Math.max(1, Math.round(baseHp(round) * 0.5 * diffMul())),
    speed: baseSpeed(round) * 1.8,
    gold: (2 + Math.floor(round / 5)) * 10,
    armor: 0,
    boss: false,
    name: "황금 비둘기",
    color: 0xffd700,
    scale: 1.1,
    golden: true,
  };
}

interface BossDef {
  name: string;
  hpMul: number;
  armorMul: number;
  speed: number;
  trait: string;
}

/** 보스 4종 — 라운드별 개성 */
export const BOSS_DEFS: Record<number, BossDef> = {
  10: { name: "폭주 덤프트럭", hpMul: 18, armorMul: 1.0, speed: 78, trait: "빠른 이동속도" },
  20: { name: "장갑 수송차", hpMul: 16, armorMul: 2.0, speed: 45, trait: "높은 방어력 — 마법/방깎 추천" },
  30: { name: "스텔스 헬기", hpMul: 27, armorMul: 1.5, speed: 62, trait: "빠르고 단단함" },
  40: { name: "시티 브레이커", hpMul: 23, armorMul: 2.0, speed: 40, trait: "최종 보스" },
};

export function bossStats(round: number): MobStats {
  const def = BOSS_DEFS[round] ?? {
    name: "보스",
    hpMul: 35,
    armorMul: 1.5,
    speed: 45,
    trait: "",
  };
  // 계열 배율의 영향을 받지 않도록 기본 공식 사용
  return {
    hp: Math.round(baseHp(round) * def.hpMul * diffMul()),
    speed: def.speed,
    gold: 20 + round,
    armor: Math.floor(mobArmor(round) * def.armorMul),
    boss: true,
    name: def.name,
  };
}

/** 물리 피해 감소율: armor / (armor + 100), 최대 85% */
export function armorReduction(armor: number): number {
  if (armor <= 0) return 0;
  return Math.min(0.85, armor / (armor + 100));
}

export function roundClearBonus(round: number): number {
  return 10 + round * 2; // 3기 합성 경제에 맞춰 상향 (v3.2)
}
