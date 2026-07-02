export interface MobStats {
  hp: number;
  speed: number; // px/s
  gold: number;
  armor: number; // 물리 피해 감소 (마법은 무시)
  boss: boolean;
  name?: string;
}

export function mobArmor(round: number): number {
  return Math.floor(round * 2.2);
}

export function mobStats(round: number): MobStats {
  return {
    hp: Math.round(18 * Math.pow(1.21, round - 1)),
    speed: 60 + round * 1.5,
    gold: 1 + Math.floor(round / 8),
    armor: mobArmor(round),
    boss: false,
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
  10: { name: "폭주 덤프트럭", hpMul: 25, armorMul: 1.0, speed: 78, trait: "빠른 이동속도" },
  20: { name: "장갑 수송차", hpMul: 35, armorMul: 3.0, speed: 45, trait: "높은 방어력 — 마법/방깎 추천" },
  30: { name: "스텔스 헬기", hpMul: 45, armorMul: 1.5, speed: 62, trait: "빠르고 단단함" },
  40: { name: "시티 브레이커", hpMul: 22, armorMul: 2.0, speed: 40, trait: "최종 보스" },
};

export function bossStats(round: number): MobStats {
  const base = mobStats(round);
  const def = BOSS_DEFS[round] ?? {
    name: "보스",
    hpMul: 35,
    armorMul: 1.5,
    speed: 45,
    trait: "",
  };
  return {
    hp: Math.round(base.hp * def.hpMul),
    speed: def.speed,
    gold: 20 + round,
    armor: Math.floor(base.armor * def.armorMul),
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
  return 5 + round;
}
