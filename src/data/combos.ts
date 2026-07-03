// ponytail: .ts 확장자 명시 — balance-sim(node 직접 실행)이 이 파일을 import하기 때문
import { UNIT_BY_ID, type DmgType, type Grade, type UnitDef } from "./units.ts";

/**
 * 3기 조합 시스템 (docs/unit-ideas.md 6장)
 * 흔함 10종(일반 8 + 히든 2)에서 3기(중복 허용)를 소모해 상위 유닛 획득.
 * 220가지 결과는 데이터로 나열하지 않고 규칙으로 생성:
 *   등급 = 히든 재료 수(0/1/2/3 → 안흔함/특별함/희귀함/전설)
 *   전투 형태 = 지배 재료의 아키타입 · 수치 = 등급 DPS 예산
 *   이름 = 큐레이션 표 → 톰과 제리 규칙 → 일반 템플릿
 */

export const NORMAL_COMMON_IDS = ["dv1", "pc1", "sn1", "dr1", "dm1", "tf1", "fl1", "fb1"];
export const HIDDEN_IDS = ["hp1", "hc1"];
export const COMMON_IDS = [...NORMAL_COMMON_IDS, ...HIDDEN_IDS];

/** 작명용 테마 단어 */
const WORD: Record<string, string> = {
  dv1: "배달", pc1: "치안", sn1: "새총", dr1: "드론", dm1: "철거",
  tf1: "공원", fl1: "전단지", fb1: "붕어빵", hp1: "닭둘기", hc1: "냥이",
};

/** 지배 재료가 결정하는 전투 형태 (아키타입) */
interface Shape {
  dmgType: DmgType;
  cd: number;
  range: number;
  dpsMul: number; // 유틸(마법/감속/방깎/광역) 보유 시 DPS 페널티
  splash?: boolean;
  slow?: boolean;
  shred?: boolean;
}
const SHAPES: Record<string, Shape> = {
  dv1: { dmgType: "phys", cd: 0.5, range: 280, dpsMul: 1.0 }, // 연타
  pc1: { dmgType: "phys", cd: 0.9, range: 290, dpsMul: 1.05 }, // 밸런스
  sn1: { dmgType: "phys", cd: 1.8, range: 420, dpsMul: 1.1 }, // 한방
  dr1: { dmgType: "magic", cd: 1.0, range: 330, dpsMul: 0.8 }, // 마법
  dm1: { dmgType: "phys", cd: 1.3, range: 270, dpsMul: 0.85, shred: true }, // 방깎
  tf1: { dmgType: "magic", cd: 1.0, range: 300, dpsMul: 0.75, slow: true }, // 감속
  fl1: { dmgType: "phys", cd: 0.6, range: 260, dpsMul: 0.8, slow: true }, // 연타+감속
  fb1: { dmgType: "phys", cd: 1.4, range: 250, dpsMul: 0.7, splash: true }, // 광역
  hp1: { dmgType: "phys", cd: 0.8, range: 280, dpsMul: 0.75, splash: true }, // 떼 광역
  hc1: { dmgType: "phys", cd: 1.5, range: 310, dpsMul: 1.2 }, // 암습 고단일
};

const GRADE_BY_HIDDEN: Grade[] = ["uncommon", "special", "rare", "legendary"];
// 재료 3기(흔함 DPS 합 ~30)보다 강해야 조합이 성립 — 동급 뽑기 유닛보다 높게 책정
const DPS_BUDGET: Partial<Record<Grade, number>> = { uncommon: 40, special: 85, rare: 180, legendary: 700 };
const SPLASH_R: Partial<Record<Grade, number>> = { uncommon: 50, special: 60, rare: 80, legendary: 100 };
const SLOW_PCT: Partial<Record<Grade, number>> = { uncommon: 0.25, special: 0.4, rare: 0.5, legendary: 0.5 };
const SHRED_AMT: Partial<Record<Grade, number>> = { uncommon: 8, special: 15, rare: 30, legendary: 45 };

/** 큐레이션 작명 — AAA 시그니처 10종 + 하이라이트 (키는 comboKey 순서) */
const NAMES: Record<string, string> = {
  "dv1+dv1+dv1": "번개 배달왕",
  "pc1+pc1+pc1": "지구대의 전설",
  "sn1+sn1+sn1": "새총 3연성",
  "dr1+dr1+dr1": "드론 편대",
  "dm1+dm1+dm1": "철거 3인방",
  "tf1+tf1+tf1": "공원의 수호신",
  "fl1+fl1+fl1": "전단지 폭풍",
  "fb1+fb1+fb1": "붕어빵 푸드트럭 제국",
  "hp1+hp1+hp1": "비둘기 대군단",
  "hc1+hc1+hc1": "골목 냥아치 파벌",
  "dv1+hp1+hp1": "전서구 특급배송",
  "pc1+hc1+hc1": "K-냥 수사대",
  "hp1+hp1+hc1": "쫓는 자와 쫓기는 자",
  "hp1+hc1+hc1": "골목의 포식자들",
};

/** 재료 3기 → 정렬된 조합 키 ("a+b+c") */
export function comboKey(ids: string[]): string {
  return [...ids]
    .sort((a, b) => COMMON_IDS.indexOf(a) - COMMON_IDS.indexOf(b))
    .join("+");
}

function comboName(sorted: string[]): string {
  const curated = NAMES[sorted.join("+")];
  if (curated) return curated;
  // 톰과 제리 시리즈: 닭둘기 1 + 냥이 1 + α
  if (sorted.filter((i) => i === "hp1").length === 1 && sorted.filter((i) => i === "hc1").length === 1) {
    const third = sorted.find((i) => i !== "hp1" && i !== "hc1")!;
    return `톰과 제리와 ${WORD[third]}`;
  }
  const uniq = [...new Set(sorted)];
  if (uniq.length === 2) {
    const dom = sorted.filter((i) => i === uniq[0]).length === 2 ? uniq[0] : uniq[1];
    const sub = dom === uniq[0] ? uniq[1] : uniq[0];
    return `${WORD[sub]} ${WORD[dom]} 콤비`;
  }
  return `${WORD[uniq[0]]}·${WORD[uniq[1]]}·${WORD[uniq[2]]} 연합`;
}

/** 지배 재료: 개수 우선, 동수면 희귀한 쪽(히든 > 뒷번호) */
function dominant(sorted: string[]): string {
  const count: Record<string, number> = {};
  for (const i of sorted) count[i] = (count[i] ?? 0) + 1;
  let best = sorted[0];
  for (const id of Object.keys(count)) {
    const c = count[id];
    const bc = count[best];
    if (c > bc || (c === bc && COMMON_IDS.indexOf(id) > COMMON_IDS.indexOf(best))) best = id;
  }
  return best;
}

const cache = new Map<string, UnitDef>();

/** 조합 결과 유닛 생성 (결정적 — 같은 재료면 항상 같은 결과) */
export function comboResult(ids: string[]): UnitDef {
  const key = comboKey(ids);
  const hit = cache.get(key);
  if (hit) return hit;

  const sorted = key.split("+");
  const hiddenN = sorted.filter((i) => HIDDEN_IDS.includes(i)).length;
  const grade = GRADE_BY_HIDDEN[hiddenN];
  const s = SHAPES[dominant(sorted)];
  let dps = (DPS_BUDGET[grade] ?? 22) * s.dpsMul;
  if (s.splash) dps *= 0.65;

  const def: UnitDef = {
    id: `cb_${key}`,
    name: comboName(sorted),
    grade,
    dmgType: s.dmgType,
    atk: Math.max(1, Math.round(dps * s.cd)),
    range: s.range,
    cooldown: s.cd,
    splash: s.splash ? SPLASH_R[grade] : undefined,
    slowPct: s.slow ? SLOW_PCT[grade] : undefined,
    slowMs: s.slow ? 1500 : undefined,
    shredAmt: s.shred ? SHRED_AMT[grade] : undefined,
    shredMs: s.shred ? 3000 : undefined,
    phase:
      hiddenN === 0
        ? undefined
        : sorted.includes("hp1") && sorted.includes("hc1")
          ? "both"
          : sorted.includes("hp1")
            ? "day"
            : "night",
    desc: `조합: ${sorted.map((i) => UNIT_BY_ID[i].name).join(" + ")}`,
  };
  cache.set(key, def);
  return def;
}

function multisets(pool: string[]): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < pool.length; i++)
    for (let j = i; j < pool.length; j++)
      for (let k = j; k < pool.length; k++) out.push([pool[i], pool[j], pool[k]]);
  return out;
}

/** 전체 220조합의 키 목록 (도감용) */
export function allComboKeys(): string[] {
  return multisets(COMMON_IDS).map((m) => m.join("+"));
}

/** 전체 조합 수 = C(12,3) = 220 */
export const COMBO_TOTAL = multisets(COMMON_IDS).length;

/** 이번 판 덱(일반 3종)으로 만들 수 있는 조합 키 35개 */
export function deckComboKeys(deck: string[]): string[] {
  const active = [...deck, ...HIDDEN_IDS].sort(
    (a, b) => COMMON_IDS.indexOf(a) - COMMON_IDS.indexOf(b)
  );
  return multisets(active).map((m) => m.join("+"));
}
