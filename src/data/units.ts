export type Grade =
  | "common"
  | "uncommon"
  | "special"
  | "rare"
  | "legendary"
  | "transcendent";

export type DmgType = "phys" | "magic";

/** 유닛 계열 — 같은 컨셉으로 등급이 올라가는 시리즈 */
export type Family = "delivery" | "police" | "sniper" | "drone" | "demolition" | "traffic";

export const FAMILY_NAME: Record<Family, string> = {
  delivery: "배달",
  police: "경찰",
  sniper: "저격",
  drone: "드론",
  demolition: "철거",
  traffic: "교통",
};

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
  family?: Family; // 초월은 계열 없음
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
  phase?: "day" | "night" | "both"; // 낮/밤 태그 — 해당 페이즈에 공격력 버프 (both = 항상)
  hidden?: boolean; // 히든 유닛 — 뽑기 저확률 전용, 덱 선택 불가
  desc?: string;
}

export const UNITS: UnitDef[] = [
  // ===== 흔함 추가 2종 — 3기 조합 재료 (계열 없음) =====
  { id: "fl1", name: "전단지 알바", grade: "common", dmgType: "phys", atk: 5, range: 260, cooldown: 0.65, desc: "한 장만 받아주세요" },
  { id: "fb1", name: "붕어빵 사장", grade: "common", dmgType: "phys", atk: 12, range: 230, cooldown: 1.3, desc: "팥 앙금 장전 완료" },

  // ===== ✨ 히든 흔함 2종 — 뽑기 저확률 전용, 조합의 열쇠 =====
  {
    id: "hp1", name: "닭둘기", grade: "common", hidden: true, phase: "day", dmgType: "phys", atk: 4, range: 280, cooldown: 0.8,
    splash: 40, desc: "도시의 낮의 주인 · 떼 쪼기 (반경 40)",
  },
  {
    id: "hc1", name: "골목대장 냥이", grade: "common", hidden: true, phase: "night", dmgType: "phys", atk: 18, range: 310, cooldown: 1.5,
    desc: "도시의 밤의 주인 · 암습",
  },

  // ===== 🛵 배달 계열 — 고속 연타 물리 =====
  { id: "dv1", name: "배달 라이더", grade: "common", family: "delivery", dmgType: "phys", atk: 4, range: 250, cooldown: 0.5 },
  { id: "dv2", name: "슈퍼 라이더", grade: "uncommon", family: "delivery", dmgType: "phys", atk: 9, range: 260, cooldown: 0.45 },
  { id: "dv3", name: "배달 대행업체 사장님", grade: "special", family: "delivery", dmgType: "phys", atk: 25, range: 270, cooldown: 0.5 },
  { id: "dv4", name: "물류센터 CEO", grade: "rare", family: "delivery", dmgType: "phys", atk: 70, range: 280, cooldown: 0.5, phase: "night", desc: "새벽 배송" },
  { id: "dv5", name: "대기업 비서실장", grade: "legendary", family: "delivery", dmgType: "phys", atk: 290, range: 300, cooldown: 0.5 },

  // ===== 👮 경찰 계열 — 밸런스 물리 =====
  { id: "pc1", name: "신입 경관", grade: "common", family: "police", dmgType: "phys", atk: 7, range: 280, cooldown: 0.9 },
  { id: "pc2", name: "경찰관", grade: "uncommon", family: "police", dmgType: "phys", atk: 16, range: 270, cooldown: 0.8 },
  { id: "pc3", name: "SWAT 대원", grade: "special", family: "police", dmgType: "phys", atk: 50, range: 280, cooldown: 0.9 },
  { id: "pc4", name: "특수기동대장", grade: "rare", family: "police", dmgType: "phys", atk: 130, range: 290, cooldown: 0.9 },
  { id: "pc5", name: "경찰청장", grade: "legendary", family: "police", dmgType: "phys", atk: 480, range: 320, cooldown: 0.85 },

  // ===== 🎯 저격 계열 — 장거리 한방 물리 =====
  { id: "sn1", name: "새총 명수", grade: "common", family: "sniper", dmgType: "phys", atk: 13, range: 330, cooldown: 1.6 },
  { id: "sn2", name: "사냥꾼", grade: "uncommon", family: "sniper", dmgType: "phys", atk: 34, range: 360, cooldown: 1.7 },
  { id: "sn3", name: "저격수", grade: "special", family: "sniper", dmgType: "phys", atk: 95, range: 400, cooldown: 1.8 },
  { id: "sn4", name: "레일건 저격수", grade: "rare", family: "sniper", dmgType: "phys", atk: 260, range: 480, cooldown: 1.9 },
  { id: "sn5", name: "비밀요원 제로", grade: "legendary", family: "sniper", dmgType: "phys", atk: 950, range: 420, cooldown: 1.6, phase: "night", desc: "밤의 저격수" },

  // ===== 🚁 드론 계열 — 마법 (방어 무시) =====
  { id: "dr1", name: "드론 동호회원", grade: "common", family: "drone", dmgType: "magic", atk: 8, range: 300, cooldown: 1.0 },
  { id: "dr2", name: "드론 조종사", grade: "uncommon", family: "drone", dmgType: "magic", atk: 18, range: 320, cooldown: 1.0 },
  {
    id: "dr3", name: "헬기 정찰대", grade: "special", family: "drone", dmgType: "magic", atk: 35, range: 330, cooldown: 1.2,
    splash: 60, phase: "day", desc: "범위 피해 (반경 60) · 주간 정찰",
  },
  {
    id: "dr4", name: "사이버 요원", grade: "rare", family: "drone", dmgType: "magic", atk: 100, range: 320, cooldown: 1.0,
    stunMs: 800, phase: "night", desc: "공격 시 대상 기절 0.8초 · 심야 해킹",
  },
  {
    id: "dr5", name: "AI 관제센터장", grade: "legendary", family: "drone", dmgType: "magic", atk: 520, range: 380, cooldown: 1.0,
    splash: 80, desc: "범위 피해 (반경 80)",
  },

  // ===== 💥 철거 계열 — 방깎 지원 물리 =====
  { id: "dm1", name: "공사장 인부", grade: "common", family: "demolition", dmgType: "phys", atk: 9, range: 240, cooldown: 1.1, phase: "day", desc: "주간 공사" },
  {
    id: "dm2", name: "철거반원", grade: "uncommon", family: "demolition", dmgType: "phys", atk: 22, range: 250, cooldown: 1.1,
    shredAmt: 8, shredMs: 3000, desc: "공격 시 방어력 -8 (3초)",
  },
  {
    id: "dm3", name: "폭발물 처리반", grade: "special", family: "demolition", dmgType: "phys", atk: 80, range: 260, cooldown: 1.6,
    shredAmt: 15, shredMs: 3000, desc: "공격 시 방어력 -15 (3초)",
  },
  {
    id: "dm4", name: "국정원 요원", grade: "rare", family: "demolition", dmgType: "phys", atk: 210, range: 300, cooldown: 1.5,
    shredAmt: 30, shredMs: 3000, phase: "night", desc: "공격 시 방어력 -30 (3초) · 심야 작전",
  },
  {
    id: "dm5", name: "재개발 조합장", grade: "legendary", family: "demolition", dmgType: "phys", atk: 560, range: 320, cooldown: 1.2,
    splash: 90, shredAmt: 45, shredMs: 3000, desc: "범위 피해 + 방어력 -45 (3초)",
  },

  // ===== 🚧 교통 계열 — 감속·군중 제어 =====
  { id: "tf1", name: "공원 관리인", grade: "common", family: "traffic", dmgType: "phys", atk: 13, range: 220, cooldown: 1.4 },
  {
    id: "tf2", name: "교통 경찰", grade: "uncommon", family: "traffic", dmgType: "magic", atk: 10, range: 290, cooldown: 1.0,
    slowPct: 0.25, slowMs: 1200, phase: "day", desc: "공격 시 대상 감속 25% · 출퇴근 단속",
  },
  {
    id: "tf3", name: "진압 방패병", grade: "special", family: "traffic", dmgType: "phys", atk: 30, range: 250, cooldown: 1.0,
    slowPct: 0.4, slowMs: 1500, desc: "공격 시 대상 감속 40%",
  },
  {
    id: "tf4", name: "도시계획 국장", grade: "rare", family: "traffic", dmgType: "magic", atk: 90, range: 300, cooldown: 1.0,
    slowPct: 0.5, slowMs: 1800, desc: "공격 시 대상 감속 50%",
  },
  {
    id: "tf5", name: "시장", grade: "legendary", family: "traffic", dmgType: "phys", atk: 550, range: 340, cooldown: 1.0,
    splash: 100, phase: "day", desc: "범위 피해 (반경 100) · 낮의 도시",
  },

  // ===== ⚡ 초월 (5) — 조합 레시피 전용 =====
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
    phase: "night", desc: "마법 단일 — 방어 무시 · 밤의 유령",
  },
  {
    id: "t4", name: "썬더 콜러", grade: "transcendent", dmgType: "magic", atk: 1300, range: 380, cooldown: 0.9,
    splash: 100, slowPct: 0.3, slowMs: 1500, desc: "마법 광역 + 감속 30%",
  },
  {
    id: "t5", name: "아마겟돈 드론", grade: "transcendent", dmgType: "phys", atk: 800, range: 400, cooldown: 0.8,
    splash: 70, shredAmt: 60, shredMs: 3000, desc: "광역 방어력 -60 (3초) 지원형",
  },
  {
    id: "t6", name: "시티 로드", grade: "transcendent", dmgType: "phys", atk: 2600, range: 380, cooldown: 1.0,
    splash: 110, desc: "도시 권력의 정점 — 물리 광역 (시장+경찰청장 페어)",
  },
];

export const UNIT_BY_ID: Record<string, UnitDef> = Object.fromEntries(
  UNITS.map((u) => [u.id, u])
);

export const GACHA_RATES: Array<[Grade, number]> = [
  ["common", 0.47],
  ["uncommon", 0.27],
  ["special", 0.15],
  ["rare", 0.08],
  ["legendary", 0.03],
];

/** 라운드 구간별 뽑기 확률 — 초반엔 흔함 위주, 30라운드부터 기존 확률 */
export function gachaRates(round: number): Array<[Grade, number]> {
  if (round < 10)
    return [
      ["common", 0.98],
      ["uncommon", 0.02],
    ];
  if (round <= 20)
    return [
      ["common", 0.9],
      ["uncommon", 0.08],
      ["special", 0.02],
    ];
  if (round < 30)
    // 기획 미지정 구간(21~29) — 두 구간을 잇는 중간값
    return [
      ["common", 0.7],
      ["uncommon", 0.17],
      ["special", 0.08],
      ["rare", 0.04],
      ["legendary", 0.01],
    ];
  return GACHA_RATES;
}

export function rollGrade(
  round: number,
  rand: () => number = Math.random
): Grade {
  let r = rand();
  for (const [grade, p] of gachaRates(round)) {
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
  // 히든은 일반 풀에서 제외 — 뽑기의 히든 슬롯에서만 등장
  const pool = UNITS.filter((u) => u.grade === grade && !u.hidden);
  return pool[Math.floor(rand() * pool.length)];
}
