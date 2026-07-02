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

  /**
   * sameCount: 필드 위 동일 유닛 수 (선택된 유닛 포함).
   * 단, 전설 유닛이면 필드 위 전설 유닛 수 — 전설 2기(종류 무관)로 초월 합성.
   */
  unitInfo(unit: UnitDef | null, sameCount: number): void {
    const el = this.els["unitInfo"];
    if (!unit) {
      el.innerHTML = `<div style="color:#8f96a3">유닛을 선택하세요</div>`;
      return;
    }

    const isLegendary = unit.grade === "legendary";
    const next = nextGrade(unit.grade);
    const canMerge = isLegendary
      ? sameCount >= 2
      : next !== null && sameCount >= 2;
    const countLabel = isLegendary
      ? `전설 유닛 ${sameCount}/2`
      : `동일 유닛 ${sameCount}/2`;
    const mergeLabel = isLegendary
      ? "⚡ 초월 합성 (랜덤)"
      : next
        ? `${GRADE_NAME[next]} 합성`
        : "합성 불가";
    el.innerHTML = `
      <div class="grade" style="color:${GRADE_COLOR_CSS[unit.grade]}">
        [${GRADE_NAME[unit.grade]}] ${unit.name}
      </div>
      <div>공격력 ${unit.atk} · 사거리 ${unit.range} · 주기 ${unit.cooldown}s</div>
      <div>${unit.dmgType === "phys" ? "물리" : "마법"}${
        unit.desc ? ` · ${unit.desc}` : ""
      }</div>
      <div>${countLabel}</div>
      <button class="big" id="h-merge" ${canMerge ? "" : "disabled"}>
        ${mergeLabel}
      </button>
    `;
    el.querySelector("#h-merge")?.addEventListener("click", this.onMerge);
  }

  recipes(states: RecipeState[]): void {
    const el = this.els["recipes"];
    el.innerHTML = `
      <div class="rtitle">초월 조합</div>
      ${states
        .map(
          (r) => `
            <div class="rrow">
              <button class="rbtn" data-recipe="${r.id}" ${
                r.ok ? "" : "disabled"
              }>
                ${r.name}${r.crafted ? " · 보유" : ""}
              </button>
              <div>
                ${r.mats
                  .map(
                    (m) =>
                      `<span class="${m.have ? "have" : "lack"}">${m.name}</span>`
                  )
                  .join(" + ")}
              </div>
            </div>
          `
        )
        .join("")}
    `;
    el.querySelectorAll<HTMLButtonElement>("[data-recipe]").forEach((btn) => {
      btn.addEventListener("click", () => this.onCraft(btn.dataset.recipe!));
    });
  }

  offerCards(cards: CardDef[], onPick: (id: string) => void): void {
    const el = this.els["cards"];
    el.style.display = "flex";
    el.innerHTML = `
      <div class="ctitle">보상 카드 선택</div>
      ${cards
        .map(
          (card) => `
            <button class="card" data-card="${card.id}">
              <div class="cicon">${card.icon}</div>
              <div class="cname">${card.name}</div>
              <div class="cdesc">${card.desc}</div>
            </button>
          `
        )
        .join("")}
    `;
    el.querySelectorAll<HTMLButtonElement>("[data-card]").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.style.display = "none";
        onPick(btn.dataset.card!);
      });
    });
  }

  result(win: boolean, desc: string, onRetry: () => void): void {
    this.els["h-rtitle"].textContent = win ? "승리" : "패배";
    this.els["h-rdesc"].textContent = desc;
    const retry = this.els["h-retry"] as HTMLButtonElement;
    retry.onclick = onRetry;
    this.els["result"].style.display = "flex";
  }

  destroy(): void {
    if (this.msgTimer !== undefined) window.clearTimeout(this.msgTimer);
    this.root.innerHTML = "";
  }
}
