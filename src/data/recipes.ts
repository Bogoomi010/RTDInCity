/** 초월 유닛 조합 레시피 — 필드 위의 재료 유닛을 소모한다 */
export interface Recipe {
  resultId: string; // 초월 유닛 id
  materials: string[]; // 재료 유닛 id 3개
}

export const RECIPES: Recipe[] = [
  // 시티 가디언 = 경찰 계열 총집결 (경찰청장 + 특수기동대장 + SWAT 대원)
  { resultId: "t1", materials: ["pc5", "pc4", "pc3"] },
  // 스틸 타이탄 = 시장 + 국정원 요원 + 폭발물 처리반
  { resultId: "t2", materials: ["tf5", "dm4", "dm3"] },
  // 고스트 프로토콜 = 비밀요원 제로 + 사이버 요원 + 저격수
  { resultId: "t3", materials: ["sn5", "dr4", "sn3"] },
  // 썬더 콜러 = 사이버 요원 + 도시계획 국장 + 헬기 정찰대 (전설 불필요)
  { resultId: "t4", materials: ["dr4", "tf4", "dr3"] },
  // 아마겟돈 드론 = 물류센터 CEO + 레일건 저격수 + 드론 조종사
  { resultId: "t5", materials: ["dv4", "sn4", "dr2"] },
];
