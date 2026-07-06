import Phaser from "phaser";
import { GRADE_COLOR, type DmgType, type UnitDef } from "../data/units";
import { PHASE_BUFF } from "../data/config";
import { attackKey, UNIT_ART, walkKey, type WalkDir } from "../data/art";
import type { Mob } from "./Mob";

const MOVE_SPEED = 150; // px/s — RTS식 이동 속도

export interface CombatCtx {
  now: number;
  isDay: boolean; // 낮/밤 페이즈 — 태그 유닛 버프 판정
  mobs: Mob[];
  cdMul: number; // 공격 주기 보정 (카드)
  rangeMul: number; // 사거리 보정 (카드)
  damage(mob: Mob, amount: number, type: DmgType): void;
  flash(x1: number, y1: number, x2: number, y2: number, color: number): void;
}

export class Unit extends Phaser.GameObjects.Container {
  def: UnitDef;

  private cd = 0;
  private ring: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Sprite | null = null; // 아트 등록 유닛의 애니메이션 스프라이트
  private idleKey = ""; // 대기 텍스처 키
  private tx: number | null = null; // 이동 목표 (null = 정지)
  private ty = 0;

  constructor(
    scene: Phaser.Scene,
    def: UnitDef,
    x: number,
    y: number,
    onClick: (unit: Unit) => void
  ) {
    super(scene, x, y);
    this.def = def;

    this.ring = scene.add.graphics();
    this.ring.lineStyle(3, 0xffffff, 0.95);
    this.ring.strokeCircle(0, 0, 31);
    this.ring.setVisible(false);

    // 전용 아트: 공격 시트 프레임 0 = 대기 (없으면 정면 걷기 프레임 0)
    const idleKey = [attackKey(def.id), walkKey(def.id, "front")].find(
      (k) => UNIT_ART[def.id] && scene.textures.exists(k)
    );
    if (idleKey) {
      // 틴트·라벨 없이 아트가 정체성.
      // 시트 규격: 셀 720 · 캐릭터 높이 560 통일 (normalize.py) → 화면 캐릭터 높이 ≈ 56px
      const s = scene.add.sprite(0, 0, idleKey, 0).setDisplaySize(72, 72);
      // 공격(1회성) 종료 → 대기 프레임 복귀. 걷기(루프)는 stopWalk가 담당
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.setFrame(0));
      this.sprite = s;
      this.idleKey = idleKey;
      this.add([this.ring, s]);
    } else {
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
      this.add([this.ring, body, label]);
    }
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

  /** RTS식 이동 명령 — update에서 목표까지 걸어간다 (Container.moveTo와 이름 충돌 회피) */
  commandTo(x: number, y: number): void {
    this.tx = x;
    this.ty = y;
  }

  get moving(): boolean {
    return this.tx !== null;
  }

  /** 이동 방향 → 걷기 애니메이션. 공격 모션 재생 중엔 공격이 우선 */
  private playWalk(dx: number, dy: number): void {
    const s = this.sprite;
    if (!s) return;
    if (s.anims.isPlaying && s.anims.currentAnim?.key === attackKey(this.def.id)) return;
    let dir: WalkDir;
    let flip = false;
    if (Math.abs(dx) >= Math.abs(dy)) {
      dir = "side";
      flip = dx < 0; // 시트 기본 방향 = 오른쪽
    } else {
      dir = dy > 0 ? "front" : "back";
    }
    const key = walkKey(this.def.id, dir);
    if (!this.scene.anims.exists(key)) return;
    s.setFlipX(flip);
    s.play(key, true); // 같은 애니면 유지
  }

  /** 도착 시 걷기 종료 → 대기 프레임 */
  private stopWalk(): void {
    const s = this.sprite;
    if (!s) return;
    if (s.anims.isPlaying && (s.anims.currentAnim?.key ?? "").includes("_walk_")) {
      s.stop();
      s.setTexture(this.idleKey, 0);
      s.setFlipX(false);
    }
  }

  update(ctx: CombatCtx, deltaMs: number): void {
    // 이동
    if (this.tx !== null) {
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const dist = Math.hypot(dx, dy);
      const step = (MOVE_SPEED * deltaMs) / 1000;
      if (dist <= step) {
        this.setPosition(this.tx, this.ty);
        this.tx = null;
        this.stopWalk();
      } else {
        this.setPosition(this.x + (dx / dist) * step, this.y + (dy / dist) * step);
        this.playWalk(dx, dy);
      }
    }

    this.cd -= deltaMs;
    // 이동 중에는 공격 불가 — 쿨다운은 계속 흘러 도착 즉시 사격 가능
    if (this.tx !== null) return;
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
    if (this.sprite && this.scene.anims.exists(attackKey(this.def.id))) {
      this.sprite.setFlipX(target.x < this.x); // 시트 기본 방향 = 오른쪽
      this.sprite.play(attackKey(this.def.id));
    }
    ctx.flash(this.x, this.y, target.x, target.y, GRADE_COLOR[this.def.grade]);

    const p = this.def.phase;
    const phaseBuffed =
      p !== undefined && (p === "both" || (p === "day") === ctx.isDay);
    const atk = phaseBuffed ? this.def.atk * PHASE_BUFF : this.def.atk;

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
        ctx.damage(m, atk, this.def.dmgType);
      }
      return;
    }

    if (this.def.shredAmt && this.def.shredMs) {
      target.applyShred(this.def.shredAmt, this.def.shredMs, ctx.now);
    }
    ctx.damage(target, atk, this.def.dmgType);
  }
}
