import type { Grade } from "./units";

/**
 * 스토리 보스존 — 어느 도시인의 일대기 (docs/story-ideas.md)
 * 보스 HP는 판을 넘어 유지되고, 파견 유닛의 DPS로 실시간으로 깎는다.
 */

export interface StoryChapter {
  title: string;
  boss: string;
}

export const STORY_CHAPTERS: StoryChapter[] = [
  { title: "수능 전날", boss: "수능 한파" },
  { title: "백수 상경기", boss: "서류 광탈의 벽" },
  { title: "첫 출근", boss: "월요일 아침 2호선" },
  { title: "자취 원년", boss: "월세 고지서" },
  { title: "대리 진급", boss: "무한 야근의 화신" },
  { title: "결혼 대작전", boss: "축의금 정산서" },
  { title: "내 집 마련", boss: "대출 이자 드래곤" },
  { title: "육아 전쟁", boss: "새벽 3시의 울음소리" },
  { title: "부장의 무게", boss: "사내 정치 구름" },
  { title: "은퇴, 그리고", boss: "치킨집 창업의 유혹" },
];

/** 챕터 정보 (10장 이후는 회차 반복) */
export function storyChapter(chapter: number): StoryChapter {
  return STORY_CHAPTERS[(chapter - 1) % STORY_CHAPTERS.length];
}

/** 보스 HP 곡선 — 1장: 안흔함 1기 ~30초, 10장: 초월급 필요 (~38만) */
export function storyBossHp(chapter: number): number {
  return Math.round(600 * Math.pow(2.05, chapter - 1));
}

export interface StoryReward {
  gold?: number;
  gachaDiscount?: number; // 이번 판 뽑기 할인
  death?: number;
  card?: boolean; // 지원 카드 1장 선택
  hidden?: boolean; // 히든 유닛 1기 확정
  tickets?: Array<[Grade, number]>; // 🎟 소환권 — 챕터가 오를수록 등급·수량 상승
}

/** 챕터별 보상 (10장 주기 순환) */
export const STORY_REWARDS: StoryReward[] = [
  { gold: 100, tickets: [["uncommon", 1]] },
  { gachaDiscount: 2, tickets: [["uncommon", 2]] },
  { tickets: [["special", 1]] },
  { gold: 250, tickets: [["special", 1]] },
  { card: true, tickets: [["special", 2]] },
  { tickets: [["rare", 1]] },
  { death: 2, tickets: [["rare", 2]] },
  { hidden: true, tickets: [["rare", 2]] },
  { tickets: [["legendary", 1]] },
  { tickets: [["legendary", 2]] },
];

export function storyReward(chapter: number): StoryReward {
  return STORY_REWARDS[(chapter - 1) % STORY_REWARDS.length];
}

/** 스토리 존 오두막 위치 (트랙 안쪽 좌하단) */
export const STORY_POS = { x: 170, y: 566 };
