import Phaser from "phaser";
import type { PathLoop } from "../core/path";
import type { MobStats } from "../data/waves";

export class Mob extends Phaser.GameObjects.Image {
  hp: number;
  readonly maxHp: number;
  readonly baseSpeed: number;
  readonly gold: number;
  readonly armor: number;
  readonly isBoss: boolean;
  readonly splits: boolean; // 사망 시 분열
  readonly golden: boolean; // 황금 비둘기 — 캡/데스 미적용, 1바퀴 후 소멸
  dead = false;
  dist = 0; // 트랙 진행 거리(px) — 분열 자식 배치·황금 소멸 판정에 사용

  private slowPct = 0;
  private slowUntil = 0;
  private stunUntil = 0;
  private shredAmt = 0;
  private shredUntil = 0;
  private markMul = 1; // 받는 피해 증가 (스킬 마킹)
  private markUntil = 0;
  dotDps = 0; // 도트 (마법 판정) — GameScene이 틱마다 적용
  dotUntil = 0;

  constructor(
    scene: Phaser.Scene,
    private loop: PathLoop,
    stats: MobStats,
    startDist = 0
  ) {
    super(scene, 0, 0, stats.boss ? "boss" : "mob");
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.baseSpeed = stats.speed;
    this.gold = stats.gold;
    this.armor = stats.armor;
    this.isBoss = stats.boss;
    this.splits = stats.splits ?? false;
    this.golden = stats.golden ?? false;
    this.dist = startDist;
    this.setTint(stats.color ?? (stats.boss ? 0xff2e2e : 0xd9534f));
    if (stats.scale) {
      this.setScale(stats.scale);
    } else {
      this.setScale(this.isBoss ? 1.08 : this.golden ? 1.18 : 1);
    }
    this.setDepth(5);
    const p = loop.posAt(startDist);
    this.setPosition(p.x, p.y);
    scene.add.existing(this);
  }

  advance(now: number, deltaMs: number, speedMul = 1): void {
    if (this.dead) return;
    if (now < this.stunUntil) return;
    const slow = now < this.slowUntil ? this.slowPct : 0;
    const speed = this.baseSpeed * (1 - slow) * speedMul;
    this.dist += (speed * deltaMs) / 1000;
    const p = this.loop.posAt(this.dist);
    this.setPosition(p.x, p.y);
  }

  /** true를 반환하면 사망 */
  hit(dmg: number): boolean {
    if (this.dead) return false;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  applySlow(pct: number, durMs: number, now: number): void {
    // 더 강한 감속이거나 기존 감속이 끝났으면 갱신
    if (pct >= this.slowPct || now >= this.slowUntil) {
      this.slowPct = Math.min(pct, 0.9);
      this.slowUntil = now + durMs;
    }
  }

  applyStun(durMs: number, now: number): void {
    this.stunUntil = Math.max(this.stunUntil, now + durMs);
  }

  applyShred(amount: number, durMs: number, now: number): void {
    if (amount >= this.shredAmt || now >= this.shredUntil) {
      this.shredAmt = amount;
      this.shredUntil = now + durMs;
    }
  }

  /** 방깎 디버프가 적용된 현재 방어력 */
  effArmor(now: number): number {
    const shred = now < this.shredUntil ? this.shredAmt : 0;
    return Math.max(0, this.armor - shred);
  }

  // ---------- 스킬 상태 (GDD 1.7) ----------

  applyMark(mul: number, durMs: number, now: number): void {
    if (mul >= this.markMul || now >= this.markUntil) {
      this.markMul = mul;
      this.markUntil = now + durMs;
    }
  }

  /** 받는 피해 배율 (마킹) */
  takenMul(now: number): number {
    return now < this.markUntil ? this.markMul : 1;
  }

  applyDot(dps: number, durMs: number, now: number): void {
    if (dps >= this.dotDps || now >= this.dotUntil) {
      this.dotDps = dps;
      this.dotUntil = now + durMs;
    }
  }

  isStunned(now: number): boolean {
    return now < this.stunUntil;
  }

  isShredded(now: number): boolean {
    return now < this.shredUntil && this.shredAmt > 0;
  }
}
