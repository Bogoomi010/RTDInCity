import {
  GRADE_COLOR_CSS,
  GRADE_NAME,
  nextGrade,
  UNITS,
  type Grade,
  type UnitDef,
} from "../data/units";
import { GACHA_COST, PHASE_BUFF } from "../data/config";
import { bustHtml } from "../data/art";

/** 조합 재료를 "버스트 + 이름" 나열로 렌더 — 조합법 책·관련 조합법 공통 */
function matsHtml(key: string, mats: string[]): string {
  const ids = key.split("+");
  return ids
    .map((id, i) => {
      const img = bustHtml(id, 22) ?? "";
      return `<span style="display:inline-flex;align-items:center;gap:3px">${img}${mats[i]}</span>`;
    })
    .join(" + ");
}
import type { CardDef } from "../data/cards";
import { skillsOf } from "../data/skills";
import { sparkline, STOCKS, type StockState } from "../data/stocks";
import { settingsUI } from "./settings";

/** 스킬 목록 렌더 — ◆패시브 ✦공격 ⚡액티브 (GDD 1.7) */
function skillsHtml(unitId: string): string {
  const skills = skillsOf(unitId);
  if (skills.length === 0) return "";
  const icon = { passive: "◆", attack: "✦", active: "⚡" } as const;
  const color = { passive: "#8f96a3", attack: "#ffd166", active: "#26c6da" } as const;
  return `
    <div class="crowtitle">스킬</div>
    ${skills
      .map(
        (s) => `
          <div style="font-size:12px;line-height:1.35;margin:1px 0">
            <b style="color:${color[s.kind]}">${icon[s.kind]} ${s.name}</b>
            <span style="color:#aab1bd"> — ${s.desc}</span>
          </div>
        `
      )
      .join("")}
  `;
}

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
  streak: number; // 🔥 킬 스트릭 (활성 아닐 땐 0)
  pityLeft: number | null; // 🎰 천장까지 남은 뽑기 수 (전설 풀 구간 전엔 null)
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
    onPause: () => boolean, // 클릭 시 토글, 정지 여부 반환
    onGiveUp: () => void, // 설정 → 포기하기 (재확인 후 타이틀로)
    private onActive: () => void = () => {}, // ⚡ 선택 유닛의 액티브 스킬 발동
    private onStockTrade: (stockId: string, n: number) => void = () => {} // 📈 n>0 매수 / n<0 매도 (-999 전량)
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
        <span class="stat" id="h-streak" style="display:none;color:#ff8f4d">🔥 <b id="h-streakv"></b></span>
        <span style="flex:1"></span>
        <button class="gearbtn" id="h-pause" title="일시정지">⏸</button>
        <button class="gearbtn" id="h-speed" title="배속">x1</button>
        <button class="gearbtn" id="h-settings" title="설정">⚙</button>
      </div>
      <div id="panel">
        <button class="big" id="h-gacha">유닛 뽑기 — ${GACHA_COST}G</button>
        <div id="h-pity" style="display:none;font-size:11px;color:#8f96a3;text-align:center;margin-top:-4px"></div>
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
        <button class="big" id="h-stocks">📈 증권거래소</button>
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
      <div id="stocks-panel" style="display:none">
        <div class="dpanel">
          <h2>📈 도시 증권거래소</h2>
          <div style="font-size:12px;color:#8f96a3;margin-bottom:6px">
            시세는 라운드 클리어마다 변동 · 판이 끝나면 잔여 주식은 소멸 — 팔아야 내 돈
          </div>
          <div id="stock-rows"></div>
          <button class="big" id="h-stocksclose">닫기</button>
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
    // 📈 증권거래소
    const stocksPanel = document.getElementById("stocks-panel")!;
    document.getElementById("h-stocks")!.addEventListener("click", () => {
      stocksPanel.style.display = "flex";
      this.renderStockRows();
    });
    document.getElementById("h-stocksclose")!.addEventListener("click", () => {
      stocksPanel.style.display = "none";
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
      .addEventListener("click", () => settingsUI.open({ onGiveUp }));
    this.unitInfo(null, 0);
  }

  update(s: HudSnapshot): void {
    this.els["h-round"].textContent =
      s.round <= 0
        ? "대기"
        : Number.isFinite(s.roundMax)
          ? `${s.round}/${s.roundMax}`
          : `${s.round} ♾`;
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
    // 🔥 킬 스트릭
    const streakEl = document.getElementById("h-streak")!;
    if (s.streak >= 5) {
      streakEl.style.display = "";
      document.getElementById("h-streakv")!.textContent = `${s.streak} (골드 +${Math.min(20, s.streak)}%)`;
    } else {
      streakEl.style.display = "none";
    }
    // 🎰 천장 카운터
    const pityEl = document.getElementById("h-pity")!;
    if (s.pityLeft !== null) {
      pityEl.style.display = "";
      pityEl.textContent =
        s.pityLeft === 0 ? "🎰 천장 도달 — 다음 뽑기 전설 확정!" : `천장까지 ${s.pityLeft}회`;
    } else {
      pityEl.style.display = "none";
    }
  }

  // ---------- 📈 미니 주식 ----------

  private stockData: { stocks: Record<string, StockState>; gold: number } | null = null;

  /** 시세·보유 갱신 (GameScene가 라운드 틱·매매 후 호출) — 패널이 열려 있을 때만 다시 그린다 */
  stocksRender(stocks: Record<string, StockState>, gold: number): void {
    this.stockData = { stocks, gold };
    const panel = document.getElementById("stocks-panel");
    if (panel && panel.style.display === "flex") this.renderStockRows();
  }

  private renderStockRows(): void {
    if (!this.stockData) return;
    const { stocks, gold } = this.stockData;
    const rows = document.getElementById("stock-rows")!;
    rows.innerHTML = STOCKS.map((def) => {
      const st = stocks[def.id];
      const prev = st.history.length > 1 ? st.history[st.history.length - 2] : st.price;
      const chg = ((st.price - prev) / prev) * 100;
      // 한국식 색: 상승 빨강 / 하락 파랑
      const chgColor = chg > 0 ? "#e25b5b" : chg < 0 ? "#5b8de2" : "#8f96a3";
      const profit = st.shares > 0 ? Math.round((st.price - st.avgCost) * st.shares) : 0;
      const profitColor = profit >= 0 ? "#e25b5b" : "#5b8de2";
      return `
        <div class="srow">
          <div class="sname">${def.icon} ${def.name}<br>
            <span style="font-weight:400;color:#8f96a3;font-size:11px">${def.desc}</span></div>
          <div style="width:64px;text-align:right"><b>${st.price}G</b><br>
            <span style="color:${chgColor};font-size:12px">${chg >= 0 ? "+" : ""}${chg.toFixed(0)}%</span></div>
          <div class="schart">${sparkline(st.history)}</div>
          <div style="flex:1;text-align:right;font-size:12px;color:#b8bcc4">${st.shares}주${
            st.shares > 0
              ? `<br><span style="color:${profitColor}">${profit >= 0 ? "+" : ""}${profit}G</span>`
              : ""
          }</div>
          <button class="sbtn" data-t="${def.id}:1" ${gold < st.price ? "disabled" : ""}>매수</button>
          <button class="sbtn" data-t="${def.id}:5" ${gold < st.price * 5 ? "disabled" : ""}>×5</button>
          <button class="sbtn" data-t="${def.id}:-999" ${st.shares === 0 ? "disabled" : ""}>전량 매도</button>
        </div>
      `;
    }).join("");
    rows.querySelectorAll<HTMLButtonElement>("[data-t]").forEach((b) => {
      b.addEventListener("click", () => {
        const [id, n] = b.dataset.t!.split(":");
        this.onStockTrade(id, Number(n));
      });
    });
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

  /** 🎰 뽑기 컷인 — 특별함+ 등급 연출. nearMiss = 한 등급 위 색이 스쳤다 떨어지는 연출 (확률 왜곡 없음) */
  gachaCutIn(grade: Grade, name: string, nearMiss?: Grade): void {
    const show = (g: Grade, final: boolean) => {
      const color = GRADE_COLOR_CSS[g];
      const big = final && (g === "legendary" || g === "transcendent");
      const el = document.createElement("div");
      el.style.cssText = `
        position:fixed;inset:0;pointer-events:none;z-index:60;
        display:flex;align-items:center;justify-content:center;
        background:radial-gradient(circle at 50% 45%, ${color}${big ? "55" : "30"} 0%, transparent ${big ? "62%" : "40%"});
        transition:opacity .3s`;
      if (final) {
        const label = document.createElement("div");
        label.style.cssText = `
          font-weight:900;color:${color};text-shadow:0 0 18px ${color};
          font-size:${big ? 44 : 26}px;transform:scale(.7);transition:transform .18s`;
        label.textContent = `[${GRADE_NAME[g]}] ${name}`;
        el.appendChild(label);
        requestAnimationFrame(() => (label.style.transform = "scale(1)"));
      }
      document.body.appendChild(el);
      window.setTimeout(() => {
        el.style.opacity = "0";
        window.setTimeout(() => el.remove(), 320);
      }, final ? (big ? 900 : 550) : 200);
    };
    if (nearMiss) {
      show(nearMiss, false); // 스치는 상위 색
      window.setTimeout(() => show(grade, true), 230);
    } else {
      show(grade, true);
    }
  }

  /**
   * sameCount: 전설 유닛이면 필드 위 전설 유닛 수 — 전설 2기(종류 무관)로 초월 합성.
   * combos: 흔함 유닛이면 이 유닛이 재료인 조합법 목록 (가능한 조합은 빛나고 클릭 = 조합)
   */
  unitInfo(
    unit: UnitDef | null,
    sameCount: number,
    combos: ComboRow[] = [],
    activeCdLeft = 0 // ⚡ 액티브 남은 쿨다운(초) — 선택 시점 기준 표시용
  ): void {
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
    const bust = bustHtml(unit.id, 96);
    el.innerHTML = `
      ${bust ? `<div style="text-align:center;margin-bottom:4px">${bust}</div>` : ""}
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
      ${skillsHtml(unit.id)}
      ${
        skillsOf(unit.id).some((s) => s.kind === "active")
          ? `<button class="big" id="h-active">⚡ ${
              skillsOf(unit.id).find((s) => s.kind === "active")!.name
            }${activeCdLeft > 0 ? ` (${activeCdLeft}초)` : ""}</button>`
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
                      <span>${matsHtml(r.key, r.mats)}</span>
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
    el.querySelector("#h-active")?.addEventListener("click", this.onActive);
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
            <span>${matsHtml(r.key, r.mats)}</span>
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
    onTitle: () => void,
    extra?: { endlessRound?: number; onEndless?: () => void } // ♾ 무한 모드
  ): void {
    this.els["h-rtitle"].textContent = extra?.endlessRound
      ? `♾ 무한 기록 ${extra.endlessRound}R`
      : win
        ? "승리"
        : "패배";
    this.els["h-rdesc"].textContent = desc;
    const retry = this.els["h-retry"] as HTMLButtonElement;
    retry.onclick = onRetry;
    (document.getElementById("h-totitle") as HTMLButtonElement).onclick = onTitle;
    // 승리(40R) 시에만: 무한 모드 계속하기
    document.getElementById("h-endless")?.remove();
    if (extra?.onEndless) {
      const btn = document.createElement("button");
      btn.className = "big";
      btn.id = "h-endless";
      btn.textContent = "♾ 무한 모드 — 계속 싸운다";
      btn.onclick = () => {
        this.els["result"].style.display = "none";
        extra.onEndless!();
      };
      this.els["result"].querySelector("p")!.after(btn);
    }
    this.els["result"].style.display = "flex";
  }

  destroy(): void {
    if (this.msgTimer !== undefined) window.clearTimeout(this.msgTimer);
    this.root.innerHTML = "";
  }
}
