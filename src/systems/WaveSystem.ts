import {
  BOSS_TIME,
  FIRST_BREAK,
  MOBS_PER_ROUND,
  ROUND_BREAK,
  ROUND_MAX,
  ROUND_TIME,
  SPAWN_INTERVAL,
} from "../data/config";
import type { Mob } from "../entities/Mob";

export interface WaveCallbacks {
  spawn(round: number, boss: boolean): Mob | null;
  mobCount(): number;
  roundStart(round: number, boss: boolean): void;
  roundClear(round: number): void;
  message(text: string): void;
  defeat(reason: string): void;
  victory(): void;
}

export class WaveSystem {
  round = 0;
  state: "break" | "running" = "break";
  private timer = FIRST_BREAK * 1000;
  private spawned = 0;
  private spawnT = 0;
  private boss: Mob | null = null;
  private done = false;

  constructor(private cb: WaveCallbacks) {}

  get timeLeftSec(): number {
    return Math.max(0, Math.ceil(this.timer / 1000));
  }

  isBossRound(r: number): boolean {
    return r > 0 && r % 10 === 0;
  }

  notifyBossKilled(): void {
    if (this.done) return;
    if (this.round >= ROUND_MAX) {
      this.done = true;
      this.cb.victory();
      return;
    }
    this.cb.message("보스 처치!");
    this.endRound();
  }

  stop(): void {
    this.done = true;
  }

  update(deltaMs: number): void {
    if (this.done) return;
    this.timer -= deltaMs;

    if (this.state === "break") {
      if (this.timer <= 0) this.startRound();
      return;
    }

    const bossRound = this.isBossRound(this.round);
    if (bossRound) {
      if (this.spawned === 0) {
        this.boss = this.cb.spawn(this.round, true);
        this.spawned = 1;
      }
    } else {
      this.spawnT -= deltaMs;
      if (this.spawned < MOBS_PER_ROUND && this.spawnT <= 0) {
        this.cb.spawn(this.round, false);
        this.spawned++;
        this.spawnT = SPAWN_INTERVAL * 1000;
      }
      // 모든 몹을 다 잡았으면 조기 종료
      if (this.spawned >= MOBS_PER_ROUND && this.cb.mobCount() === 0) {
        this.endRound();
        return;
      }
    }

    if (this.timer <= 0) {
      if (bossRound && this.boss && !this.boss.dead) {
        this.done = true;
        this.cb.defeat("제한 시간 내에 보스를 처치하지 못했습니다");
        return;
      }
      this.endRound();
    }
  }

  private startRound(): void {
    this.round++;
    this.state = "running";
    this.spawned = 0;
    this.spawnT = 0;
    this.boss = null;
    const boss = this.isBossRound(this.round);
    this.timer = (boss ? BOSS_TIME : ROUND_TIME) * 1000;
    this.cb.roundStart(this.round, boss);
  }

  private endRound(): void {
    if (this.state !== "running") return;
    this.state = "break";
    this.timer = ROUND_BREAK * 1000;
    this.cb.roundClear(this.round);
  }
}
