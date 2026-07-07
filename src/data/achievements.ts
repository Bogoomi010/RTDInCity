/** 🏆 마이크로 업적 (v3.9) — 즉석 토스트 + 판 간 누적 저장. 보상은 없고 인정만 준다 (수집 도파민). */
export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-legendary", name: "첫 전설", desc: "전설 유닛을 처음 획득" },
  { id: "first-transcendent", name: "도시의 신화", desc: "초월 유닛을 처음 획득" },
  { id: "dex-50", name: "골목 도감러", desc: "조합 도감 50종 해금" },
  { id: "dex-110", name: "절반의 완성", desc: "조합 도감 110종 해금" },
  { id: "dex-220", name: "도감 마스터", desc: "조합 도감 220종 전부 해금" },
  { id: "streak-20", name: "논스톱 배송", desc: "킬 스트릭 20 달성" },
  { id: "golden-10", name: "황금 사냥꾼", desc: "황금 비둘기 누적 10마리 처치" },
  { id: "win-normal", name: "도시의 수호자", desc: "보통 난이도 40라운드 승리" },
  { id: "win-hard", name: "베테랑 수비대", desc: "어려움 난이도 40라운드 승리" },
  { id: "nodeath-win", name: "무결점 방어", desc: "데스 카운트를 잃지 않고 승리" },
  { id: "endless-50", name: "야근 버티기", desc: "무한 모드 50라운드 도달" },
  { id: "endless-60", name: "야근의 화신을 넘어", desc: "무한 모드 60라운드 돌파" },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a])
);
