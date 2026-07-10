import Phaser from "phaser";
import { GRADE_COLOR, type DmgType, type Family, type UnitDef } from "../data/units";
import { PHASE_BUFF } from "../data/config";
import { attackKey, UNIT_ART, walkKey, type WalkDir } from "../data/art";
import { skillsOf, type SkillDef } from "../data/skills";
import type { Mob } from "./Mob";

const MOVE_SPEED = 150; // px/s — RTS식 이동 속도

export interface CombatCtx {
  now: number;
  isDay: boolean; // 낮/밤 페이즈 — 태그 유닛 버프 판정
  round: number;
  death: number; // 데스 카운트 (수호 본능)
  allyCount: number; // 필드 아군 수 (시민의 염원)
  mobs: Mob[];
  cdMul: number; // 공격 주기 보정 (카드 + 팀 버프)
  rangeMul: number; // 사거리 보정 (카드)
  hasAllyFamily(f: Family | "common"): boolean;
  /** 필드 오라 — 이 유닛에 적용되는 배율 (skills.ts aura) */
  aura(family: Family | undefined): { atkMul: number; cdMul: number };
  /** true = 처치 */
  damage(mob: Mob, amount: number, type: DmgType, killGoldMul?: number): boolean;
  flash(x1: number, y1: number, x2: number, y2: number, color: number): void;
}

export class Unit extends Phaser.GameObjects.Container {
  def: UnitDef;
  activeReadyAt = 0; // 액티브 스킬 사용 가능 시각 (게임 시간 ms)

  private cd = 0;
  private ring: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Sprite | null = null; // 아트 등록 유닛의 애니메이션 스프라이트
  private idleKey = ""; // 대기 텍스처 키
  private tx: number | null = null; // 이동 목표 (null = 정지)
  private ty = 0;

  // ---------- 스킬 상태 (GDD 1.7) ----------
  private passives: SkillDef[];
  private attackSkills: SkillDef[];
  private attackCount = 0;
  private lastTarget: Mob | null = null;
  private stacks = 0; // 같은 대상 연속 공격 수
  private lastAttackRound = -1;
  private skipNextAtk = false; // 과부하 방출 냉각
  private buffUntil = 0;
  private buffCdMul = 1;
  private buffAtkMul = 1;
  private buffSplashMul = 1;
  private readonly killGoldMul: number;
  private readonly killHaste: number | undefined;
  private readonly luckyReset: number | undefined;
  private readonly bossMagic: boolean;
  private readonly moveSpeedMul: number;
  private readonly passiveSlow: SkillDef | undefined; // 신호 동기화 등 — 모든 명중에 감속

  constructor(
    scene: Phaser.Scene,
    def: UnitDef,
    x: number,
    y: number,
    onClick: (unit: Unit) => void
  ) {
    super(scene, x, y);
    this.def = def;

    const skills = skillsOf(def.id).filter((s) => !s.builtin);
    this.passives = skills.filter((s) => s.kind === "passive");
    this.attackSkills = skills
      .filter((s) => s.kind === "attack" && s.everyN)
      .sort((a, b) => (b.everyN ?? 0) - (a.everyN ?? 0)); // 희귀한(주기 긴) 스킬 우선
    this.killGoldMul = this.passives.find((p) => p.killGoldMul)?.killGoldMul ?? 1;
    this.killHaste = this.passives.find((p) => p.killHaste)?.killHaste;
    this.luckyReset = this.passives.find((p) => p.luckyReset)?.luckyReset;
    this.bossMagic = this.passives.some((p) => p.bossMagic);
    this.moveSpeedMul = this.passives.find((p) => p.moveSpeedMul)?.moveSpeedMul ?? 1;
    this.passiveSlow = this.passives.find((p) => p.slowPct && p.slowMs);

    this.ring = scene.add.graphics();
    this.ring.lineStyle(3, 0xffffff, 0.95);
    this.ring.strokeCircle(0, 0, 31);
    this.ring.setVisible(false);

    // 전용 아트: 공격 시트 프레임 0 = 대기 (없으면 정면 걷기 프레임 0)
    const idleKey = [walkKey(def.id, "front"), attackKey(def.id)].find(
      (k) => UNIT_ART[def.id] && scene.textures.exists(k)
    );
    if (idleKey) {
      // 틴트·라벨 없이 아트가 정체성.
      // 시트 해상도와 무관하게 72px 캔버스에 맞춘다. 생성 에셋은 프레임 내 캐릭터 비율을 통일한다.
      const s = scene.add.sprite(0, 0, idleKey, 0).setDisplaySize(72, 72);
      // 공격(1회성) 종료 → 대기 프레임 복귀. 걷기(루프)는 stopWalk가 담당
      s.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        s.setTexture(this.idleKey, 0);
        s.setFlipX(false);
      });
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

  /** 액티브·버프 스킬용 자기 버프 (GameScene에서 호출) */
  applyBuff(now: number, ms: number, cdMul = 1, atkMul = 1, splashMul = 1): void {
    this.buffUntil = now + ms;
    this.buffCdMul = cdMul;
    this.buffAtkMul = atkMul;
    this.buffSplashMul = splashMul;
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

  // ---------- 패시브 판정 ----------

  /** 대상·상황 조건부 공격력 배율 (오라·버프 제외) */
  private passiveAtkMul(m: Mob, dist2: number, range: number, crowd: number, ctx: CombatCtx): number {
    let mul = 1;
    for (const p of this.passives) {
      if (p.allyScaleAtk) {
        mul *= 1 + Math.min(p.allyScaleAtk.cap, p.allyScaleAtk.per * ctx.allyCount);
        continue;
      }
      if (!p.atkMul) continue;
      let on = false;
      switch (p.when ?? "always") {
        case "always": on = true; break;
        case "day": on = ctx.isDay; break;
        case "night": on = !ctx.isDay; break;
        case "boss": on = m.isBoss; break;
        case "lowHp": on = m.hp <= m.maxHp * 0.5; break;
        case "farHalf": on = dist2 > range * range * 0.25; break;
        case "crowd": on = crowd >= (p.crowdMin ?? 3); break;
        case "stack": {
          const n = Math.min(this.stacks, p.stackMax ?? 1);
          mul *= 1 + (p.atkMul - 1) * n;
          continue;
        }
        case "newTarget": on = m !== this.lastTarget; break;
        case "stunned": on = m.isStunned(ctx.now); break;
        case "shredded": on = m.isShredded(ctx.now); break;
        case "armored": on = m.armor >= 50; break;
        case "swift": on = m.baseSpeed > (60 + 1.5 * ctx.round) * 1.15; break;
        case "golden": on = m.golden; break;
        case "lowDeath": on = ctx.death <= 5; break;
        case "firstOfRound": on = ctx.round !== this.lastAttackRound; break;
      }
      if (on) mul *= p.atkMul;
    }
    return mul;
  }

  /** 대상 무관 공격 주기 배율 (오라·버프 제외) */
  private passiveCdMul(crowd: number, ctx: CombatCtx): number {
    let mul = 1;
    for (const p of this.passives) {
      if (!p.cdMul) continue;
      let on = false;
      switch (p.when ?? "always") {
        case "always":
          on = p.allyFamily ? ctx.hasAllyFamily(p.allyFamily) : true;
          break;
        case "day": on = ctx.isDay; break;
        case "night": on = !ctx.isDay; break;
        case "crowd": on = crowd >= (p.crowdMin ?? 3); break;
        default: on = false;
      }
      if (on) mul *= p.cdMul;
    }
    return mul;
  }

  private passiveRangeMul(): number {
    let mul = 1;
    for (const p of this.passives) if (p.rangeMul) mul *= p.rangeMul;
    return mul;
  }

  // ---------- 전투 ----------

  /** 한 대상에게 스킬/기본 공격 1히트 — 디버프 적용 + 피해 (true = 처치) */
  private hitOne(
    m: Mob,
    baseAtk: number,
    pct: number,
    skill: SkillDef | null,
    ctx: CombatCtx
  ): boolean {
    // 디버프 — 기본 공격과 동일하게 유닛 고유 디버프도 스킬 명중에 적용
    if (this.def.slowPct && this.def.slowMs) m.applySlow(this.def.slowPct, this.def.slowMs, ctx.now);
    if (this.def.stunMs) m.applyStun(this.def.stunMs, ctx.now);
    if (this.def.shredAmt && this.def.shredMs) m.applyShred(this.def.shredAmt, this.def.shredMs, ctx.now);
    if (this.passiveSlow) m.applySlow(this.passiveSlow.slowPct!, this.passiveSlow.slowMs!, ctx.now);
    if (skill) {
      if (skill.slowPct && skill.slowMs) m.applySlow(skill.slowPct, skill.slowMs, ctx.now);
      if (skill.stunMs) m.applyStun(skill.stunMs, ctx.now);
      if (skill.shredAmt && skill.shredMs) m.applyShred(skill.shredAmt, skill.shredMs, ctx.now);
      if (skill.markMul && skill.markMs) m.applyMark(skill.markMul, skill.markMs, ctx.now);
      if (skill.dotPctPerSec && skill.dotMs) {
        m.applyDot((baseAtk * skill.dotPctPerSec) / 100, skill.dotMs, ctx.now);
      }
    }
    if (pct <= 0) return false;
    let type: DmgType = skill?.magic ? "magic" : this.def.dmgType;
    if (this.bossMagic && m.isBoss) type = "magic";
    return ctx.damage(m, (baseAtk * pct) / 100, type, this.killGoldMul);
  }

  update(ctx: CombatCtx, deltaMs: number): void {
    // 이동
    if (this.tx !== null) {
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const dist = Math.hypot(dx, dy);
      const step = (MOVE_SPEED * this.moveSpeedMul * deltaMs) / 1000;
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

    const range = this.def.range * ctx.rangeMul * this.passiveRangeMul();
    const r2 = range * range;
    let target: Mob | null = null;
    let best = Infinity;
    let crowd = 0; // 사거리 내 몹 수 (crowd 패시브)
    let strongest: Mob | null = null;
    for (const m of ctx.mobs) {
      if (m.dead) continue;
      const dx = m.x - this.x;
      const dy = m.y - this.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      crowd++;
      if (d2 < best) {
        best = d2;
        target = m;
      }
      if (!strongest || m.hp > strongest.hp) strongest = m;
    }
    if (!target) return;

    // 냉각 (과부하 방출) — 이번 공격 1회를 쉰다
    if (this.skipNextAtk) {
      this.skipNextAtk = false;
      this.cd = this.def.cooldown * 1000 * ctx.cdMul;
      return;
    }

    // 공격 스킬 발동 판정 — everyN회마다 기본 공격 대체 (주기 긴 스킬 우선)
    this.attackCount++;
    const skill =
      this.attackSkills.find((s) => this.attackCount % (s.everyN ?? 0) === 0) ?? null;
    if (skill?.targetMode === "strongest" && strongest) target = strongest;

    // 쿨다운: 카드·팀 버프(ctx) × 패시브 × 오라 × 자기 버프
    const aura = ctx.aura(this.def.family);
    const buffed = ctx.now < this.buffUntil;
    this.cd =
      this.def.cooldown *
      1000 *
      ctx.cdMul *
      this.passiveCdMul(crowd, ctx) *
      aura.cdMul *
      (buffed ? this.buffCdMul : 1);
    if (this.luckyReset && Math.random() < this.luckyReset) this.cd = 0;

    if (this.sprite && this.scene.anims.exists(attackKey(this.def.id))) {
      this.sprite.setFlipX(target.x < this.x); // 시트 기본 방향 = 오른쪽
      this.sprite.play(attackKey(this.def.id));
    }
    ctx.flash(this.x, this.y, target.x, target.y, GRADE_COLOR[this.def.grade]);

    const p = this.def.phase;
    const phaseBuffed =
      p !== undefined && (p === "both" || (p === "day") === ctx.isDay);
    const atkBase =
      (phaseBuffed ? this.def.atk * PHASE_BUFF : this.def.atk) *
      aura.atkMul *
      (buffed ? this.buffAtkMul : 1) *
      this.passiveAtkMul(target, best, range, crowd, ctx);

    // 스택·라운드 추적
    this.stacks = target === this.lastTarget ? this.stacks + 1 : 0;
    this.lastTarget = target;
    this.lastAttackRound = ctx.round;

    let killedAny = false;

    if (skill) {
      // 자기 버프형
      if (skill.buffMs) {
        this.applyBuff(
          ctx.now,
          skill.buffMs,
          skill.buffCdMul ?? 1,
          skill.buffAtkMul ?? 1,
          skill.buffSplashMul ?? 1
        );
      }
      if (skill.skipNext) this.skipNextAtk = true;

      // 대상 집합
      let targets: Mob[];
      if (skill.radius) {
        const s2 = skill.radius * skill.radius;
        targets = ctx.mobs.filter((m) => {
          if (m.dead) return false;
          const dx = m.x - target.x;
          const dy = m.y - target.y;
          return dx * dx + dy * dy <= s2;
        });
      } else if (skill.targets === -1) {
        targets = ctx.mobs.filter((m) => {
          if (m.dead) return false;
          const dx = m.x - this.x;
          const dy = m.y - this.y;
          return dx * dx + dy * dy <= r2;
        });
      } else if (skill.targets && skill.targets > 1) {
        targets = ctx.mobs
          .filter((m) => {
            if (m.dead) return false;
            const dx = m.x - this.x;
            const dy = m.y - this.y;
            return dx * dx + dy * dy <= r2;
          })
          .sort((a, b) => {
            const da = (a.x - target.x) ** 2 + (a.y - target.y) ** 2;
            const db = (b.x - target.x) ** 2 + (b.y - target.y) ** 2;
            return da - db;
          })
          .slice(0, skill.targets);
      } else {
        targets = [target];
      }

      // 처형 (작업 종료 선언)
      if (skill.executePct) {
        for (const m of [...targets]) {
          if (m.isBoss || m.golden || m.dead) continue;
          if (m.hp <= m.maxHp * skill.executePct) ctx.damage(m, 9e9, "magic", this.killGoldMul);
        }
      }

      // 명중 수 비례 가산 (도시의 함성)
      const pct =
        (skill.pct ?? 100) +
        (skill.crowdScalePct ? skill.crowdScalePct * Math.max(0, targets.length - 1) : 0);
      const hits = skill.hits ?? 1;
      for (let h = 0; h < hits; h++) {
        for (const m of [...targets]) {
          if (m.dead) continue;
          if (this.hitOne(m, atkBase, pct, skill, ctx)) killedAny = true;
        }
      }
    } else if (this.def.splash) {
      const splashR = this.def.splash * (buffed ? this.buffSplashMul : 1);
      const s2 = splashR * splashR;
      const tx = target.x;
      const ty = target.y;
      for (const m of [...ctx.mobs]) {
        if (m.dead) continue;
        const dx = m.x - tx;
        const dy = m.y - ty;
        if (dx * dx + dy * dy > s2) continue;
        if (this.hitOne(m, atkBase, 100, null, ctx)) killedAny = true;
      }
    } else {
      if (this.hitOne(target, atkBase, 100, null, ctx)) killedAny = true;
    }

    // 별똥별 리듬 — 처치 시 남은 쿨다운 단축
    if (killedAny && this.killHaste) this.cd *= this.killHaste;
  }
}
