import { HIDDEN_IDS, NORMAL_COMMON_IDS } from "../data/combos";
import { UNIT_BY_ID } from "../data/units";
import { DIFFICULTY_DEFS, type Difficulty } from "../data/waves";
import { bustHtml } from "../data/art";

/**
 * 캐릭터 선택 화면 느낌의 출격 덱 선택.
 * 버스트 에셋(UNIT_ART)이 있으면 그걸 쓰고, 없으면 유닛별 고유 도형(SVG) 폴백.
 */

/** 버스트 이미지 우선, 없으면 도형 폴백 */
function charVisual(id: string, size: number): string {
  return bustHtml(id, size) ?? shapeSvg(id, size);
}

/** 유닛 → 도형 실루엣 (색 + 형태로 개성 표현) */
function shapeSvg(id: string, size: number): string {
  const s = (body: string) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 100 100">
       <ellipse cx="50" cy="92" rx="30" ry="6" fill="#000" opacity="0.3"/>
       ${body}
     </svg>`;
  switch (id) {
    case "dv1": // 배달 라이더 — 바퀴(원)
      return s(`<circle cx="50" cy="52" r="32" fill="#ff8f3c"/>
                <circle cx="50" cy="52" r="14" fill="#c9641d"/>`);
    case "pc1": // 신입 경관 — 방패(사각)
      return s(`<rect x="22" y="24" width="56" height="56" rx="8" fill="#3f6fd1"/>
                <rect x="40" y="40" width="20" height="24" fill="#ffd14d"/>`);
    case "sn1": // 새총 명수 — 삼각
      return s(`<polygon points="50,16 84,82 16,82" fill="#5cb85c"/>
                <circle cx="50" cy="60" r="9" fill="#2c6e2c"/>`);
    case "dr1": // 드론 동호회원 — 마름모(프로펠러)
      return s(`<polygon points="50,14 86,52 50,90 14,52" fill="#42c7e8"/>
                <circle cx="50" cy="52" r="10" fill="#0f7d99"/>`);
    case "dm1": // 공사장 인부 — 오각형(안전모)
      return s(`<polygon points="50,14 86,42 72,84 28,84 14,42" fill="#f2b433"/>
                <rect x="34" y="52" width="32" height="10" fill="#a86e12"/>`);
    case "tf1": // 공원 관리인 — 육각형(잔디)
      return s(`<polygon points="30,20 70,20 90,52 70,84 30,84 10,52" fill="#4caf7d"/>
                <circle cx="50" cy="52" r="11" fill="#1f6b47"/>`);
    case "fl1": // 전단지 알바 — 종이(직사각)
      return s(`<rect x="26" y="20" width="48" height="62" rx="4" fill="#f4f1e6"/>
                <rect x="34" y="32" width="32" height="5" fill="#9aa0a6"/>
                <rect x="34" y="44" width="32" height="5" fill="#9aa0a6"/>
                <rect x="34" y="56" width="20" height="5" fill="#9aa0a6"/>`);
    case "fb1": // 붕어빵 사장 — 반원(붕어빵)
      return s(`<path d="M14 70 A36 36 0 0 1 86 70 Z" fill="#d99a4e"/>
                <circle cx="38" cy="58" r="5" fill="#7a4a1d"/>
                <circle cx="62" cy="58" r="5" fill="#7a4a1d"/>`);
    case "hp1": // 닭둘기 — 통통한 원 + 부리
      return s(`<circle cx="48" cy="54" r="30" fill="#b8bec9"/>
                <polygon points="76,50 90,54 76,60" fill="#f2b433"/>
                <circle cx="60" cy="46" r="4" fill="#22262e"/>`);
    case "hc1": // 골목대장 냥이 — 귀 달린 삼각 머리
      return s(`<polygon points="26,34 36,16 46,32" fill="#4a4f5c"/>
                <polygon points="54,32 64,16 74,34" fill="#4a4f5c"/>
                <circle cx="50" cy="56" r="28" fill="#4a4f5c"/>
                <circle cx="40" cy="52" r="4" fill="#ffd14d"/>
                <circle cx="60" cy="52" r="4" fill="#ffd14d"/>`);
    default:
      return s(`<circle cx="50" cy="52" r="30" fill="#9aa0a6"/>`);
  }
}

export function openDeckSelect(
  onStart: (deck: string[], difficulty: Difficulty) => void
): void {
  document.getElementById("deck")?.remove(); // 중복 생성 가드
  const root = document.getElementById("ui")!;
  const el = document.createElement("div");
  el.id = "deck";
  const picked: string[] = []; // 선택 순서 유지 → 파티 슬롯에 순서대로
  let difficulty: Difficulty = "normal";

  el.innerHTML = `
    <div class="dkpanel">
      <button class="dkclose" id="dk-close" title="뒤로가기">✕</button>
      <h2>출격 대원 선택</h2>
      <div class="dksub">거리의 흔한 이웃들 — 3명과 함께 출격한다</div>
      <div class="dkstage">
        ${NORMAL_COMMON_IDS.map((id) => {
          const u = UNIT_BY_ID[id];
          return `
            <button class="dkchar" data-id="${id}">
              <div class="dkshape">${charVisual(id, 76)}</div>
              <div class="dkname">${u.name}</div>
            </button>
          `;
        }).join("")}
      </div>
      <div class="dkbottom">
        <div class="dkparty" id="dk-party"></div>
        <div class="dkinfo" id="dk-info">대원을 클릭해 파티에 넣으세요</div>
      </div>
      <div class="dkdiff">
        ${(Object.keys(DIFFICULTY_DEFS) as Difficulty[])
          .map(
            (d) => `
              <button class="dkdbtn ${d === "normal" ? "on" : ""}" data-diff="${d}"
                title="${DIFFICULTY_DEFS[d].desc}">
                ${DIFFICULTY_DEFS[d].name}
              </button>
            `
          )
          .join("")}
        <span class="dkddesc" id="dk-ddesc">${DIFFICULTY_DEFS.normal.desc}</span>
      </div>
      <button class="big" id="dk-start" disabled>대원 3명을 선택하세요</button>
    </div>
  `;
  root.appendChild(el);

  const startBtn = el.querySelector<HTMLButtonElement>("#dk-start")!;
  const party = el.querySelector<HTMLElement>("#dk-party")!;
  const info = el.querySelector<HTMLElement>("#dk-info")!;

  const renderParty = (): void => {
    const slots: string[] = [];
    for (let i = 0; i < 3; i++) {
      slots.push(
        picked[i]
          ? `<div class="dkslot filled">${charVisual(picked[i], 40)}</div>`
          : `<div class="dkslot">?</div>`
      );
    }
    for (const hid of HIDDEN_IDS) {
      slots.push(
        `<div class="dkslot hiddenslot" title="${UNIT_BY_ID[hid].name} — 뽑기에서 낮은 확률로 등장">
           ${charVisual(hid, 40)}<span>✨</span>
         </div>`
      );
    }
    party.innerHTML = slots.join("");
    startBtn.disabled = picked.length !== 3;
    startBtn.textContent =
      picked.length === 3 ? "▶ 출격!" : `대원 3명을 선택하세요 (${picked.length}/3)`;
  };

  const showInfo = (id: string): void => {
    const u = UNIT_BY_ID[id];
    info.innerHTML = `
      <b>${u.name}</b><br>
      공격 ${u.atk} · 사거리 ${u.range} · 주기 ${u.cooldown}s
      ${u.desc ? `<br><span class="dkdesc">${u.desc}</span>` : ""}
    `;
  };

  el.querySelectorAll<HTMLButtonElement>(".dkchar").forEach((btn) => {
    const id = btn.dataset.id!;
    btn.addEventListener("mouseenter", () => showInfo(id));
    btn.addEventListener("click", () => {
      const i = picked.indexOf(id);
      if (i >= 0) {
        picked.splice(i, 1);
        btn.classList.remove("on");
      } else if (picked.length < 3) {
        picked.push(id);
        btn.classList.add("on");
      } else {
        // 파티가 가득 찬 상태 — 무반응 대신 안내
        info.innerHTML = `<b>파티가 가득 찼습니다</b><br>먼저 선택된 대원을 클릭해 빼주세요`;
        renderParty();
        return;
      }
      showInfo(id);
      renderParty();
    });
  });

  el.querySelectorAll<HTMLButtonElement>(".dkdbtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      difficulty = btn.dataset.diff as Difficulty;
      el.querySelectorAll(".dkdbtn").forEach((b) => b.classList.remove("on"));
      btn.classList.add("on");
      el.querySelector("#dk-ddesc")!.textContent = DIFFICULTY_DEFS[difficulty].desc;
    });
  });

  el.querySelector("#dk-close")!.addEventListener("click", () => el.remove());
  startBtn.addEventListener("click", () => {
    el.remove();
    onStart([...picked], difficulty);
  });

  renderParty();
}
