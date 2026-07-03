/**
 * 전설 페어 → 지정 초월 (두 전설의 테마를 계승 — docs/unit-ideas.md 4장)
 * 페어가 아닌 전설 2기는 랜덤 초월 (천장).
 * 조합은 같은 등급끼리만 — 등급이 섞이던 구 레시피 시스템은 삭제됨 (v3.3).
 * 신규 계열 전설이 추가될 때마다 페어를 늘린다.
 */
export const PAIR_TRANSCENDS: Array<{ pair: [string, string]; resultId: string }> = [
  { pair: ["tf5", "pc5"], resultId: "t6" }, // 시장 + 경찰청장 = 시티 로드
];
