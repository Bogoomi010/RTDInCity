/** 초월 유닛 조합 레시피 — 필드 위의 재료 유닛을 소모한다 */
export interface Recipe {
  resultId: string; // 초월 유닛 id
  materials: string[]; // 재료 유닛 id 3개
}

export const RECIPES: Recipe[] = [
  { resultId: "t1", materials: ["l3", "r1", "s1"] }, // 시티 가디언 = 특전사령관 + 특수기동대장 + SWAT 대원
  { resultId: "t2", materials: ["l1", "r2", "s5"] }, // 스틸 타이탄 = 시장 + 전술 드론 + 폭발물 처리반
  { resultId: "t3", materials: ["l2", "r3", "s2"] }, // 고스트 프로토콜 = 비밀요원 제로 + 사이버 요원 + 저격수
  { resultId: "t4", materials: ["r3", "r2", "s4"] }, // 썬더 콜러 = 사이버 요원 + 전술 드론 + 헬기 정찰대
  { resultId: "t5", materials: ["r4", "r5", "u2"] }, // 아마겟돈 드론 = 국정원 요원 + 레일건 저격수 + 드론 조종사
];
