import {
  GRADE_COLOR_CSS,
  GRADE_NAME,
  nextGrade,
  UNITS,
  type Grade,
  type UnitDef,
} from "../data/units";
import { GACHA_COST, PHASE_BUFF } from "../data/config";
import type { CardDef } from "../data/cards";
import { settingsUI } from "./settings";

export interface ComboRow {
  key: string;
  result: string | null; // 미발견이면 null → "???"
  mats: string[];
  ok: boolean; // 필드에 재료가 모두 있는가
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
  isDay: boolean;
  phaseLeft: number; // 다음 낮/밤 전환까지 남은 초
}

export class Hud {
  private root: HTMLElement;
  private els: Record<string, HTMLElement> = {};
  private msgTimer: number | undefined;

  constructor(
    private onGacha: () => void,
    private onMerge: () => void,
    private onCombo: (key: string) => void,
    private onSummon: (grade: Grade, unitId: string) => void,
    onSpeed: () => number, // 클릭 시 배속 순환, 새 배속 반환
    onPause: () => boolean // 클릭 시 토글, 정지 여부 반환
  ) {
    this.root = document.getElementById("ui")!;
    this.root.innerHTML = `
      <div id="topbar">
        <span class="stat">라운드 <b id="h-round">-</b></span>
        <span class="stat">⏱ <b id="h-time">-</b></span>
        <span class="stat" title="낮/밤 전환까지"><b id="h-phase">☀</b></span>
        <span class="stat">몹 <b id="h-mobs">0/50</b></span>
        <span class="stat">데스 <b id="h-death">10</b></span>
        <span class="stat">💰 <b id="h-gold">0</b></span>
        <span style="flex:1"></span>
        <button class="gearbtn" id="h-pause" title="일시정지">⏸</button>
        <button class="gearbtn" id="h-speed" title="배속">x1</button>
        <button class="gearbtn" id="h-settings" title="설정">⚙</button>
      </div>
      <div id="panel">
        <button class="big" id="h-gacha">유닛 뽑기 — ${GACHA_COST}G</button>
        <div id="unitInfo"></div>
        <div id="tickets"></div>
        <div id="combos"></div>
      </div>
      <div id="picker"></div>
      <div id="msg"></div>
      <div id="pause">
        <button class="playbtn" id="h-resume" title="다시 시작">▶</button>
        <div class="ptext">일시 중지</div>
      </div>
      <div id="cards"></div>
      <div id="result">
        <h1 id="h-rtitle"></h1>
        <p id="h-rdesc"></p>
        <button class="big" id="h-retry">다시하기</button>
      </div>
    `;
    for (const id of [
      "h-round", "h-time", "h-phase", "h-mobs", "h-death", "h-gold",
      "h-gacha", "h-rtitle", "h-rdesc", "h-retry",
    ]) {
      this.els[id] = document.getElementById(id)!;
    }
    this.els["msg"] = document.getElementById("msg")!;
    this.els["combos"] = document.getElementById("combos")!;
    this.els["tickets"] = document.getElementById("tickets")!;
    this.els["picker"] = document.getElementById("picker")!;
    this.els["cards"] = document.getElementById("cards")!;
    this.els["result"] = document.getElementById("result")!;
    this.els["unitInfo"] = document.getElementById("unitInfo")!;
    this.els["h-gacha"].addEventListener("click", this.onGacha);
    const pauseBtn = document.getElementById("h-pause")!;
    const pauseOverlay = document.getElementById("pause")!;
    const togglePause = () => {
      const paused = onPause();
      pauseBtn.textContent = paused ? "▶" : "⏸";
      pauseOverlay.style.display = paused ? "flex" : "none";
    };
    pauseBtn.addEventListener("click", togglePause);
    document.getElementById("h-resume")!.addEventListener("click", togglePause);
    const speedBtn = document.getElementById("h-speed")!;
    speedBtn.addEventListener("click", () => {
      speedBtn.textContent = `x${onSpeed()}`;
    });
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
    this.els["h-phase"].textContent = `${s.isDay ? "☀" : "🌙"} ${s.phaseLeft}s`;
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
   * sameCount: 전설 유닛이면 필드 위 전설 유닛 수 — 전설 2기(종류 무관)로 초월 합성.
   * 그 외 등급은 합성 없음 (성장은 3기 조합·뽑기 담당).
   */
  unitInfo(unit: UnitDef | null, sameCount: number): void {
    const el = this.els["unitInfo"];
    if (!unit) {
      el.innerHTML = `<div style="color:#8f96a3">유닛을 선택하세요</div>`;
      return;
    }

    const isLegendary = unit.grade === "legendary";
    el.innerHTML = `
      <div class="grade" style="color:${GRADE_COLOR_CSS[unit.grade]}">
        [${GRADE_NAME[unit.grade]}] ${unit.name}
      </div>
      <div>공격력 ${unit.atk} · 사거리 ${unit.range} · 주기 ${unit.cooldown}s</div>
      <div>${unit.dmgType === "phys" ? "물리" : "마법"}${
        unit.desc ? ` · ${unit.desc}` : ""
      }</div>
      ${
        unit.phase
          ? `<div>${
              unit.phase === "both" ? "☀🌙 낮밤 모두" : unit.phase === "day" ? "☀ 낮" : "🌙 밤"
            }에 공격력 +${Math.round((PHASE_BUFF - 1) * 100)}%</div>`
          : ""
      }
      ${unit.grade === "common" ? `<div style="color:#ffd166">3기 조합 재료</div>` : ""}
      ${
        isLegendary
          ? `
            <div>전설 유닛 ${sameCount}/2</div>
            <button class="big" id="h-merge" ${sameCount >= 2 ? "" : "disabled"}>
              ⚡ 초월 합성
            </button>
          `
          : unit.grade !== "common" && nextGrade(unit.grade)
            ? `
              <div>동급 유닛 ${sameCount}/3</div>
              <button class="big" id="h-merge" ${sameCount >= 3 ? "" : "disabled"}>
                ${GRADE_NAME[nextGrade(unit.grade)!]} 합성 (동급 3기)
              </button>
            `
            : ""
      }
    `;
    el.querySelector("#h-merge")?.addEventListener("click", this.onMerge);
  }

  // ---------- 🎟 소환권 ----------

  /** 보유 소환권 표시 — 클릭 시 해당 등급 유닛 선택 소환 */
  tickets(counts: Partial<Record<Grade, number>>): void {
    const el = this.els["tickets"];
    const rows = (Object.entries(counts) as Array<[Grade, number]>).filter(
      ([, n]) => n > 0
    );
    if (rows.length === 0) {
      el.innerHTML = "";
      el.style.display = "none";
      return;
    }
    el.style.display = "flex";
    el.innerHTML = `
      <div class="rtitle">🎟 소환권</div>
      ${rows
        .map(
          ([g, n]) => `
            <button class="rbtn" data-ticket="${g}" style="color:${GRADE_COLOR_CSS[g]}">
              ${GRADE_NAME[g]} 소환권 ×${n} — 원하는 유닛 소환
            </button>
          `
        )
        .join("")}
    `;
    el.querySelectorAll<HTMLButtonElement>("[data-ticket]").forEach((btn) => {
      btn.addEventListener("click", () =>
        this.openPicker(btn.dataset.ticket as Grade)
      );
    });
  }

  private openPicker(grade: Grade): void {
    const el = this.els["picker"];
    const pool = UNITS.filter((u) => u.grade === grade && !u.hidden);
    el.innerHTML = `
      <div class="dpanel">
        <h2>🎟 ${GRADE_NAME[grade]} 유닛 소환</h2>
        <div id="picklist">
          ${pool
            .map(
              (u) => `
                <button class="rbtn" data-pick="${u.id}">
                  ${u.name} — 공격 ${u.atk} · 주기 ${u.cooldown}s${u.desc ? ` · ${u.desc}` : ""}
                </button>
              `
            )
            .join("")}
        </div>
        <button class="big" id="h-pickclose">취소</button>
      </div>
    `;
    el.style.display = "flex";
    el.querySelector("#h-pickclose")!.addEventListener("click", () => {
      el.style.display = "none";
    });
    el.querySelectorAll<HTMLButtonElement>("[data-pick]").forEach((btn) => {
      btn.addEventListener("click", () => {
        el.style.display = "none";
        this.onSummon(grade, btn.dataset.pick!);
      });
    });
  }

  // ---------- 3기 조합 ----------

  /** 패널: 지금 만들 수 있는 조합만 표시 */
  combos(rows: ComboRow[]): void {
    const el = this.els["combos"];
    const craftable = rows.filter((r) => r.ok);
    el.innerHTML = `
      <div class="rtitle">3기 조합</div>
      ${
        craftable.length === 0
          ? `<div style="color:#8f96a3">흔함 유닛 3기가 모이면 표시됩니다</div>`
          : craftable
              .map(
                (r) => `
                  <div class="rrow">
                    <button class="rbtn" data-combo="${r.key}">
                      ${r.result ?? "??? (미발견)"}
                    </button>
                    <div>${r.mats.join(" + ")}</div>
                  </div>
                `
              )
              .join("")
      }
    `;
    el.querySelectorAll<HTMLButtonElement>("[data-combo]").forEach((btn) => {
      btn.addEventListener("click", () => this.onCombo(btn.dataset.combo!));
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
