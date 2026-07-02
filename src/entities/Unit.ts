import Phaser from "phaser";
import { GRADE_COLOR, type DmgType, type UnitDef } from "../data/units";
import { cellCenter } from "../data/config";
import type { Mob } from "./Mob";

export interface CombatCtx {
  now: number;
  mobs: Mob[];
  cdMul: number; // 공격 주기 보정 (카드)
  rangeMul: number; // 사거리 보정 (카드)
  damage(mob: Mob, amount: number, type: DmgType): void;
  flash(x1: number, y1: number, x2: number, y2: number, color: number): void;
}

export class Unit extends Phaser.GameObjects.Container {
  def: UnitDef;
  col: number;
  row: number;

  private cd = 0;
  private ring: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    def: UnitDef,
    col: number,
    row: number,
    onClick: (unit: Unit) => void
  ) {
    const c = cellCenter(col, row);
    super(scene, c.x, c.y);
    this.def = def;
    this.col = col;
    this.row = row;

    const body = scene.add
      .image(0, 0, "unit")
      .setTint(GRADE_COLOR[def.grade])
      .setDisplaySize(48, 48);
    const label = scene.add
      .text(0, 0, def.name.slice(0, 2), {
        fontSize: "15px",
        fontStyle: "bold",
        color: "#10131a",
      })
      .setOrigin(0.5);

    this.ring = scene.add.graphics();
    this.ring.lineStyle(3, 0xffffff, 0.95);
    this.ring.strokeCircle(0, 0, 31);
    this.ring.setVisible(false);

    this.add([this.ring, body, label]);
    this.setSize(50, 50);
    this.setDepth(10);
    this.setInteractive({ useHandCursor: true });
    this.on(
      "pointerdown",
      (
        _p: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        event: Phaser.Types.Input.EventData
      ) => {
        event.stopPropagation();
        onClick(this);
      }
    );
    scene.add.existing(this);
  }

  setSelected(sel: boolean): void {
    this.ring.setVisible(sel);
  }

  moveToCell(col: number, row: number): void {
    this.col = col;
    this.row = row;
    const c = cellCenter(col, row);
    this.setPosition(c.x, c.y);
  }

  update(ctx: CombatCtx, deltaMs: number): void {
    this.cd -= deltaMs;
    if (this.cd > 0) return;

    const range = this.def.range * ctx.rangeMul;
    const r2 = range * range;
    let target: Mob | null = null;
    let best = Infinity;
    for (const m of ctx.mobs) {
      if (m.dead) continue;
      const dx = m.x - this.x;
      const dy = m.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2 && d2 < best) {
        best = d2;
        target = m;
      }
    }
    if (!target) return;

    this.cd = this.def.cooldown * 1000 * ctx.cdMul;
    ctx.flash(this.x, this.y, target.x, target.y, GRADE_COLOR[this.def.grade]);

    if (this.def.slowPct && this.def.slowMs) {
      target.applySlow(this.def.slowPct, this.def.slowMs, ctx.now);
    }
    if (this.def.stunMs) {
      target.applyStun(this.def.stunMs, ctx.now);
    }

    if (this.def.splash) {
      const s2 = this.def.splash * this.def.splash;
      const tx = target.x;
      const ty = target.y;
      for (const m of [...ctx.mobs]) {
        if (m.dead) continue;
        const dx = m.x - tx;
        const dy = m.y - ty;
        if (dx * dx + dy * dy > s2) continue;
        if (this.def.shredAmt && this.def.shredMs) {
          m.applyShred(this.def.shredAmt, this.def.shredMs, ctx.now);
        }
        ctx.damage(m, this.def.atk, this.def.dmgType);
      }
      return;
    }

    if (this.def.shredAmt && this.def.shredMs) {
      target.applyShred(this.def.shredAmt, this.def.shredMs, ctx.now);
    }
    ctx.damage(target, this.def.atk, this.def.dmgType);
  }
}
