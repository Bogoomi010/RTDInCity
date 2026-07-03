import Phaser from "phaser";
import {
  cellFromPoint,
  DEATH_START,
  GACHA_COST,
  GAME_H,
  GAME_W,
  GRID,
  MOB_CAP,
  PHASE_SEC,
  ROUND_MAX,
  START_GOLD,
  TRACK,
} from "../data/config";
import { PathLoop } from "../core/path";
import { Mob } from "../entities/Mob";
import { Unit, type CombatCtx } from "../entities/Unit";
import { WaveSystem } from "../systems/WaveSystem";
import { Hud } from "../ui/hud";
import {
  armorReduction,
  bossStats,
  goldenStats,
  mobStats,
  roundClearBonus,
} from "../data/waves";
import {
  GRADE_COLOR,
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
import { addDex, loadDex, updateRecords } from "../core/save";

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
  private selected: Unit | null = null;

  private deck: string[] = ["dv1", "pc1", "sn1"]; // 덱 선택 없이 진입 시 기본값
  private dex = new Set<string>(); // 발견한 조합 (판 간 누적, 세이브 연동)
  private tickets: Partial<Record<Grade, number>> = {}; // 🎟 등급별 소환권
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

  private hpG!: Phaser.GameObjects.Graphics;
  private selG!: Phaser.GameObjects.Graphics;
  private nightO!: Phaser.GameObjects.Rectangle; // 밤 오버레이 (알파로 낮/밤 연출)

  constructor() {
    super("game");
  }

  create(data: { deck?: string[] } = {}): void {
    if (data.deck?.length === 3) this.deck = data.deck;
    void loadDex().then((d) => {
      this.dex = new Set(d);
      if (!this.over) this.refreshRecipes();
    });

    // 상태 초기화 (재시작 대비)
    this.mobs = [];
    this.units = [];
    this.selected = null;
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

    this.loop = new PathLoop([
      { x: TRACK.left, y: TRACK.top },
      { x: TRACK.right, y: TRACK.top },
      { x: TRACK.right, y: TRACK.bottom },
      { x: TRACK.left, y: TRACK.bottom },
    ]);

    this.drawBoard();
    this.hpG = this.add.graphics().setDepth(6);
    this.selG = this.add.graphics().setDepth(3);
    this.nightO = this.add
      .rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0b1026, 1)
      .setAlpha(0)
      .setDepth(40);

    this.hud = new Hud(
      () => this.gacha(),
      () => this.merge(),
      (comboKey) => this.craftCombo(comboKey),
      (grade, unitId) => this.summon(grade, unitId),
      () => {
        this.speed = (this.speed % 3) + 1;
        return this.speed;
      },
      () => {
        if (!this.over) this.userPaused = !this.userPaused;
        return this.userPaused;
      }
    );
    this.refreshRecipes();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.destroy());

    this.wave = new WaveSystem({
      spawn: (round, boss) => this.spawnMob(round, boss),
      // 황금 비둘기는 라운드 종료·수용 한계 계산에서 제외
      mobCount: () => this.mobs.filter((m) => !m.golden).length,
      roundStart: (round, boss) => {
        if (boss) {
          const b = bossStats(round);
          this.hud.message(`라운드 ${round} — 보스 [${b.name}] 등장!`);
          sfx.alarm();
        } else {
          this.hud.message(`라운드 ${round} — ${mobStats(round).name}`);
        }
      },
      roundClear: (round) => {
        this.gold += roundClearBonus(round);
        if (CARD_ROUNDS.has(round) && !this.over) this.offerCards();
      },
      message: (t) => this.hud.message(t),
      defeat: (reason) => this.gameOver(false, reason),
      victory: () => this.gameOver(true, "도시를 지켜냈습니다!"),
    });

    // 빈 칸 클릭 → 선택 유닛 이동 / 선택 해제
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.over || this.halted) return;
      // 상단바·우측 패널 영역 클릭은 무시 — UI 틈새 클릭으로 선택이 풀리는 것 방지
      if (p.worldY < 56 || p.worldX > 950) return;
      const cell = cellFromPoint(p.worldX, p.worldY);
      if (this.selected && cell && !this.unitAt(cell.col, cell.row)) {
        this.selected.moveToCell(cell.col, cell.row);
      }
      this.selectUnit(null);
    });
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
    }

    this.wave.update(d);
    if (this.over) return;

    for (const m of this.mobs)
      m.advance(this.gameTime, d, this.mods.mobSpeedMul);

    // 황금 비둘기: 트랙 1바퀴를 돌면 벌 없이 떠난다
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (m.golden && m.dist >= this.loop.total) {
        this.mobs.splice(i, 1);
        m.destroy();
        this.hud.message("황금 비둘기가 떠났다…");
      }
    }

    const ctx: CombatCtx = {
      now: this.gameTime,
      isDay: day,
      mobs: this.mobs,
      cdMul: this.mods.cdMul,
      rangeMul: this.mods.rangeMul,
      damage: (m, a, t) => this.damage(m, a, t),
      flash: (x1, y1, x2, y2, color) => this.flash(x1, y1, x2, y2, color),
    };
    for (const u of this.units) u.update(ctx, d);

    this.drawHpBars();
    this.hud.update({
      round: this.wave.round,
      roundMax: ROUND_MAX,
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

  private damage(m: Mob, amount: number, type: DmgType): void {
    if (this.over || m.dead) return;
    amount *= this.mods.atkMul;
    amount *= type === "phys" ? this.mods.physMul : this.mods.magicMul;
    if (type === "phys") {
      amount *= 1 - armorReduction(m.effArmor(this.gameTime));
    }
    if (m.hit(amount)) {
      this.gold += m.gold;
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
      this.killPop(m.x, m.y, wasBoss);
      m.destroy();
      sfx.kill();
      if (wasBoss) {
        // 🎟 보스 처치 보상: 라운드에 맞는 등급 소환권
        const g = BOSS_TICKET[this.wave.round];
        if (g) {
          this.tickets[g] = (this.tickets[g] ?? 0) + 1;
          this.hud.message(`🎟 ${GRADE_NAME[g]} 소환권 획득!`);
          this.refreshRecipes();
        }
        this.wave.notifyBossKilled();
      }
    }
  }

  private killPop(x: number, y: number, boss: boolean): void {
    const c = this.add
      .circle(x, y, boss ? 14 : 6, 0xffd166)
      .setDepth(9)
      .setAlpha(0.9);
    this.tweens.add({
      targets: c,
      scale: boss ? 3 : 2,
      alpha: 0,
      duration: boss ? 300 : 160,
      onComplete: () => c.destroy(),
    });
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

  private emptyCells(): Array<{ col: number; row: number }> {
    const empty: Array<{ col: number; row: number }> = [];
    for (let col = 0; col < GRID.cols; col++) {
      for (let row = 0; row < GRID.rows; row++) {
        if (!this.unitAt(col, row)) empty.push({ col, row });
      }
    }
    return empty;
  }

  /** 랜덤 빈 칸에 유닛 배치. 성공 여부 반환 */
  private placeNewUnit(defGetter: () => ReturnType<typeof randomUnitOfGrade>): boolean {
    const empty = this.emptyCells();
    if (empty.length === 0) return false;
    const def = defGetter();
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const unit = new Unit(this, def, cell.col, cell.row, (u) =>
      this.selectUnit(u)
    );
    this.units.push(unit);
    this.hud.message(def.hidden ? `✨ 히든! ${def.name} 획득!` : `${def.name} 획득!`);
    this.refreshRecipes();
    return true;
  }

  /** 뽑기: 흔함은 덱 3종에서, 6% 확률로 히든. 상위 등급은 기존 풀 */
  private rollUnit(): UnitDef {
    const grade = rollGrade(this.wave.round);
    if (grade !== "common") return randomUnitOfGrade(grade);
    if (Math.random() < 0.06) {
      return UNIT_BY_ID[HIDDEN_IDS[Math.floor(Math.random() * HIDDEN_IDS.length)]];
    }
    return UNIT_BY_ID[this.deck[Math.floor(Math.random() * this.deck.length)]];
  }

  private gacha(): void {
    if (this.over || this.halted) return;
    const cost = this.gachaCost();
    if (this.gold < cost) {
      this.hud.message("골드가 부족합니다");
      return;
    }
    if (!this.placeNewUnit(() => this.rollUnit())) {
      this.hud.message("빈 칸이 없습니다");
      return;
    }
    this.gold -= cost;
    sfx.gacha();
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
          this.hud.message("빈 칸이 없어 지원 유닛을 받을 수 없습니다");
        }
        break;
    }
  }

  // ---------- 합성 / 조합 ----------

  /** 합성은 전설 2기 → 초월만 존재. 일반 성장은 3기 조합·뽑기가 담당 */
  private merge(): void {
    if (this.over || this.halted || !this.selected) return;

    const base = this.selected;

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

      const col = base.col;
      const row = base.row;
      this.removeUnit(base);
      this.removeUnit(partner);

      const unit = this.addUnit(resultDef, col, row);
      this.selectUnit(unit);
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

    const col = base.col;
    const row = base.row;
    this.removeUnit(base);
    for (const u of sameGrade.slice(0, 2)) this.removeUnit(u);

    const def = randomUnitOfGrade(next);
    const unit = this.addUnit(def, col, row);
    this.selectUnit(unit);
    this.hud.message(`${GRADE_NAME[next]} ${def.name} 합성!`);
    this.refreshRecipes();
    sfx.power();
  }

  /** 🎟 소환권 사용: 해당 등급의 원하는 유닛을 지정 소환 */
  private summon(grade: Grade, unitId: string): void {
    if (this.over || this.halted) return;
    if ((this.tickets[grade] ?? 0) <= 0) return;
    const def = UNIT_BY_ID[unitId];
    if (!def || def.grade !== grade) return;
    const empty = this.emptyCells();
    if (empty.length === 0) {
      this.hud.message("빈 칸이 없습니다");
      return;
    }
    this.tickets[grade] = this.tickets[grade]! - 1;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    const unit = this.addUnit(def, cell.col, cell.row);
    this.selectUnit(unit);
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

    const col = mats[0].col;
    const row = mats[0].row;
    for (const unit of mats) this.removeUnit(unit);

    const def = comboResult(ids);
    const crafted = this.addUnit(def, col, row);
    this.selectUnit(crafted);

    if (!this.dex.has(key)) {
      this.dex.add(key);
      void addDex(key);
      this.hud.message(`✨ 새 캐릭터 해금! [${GRADE_NAME[def.grade]}] ${def.name}`);
    } else {
      this.hud.message(`${def.name} 조합!`);
    }
    this.refreshRecipes();
    sfx.power();
  }

  private refreshRecipes(): void {
    // 3기 조합 목록 + 도감
    const counts = new Map<string, number>();
    for (const u of this.units)
      counts.set(u.def.id, (counts.get(u.def.id) ?? 0) + 1);
    const comboRows = deckComboKeys(this.deck).map((key) => {
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
    this.hud.comboBook(comboRows);
    this.hud.tickets(this.tickets);
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

  private selectUnit(unit: Unit | null): void {
    if (this.selected) this.selected.setSelected(false);
    this.selected = unit;
    this.selG.clear();

    if (!unit) {
      this.hud.unitInfo(null, 0);
      return;
    }

    unit.setSelected(true);
    const x = GRID.x + unit.col * GRID.cell + 5;
    const y = GRID.y + unit.row * GRID.cell + 5;
    this.selG.lineStyle(3, GRADE_COLOR[unit.def.grade], 0.95);
    this.selG.strokeRoundedRect(x, y, GRID.cell - 10, GRID.cell - 10, 8);

    // 전설: 종류 무관 2기 → 초월 / 안흔함~희귀함: 동급 3기 → 상위 합성
    const sameCount = this.units.filter(
      (u) => u.def.grade === unit.def.grade
    ).length;
    this.hud.unitInfo(unit.def, sameCount);
  }

  private unitAt(col: number, row: number): Unit | undefined {
    return this.units.find((u) => u.col === col && u.row === row);
  }

  private addUnit(def: ReturnType<typeof randomUnitOfGrade>, col: number, row: number): Unit {
    const unit = new Unit(this, def, col, row, (u) => this.selectUnit(u));
    this.units.push(unit);
    return unit;
  }

  private removeUnit(unit: Unit): void {
    const i = this.units.indexOf(unit);
    if (i >= 0) this.units.splice(i, 1);
    if (this.selected === unit) this.selected = null;
    unit.destroy();
  }

  private gameOver(win: boolean, reason: string): void {
    if (this.over) return;
    this.over = true;
    this.paused = false;
    this.wave.stop();
    this.selectUnit(null);
    if (win) sfx.win();
    else sfx.lose();

    const round = this.wave.round;
    void updateRecords(win, round).then((records) => {
      const desc = `${reason}\n라운드 ${round} · 처치 ${this.kills} · 최고 라운드 ${records.bestRound}`;
      this.hud.result(win, desc, () => this.scene.restart({ deck: this.deck }));
    });
  }
}
