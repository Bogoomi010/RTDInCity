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
  GRADE_COLOR,
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
        this.selected.moveToCell(cell.col, cell.row);
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

  private merge(): void {
    if (this.over || this.paused || !this.selected) return;

    const base = this.selected;

    // 전설 유닛: 종류 무관 전설 2기 → 랜덤 초월 (레시피 없이도 초월 획득 가능한 천장)
    if (base.def.grade === "legendary") {
      const partner = this.units.find(
        (u) => u !== base && u.def.grade === "legendary"
      );
      if (!partner) {
        this.hud.message("전설 유닛이 2기 필요합니다");
        return;
      }
      const col = base.col;
      const row = base.row;
      this.removeUnit(base);
      this.removeUnit(partner);

      const def = randomUnitOfGrade("transcendent");
      const unit = this.addUnit(def, col, row);
      this.selectUnit(unit);
      this.hud.message(`⚡ 초월 강림! ${def.name}!`);
      this.refreshRecipes();
      sfx.power();
      return;
    }

    const grade = nextGrade(base.def.grade);
    if (!grade) {
      this.hud.message(`${GRADE_NAME[base.def.grade]} 유닛은 합성할 수 없습니다`);
      return;
    }

    const partner = this.units.find(
      (u) => u !== base && u.def.id === base.def.id
    );
    if (!partner) {
      this.hud.message("같은 유닛이 2기 필요합니다");
      return;
    }

    const col = base.col;
    const row = base.row;
    this.removeUnit(base);
    this.removeUnit(partner);

    const def = randomUnitOfGrade(grade);
    const unit = this.addUnit(def, col, row);
    this.selectUnit(unit);
    this.hud.message(`${GRADE_NAME[grade]} ${def.name} 합성!`);
    this.refreshRecipes();
    sfx.power();
  }

  private craft(recipeId: string): void {
    if (this.over || this.paused) return;

    const recipe = RECIPES.find((r) => r.resultId === recipeId);
    if (!recipe) return;

    const materials: Unit[] = [];
    for (const id of recipe.materials) {
      const unit = this.units.find(
        (u) => u.def.id === id && !materials.includes(u)
      );
      if (!unit) {
        this.hud.message("조합 재료가 부족합니다");
        return;
      }
      materials.push(unit);
    }

    const anchor = materials[0];
    const col = anchor.col;
    const row = anchor.row;
    for (const unit of materials) this.removeUnit(unit);

    const def = UNIT_BY_ID[recipe.resultId];
    const crafted = this.addUnit(def, col, row);
    this.selectUnit(crafted);
    this.hud.message(`${def.name} 조합 완료!`);
    this.refreshRecipes();
    sfx.power();
  }

  private refreshRecipes(): void {
    this.hud.recipes(
      RECIPES.map((recipe) => {
        const result = UNIT_BY_ID[recipe.resultId];
        return {
          id: recipe.resultId,
          name: result.name,
          ok: recipe.materials.every((id) =>
            this.units.some((u) => u.def.id === id)
          ),
          crafted: this.units.some((u) => u.def.id === recipe.resultId),
          mats: recipe.materials.map((id) => ({
            name: UNIT_BY_ID[id].name,
            have: this.units.some((u) => u.def.id === id),
          })),
        };
      })
    );
  }

  // ---------- 표시 / 상태 ----------

  private drawBoard(): void {
    this.cameras.main.setBackgroundColor("#12151c");

    const g = this.add.graphics().setDepth(0);
    const path = [
      new Phaser.Geom.Point(TRACK.left, TRACK.top),
      new Phaser.Geom.Point(TRACK.right, TRACK.top),
      new Phaser.Geom.Point(TRACK.right, TRACK.bottom),
      new Phaser.Geom.Point(TRACK.left, TRACK.bottom),
    ];

    g.lineStyle(48, 0x2b303b, 1);
    g.strokePoints(path, true, true);
    g.lineStyle(4, 0x485063, 1);
    g.strokePoints(path, true, true);

    for (let col = 0; col < GRID.cols; col++) {
      for (let row = 0; row < GRID.rows; row++) {
        const x = GRID.x + col * GRID.cell;
        const y = GRID.y + row * GRID.cell;
        g.fillStyle(0x1c2430, 0.88);
        g.fillRoundedRect(x + 5, y + 5, GRID.cell - 10, GRID.cell - 10, 8);
        g.lineStyle(1, 0x536174, 0.85);
        g.strokeRoundedRect(x + 5, y + 5, GRID.cell - 10, GRID.cell - 10, 8);
      }
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

    // 전설은 종류 무관 2기로 초월 합성이 가능하므로 전설 전체 수를 전달
    const sameCount =
      unit.def.grade === "legendary"
        ? this.units.filter((u) => u.def.grade === "legendary").length
        : this.units.filter((u) => u.def.id === unit.def.id).length;
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
      this.hud.result(win, desc, () => this.scene.restart());
    });
  }
}
