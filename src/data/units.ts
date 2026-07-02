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
  },
  {
    id: "s5", name: "폭발물 처리반", grade: "special", dmgType: "phys", atk: 80, range: 260, cooldown: 1.6,
    shredAmt: 15, shredMs: 3000, desc: "공격 시 방어력 -15 (3초)",
  },
  // ===== 희귀함 (5) =====
  { id: "r1", name: "특수기동대장", grade: "rare", dmgType: "phys", atk: 130, range: 290, cooldown: 0.9 },
  {
    id: "r2", name: "전술 드론", grade: "rare", dmgType: "phys", atk: 120, range: 360, cooldown: 1.2,
    splash: 80, desc: "범위 피해 (반경 80)",
  },
  {
    id: "r3", name: "사이버 요원", grade: "rare", dmgType: "magic", atk: 100, range: 320, cooldown: 1.0,
    stunMs: 800, desc: "공격 시 대상 기절 0.8초",
  },
  {
    id: "r4", name: "국정원 요원", grade: "rare", dmgType: "phys", atk: 210, range: 300, cooldown: 1.5,
    shredAmt: 30, shredMs: 3000, desc: "공격 시 방어력 -30 (3초)",
  },
  { id: "r5", name: "레일건 저격수", grade: "rare", dmgType: "phys", atk: 260, range: 480, cooldown: 2.0 },
  // ===== 전설 (3) =====
  {
    id: "l1", name: "시장", grade: "legendary", dmgType: "phys", atk: 550, range: 340, cooldown: 1.0,
    splash: 100, desc: "범위 피해 (반경 100)",
  },
  { id: "l2", name: "비밀요원 제로", grade: "legendary", dmgType: "magic", atk: 950, range: 420, cooldown: 1.6 },
  { id: "l3", name: "특전사령관", grade: "legendary", dmgType: "phys", atk: 420, range: 360, cooldown: 0.8 },
  // ===== 초월 (5) — 조합 레시피 전용 =====
  {
    id: "t1", name: "시티 가디언", grade: "transcendent", dmgType: "phys", atk: 5000, range: 380, cooldown: 1.2,
    desc: "물리 단일 초고화력",
  },
  {
    id: "t2", name: "스틸 타이탄", grade: "transcendent", dmgType: "phys", atk: 2200, range: 340, cooldown: 1.2,
    splash: 120, desc: "물리 광역 (반경 120)",
  },
  {
    id: "t3", name: "고스트 프로토콜", grade: "transcendent", dmgType: "magic", atk: 3600, range: 420, cooldown: 1.0,
    desc: "마법 단일 — 방어 무시",
  },
  {
    id: "t4", name: "썬더 콜러", grade: "transcendent", dmgType: "magic", atk: 1300, range: 380, cooldown: 0.9,
    splash: 100, slowPct: 0.3, slowMs: 1500, desc: "마법 광역 + 감속 30%",
  },
  {
    id: "t5", name: "아마겟돈 드론", grade: "transcendent", dmgType: "phys", atk: 800, range: 400, cooldown: 0.8,
    splash: 70, shredAmt: 60, shredMs: 3000, desc: "광역 방어력 -60 (3초) 지원형",
  },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.id, u])
);

export const GACHA_RATES: Array<[Grade, number]> = [
  ["common", 0.5],
  ["uncommon", 0.28],
  ["special", 0.14],
  ["rare", 0.06],
  ["legendary", 0.02],
];

export function rollGrade(rand: () => number = Math.random): Grade {
  let r = rand();
  for (const [grade, p] of GACHA_RATES) {
    if (r < p) return grade;
    r -= p;
  }
  return "common";
}

export function nextGrade(grade: Grade): Grade | null {
  const i = GRADE_ORDER.indexOf(grade);
  return i >= 0 && i < GRADE_ORDER.length - 1 ? GRADE_ORDER[i + 1] : null;
}

export function randomUnitOfGrade(
  grade: Grade,
  rand: () => number = Math.random
): UnitDef {
  const pool = UNITS.filter((u) => u.grade === grade);
  return pool[Math.floor(rand() * pool.length)];
}
