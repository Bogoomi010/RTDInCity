import {
  GRADE_COLOR_CSS,
  GRADE_NAME,
  nextGrade,
  type UnitDef,
} from "../data/units";
import { GACHA_COST } from "../data/config";
import type { CardDef } from "../data/cards";
import { settingsUI } from "./settings";

export interface RecipeState {
  id: string;
  name: string;
  ok: boolean;
  crafted: boolean;
  mats: Array<{ name: string; have: boolean }>;
}

export interface HudSnapshot {
  round: number;
  roundMax: number;
  timeLeft: number;
  state: "break" | "running";
  mobs: number;
  cap: number;
  death: number;
  gold: number;
  gachaCost: number;
}

export class Hud {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private msgTimer: number | undefined;

  constructor(
    private onGacha: () => void,
    private onMerge: () => void,
    private onCraft: (recipeId: string) => void
  ) {
    this.root = document.getElementById("ui")!;
    this.root.innerHTML = `
      <div id="topbar">
        <span class="stat">라운드 <b id="h-round">-</b></span>
        <span class="stat">⏱ <b id="h-time">-</b></span>
        <span class="stat">몹 <b id="h-mobs">0/50</b></span>
        <span class="stat">데스 <b id="h-death">10</b></span>
        <span class="stat">💰 <b id="h-gold">0</b></span>
        <span style="flex:1"></span>
        <button class="gearbtn" id="h-settings" title="설정">⚙</button>
      </div>
      <div id="panel">
        <button class="big" id="h-gacha">유닛 뽑기 — ${GACHA_COST}G</button>
        <div id="unitInfo"></div>
        <div id="recipes"></div>
      </div>
      <div id="msg"></div>
      <div id="cards"></div>
      <div id="result">
        <h1 id="h-rtitle"></h1>
        <p id="h-rdesc"></p>
        <button class="big" id="h-retry">다시하기</button>
      </div>
    `;
    for (const id of [
      "h-round", "h-time", "h-mobs", "h-death", "h-gold",
      "h-gacha", "h-rtitle", "h-rdesc", "h-retry",
    ]) {
      this.els[id] = document.getElementById(id)!;
    }
    this.els["msg"] = document.getElementById("msg")!;
    this.els["cards"] = document.getElementById("cards")!;
    this.els["result"] = document.getElementById("result")!;
    this.els["unitInfo"] = document.getElementById("unitInfo")!;
    this.els["recipes"] = document.getElementById("recipes")!;
    this.els["h-gacha"].addEventListener("click", this.onGacha);
    document
      .getElementById("h-settings")!
      .addEventListener("click", () => settingsUI.open());
    this.unitInfo(null, 0);
  }

  update(s: HudSnapshot): void {
    this.els["h-round"].textContent =
      s.round <= 0 ? "대기" : `${s.round}/${s.roundMax}`;
    this.els["h-time"].textContent =
      s.state === "break" ? `다음 라운드 ${s.timeLeft}s` : `${s.timeLeft}s`;
    this.els["h-mobs"].textContent = `${s.mobs}/${s.cap}`;
    this.els["h-death"].textContent = String(s.death);
    this.els["h-gold"].textContent = String(s.gold);
    const gachaBtn = this.els["h-gacha"] as HTMLButtonElement;
    gachaBtn.disabled = s.gold < s.gachaCost;
    const label = `유닛 뽑기 — ${s.gachaCost}G`;
    if (gachaBtn.textContent !== label) gachaBtn.textContent = label;
  }

  message(text: string): void {
    const el = this.els["msg"];
    el.textContent = text;
    el.style.opacity = "1";
    if (this.msgTimer !== undefined) window.clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => {
      el.style.opacity = "0";
    }, 2200);
  }

  /** sameCount: 필드 위 동일 유닛 수 (선택된 유닛 포함) */
  unitIn