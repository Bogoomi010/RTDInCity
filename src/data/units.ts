export type Grade =
  | "common"
  | "uncommon"
  | "special"
  | "rare"
  | "legendary"
  | "transcendent";

export type DmgType = "phys" | "magic";

/** 합성(2기→상위)이 적용되는 등급 순서 — 초월은 조합 레시피로만 획득 */
export const GRADE_ORDER: Grade[] = [
  "common",
  "uncommon",
  "special",
  "rare",
  "legendary",
];

export const GRADE_NAME: Record<Grade, string> = {
  common: "흔함",
  uncommon: "안흔함",
  special: "특별함",
  rare: "희귀함",
  legendary: "전설",
  transcendent: "초월",
};

export const GRADE_COLOR: Record<Grade, number> = {
  common: 0x9aa0a6,
  uncommon: 0x4caf50,
  special: 0x42a5f5,
  rare: 0xab47bc,
  legendary: 0xffa726,
  transcendent: 0x26c6da,
};

export const GRADE_COLOR_CSS: Record<Grade, string> = {
  common: "#9aa0a6",
  uncommon: "#4caf50",
  special: "#42a5f5",
  rare: "#ab47bc",
  legendary: "#ffa726",
  transcendent: "#26c6da",
};

export interface UnitDef {
  id: string;
  name: string;
  grade: Grade;
  atk: number;
  range: number;
  cooldown: number; // 공격 주기(초)
  dmgType: DmgType; // 물리: 방어력 적용 / 마법: 방어 무시
  splash?: number; // 스플래시 반경(px)
  slowPct?: number; // 이동속도 감소율 (0~1)
  slowMs?: number;
  stunMs?: number;
  shredAmt?: number; // 방어력 감소량
  shredMs?: number;
  desc?: string;
}

export const UNITS: UnitDef[] = [
  // ===== 흔함 (6) =====
  { id: "c1", name: "시민 순찰대", grade: "common", dmgType: "phys", atk: 6, range: 260, cooldown: 0.8 },
  { id: "c2", name: "자경단원", grade: "common", dmgType: "phys", atk: 9, range: 240, cooldown: 1.0 },
  { id: "c3", name: "신입 경관", grade: "common", dmgType: "phys", atk: 7, range: 280, cooldown: 0.9 },
  { id: "c4", name: "경비원", grade: "common", dmgType: "phys", atk: 11, range: 230, cooldown: 1.2 },
  { id: "c5", name: "배달 라이더", grade: "common", dmgType: "phys", atk: 4, range: 250, cooldown: 0.5 },
  { id: "c6", name: "공원 관리인", grade: "common", dmgType: "phys", atk: 13, range: 220, cooldown: 1.4 },
  // ===== 안흔함 (6) =====
  { id: "u1", name: "경찰관", grade: "uncommon", dmgType: "phys", atk: 16, range: 270, cooldown: 0.8 },
  { id: "u2", name: "드론 조종사", grade: "uncommon", dmgType: "magic", atk: 18, range: 320, cooldown: 1.0 },
  { id: "u3", name: "소방관", grade: "uncommon", dmgType: "phys", atk: 24, range: 250, cooldown: 1.1 },
  {
    id: "u4", name: "교통 경찰", grade: "uncommon", dmgType: "magic", atk: 10, range: 290, cooldown: 1.0,
    slowPct: 0.25, slowMs: 1200, desc: "공격 시 대상 감속 25%",
  },
  { id: "u5", name: "K-9 핸들러", grade: "uncommon", dmgType: "phys", atk: 9, range: 240, cooldown: 0.45 },
  { id: "u6", name: "민방위 대장", grade: "uncommon", dmgType: "phys", atk: 30, range: 260, cooldown: 1.5 },
  // ===== 특별함 (5) =====
  { id: "s1", name: "SWAT 대원", grade: "special", dmgType: "phys", atk: 50, range: 280, cooldown: 0.9 },
  { id: "s2", name: "저격수", grade: "special", dmgType: "phys", atk: 95, range: 400, cooldown: 1.8 },
  {
    id: "s3", name: "진압 방패병", grade: "special", dmgType: "phys", atk: 30, range: 250, cooldown: 1.0,
    slowPct: 0.4, slowMs: 1500, desc: "공격 시 대상 감속 40%",
  },
  {
    id: "s4", name: "헬기 정찰대", grade: "special", dmgType: "magic", atk: 35, range: 330, cooldown: 1.2,
    splash: 60, desc: "범위 피해 (반경 60)",
