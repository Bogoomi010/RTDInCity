export const GAME_W = 1280;
export const GAME_H = 720;

/** 몹이 순환하는 트랙 사각형 (모서리 = 웨이포인트) */
export const TRACK = { left: 90, top: 110, right: 880, bottom: 640 };

/** 유닛 배치 그리드 (트랙 내부) */
export const GRID = { cols: 6, rows: 4, cell: 74, x: 263, y: 227 };

export const MOB_CAP = 50; // 필드 몹 수용 한계
export const DEATH_START = 10; // 데스 카운트
export const ROUND_MAX = 40;
export const ROUND_TIME = 25; // 일반 라운드 시간(초)
export const BOSS_TIME = 45; // 보스 제한 시간(초)
export const ROUND_BREAK = 4; // 라운드 간 휴식(초)
export const FIRST_BREAK = 3;
export const MOBS_PER_ROUND = 20;
export const SPAWN_INTERVAL = 0.8; // 초
export const GACHA_COST = 20;
export const START_GOLD = 100;
export const PHASE_SEC = 180; // 낮/밤 지속 시간(초) — 게임 시계 기준(배속 연동)
export const PHASE_BUFF = 1.25; // 태그 유닛의 해당 페이즈 공격력 배율

export function cellCenter(col: number, row: number): { x: number; y: number } {
  return {
    x: GRID.x + col * GRID.cell + GRID.cell / 2,
    y: GRID.y + row * GRID.cell + GRID.cell / 2,
  };
}

export function cellFromPoint(
  x: number,
  y: number
): { col: number; row: number } | null {
  const col = Math.floor((x - GRID.x) / GRID.cell);
  const row = Math.floor((y - GRID.y) / GRID.cell);
  if (col < 0 || col >= GRID.cols || row < 0 || row >= GRID.rows) return null;
  return { col, row };
}
