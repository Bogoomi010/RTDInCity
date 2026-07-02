import Phaser from "phaser";
import {
  cellFromPoint,
  DEATH_START,
  GACHA_COST,
  GRID,
  MOB_CAP,
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
  mobStats,
  roundClearBonus,
} from "../data/waves";
import {
  GRADE_NAME,
  nextGrade,
  randomUnitOfGrade,
  rollGrade,
  UNIT_BY_ID,
  type DmgType,
} from "../data/units";
import { RECIPES } from "../data/recipes";
import {
  CARD_ROUNDS,
  defaultMods,
  drawCards,
  type CardEffect,
  type Mods,
} from "../data/cards";
import { sfx } from "../core/sfx";
import { updateRecords } from "../core/save";

export class GameScene extends Phaser.Scene {
  private loop!: PathLoop;
  private wave!: WaveSystem;
  private hud!: Hud;
  private mobs: Mob[] = [];
  private units: Unit[] = [];
  private selected: Unit | null = null;

  private gold = START_GOLD;
  private death = DEATH_START;
  private kills = 0;
  private over = false;
  private paused = false;
  private mods: Mods = defaultMods();

  private hpG!: Phaser.GameObjects.Graphics;
  private selG!: Phaser.GameObjects.Graphics;

  constructor() {
    super("game");
  }

  create(): void {
    // 상태 초기화 (재시작 대비)
    this.mobs = [];
    this.units = [];
    this.selected = null;
    this.gold = START_GOLD;
    this.death = DEATH_START;
    this.kills = 0;
    this.over = false;
    this.paused = false;
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

    this.hud = new Hud(
      () => this.gacha(),
      () => this.merge(),
      (recipeId) => this.craft(recipeId)
    );
    this.refreshRecipes();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.hud.destroy());

    this.wave = new WaveSystem({
      spawn: (round, boss) => this.spawnMob(round, boss),
      mobCount: () => this.mobs.length,
      roundStart: (round, boss) => {
        if (boss) {
          const b = bossStats(round);
          this.hud.message(`라운드 ${round} — 보스 [${b.name}] 등장!`);
          sfx.alarm();
        } else {
          this.hud.message(`라운드 ${round}`);
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
      if (this.over || this.paused) return;
      const cell = cellFromPoint(p.worldX, p.worldY);
      if (this.selected && cell && !this.unitAt(cell.col, cell.row)) {
        this.selected.moveTo(cell.col, cell.row);
      }
      this.selectUnit(null);
    });
  }

  update(time: number, delta: number): void {
    if (this.over || this.paused) return;

    this.wave.update(delta);
    if (this.over) return;

    for (const m of this.mobs) m.advance(time, delta, this.mods.mobSpeedMul);

    const ctx: CombatCtx = {
      now: time,
      mobs: this.mobs,
      cdMul: this.mods.cdMul,
      rangeMul: this.mods.rangeMul,
      damage: (m, a, t) => this.damage(m, a, t),
      flash: (x1, y1, x2, y2, color) => this.flash(x1, y1, x2, y2, color),
    };
    for (const u of this.units) u.update(ctx, delta);

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
    });
  }

  // ---------- 전투 ----------

  private spawnMob(round: number, boss: boolean): Mob | null {
    if (this.over) return null;
    if (!boss && this.mobs.length >= MOB_CAP) {
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
      amount *= 1 - armorReduction(m.effArmor(this.time.now));
    }
    if (m.hit(amount)) {
      this.gold += m.gold;
      this.kills++;
      const i = this.mobs.indexOf(m);
      if (i >= 0) this.mobs.splice(i, 1);
      const wasBoss = m.isBoss;
      this.killPop(m.x, m.y, wasBoss);
      m.destroy();
      sfx.kill();
      if (wasBoss) this.wave.notifyBossKilled();
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
    this.hud.message(`${def.name} 획득!`);
    this.refreshRecipes();
    return true;
  }

  private gacha(): void {
    if (this.over || this.paused) return;
    const cost = this.gachaCost();
    if (this.gold < cost) {
      this.hud.message("골드가 부족합니다");
      return;
    }
    if (!this.placeNewUnit(() => randomUnitOfGrade(rollGrade()))) {
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
   