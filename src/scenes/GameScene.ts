import Phaser from "phaser";
import {
  cellCenter,
  DEATH_START,
  GACHA_COST,
  GAME_H,
  GAME_W,
  GRID,
  MOB_CAP,
  PHASE_BUFF,
  PHASE_SEC,
  ROUND_MAX,
  START_GOLD,
  TRACK,
} from "../data/config";
import { PathLoop } from "../core/path";
import { Mob } from "../entities/Mob";
import { Unit, type CombatCtx } from "../entities/Unit";
import { WaveSystem } from "../systems/WaveSystem";
import { Hud, type ComboRow } from "../ui/hud";
import {
  armorReduction,
  bossStats,
  DIFFICULTY_DEFS,
  goldenStats,
  mobStats,
  roundClearBonus,
  setDifficulty,
  type Difficulty,
} from "../data/waves";
import {
  GRADE_NAME,
  nextGrade,
  randomUnitOfGrade,
  rollGrade,
  UNIT_BY_ID,
  type DmgType,
  type Grade,
  type UnitDef,
} from "../data/units";
import { PAIR_TRANSCENDS } from "../data/recipes";
import { comboResult, deckComboKeys, HIDDEN_IDS } from "../data/combos";
import {
  CARD_ROUNDS,
  defaultMods,
  drawCards,
  type CardEffect,
  type Mods,
} from "../data/cards";
import { sfx } from "../core/sfx";
import { activeSkill, skillsOf, teamAuraMul } from "../data/skills";
import {
  BOOSTER_CAP,
  BOOSTER_PER_LOSS,
  CITY_EVENTS,
  EVENT_CHANCE,
  EVENT_FISHBREAD_GOLD,
  EVENT_GOLDEN_COUNT,
  EVENT_MARKET_DISCOUNT,
  EVENT_MIN_ROUND,
  EVENT_RAIN_SLOW,
  HIDDEN_BASE,
  JACKPOT_CHANCE,
  JACKPOT_ROLLS,
  MUTATOR_CHANCE,
  MUTATORS,
  NEAR_MISS_CHANCE,
  PITY_LIMIT,
  PITY_MIN_ROUND,
  STREAK_WINDOW_MS,
  streakGoldMul,
} from "../data/events";
import { ACHIEVEMENT_BY_ID, ACHIEVEMENTS } from "../data/achievements";
import { initStocks, tickStocks, type StockState } from "../data/stocks";
import {
  addAchievement,
  loadAchievements,
  loadBooster,
  loadCounters,
  saveBooster,
  saveCounters,
  type Counters,
} from "../core/save";
import { addDex, loadDex, loadStory, saveStory, updateRecords } from "../core/save";
import {
  STORY_POS,
  storyBossHp,
  storyChapter,
  storyReward,
} from "../data/story";

/** 부대 한도 — 그리드 폐지 후에도 기존 24칸 수용량 유지 */
const MAX_UNITS = GRID.cols * GRID.rows;

/** 웨이브 보스 처치 시 지급되는 소환권 등급 */
const BOSS_TICKET: Record<number, Grade> = {
  10: "uncommon",
  20: "special",
  30: "rare",
  40: "legendary",
};

export class GameScene extends Phaser.Scene {
  private loop!: PathLoop;
  private wave!: WaveSystem;
  private hud!: Hud;
  private mobs: Mob[] = [];
  private units: Unit[] = [];
  private selectedUnits: Unit[] = [];
  private dragStart: { x: number; y: number } | null = null;
  private dragging = false;
  private marqueeG!: Phaser.GameObjects.Graphics; // 드래그 선택 박스

  private deck: string[] = ["dv1", "pc1", "sn1"]; // 덱 선택 없이 진입 시 기본값
  private difficulty: Difficulty = "normal";
  private dex = new Set<string>(); // 발견한 조합 (판 간 누적, 세이브 연동)
  private tickets: Partial<Record<Grade, number>> = {}; // 🎟 등급별 소환권

  // 📖 스토리 존 — 챕터·보스 HP는 세이브로 판 간 유지
  private storyChapterNo = 1;
  private storyHp = 0;
  private storyMax = 1;
  private storyLoaded = false;
  private storyUnit: Unit | null = null; // 파견 중인 유닛 (필드에서 제외)
  private pendingDispatch: Unit | null = null; // 오두막으로 걸어가는 중
  private gold = START_GOLD;
  private death = DEATH_START;
  private kills = 0;
  private over = false;
  private paused = false; // 카드 선택 등 시스템 정지
  private userPaused = false; // ⏸ 버튼
  /** 어떤 이유로든 게임이 멈춘 상태 — 정지 기능은 공통, 플래그만 구분 */
  private get halted(): boolean {
    return this.paused || this.userPaused;
  }
  private speed = 1; // 1 / 2 / 3배속
  private gameTime = 0; // 배속이 반영된 가상 시계(ms) — 디버프 만료·낮/밤 기준
  private wasDay = true;
  /** 낮/밤 페이즈 — PHASE_SEC마다 전환 */
  private get isDay(): boolean {
    const p = PHASE_SEC * 1000;
    return this.gameTime % (p * 2) < p;
  }
  private mods: Mods = defaultMods();
  // 액티브 스킬의 아군 전체 버프 (총동원령 등)
  private teamBuffUntil = 0;
  private teamBuffCdMul = 1;
  private teamBuffAtkMul = 1;

  // ---------- 도파민 시스템 (v3.9 — 수치는 data/events.ts) ----------
  private streak = 0; // 🔥 킬 스트릭
  private lastKillAt = -1e9;
  private maxStreak = 0;
  private killsThisTick = 0; // 동시 처치 토스트용
  private toastCoolUntil = 0;
  private pity = 0; // 🎰 천장 — 전설 못 본 뽑기 수 (21R+)
  private roundGoldMul = 1; // 🎲 변이 라운드
  private roundSpeedMul = 1;
  private rainNextRound = false; // 📰 게릴라 소나기
  private rainThisRound = false;
  private booster = 0; // 🎟 다음 판 부스터 — 히든 확률 가산 (판 간 유지)
  private achUnlocked = new Set<string>(); // 🏆 업적 (판 간 누적)
  private counters: Counters = { goldenKills: 0 };
  private runNewDex = 0; // 이번 판 신규 도감 해금 수 (결과 하이라이트)
  private stocks: Record<string, StockState> = initStocks(); // 📈 미니 주식 (판 단위)
  private pendingStockBoost: string | null = null; // 속보·러시아워 연동 급등 예약

  private hpG!: Phaser.GameObjects.Graphics;
  private nightO!: Phaser.GameObjects.Rectangle; // 밤 오버레이 (알파로 낮/밤 연출)

  constructor() {
    super("game");
  }

  create(data: { deck?: string[]; difficulty?: Difficulty } = {}): void {
    if (data.deck?.length === 3) this.deck = data.deck;
    if (data.difficulty) this.difficulty = data.difficulty;
    setDifficulty(this.difficulty);
    void loadDex().then((d) => {
      this.dex = new Set(d);
      if (!this.over) this.refreshRecipes();
    });
    this.storyChapterNo = 1;
    this.storyHp = 0;
    this.storyMax = 1;
    this.storyLoaded = false;
    this.storyUnit = null;
    this.pendingDispatch = null;
    void loadStory().then((s) => {
      this.storyChapterNo = s?.chapter ?? 1;
      this.storyMax = storyBossHp(this.storyChapterNo);
      this.storyHp = s?.hp ?? this.storyMax;
      this.storyLoaded = true;
    });

    // 상태 초기화 (재시작 대비)
    this.mobs = [];
    this.units = [];
    this.selectedUnits = [];
    this.dragStart = null;
    this.dragging = false;
    this.gold = START_GOLD;
    this.death = DEATH_START;
    this.kills = 0;
    this.over = false;
    this.paused = false;
    this.userPaused = false;
    this.tickets = {};
    this.speed = 1;
    this.gameTime = 0;
    this.wasDay = true;
    this.mods = defaultMods();
    this.teamBuffUntil = 0;
    this.teamBuffCdMul = 1;
    this.teamBuffAtkMul = 1;
    this.streak = 0;
    this.lastKillAt = -1e9;
    this.maxStreak = 0;
    this.killsThisTick = 0;
    this.toastCoolUntil = 0;
    this.pity = 0;
    this.roundGoldMul = 1;
    this.roundSpeedMul = 1;
    this.rainNextRound = false;
    this.rainThisRound = false;
    this.runNewDex = 0;
    this.stocks = initStocks();
    this.pendingStockBoost = null;
    void loadAchievements().then((a) => (this.achUnlocked = new Set(a)));
    void loadCounters().then((c) => (this.counters = c));
    void loadBooster().then((b) => {
      this.booster = b;
      if (b > 0) {
        this.hud.message(`🎟 위로 쿠폰 발동 — 이번 판 히든 확률 +${Math.round(b * 100)}%p`);
      }
    });

    this.loop = new PathLoop([
      { x: TRACK.left, y: TRACK.top },
      { x: TRACK.right, y: TRACK.top },
      { x: TRACK.right, y: TRACK.bottom },
      { x: TRACK.left, y: TRACK.bottom },
    ]);

    this.drawBoard();
    this.hpG = this.add.graphics().setDepth(6);
    this.marqueeG = this.add.graphics().setDepth(45);
    this.nightO = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0b1026, 1)
      .setAlpha(0)
      .setDepth(40);

    this.hud = new Hud(
      () => this.gacha(),
      () => this.merge(),
      (comboKey) => this.craftCombo(comboKey),
      (grade, unitId) => this.summon(grade, unitId),
      () => this.recallStory(),
      () => {
        this.speed = (this.speed % 3) + 1;
        return this.speed;
      },
      () => {
        if (!this.over) this.userPaused = !this.userPaused;
        return this.userPaused;
      },
      () => this.giveUp(),
      () => this.castActive(),
      (stockId, n) => this.tradeStock(stockId, n)
    );
    this.refreshRecipes();
    this.hud.stocksRender(this.stocks, this.gold);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.destroy());

    this.wave = new WaveSystem({
      spawn: (round, boss) => this.spawnMob(round, boss),
      // 황금 비둘기는 라운드 종료·수용 한계 계산에서 제외
      mobCount: () => this.mobs.filter((m) => !m.golden).length,
      roundStart: (round, boss) => {
        // 📰 소나기 예약 소진 + 🎲 변이 라운드 (비보스 · 보너스만)
        this.rainThisRound = this.rainNextRound;
        this.rainNextRound = false;
        this.roundGoldMul = 1;
        this.roundSpeedMul = 1;
        if (this.rainThisRound) {
          this.hud.message(`🌧 게릴라 소나기 — 몹 이동속도 -${EVENT_RAIN_SLOW * 100}%`);
        }
        if (!boss && Math.random() < MUTATOR_CHANCE) {
          const mu = MUTATORS[Math.floor(Math.random() * MUTATORS.length)];
          this.roundGoldMul = mu.goldMul;
          this.roundSpeedMul = mu.speedMul;
          if (mu.id === "rush") this.pendingStockBoost = "rider"; // 🛵 배달로켓 연동
          this.hud.message(`${mu.name} — ${mu.desc}`);
          sfx.card();
        }
        if (boss) {
          const b = bossStats(round);
          this.hud.message(`라운드 ${round} — 보스 [${b.name}] 등장!`);
          sfx.alarm();
        } else {
          this.hud.message(`라운드 ${round} — ${mobStats(round).name}`);
        }
      },
      roundClear: (round) => {
        // 예산 배정 (tf4 패시브): 필드 존재 시 클리어 골드 배율
        let mul = 1;
        for (const u of this.units) {
          for (const s of skillsOf(u.def.id)) {
            if (s.roundClearGoldMul) mul *= s.roundClearGoldMul;
          }
        }
        this.gold += Math.round(roundClearBonus(round) * mul);
        if (CARD_ROUNDS.has(round) && !this.over) this.offerCards();
        // 📰 속보 이벤트 — 보너스만, 낮은 빈도 (data/events.ts)
        if (round >= EVENT_MIN_ROUND && !this.over && Math.random() < EVENT_CHANCE) {
          this.fireCityEvent();
        }
        // 📈 주식 시세 갱신 — 속보·러시아워 연동 급등 반영
        if (!this.over) {
          const alerts = tickStocks(this.stocks, this.pendingStockBoost);
          this.pendingStockBoost = null;
          if (alerts.length > 0) {
            const a = alerts[0];
            this.hud.message(
              `${a.pct > 0 ? "📈" : "📉"} ${a.def.icon} ${a.def.name} ${
                a.pct > 0 ? "급등" : "급락"
              } ${a.pct > 0 ? "+" : ""}${Math.round(a.pct * 100)}%!`
            );
          }
          this.hud.stocksRender(this.stocks, this.gold);
        }
      },
      message: (t) => this.hud.message(t),
      defeat: (reason) => this.gameOver(false, reason),
      victory: () => this.gameOver(true, "도시를 지켜냈습니다!"),
    });

    // RTS식 조작 — 좌드래그: 다중 선택 / 좌클릭(빈 곳): 해제 / 우클릭: 이동 명령
    this.input.mouse?.disableContextMenu();
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.over || this.halted) return;
      // 상단바·우측 패널 영역 클릭은 무시 — UI 틈새 클릭으로 선택이 풀리는 것 방지
      if (p.worldY < 56 || p.worldX > 950) return;
      if (p.rightButtonDown()) {
        this.commandMove(p.worldX, p.worldY);
        return;
      }
      this.dragStart = { x: p.worldX, y: p.worldY };
      this.dragging = false;
    });
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (!this.dragStart || !p.isDown) return;
      if (
        !this.dragging &&
        Math.hypot(p.worldX - this.dragStart.x, p.worldY - this.dragStart.y) > 8
      ) {
        this.dragging = true;
      }
      if (this.dragging) {
        const x = Math.min(this.dragStart.x, p.worldX);
        const y = Math.min(this.dragStart.y, p.worldY);
        const w = Math.abs(p.worldX - this.dragStart.x);
        const h = Math.abs(p.worldY - this.dragStart.y);
        this.marqueeG.clear();
        this.marqueeG.fillStyle(0xffd166, 0.08);
        this.marqueeG.fillRect(x, y, w, h);
        this.marqueeG.lineStyle(2, 0xffd166, 0.9);
        this.marqueeG.strokeRect(x, y, w, h);
      }
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (!this.dragStart) return;
      const s = this.dragStart;
      this.dragStart = null;
      this.marqueeG.clear();
      if (this.dragging) {
        this.dragging = false;
        const x1 = Math.min(s.x, p.worldX);
        const x2 = Math.max(s.x, p.worldX);
        const y1 = Math.min(s.y, p.worldY);
        const y2 = Math.max(s.y, p.worldY);
        this.selectUnits(
          this.units.filter(
            (u) => u.x >= x1 && u.x <= x2 && u.y >= y1 && u.y <= y2
          )
        );
      } else {
        // 단순 클릭(빈 곳) = 해제 — 유닛 클릭은 유닛 자체 핸들러가 처리
        this.selectUnits([]);
      }
    });
    // Space = 뽑기 (가장 잦은 행동의 단축키)
    this.input.keyboard?.on("keydown-SPACE", () => this.gacha());

    if (this.difficulty !== "normal") {
      this.hud.message(`난이도: ${DIFFICULTY_DEFS[this.difficulty].name}`);
    }
  }

  update(_time: number, delta: number): void {
    if (this.over || this.halted) return;

    const d = delta * this.speed;
    this.gameTime += d;

    const day = this.isDay;
    if (day !== this.wasDay) {
      this.wasDay = day;
      this.tweens.add({
        targets: this.nightO,
        alpha: day ? 0 : 0.42,
        duration: 900,
      });
      this.hud.message(
        day ? "☀ 아침이 밝았다 — 낮 유닛 강화!" : "🌙 밤이 찾아왔다 — 밤 유닛 강화!"
      );
      // 지하철 출근 (tf5 패시브): 낮 시작 시 골드
      if (day) {
        let bonus = 0;
        for (const u of this.units) {
          for (const s of skillsOf(u.def.id)) {
            if (s.dayStartGold) bonus += s.dayStartGold;
          }
        }
        if (bonus > 0) {
          this.gold += bonus;
          this.hud.message(`🚇 지하철 출근 — 골드 +${bonus}`);
        }
      }
    }

    this.wave.update(d);
    if (this.over) return;

    this.killsThisTick = 0;
    const mobSpeedMul =
      this.mods.mobSpeedMul *
      this.roundSpeedMul *
      (this.rainThisRound ? 1 - EVENT_RAIN_SLOW : 1);
    for (const m of this.mobs) m.advance(this.gameTime, d, mobSpeedMul);

    // 황금 비둘기: 트랙 1바퀴를 돌면 벌 없이 떠난다
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (m.golden && m.dist >= this.loop.total) {
        this.mobs.splice(i, 1);
        m.destroy();
        this.hud.message("황금 비둘기가 떠났다…");
      }
    }

    // 도트 (랜섬웨어·좀비 프로세스) — 마법 판정으로 틱마다 차감
    for (const m of [...this.mobs]) {
      if (!m.dead && m.dotDps > 0 && this.gameTime < m.dotUntil) {
        this.damage(m, (m.dotDps * d) / 1000, "magic");
      }
    }

    // 필드 오라 — 유닛 계열별 배율을 틱마다 1회 계산 (skills.ts와 공유 수식)
    const teamIds = this.units.map((u) => u.def.id);
    const auraCache = new Map<string, { atkMul: number; cdMul: number }>();
    const teamBuffed = this.gameTime < this.teamBuffUntil;
    const ctx: CombatCtx = {
      now: this.gameTime,
      isDay: day,
      round: this.wave.round,
      death: this.death,
      allyCount: this.units.length,
      mobs: this.mobs,
      cdMul: this.mods.cdMul * (teamBuffed ? this.teamBuffCdMul : 1),
      rangeMul: this.mods.rangeMul,
      hasAllyFamily: (f) =>
        this.units.some((u) =>
          f === "common" ? u.def.grade === "common" : u.def.family === f
        ),
      aura: (family) => {
        const key = family ?? "-";
        let v = auraCache.get(key);
        if (!v) {
          v = teamAuraMul(teamIds, family);
          auraCache.set(key, v);
        }
        return v;
      },
      damage: (m, a, t, kg) => this.damage(m, a, t, kg),
      flash: (x1, y1, x2, y2, color) => this.flash(x1, y1, x2, y2, color),
    };
    for (const u of this.units) u.update(ctx, d);

    // 💥 동시 처치 아나운서 — 한 틱에 다수 처치 (쿨다운으로 스팸 방지)
    if (this.killsThisTick >= 6 && this.gameTime > this.toastCoolUntil) {
      this.toastCoolUntil = this.gameTime + 4000;
      this.hud.message(`💥 동시 처치 ${this.killsThisTick}!`);
    }

    // 📖 스토리 존 — 도착 시 파견 / 파견 유닛의 DPS로 보스 HP 차감
    if (this.pendingDispatch) {
      const u = this.pendingDispatch;
      if (!this.units.includes(u)) this.pendingDispatch = null;
      else if (!u.moving) {
        this.pendingDispatch = null;
        this.dispatchStory(u);
      }
    }
    if (this.storyUnit && this.storyLoaded) {
      const def = this.storyUnit.def;
      const p = def.phase;
      const buff =
        p !== undefined && (p === "both" || (p === "day") === day)
          ? PHASE_BUFF
          : 1;
      // 서버 상주 (t3 패시브): 스토리 존 파견 DPS 배율
      const storyMul =
        skillsOf(def.id).find((s) => s.storyDpsMul)?.storyDpsMul ?? 1;
      this.storyHp -= ((def.atk / def.cooldown) * buff * storyMul * d) / 1000;
      if (this.storyHp <= 0) this.clearStoryChapter();
    }
    if (this.storyLoaded) {
      const ch = storyChapter(this.storyChapterNo);
      this.hud.storyUpdate(
        this.storyChapterNo,
        ch.title,
        ch.boss,
        this.storyHp,
        this.storyMax,
        this.storyUnit?.def.name ?? null
      );
    }

    this.drawHpBars();
    this.hud.update({
      round: this.wave.round,
      roundMax: this.wave.endless ? Infinity : ROUND_MAX,
      timeLeft: this.wave.timeLeftSec,
      state: this.wave.state,
      mobs: this.mobs.length,
      cap: MOB_CAP,
      death: this.death,
      gold: this.gold,
      gachaCost: this.gachaCost(),
      isDay: day,
      phaseLeft: Math.ceil(
        (PHASE_SEC * 1000 - (this.gameTime % (PHASE_SEC * 1000))) / 1000
      ),
      streak: this.gameTime - this.lastKillAt <= STREAK_WINDOW_MS ? this.streak : 0,
      pityLeft:
        this.wave.round >= PITY_MIN_ROUND ? Math.max(0, PITY_LIMIT - this.pity) : null,
    });
  }

  /** 📰 속보 이벤트 — 전부 보너스, 페널티 없음 (황금 비둘기 원칙) */
  private fireCityEvent(): void {
    const ev = CITY_EVENTS[Math.floor(Math.random() * CITY_EVENTS.length)];
    switch (ev.id) {
      case "rain":
        this.rainNextRound = true;
        break;
      case "fishbread":
        this.gold += EVENT_FISHBREAD_GOLD;
        this.pendingStockBoost = "fish"; // 🐟 붕어빵F&B 연동
        break;
      case "goldenFlock":
        for (let i = 0; i < EVENT_GOLDEN_COUNT; i++) {
          this.mobs.push(
            new Mob(this, this.loop, goldenStats(Math.max(1, this.wave.round)), i * 40)
          );
        }
        break;
      case "nightMarket":
        this.mods.gachaDiscount += EVENT_MARKET_DISCOUNT;
        break;
    }
    this.hud.message(`📰 속보! ${ev.name} — ${ev.desc}`);
    sfx.card();
  }

  /** 📈 주식 매매 — n > 0 매수 / n < 0 매도 (-999 = 전량) */
  private tradeStock(stockId: string, n: number): void {
    if (this.over) return;
    const st = this.stocks[stockId];
    if (!st) return;
    if (n > 0) {
      const cost = st.price * n;
      if (this.gold < cost) {
        this.hud.message("골드가 부족합니다");
        return;
      }
      this.gold -= cost;
      st.avgCost = (st.avgCost * st.shares + cost) / (st.shares + n);
      st.shares += n;
    } else {
      const sell = n === -999 ? st.shares : Math.min(st.shares, -n);
      if (sell <= 0) return;
      const gain = st.price * sell;
      this.gold += gain;
      st.shares -= sell;
      if (st.shares === 0) st.avgCost = 0;
      const profit = Math.round((st.price - st.avgCost) * sell);
      if (profit > 0) this.hud.message(`📈 익절 +${profit}G!`);
      else if (profit < 0) this.hud.message(`📉 손절 ${profit}G…`);
    }
    sfx.card();
    this.hud.stocksRender(this.stocks, this.gold);
  }

  /** 🏆 업적 달성 (판 간 누적 — 신규일 때만 토스트) */
  private unlock(id: string): void {
    if (this.achUnlocked.has(id)) return;
    this.achUnlocked.add(id);
    void addAchievement(id).then((fresh) => {
      if (fresh) this.hud.message(`🏆 업적 달성 — ${ACHIEVEMENT_BY_ID[id].name}!`);
    });
  }

  // ---------- 전투 ----------

  private spawnMob(round: number, boss: boolean): Mob | null {
    if (this.over) return null;
    // ✨ 황금 비둘기 — 스폰당 0.25% (라운드당 ~5%)
    if (!boss && Math.random() < 0.0025) {
      this.mobs.push(new Mob(this, this.loop, goldenStats(round)));
      this.hud.message("✨ 황금 비둘기 출현! 잡으면 골드 ×10");
    }
    if (!boss && this.mobs.filter((m) => !m.golden).length >= MOB_CAP) {
      this.death--;
      this.hud.message(`수용 한계 초과! 데스 -1 (남은 데스 ${this.death})`);
      if (this.death <= 0) {
        this.gameOver(false, "라인이 붕괴되었습니다");
        return null;
      }
    }
    const stats = boss ? bossStats(round) : mobStats(round);
    const mob = new Mob(this, this.loop, stats);
    this.mobs.push(mob);
    return mob;
  }

  private damage(m: Mob, amount: number, type: DmgType, killGoldMul = 1): boolean {
    if (this.over || m.dead) return false;
    amount *= this.mods.atkMul;
    amount *= type === "phys" ? this.mods.physMul : this.mods.magicMul;
    if (this.gameTime < this.teamBuffUntil) amount *= this.teamBuffAtkMul;
    amount *= m.takenMul(this.gameTime); // 스킬 마킹 — 받는 피해 증가
    if (type === "phys") {
      amount *= 1 - armorReduction(m.effArmor(this.gameTime));
    }
    const preHp = m.hp;
    if (m.hit(amount)) {
      // 🔥 킬 스트릭 — 짧은 간격 연속 처치 시 골드 보너스 (data/events.ts)
      this.streak =
        this.gameTime - this.lastKillAt <= STREAK_WINDOW_MS ? this.streak + 1 : 1;
      this.lastKillAt = this.gameTime;
      this.maxStreak = Math.max(this.maxStreak, this.streak);
      if (this.streak >= 20) this.unlock("streak-20");
      this.killsThisTick++;
      // 골드: 처치 배율(스킬) × 스트릭 × 변이 라운드
      this.gold += Math.round(
        m.gold * killGoldMul * streakGoldMul(this.streak) * this.roundGoldMul
      );
      if (m.golden) {
        this.counters.goldenKills++;
        if (this.counters.goldenKills >= 10) this.unlock("golden-10");
      }
      // 💥 오버킬 — 남은 HP의 3배 이상 한 방 (연출만, 보상 없음)
      const overkill = amount >= preHp * 3 && preHp > 0;
      this.kills++;
      const i = this.mobs.indexOf(m);
      if (i >= 0) this.mobs.splice(i, 1);
      // 🗑 분열: 쓰레기 상위 몹은 죽으면 봉투 2개로 갈라진다
      if (m.splits) {
        for (const off of [-16, 16]) {
          this.mobs.push(
            new Mob(
              this,
              this.loop,
              {
                hp: Math.max(1, Math.round(m.maxHp * 0.25)),
                speed: m.baseSpeed,
                gold: Math.max(1, Math.floor(m.gold / 2)),
                armor: m.armor,
                boss: false,
                name: "쓰레기 봉투",
                color: 0x8bc34a,
              },
              m.dist + off
            )
          );
        }
      }
      const wasBoss = m.isBoss;
      this.killPop(m.x, m.y, wasBoss, overkill);
      m.destroy();
      sfx.kill();
      if (wasBoss) {
        // 🎟 보스 처치 보상: 라운드에 맞는 등급 소환권 (♾ 무한 보스 = 전설)
        const g =
          BOSS_TICKET[this.wave.round] ??
          (this.wave.round > ROUND_MAX ? "legendary" : undefined);
        if (g) {
          this.tickets[g] = (this.tickets[g] ?? 0) + 1;
          this.hud.message(`🎟 ${GRADE_NAME[g]} 소환권 획득!`);
          this.refreshRecipes();
        }
        this.wave.notifyBossKilled();
      }
      return true;
    }
    return false;
  }

  /** ⚡ 액티브 스킬 발동 — 단일 선택 유닛의 액티브 (HUD 버튼) */
  private castActive(): void {
    if (this.over || this.halted) return;
    if (this.selectedUnits.length !== 1) return;
    const u = this.selectedUnits[0];
    const act = activeSkill(u.def.id);
    if (!act) return;
    const now = this.gameTime;
    if (now < u.activeReadyAt) {
      const left = Math.ceil((u.activeReadyAt - now) / 1000);
      this.hud.message(`⏳ ${act.name} — ${left}초 후 사용 가능`);
      return;
    }
    u.activeReadyAt = now + (act.cooldownSec ?? 60) * 1000;
    if (act.freezeMs) {
      for (const m of this.mobs) m.applyStun(act.freezeMs, now);
    }
    if (act.teamMs && (act.teamCdMul !== undefined || act.teamAtkMul !== undefined)) {
      this.teamBuffUntil = now + act.teamMs;
      this.teamBuffCdMul = act.teamCdMul ?? 1;
      this.teamBuffAtkMul = act.teamAtkMul ?? 1;
    }
    if (act.selfMs && act.selfCdMul !== undefined) {
      u.applyBuff(now, act.selfMs, act.selfCdMul);
    }
    this.cameras.main.flash(300, 140, 230, 255);
    sfx.alarm();
    this.hud.message(`⚡ ${act.name} 발동!`);
  }

  private killPop(x: number, y: number, boss: boolean, overkill = false): void {
    const c = this.add
      .circle(x, y, boss ? 14 : overkill ? 10 : 6, 0xffd166)
      .setDepth(9)
      .setAlpha(0.9);
    this.tweens.add({
      targets: c,
      scale: boss ? 3 : overkill ? 2.6 : 2,
      alpha: 0,
      duration: boss ? 300 : overkill ? 260 : 160,
      onComplete: () => c.destroy(),
    });
    // 💥 오버킬 팡파레 — 코인이 튀어오른다 (연출만)
    if (overkill || boss) {
      for (let i = 0; i < (boss ? 6 : 3); i++) {
        const coin = this.add.circle(x, y, 4, 0xffd700).setDepth(9);
        this.tweens.add({
          targets: coin,
          x: x + (Math.random() - 0.5) * 70,
          y: y - 30 - Math.random() * 40,
          alpha: 0,
          duration: 380 + Math.random() * 160,
          ease: "Cubic.easeOut",
          onComplete: () => coin.destroy(),
        });
      }
    }
  }

  private flash(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: number
  ): void {
    const ln = this.add
      .line(0, 0, x1, y1, x2, y2, color)
      .setOrigin(0, 0)
      .setLineWidth(2)
      .setAlpha(0.9)
      .setDepth(8);
    this.tweens.add({
      targets: ln,
      alpha: 0,
      duration: 130,
      onComplete: () => ln.destroy(),
    });
    sfx.shoot();
  }

  // ---------- 유닛 ----------

  private gachaCost(): number {
    return Math.max(5, GACHA_COST - this.mods.gachaDiscount);
  }

  /** 트랙 안쪽 랜덤 지점 (그리드 셀 중심 + 흔들림) */
  private randomSpawnPos(): { x: number; y: number } {
    const col = Math.floor(Math.random() * GRID.cols);
    const row = Math.floor(Math.random() * GRID.rows);
    const c = cellCenter(col, row);
    return {
      x: c.x + (Math.random() - 0.5) * 16,
      y: c.y + (Math.random() - 0.5) * 16,
    };
  }

  /** 랜덤 위치에 유닛 배치. 성공 여부 반환 (부대 한도 초과 시 실패) */
  private placeNewUnit(defGetter: () => UnitDef): boolean {
    if (this.units.length >= MAX_UNITS) return false;
    const def = defGetter();
    const pos = this.randomSpawnPos();
    this.addUnit(def, pos.x, pos.y);
    this.hud.message(def.hidden ? `✨ 히든! ${def.name} 획득!` : `${def.name} 획득!`);
    this.refreshRecipes();
    return true;
  }

  /** 뽑기: 흔함은 덱 3종에서, 히든 확률 = 기본 6% + 위로 쿠폰. 🎰 천장(50연속)이면 전설 확정 */
  private rollUnit(): UnitDef {
    let grade = rollGrade(this.wave.round);
    if (this.wave.round >= PITY_MIN_ROUND && this.pity >= PITY_LIMIT) {
      grade = "legendary"; // 천장 발동
    }
    if (grade !== "common") return randomUnitOfGrade(grade);
    if (Math.random() < HIDDEN_BASE + this.booster) {
      return UNIT_BY_ID[HIDDEN_IDS[Math.floor(Math.random() * HIDDEN_IDS.length)]];
    }
    return UNIT_BY_ID[this.deck[Math.floor(Math.random() * this.deck.length)]];
  }

  /** 뽑기 1회 사후 처리 — 천장 카운트 + 등급 컷인/니어미스 연출 */
  private afterGachaRoll(def: UnitDef): void {
    if (def.grade === "legendary") {
      if (this.pity >= PITY_LIMIT) this.hud.message("🎰 천장 도달 — 전설 확정!");
      this.pity = 0;
    } else if (this.wave.round >= PITY_MIN_ROUND) {
      this.pity++;
    }
    if (def.grade === "special" || def.grade === "rare" || def.grade === "legendary") {
      // 니어미스: 특별함/희귀함 결과에 한 등급 위 색이 스쳤다 떨어진다 (연출만 — 확률 왜곡 없음)
      const up = nextGrade(def.grade);
      const nearMiss =
        def.grade !== "legendary" && up && Math.random() < NEAR_MISS_CHANCE ? up : undefined;
      this.hud.gachaCutIn(def.grade, def.name, nearMiss);
    }
  }

  private gacha(): void {
    if (this.over || this.halted) return;
    const cost = this.gachaCost();
    if (this.gold < cost) {
      this.hud.message("골드가 부족합니다");
      return;
    }
    const def = this.rollUnit();
    if (!this.placeNewUnit(() => def)) {
      this.hud.message("부대가 가득 찼습니다 — 조합으로 정리하세요");
      return;
    }
    this.gold -= cost;
    sfx.gacha();
    this.afterGachaRoll(def);

    // 🎰 연쇄 뽑기 잭팟 — 낮은 확률로 무료 뽑기가 연달아 터진다
    if (Math.random() < JACKPOT_CHANCE) {
      const n =
        JACKPOT_ROLLS[0] +
        Math.floor(Math.random() * (JACKPOT_ROLLS[1] - JACKPOT_ROLLS[0] + 1));
      let got = 0;
      for (let i = 0; i < n; i++) {
        const free = this.rollUnit();
        if (!this.placeNewUnit(() => free)) break;
        this.afterGachaRoll(free);
        got++;
      }
      if (got > 0) {
        this.hud.message(`🎰 서비스!! 무료 뽑기 ${got}회!`);
        this.cameras.main.flash(250, 255, 215, 0);
        sfx.power();
      }
    }
  }

  // ---------- 카드 ----------

  private offerCards(): void {
    this.paused = true;
    sfx.card();
    const cards = drawCards(3);
    this.hud.offerCards(cards, (id) => {
      const card = cards.find((c) => c.id === id);
      if (!card) return;
      this.applyCard(card.effect);
      this.paused = false;
      this.refreshRecipes();
      sfx.power();
    });
  }

  private applyCard(effect: CardEffect): void {
    switch (effect.kind) {
      case "atkMul":
        this.mods.atkMul *= effect.mul;
        break;
      case "cdMul":
        this.mods.cdMul *= effect.mul;
        break;
      case "rangeMul":
        this.mods.rangeMul *= effect.mul;
        break;
      case "physMul":
        this.mods.physMul *= effect.mul;
        break;
      case "magicMul":
        this.mods.magicMul *= effect.mul;
        break;
      case "mobSpeedMul":
        this.mods.mobSpeedMul *= effect.mul;
        break;
      case "gold":
        this.gold += effect.amount;
        break;
      case "gachaDiscount":
        this.mods.gachaDiscount += effect.amount;
        break;
      case "death":
        this.death += effect.amount;
        break;
      case "freeUnit":
        if (!this.placeNewUnit(() => randomUnitOfGrade(effect.grade))) {
          this.hud.message("부대가 가득 차 지원 유닛을 받을 수 없습니다");
        }
        break;
    }
  }

  // ---------- 합성 / 조합 ----------

  /** 합성은 전설 2기 → 초월만 존재. 일반 성장은 3기 조합·뽑기가 담당 */
  private merge(): void {
    if (this.over || this.halted) return;
    const base = this.selectedUnits[0];
    if (!base) return;

    // 전설 2기 → 초월. 지정 페어면 테마를 계승한 지정 초월, 아니면 랜덤(천장)
    if (base.def.grade === "legendary") {
      const legends = this.units.filter(
        (u) => u !== base && u.def.grade === "legendary"
      );
      if (legends.length === 0) {
        this.hud.message("전설 유닛이 2기 필요합니다");
        return;
      }
      let partner: Unit | undefined;
      let resultDef: UnitDef | undefined;
      for (const p of PAIR_TRANSCENDS) {
        const other =
          p.pair[0] === base.def.id
            ? p.pair[1]
            : p.pair[1] === base.def.id
              ? p.pair[0]
              : null;
        if (!other) continue;
        const found = legends.find((l) => l.def.id === other);
        if (found) {
          partner = found;
          resultDef = UNIT_BY_ID[p.resultId];
          break;
        }
      }
      const isPair = partner !== undefined;
      partner ??= legends[0];
      resultDef ??= randomUnitOfGrade("transcendent");

      const bx = base.x;
      const by = base.y;
      this.removeUnit(base);
      this.removeUnit(partner);

      const unit = this.addUnit(resultDef, bx, by);
      this.selectUnits([unit]);
      this.hud.message(
        isPair ? `⚡ 운명의 페어! ${resultDef.name} 강림!` : `⚡ 초월 강림! ${resultDef.name}!`
      );
      this.refreshRecipes();
      sfx.power();
      return;
    }

    // 안흔함~희귀함: 같은 등급 3기(종류 무관) → 상위 등급 랜덤 (3단 합성)
    // 흔함은 3기 조합 패널이 담당
    const next = nextGrade(base.def.grade);
    if (base.def.grade === "common" || !next) return;

    const sameGrade = this.units.filter(
      (u) => u !== base && u.def.grade === base.def.grade
    );
    if (sameGrade.length < 2) {
      this.hud.message("같은 등급 유닛이 3기 필요합니다");
      return;
    }

    const bx = base.x;
    const by = base.y;
    this.removeUnit(base);
    for (const u of sameGrade.slice(0, 2)) this.removeUnit(u);

    const def = randomUnitOfGrade(next);
    const unit = this.addUnit(def, bx, by);
    this.selectUnits([unit]);
    this.hud.message(`${GRADE_NAME[next]} ${def.name} 합성!`);
    this.refreshRecipes();
    sfx.power();
  }

  // ---------- 📖 스토리 존 ----------

  /** 파견: 유닛을 필드에서 빼서 스토리 존으로 (숨김 처리) */
  private dispatchStory(u: Unit): void {
    const i = this.units.indexOf(u);
    if (i >= 0) this.units.splice(i, 1);
    const si = this.selectedUnits.indexOf(u);
    if (si >= 0) this.selectUnits(this.selectedUnits.filter((x) => x !== u));
    u.setVisible(false);
    u.disableInteractive();
    this.storyUnit = u;
    const ch = storyChapter(this.storyChapterNo);
    this.hud.message(`📖 ${u.def.name} 파견 — [${ch.boss}] 토벌 시작!`);
    this.refreshRecipes();
    sfx.power();
  }

  /** 회수: 오두막 옆으로 복귀 */
  private recallStory(): void {
    if (this.over || !this.storyUnit) return;
    const u = this.storyUnit;
    this.storyUnit = null;
    u.setPosition(STORY_POS.x + 56, STORY_POS.y - 10);
    u.setVisible(true);
    u.setInteractive({ useHandCursor: true });
    this.units.push(u);
    void saveStory({ chapter: this.storyChapterNo, hp: this.storyHp });
    this.hud.message(`${u.def.name} 복귀`);
    this.refreshRecipes();
  }

  /** 챕터 격파: 보상 지급 + 다음 챕터 (파견 유닛은 계속 토벌) */
  private clearStoryChapter(): void {
    const ch = storyChapter(this.storyChapterNo);
    const reward = storyReward(this.storyChapterNo);
    this.hud.message(`🎉 제${this.storyChapterNo}장 클리어 — [${ch.boss}] 격파!`);

    if (reward.gold) this.gold += reward.gold;
    if (reward.gachaDiscount) this.mods.gachaDiscount += reward.gachaDiscount;
    if (reward.death) this.death += reward.death;
    if (reward.hidden) {
      this.placeNewUnit(
        () => UNIT_BY_ID[HIDDEN_IDS[Math.floor(Math.random() * HIDDEN_IDS.length)]]
      );
    }
    for (const [g, n] of reward.tickets ?? []) {
      this.tickets[g] = (this.tickets[g] ?? 0) + n;
    }
    if (reward.card) this.offerCards();

    this.storyChapterNo++;
    this.storyMax = storyBossHp(this.storyChapterNo);
    this.storyHp = this.storyMax;
    void saveStory({ chapter: this.storyChapterNo, hp: this.storyHp });
    this.refreshRecipes();
    sfx.win();
  }

  /** 🎟 소환권 사용: 해당 등급의 원하는 유닛을 지정 소환 */
  private summon(grade: Grade, unitId: string): void {
    if (this.over || this.halted) return;
    if ((this.tickets[grade] ?? 0) <= 0) return;
    const def = UNIT_BY_ID[unitId];
    if (!def || def.grade !== grade) return;
    if (this.units.length >= MAX_UNITS) {
      this.hud.message("부대가 가득 찼습니다");
      return;
    }
    this.tickets[grade] = this.tickets[grade]! - 1;
    const pos = this.randomSpawnPos();
    const unit = this.addUnit(def, pos.x, pos.y);
    this.selectUnits([unit]);
    this.hud.message(`🎟 소환! ${def.name}`);
    this.refreshRecipes();
    sfx.gacha();
  }

  /** 3기 조합 (중복 허용): 흔함 재료 소모 → 결과 유닛 + 도감 등록 */
  private craftCombo(key: string): void {
    if (this.over || this.halted) return;

    const ids = key.split("+");
    const mats: Unit[] = [];
    for (const id of ids) {
      const unit = this.units.find(
        (u) => u.def.id === id && !mats.includes(u)
      );
      if (!unit) {
        this.hud.message("조합 재료가 부족합니다");
        return;
      }
      mats.push(unit);
    }

    const bx = mats[0].x;
    const by = mats[0].y;
    for (const unit of mats) this.removeUnit(unit);

    const def = comboResult(ids);
    const crafted = this.addUnit(def, bx, by);
    this.selectUnits([crafted]);

    if (!this.dex.has(key)) {
      this.dex.add(key);
      this.runNewDex++;
      void addDex(key);
      this.hud.message(`✨ 새 캐릭터 해금! [${GRADE_NAME[def.grade]}] ${def.name} (도감 ${this.dex.size}/220)`);
      // 🏆 도감 마일스톤
      if (this.dex.size >= 50) this.unlock("dex-50");
      if (this.dex.size >= 110) this.unlock("dex-110");
      if (this.dex.size >= 220) this.unlock("dex-220");
    } else {
      this.hud.message(`${def.name} 조합!`);
    }
    this.refreshRecipes();
    sfx.power();
  }

  /** 이번 덱의 조합 35종 현황 (재료 충족 여부 포함) */
  private comboRows(): ComboRow[] {
    const counts = new Map<string, number>();
    for (const u of this.units)
      counts.set(u.def.id, (counts.get(u.def.id) ?? 0) + 1);
    return deckComboKeys(this.deck).map((key) => {
      const ids = key.split("+");
      const need = new Map<string, number>();
      for (const id of ids) need.set(id, (need.get(id) ?? 0) + 1);
      let ok = true;
      for (const [id, n] of need)
        if ((counts.get(id) ?? 0) < n) {
          ok = false;
          break;
        }
      const def = comboResult(ids);
      return {
        key,
        result: this.dex.has(key) ? def.name : null,
        grade: def.grade,
        mats: ids.map((id) => UNIT_BY_ID[id].name),
        ok,
      };
    });
  }

  private refreshRecipes(): void {
    this.hud.comboBook(this.comboRows());
    this.hud.tickets(this.tickets);
    // 단일 선택 중이면 정보 패널의 관련 조합법 활성 상태도 갱신
    if (this.selectedUnits.length === 1) this.selectUnits(this.selectedUnits);
  }

  // ---------- 표시 / 상태 ----------

  /** 타이틀과 같은 픽셀 도시 스타일 보드 — 전부 사각형만으로 그린다 */
  private drawBoard(): void {
    this.cameras.main.setBackgroundColor("#12151c"); // 상단바 뒤 배경

    const g = this.add.graphics().setDepth(0);
    const P = 4;
    const L = TRACK.left;
    const T = TRACK.top;
    const W = TRACK.right - TRACK.left;
    const H = TRACK.bottom - TRACK.top;

    // 하늘 띠 + 미니 스카이라인 (상단바 아래)
    g.fillStyle(0x58b4f0, 1);
    g.fillRect(0, 52, GAME_W, 58);
    let bx = 0;
    while (bx < GAME_W) {
      const bw = 40 + Math.random() * 70;
      const bh = 20 + Math.random() * 34;
      g.fillStyle(0xa8bdd2, 1);
      g.fillRect(bx, 110 - bh, bw, bh);
      bx += bw + P * 2;
    }

    // 보도 타일 바탕 (줄눈)
    g.fillStyle(0xd7d2c8, 1);
    g.fillRect(0, 110, GAME_W, GAME_H - 110);
    g.fillStyle(0xc2bcb0, 1);
    for (let x = 0; x < GAME_W; x += 32) g.fillRect(x, 110, 2, GAME_H - 110);
    for (let y = 110; y < GAME_H; y += 32) g.fillRect(0, y, GAME_W, 2);

    // 트랙 도로 — 연석(양쪽) + 아스팔트 링
    g.fillStyle(0x565e6d, 1);
    g.fillRect(L - 28, T - 28, W + 56, H + 56);
    g.fillStyle(0x6f7787, 1);
    g.fillRect(L - 24, T - 24, W + 48, H + 48);
    g.fillStyle(0x565e6d, 1);
    g.fillRect(L + 24, T + 24, W - 48, H - 48);
    g.fillStyle(0xd7d2c8, 1);
    g.fillRect(L + 28, T + 28, W - 56, H - 56);
    // 중앙 점선 (경로 중심선)
    g.fillStyle(0xf2f4f8, 1);
    for (let x = L + 8; x < L + W - 16; x += 32) {
      g.fillRect(x, T - 2, 16, P);
      g.fillRect(x, T + H - 2, 16, P);
    }
    for (let y = T + 8; y < T + H - 16; y += 32) {
      g.fillRect(L - 2, y, P, 16);
      g.fillRect(L + W - 2, y, P, 16);
    }

    // 배치 그리드 — 잔디 블록
    for (let col = 0; col < GRID.cols; col++) {
      for (let row = 0; row < GRID.rows; row++) {
        const x = GRID.x + col * GRID.cell;
        const y = GRID.y + row * GRID.cell;
        g.fillStyle(0x6e9e4f, 1);
        g.fillRect(x + P, y + P, GRID.cell - P * 2, GRID.cell - P * 2);
        g.fillStyle(0x8fbf6a, 1);
        g.fillRect(x + P + 2, y + P + 2, GRID.cell - P * 2 - 4, GRID.cell - P * 2 - 4);
        g.fillStyle(0xa5d284, 1);
        g.fillRect(x + P + 2, y + P + 2, GRID.cell - P * 2 - 4, P);
      }
    }

    // 📖 스토리 존 오두막 (트랙 안쪽 좌하단)
    const hx = STORY_POS.x - 24;
    const hy = STORY_POS.y;
    g.fillStyle(0x8a5a44, 1);
    g.fillRect(hx, hy - 22, 48, 34); // 몸체
    g.fillStyle(0xd9534f, 1);
    g.fillRect(hx - 6, hy - 36, 60, 14); // 지붕
    g.fillStyle(0x5a3a26, 1);
    g.fillRect(hx + 18, hy - 4, 12, 16); // 문
    g.fillStyle(0x9adcf5, 1);
    g.fillRect(hx + 6, hy - 14, 8, 8); // 창
    this.add
      .text(STORY_POS.x, hy + 22, "📖 스토리 존", {
        fontSize: "11px",
        fontStyle: "bold",
        color: "#5a3a26",
      })
      .setOrigin(0.5)
      .setDepth(1);

    // 하단 가로수
    for (let tx = 60; tx < 900; tx += 150) {
      g.fillStyle(0x7a5230, 1);
      g.fillRect(tx + P * 2, GAME_H - P * 8, P * 2, P * 6);
      g.fillStyle(0x58b368, 1);
      g.fillRect(tx, GAME_H - P * 13, P * 6, P * 6);
      g.fillStyle(0x46945a, 1);
      g.fillRect(tx + P, GAME_H - P * 7, P * 4, P);
    }
  }

  private drawHpBars(): void {
    this.hpG.clear();
    for (const m of this.mobs) {
      if (m.dead) continue;
      const w = m.isBoss ? 58 : 30;
      const h = m.isBoss ? 7 : 5;
      const y = m.y - (m.isBoss ? 31 : 19);
      const ratio = Phaser.Math.Clamp(m.hp / m.maxHp, 0, 1);
      this.hpG.fillStyle(0x000000, 0.65);
      this.hpG.fillRect(m.x - w / 2, y, w, h);
      this.hpG.fillStyle(m.isBoss ? 0xff2e2e : 0x65d46e, 1);
      this.hpG.fillRect(m.x - w / 2, y, w * ratio, h);
    }
  }

  private selectUnits(units: Unit[]): void {
    for (const u of this.selectedUnits) u.setSelected(false);
    this.selectedUnits = units;
    for (const u of units) u.setSelected(true);

    if (units.length === 0) {
      this.hud.unitInfo(null, 0);
      return;
    }
    if (units.length > 1) {
      this.hud.unitInfoMulti(units.length);
      return;
    }
    // 전설: 종류 무관 2기 → 초월 / 안흔함~희귀함: 동급 3기 → 상위 합성
    const unit = units[0];
    const sameCount = this.units.filter(
      (u) => u.def.grade === unit.def.grade
    ).length;
    // 흔함 유닛이면 이 유닛이 재료로 들어가는 조합법을 함께 표시 (가능한 것 우선)
    const related =
      unit.def.grade === "common"
        ? this.comboRows()
            .filter((r) => r.key.split("+").includes(unit.def.id))
            .sort((a, b) => Number(b.ok) - Number(a.ok))
        : [];
    const activeCdLeft = activeSkill(unit.def.id)
      ? Math.max(0, Math.ceil((unit.activeReadyAt - this.gameTime) / 1000))
      : 0;
    this.hud.unitInfo(unit.def, sameCount, related, activeCdLeft);
  }

  /** 우클릭 이동 명령 — 적군 경로(트랙) 안쪽으로만 이동 가능 */
  private commandMove(tx: number, ty: number): void {
    const n = this.selectedUnits.length;
    if (n === 0) return;

    // 📖 오두막(스토리 존 입구) 우클릭 = 첫 유닛 파견 이동
    if (Math.hypot(tx - STORY_POS.x, ty - STORY_POS.y) < 44) {
      if (this.storyUnit) {
        this.hud.message("이미 파견 중 — 회수 후 다시 보내세요");
        return;
      }
      const u = this.selectedUnits[0];
      this.pendingDispatch = u;
      u.commandTo(STORY_POS.x, STORY_POS.y);
      this.hud.message(`${u.def.name} 파견 이동 중…`);
      return;
    }
    // 다른 곳으로 이동 명령하면 파견 예약 취소
    if (this.pendingDispatch && this.selectedUnits.includes(this.pendingDispatch)) {
      this.pendingDispatch = null;
    }

    const cx = this.clampX(tx);
    const cy = this.clampY(ty);
    // 목적지 마커 — 이동 명령 피드백
    const marker = this.add.circle(cx, cy, 7, 0x8fff8f, 0.9).setDepth(4);
    this.tweens.add({
      targets: marker,
      scale: 2.2,
      alpha: 0,
      duration: 350,
      onComplete: () => marker.destroy(),
    });
    // 3열 포메이션 — 각 행의 실제 인원 기준으로 중앙 정렬 (1기 = 클릭 지점 정확히)
    const rows = Math.ceil(n / 3);
    this.selectedUnits.forEach((u, i) => {
      const row = Math.floor(i / 3);
      const inRow = Math.min(3, n - row * 3);
      const ox = ((i % 3) - (inRow - 1) / 2) * 52;
      const oy = (row - (rows - 1) / 2) * 52;
      u.commandTo(this.clampX(cx + ox), this.clampY(cy + oy));
    });
  }

  private clampX(x: number): number {
    return Phaser.Math.Clamp(x, TRACK.left + 52, TRACK.right - 52);
  }

  private clampY(y: number): number {
    return Phaser.Math.Clamp(y, TRACK.top + 52, TRACK.bottom - 52);
  }

  private addUnit(def: UnitDef, x: number, y: number): Unit {
    const unit = new Unit(this, def, x, y, (u) => this.selectUnits([u]));
    this.units.push(unit);
    // 🏆 획득 업적 (뽑기·조합·합성·소환 공통)
    if (def.grade === "legendary") this.unlock("first-legendary");
    if (def.grade === "transcendent") this.unlock("first-transcendent");
    return unit;
  }

  private removeUnit(unit: Unit): void {
    const i = this.units.indexOf(unit);
    if (i >= 0) this.units.splice(i, 1);
    const si = this.selectedUnits.indexOf(unit);
    if (si >= 0) this.selectedUnits.splice(si, 1);
    if (this.pendingDispatch === unit) this.pendingDispatch = null;
    unit.destroy();
  }

  /** 설정 → 포기하기 (확인 창에서 재확인 후 호출) — 스토리 진행만 저장하고 타이틀로 */
  private giveUp(): void {
    if (this.over) return;
    this.over = true;
    this.wave.stop();
    if (this.storyLoaded) {
      void saveStory({ chapter: this.storyChapterNo, hp: this.storyHp });
    }
    this.scene.start("title");
  }

  private gameOver(win: boolean, reason: string): void {
    if (this.over) return;
    this.over = true;
    this.paused = false;
    this.wave.stop();
    this.selectUnits([]);
    // 스토리 진행도는 판이 끝나도 유지
    if (this.storyLoaded) {
      void saveStory({ chapter: this.storyChapterNo, hp: this.storyHp });
    }
    if (win) sfx.win();
    else sfx.lose();

    const round = this.wave.round;
    const endless = this.wave.endless;

    // 🏆 판 종료 업적 + 통계 저장
    if (win && !endless) {
      if (this.difficulty === "normal" || this.difficulty === "hard") this.unlock("win-normal");
      if (this.difficulty === "hard") this.unlock("win-hard");
      if (this.death >= DEATH_START) this.unlock("nodeath-win");
    }
    if (endless && round >= 50) this.unlock("endless-50");
    if (endless && round > 60) this.unlock("endless-60");
    void saveCounters(this.counters);

    // 🎟 다음 판 부스터 — 정규 패배 시 히든 확률 적립, 승리 시 리셋
    if (!endless) {
      this.booster = win
        ? 0
        : Math.min(BOOSTER_CAP, this.booster + BOOSTER_PER_LOSS);
      void saveBooster(this.booster);
    }

    // ♾ 무한 모드 종료: 40R 승리에서 이미 집계됨 — 최고 라운드만 갱신
    void updateRecords(win, round, !endless).then((records) => {
      const highlights = [
        `라운드 ${round} · 처치 ${this.kills} · 최고 라운드 ${records.bestRound}`,
        `📘 이번 판 신규 해금 ${this.runNewDex}종 — 도감 ${this.dex.size}/220 · 🏆 업적 ${this.achUnlocked.size}/${ACHIEVEMENTS.length}`,
      ];
      if (this.maxStreak >= 5) highlights.push(`🔥 최대 스트릭 ${this.maxStreak}`);
      if (!win && !endless && this.booster > 0) {
        highlights.push(`🎟 위로 쿠폰 — 다음 판 히든 확률 +${Math.round(this.booster * 100)}%p`);
      }
      const desc = `${reason}\n${highlights.join("\n")}`;
      this.hud.result(
        win,
        desc,
        () =>
          this.scene.restart({ deck: this.deck, difficulty: this.difficulty }),
        () => this.scene.start("title"),
        {
          endlessRound: endless ? round : undefined,
          // 40R 정규 승리에서만 무한 모드 제안
          onEndless:
            win && round === ROUND_MAX ? () => this.continueEndless() : undefined,
        }
      );
    });
  }

  /** ♾ 무한 모드 재개 — 승리 화면에서 계속하기 */
  private continueEndless(): void {
    this.over = false;
    this.wave.resumeEndless();
    sfx.alarm();
    this.hud.message("♾ 무한 모드 — 하찮은 것들의 침공은 끝나지 않는다");
  }
}
