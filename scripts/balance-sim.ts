/**
 * 밸런스 시뮬레이터 (헤드리스)
 * 실행: node --experimental-strip-types scripts/balance-sim.ts
 *
 * 게임 데이터(src/data)를 그대로 불러와 "무난한 플레이어" 봇으로
 * N판을 돌리고 승률/패배 라운드 분포를 출력한다.
 * 근사 모델: 유닛의 트랙 커버리지 비율 * DPS 로 라운드 처리량을 계산.
 */
import {
  UNITS,
  GRADE_ORDER,
  rollGrade,
  randomUnitOfGrade,
  nextGrade,
  UNIT_BY_ID,
  type UnitDef,
} from "../src/data/units.ts";
import {
  mobStats,
  bossStats,
  armorReduction,
  roundClearBonus,
} from "../src/data/waves.ts";
import { RECIPES } from "../src/data/recipes.ts";
import { CARDS, CARD_ROUNDS, defaultMods, type Mods } from "../src/data/cards.ts";
import {
  TRACK,
  GRID,
  cellCenter,
  ROUND_MAX,
  ROUND_TIME,
  BOSS_TIME,
  MOB_CAP,
  MOBS_PER_ROUND,
  GACHA_COST,
  START_GOLD,
  DEATH_START,
} from "../src/data/config.ts";

// ---------- 트랙 커버리지 ----------
const perim: Array<{ x: number; y: number }> = [];
{
  const cs = [
    { x: TRACK.left, y: TRACK.top },
    { x: TRACK.right, y: TRACK.top },
    { x: TRACK.right, y: TRACK.bottom },
    { x: TRACK.left, y: TRACK.bottom },
  ];
  for (let i = 0; i < 4; i++) {
    const a = cs[i];
    const b = cs[(i + 1) % 4];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const n = Math.ceil(len / 8);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      perim.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
}
const cells: Array<{ x: number; y: number }> = [];
for (let c = 0; c < GRID.cols; c++)
  for (let r = 0; r < GRID.rows; r++) cells.push(cellCenter(c, r));

function coverage(cx: number, cy: number, range: number): number {
  let inR = 0;
  const r2 = range * range;
  for (const p of perim) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    if (dx * dx + dy * dy <= r2) inR++;
  }
  return inR / perim.length;
}

// ---------- 팀 평가 ----------
function evalTeam(
  team: UnitDef[],
  mods: Mods,
  armor: number,
  forBoss: boolean
): number {
  // 방깎: 팀 내 최대치 적용 (게임은 단일 최강 디버프 유지)
  const shred = Math.max(0, ...team.map((u) => u.shredAmt ?? 0));
  const effArmor = Math.max(0, armor - shred);
  const physFactor = 1 - armorReduction(effArmor);

  // 커버리지 좋은 칸부터 강한 유닛 배치
  const sorted = [...team].sort((a, b) => b.atk / b.cooldown - a.atk / a.cooldown);
  const freeCells = [...cells];
  let dps = 0;
  for (const u of sorted) {
    if (freeCells.length === 0) break;
    let bi = 0;
    let bc = -1;
    for (let i = 0; i < freeCells.length; i++) {
      const cov = coverage(freeCells[i].x, freeCells[i].y, u.range * mods.rangeMul);
      if (cov > bc) {
        bc = cov;
        bi = i;
      }
    }
    freeCells.splice(bi, 1);
    let d = (u.atk / (u.cooldown * mods.cdMul)) * mods.atkMul;
    d *= u.dmgType === "phys" ? mods.physMul * physFactor : mods.magicMul;
    if (u.splash && !forBoss) d *= 2.0; // 라인이 뭉치면 스플래시 평균 2타겟
    dps += d * bc;
  }
  return dps;
}

// ---------- 봇 구매/합성/조합 ----------
function buyPhase(team: UnitDef[], state: { gold: number; mods: Mods }): void {
  const cost = () => Math.max(5, GACHA_COST - state.mods.gachaDiscount);
  let guard = 0;
  while (guard++ < 200) {
    // 조합 우선
    let crafted = false;
    for (const r of RECIPES) {
      const idx: number[] = [];
      for (const matId of r.materials) {
        const i = team.findIndex((u, k) => u.id === matId && !idx.includes(k));
        if (i < 0) break;
        idx.push(i);
      }
      if (idx.length === r.materials.length) {
        idx.sort((a, b) => b - a).forEach((i) => team.splice(i, 1));
        team.push(UNIT_BY_ID[r.resultId]);
        crafted = true;
      }
    }
    // 합성 (같은 id 2기 → 상위 랜덤)
    let merged = false;
    outer: for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        if (team[i].id === team[j].id) {
          const next = nextGrade(team[i].grade);
          if (!next) continue;
          // 전설 재료(레시피용)는 남긴다: 흔함/안흔함만 자동 합성
          const gi = GRADE_ORDER.indexOf(team[i].grade);
          if (gi >= 2 && Math.random() < 0.5) continue; // 특별함+는 절반 확률로 보존
          team.splice(j, 1);
          team.splice(i, 1);
          team.push(randomUnitOfGrade(next));
          merged = true;
          break outer;
        }
      }
    }
    // 구매
    let bought = false;
    if (state.gold >= cost() && team.length < cells.length) {
      state.gold -= cost();
      team.push(randomUnitOfGrade(rollGrade()));
      bought = true;
    }
    if (!crafted && !merged && !bought) break;
  }
}

function pickCard(team: UnitDef[], state: { gold: number; death: number; mods: Mods }): void {
  const pool = [...CARDS].sort(() => Math.random() - 0.5).slice(0, 3);
  const physShare =
    team.filter((u) => u.dmgType === "phys").reduce((s, u) => s + u.atk / u.cooldown, 0) /
    Math.max(1, team.reduce((s, u) => s + u.atk / u.cooldown, 0));
  const prio = (id: string): number => {
    switch (id) {
      case "atk": return 10;
      case "phys": return physShare > 0.55 ? 9 : 2;
      case "magic": return physShare < 0.45 ? 9 : 2;
      case "spd": return 8;
      case "rng": return 7;
      case "gold": return 6;
      case "backup": return 5;
      case "disc": return 4;
      case "barri": return 3;
      case "insure": return state.death <= 4 ? 11 : 1;
      default: return 0;
    }
  };
  const best = pool.sort((a, b) => prio(b.id) - prio(a.id))[0];
  const e = best.effect;
  switch (e.kind) {
    case "atkMul": state.mods.atkMul *= e.mul; break;
    case "cdMul": state.mods.cdMul *= e.mul; break;
    case "rangeMul": state.mods.rangeMul *= e.mul; break;
    case "physMul": state.mods.physMul *= e.mul; break;
    case "magicMul": state.mods.magicMul *= e.mul; break;
    case "mobSpeedMul": state.mods.mobSpeedMul *= e.mul; break;
    case "gold": state.gold += e.amount; break;
    case "gachaDiscount": state.mods.gachaDiscount += e.amount; break;
    case "death": state.death += e.amount; break;
    case "freeUnit": team.push(randomUnitOfGrade(e.grade)); break;
  }
}

// ---------- 1판 시뮬레이션 ----------
interface Result {
  win: boolean;
  round: number;
  cause: string;
}

function simulate(): Result {
  const team: UnitDef[] = [];
  const state = { gold: START_GOLD, death: DEATH_START, mods: defaultMods() };
  let fieldHp = 0; // 못 잡고 누적된 몹 체력
  let fieldCount = 0;

  for (let r = 1; r <= ROUND_MAX; r++) {
    buyPhase(team, state);
    const boss = r % 10 === 0;
    if (boss) {
      const b = bossStats(r);
      const dps = evalTeam(team, state.mods, b.armor, true);
      // 보스 잡는 동안에도 필드몹 일부 처리 가정 (70% 보스 집중)
      if (dps * 0.85 * BOSS_TIME < b.hp) {
        return { win: false, round: r, cause: "보스" };
      }
      state.gold += b.gold + roundClearBonus(r);
      // 남은 시간으로 필드 정리
      const spare = Math.max(0, dps * BOSS_TIME - b.hp);
      const cleared = Math.min(fieldHp, spare);
      fieldHp -= cleared;
      fieldCount = fieldHp > 0 ? Math.ceil(fieldCount * (fieldHp / (fieldHp + cleared))) : 0;
    } else {
      const m = mobStats(r);
      const dps = evalTeam(team, state.mods, m.armor, false);
      const need = MOBS_PER_ROUND * m.hp + fieldHp;
      const dmg = dps * ROUND_TIME;
      const killedHp = Math.min(need, dmg);
      const killedMobs = Math.floor(killedHp / m.hp);
      state.gold += Math.min(killedMobs, MOBS_PER_ROUND + fieldCount) * m.gold;
      state.gold += roundClearBonus(r);
      const remain = need - killedHp;
      fieldHp = remain;
      fieldCount = remain > 0 ? Math.ceil(remain / m.hp) : 0;
      if (fieldCount > MOB_CAP) {
        state.death -= fieldCount - MOB_CAP;
        fieldCount = MOB_CAP;
        fieldHp = Math.min(fieldHp, fieldCount * m.hp);
      }
      if (state.death <= 0) {
        return { win: false, round: r, cause: "라인" };
      }
    }
    if (CARD_ROUNDS.has(r)) pickCard(team, state);
  }
  return { win: true, round: ROUND_MAX, cause: "-" };
}

// ---------- 실행 ----------
const N = 400;
const results: Result[] = [];
for (let i = 0; i < N; i++) results.push(simulate());

const wins = results.filter((r) => r.win).length;
const loses = results.filter((r) => !r.win);
const byCause: Record<string, number> = {};
const byRound: Record<number, number> = {};
for (const l of loses) {
  byCause[l.cause] = (byCause[l.cause] ?? 0) + 1;
  byRound[l.round] = (byRound[l.round] ?? 0) + 1;
}
console.log(`시뮬레이션 ${N}판`);
console.log(`승률: ${((wins / N) * 100).toFixed(1)}%`);
console.log(`패배 원인:`, byCause);
console.log(
  `패배 라운드 분포:`,
  Object.entries(byRound)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([r, c]) => `${r}R:${c}`)
    .join(" ")
);
