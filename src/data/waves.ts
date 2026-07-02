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
  armorMul: n