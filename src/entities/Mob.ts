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
  dead = false;

  private dist = 0;
  private slowPct = 0;
  private slowUntil = 0;
  private stunUntil = 0;
  private shredAmt = 0;
  private shredUntil = 0;

  constructor(scene: Phaser.Scene, private loop: PathLoop, stats: MobStats) {
    super(scene, 0, 0, stats.boss ? "boss" : "mob");
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.baseSpeed = stats.speed;
    this.gold = stats.gold;
    this.armor = stats.armor;
    this.isBoss = stats.boss;
    this.setTint(stats.boss ? 0xff2e2e : 0xd9534f);
    this.setDepth(5);
    const p = loop.posAt(0);
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
}
