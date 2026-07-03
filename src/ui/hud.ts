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
  grade: Grade; // 결과 등급 (= 시트 분류)
  mats: string[];
  ok: boolean; // 필드에 재료가 모두 있는가
}

/** 조합법 책의 시트 순서 */
const BOOK_TABS: Grade[] = ["uncommon", "special", "rare", "legendary"];

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
    onRecall: () => void, // 스토리 존 파견 유닛 회수
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
        <div id="story">
          <div class="rtitle">📖 스토리 존 <b id="st-ch"></b></div>
          <div id="st-boss">불러오는 중…</div>
          <div class="stbar"><div id="st-fill"></div></div>
          <div id="st-unit"></div>
          <button class="rbtn" id="st-recall" style="display:none">회수</button>
        </div>
        <button class="big" id="h-book">📖 조합법</button>
      </div>
      <div id="picker"></div>
      <div id="book">
        <div class="dpanel">
          <h2>📖 조합법</h2>
          <div class="btabs" id="btabs"></div>
          <div id="blist"></div>
          <button class="big" id="h-bookclose">닫기</button>
        </div>
      </div>
      <div id="msg"></div>
      <div id="pause">
        <button class="playbtn" id="h-resume" title="다시 시작">▶</button>
        <div class="ptext">일시 중지</div>
      </div>
      <div id="cards"></div>
      <div id="result">
        <h1 id="h-rtitle"></h1>
        <p id="h-rdesc"></p>
        <button class="big" id="h-retry">다시하기 (같은 덱)</button>
        <button class="big alt" id="h-totitle">타이틀로 — 덱 다시 짜기</button>
      </div>
    `;
    for (const id of [
      "h-round", "h-time", "h-phase", "h-mobs", "h-death", "h-gold",
      "h-gacha", "h-rtitle", "h-rdesc", "h-retry",
    ]) {
      this.els[id] = document.getElementById(id)!;
    }
    this.els["msg"] = document.getElementById("msg")!;
    this.els["tickets"] = document.getElementById("tickets")!;
    this.els["picker"] = document.getElementById("picker")!;
    for (const id of ["st-ch", "st-boss", "st-fill", "st-unit", "st-recall"]) {
      this.els[id] = document.getElementById(id)!;
    }
    this.els["st-recall"].addEventListener("click", onRecall);
    this.els["book"] = document.getElementById("book")!;
    this.els["btabs"] = document.getElementById("btabs")!;
    this.els["blist"] = document.getElementById("blist")!;
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
    document.getElementById("h-book")!.addEventListener("click", () => {
      this.renderBook();
      this.els["book"].style.display = "flex";
    });
    document.getElementById("h-bookclose")!.addEventListener("click", () => {
      this.els["book"].style.display = "none";
    });
    // 모달 배경 클릭 = 닫기
    for (const id of ["book", "picker"]) {
      this.els[id].addEventListener("click", (e) => {
        if (e.target === this.els[id]) this.els[id].style.display = "none";
      });
    }
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
    // 위험 상태 강조 — 몹 캡 임박 / 데스 부족
    this.els["h-mobs"].style.color = s.mobs >= s.cap * 0.8 ? "#ff6b6b" : "";
    this.els["h-death"].textContent = String(s.death);
    this.els["h-death"].style.color = s.death <= 3 ? "#ff6b6b" : "";
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
   * combos: 흔함 유닛이면 이 유닛이 재료인 조합법 목록 (가능한 조합은 빛나고 클릭 = 조합)
   */
  unitInfo(unit: UnitDef | null, sameCount: number, combos: ComboRow[] = []): void {
    const el = this.els["unitInfo"];
    if (!unit) {
      el.innerHTML = `
        <div style="color:#8f96a3">유닛을 선택하세요</div>
        <div class="hint">
          클릭: 선택 · 드래그: 부대 선택<br>
          우클릭: 이동 명령 · Space: 뽑기
        </div>
      `;
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
      ${
        combos.length > 0
          ? `
            <div class="crowtitle">관련 조합법</div>
            <div class="crows">
              ${combos
                .map(
                  (r) => `
                    <button class="crow ${r.ok ? "ok" : ""}" data-combo="${r.key}" ${r.ok ? "" : "disabled"}>
                      <span>${r.mats.join(" + ")}</span>
                      <b style="color:${GRADE_COLOR_CSS[r.grade]}">= ${r.result ?? "???"}</b>
                    </button>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }
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
    el.querySelectorAll<HTMLButtonElement>("[data-combo]").forEach((btn) => {
      btn.addEventListener("click", () => this.onCombo(btn.dataset.combo!));
    });
  }

  /** 다중 선택(부대) 표시 */
  unitInfoMulti(count: number): void {
    this.els["unitInfo"].innerHTML = `
      <div class="grade" style="color:#ffd166">부대 선택 — ${count}기</div>
      <div>우클릭: 지정 위치로 이동</div>
      <div style="color:#8f96a3">적군 경로 바깥으로는 나갈 수 없다</div>
    `;
  }

  // ---------- 📖 스토리 존 ----------

  storyUpdate(
    chapter: number,
    title: string,
    boss: string,
    hp: number,
    maxHp: number,
    unitName: string | null
  ): void {
    this.els["st-ch"].textContent = `제${chapter}장`;
    this.els["st-boss"].textContent = `${title} — ${boss}`;
    this.els["st-fill"].style.width = `${Math.max(0, Math.min(100, (hp / maxHp) * 100))}%`;
    this.els["st-unit"].textContent = unitName
      ? `⚔ 파견 중: ${unitName}`
      : "유닛 선택 → 좌하단 오두막 우클릭 = 파견";
    this.els["st-recall"].style.display = unitName ? "" : "none";
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

  // ---------- 📖 조합법 책 ----------

  private bookRows: ComboRow[] = [];
  private bookTab: Grade = "uncommon";

  /** 조합 데이터 갱신 — 책이 열려 있으면 즉시 다시 그림 */
  comboBook(rows: ComboRow[]): void {
    this.bookRows = rows;
    const craftable = rows.filter((r) => r.ok).length;
    const btn = document.getElementById("h-book")!;
    btn.textContent =
      craftable > 0 ? `📖 조합법 (지금 가능 ${craftable})` : "📖 조합법";
    btn.classList.toggle("glow", craftable > 0);
    if (this.els["book"].style.display === "flex") this.renderBook();
  }

  /** 등급별 시트에 "A + B + C = 결과"를 나열. 재료가 모이면 행이 활성화 */
  private renderBook(): void {
    this.els["btabs"].innerHTML = BOOK_TABS.map(
      (g) => `
        <button class="btab ${g === this.bookTab ? "on" : ""}" data-tab="${g}"
          style="${g === this.bookTab ? `color:${GRADE_COLOR_CSS[g]}` : ""}">
          ${GRADE_NAME[g]}
        </button>
      `
    ).join("");
    this.els["btabs"]
      .querySelectorAll<HTMLButtonElement>("[data-tab]")
      .forEach((btn) => {
        btn.addEventListener("click", () => {
          this.bookTab = btn.dataset.tab as Grade;
          this.renderBook();
        });
      });

    const rows = this.bookRows.filter((r) => r.grade === this.bookTab);
    this.els["blist"].innerHTML = rows
      .map(
        (r) => `
          <button class="brow" data-combo="${r.key}" ${r.ok ? "" : "disabled"}>
            <span>${r.mats.join(" + ")}</span>
            <b style="color:${GRADE_COLOR_CSS[this.bookTab]}">= ${r.result ?? "???"}</b>
          </button>
        `
      )
      .join("");
    this.els["blist"]
      .querySelectorAll<HTMLButtonElement>("[data-combo]")
      .forEach((btn) => {
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

  result(
    win: boolean,
    desc: string,
    onRetry: () => void,
    onTitle: () => void
  ): void {
    this.els["h-rtitle"].textContent = win ? "승리" : "패배";
    this.els["h-rdesc"].textContent = desc;
    const retry = this.els["h-retry"] as HTMLButtonElement;
    retry.onclick = onRetry;
    (document.getElementById("h-totitle") as HTMLButtonElement).onclick = onTitle;
    this.els["result"].style.display = "flex";
  }

  destroy(): void {
    if (this.msgTimer !== undefined) window.clearTimeout(this.msgTimer);
    this.root.innerHTML = "";
  }
}
