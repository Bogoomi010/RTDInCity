import { allComboKeys, COMBO_TOTAL, comboResult } from "../data/combos";
import { UNIT_BY_ID } from "../data/units";
import { loadDex } from "../core/save";

/** 도감 모달 — 타이틀 화면 전용. 발견한 조합은 이름, 미발견은 ??? */
export function openDex(): void {
  document.getElementById("dex")?.remove(); // 중복 생성 가드
  const root = document.getElementById("ui")!;
  const el = document.createElement("div");
  el.id = "dex";
  el.style.display = "flex";
  el.innerHTML = `
    <div class="dpanel">
      <h2>📘 도감 <span id="h-dexcount">…</span></h2>
      <div id="dexlist">불러오는 중…</div>
      <button class="big" id="h-dexclose">닫기</button>
    </div>
  `;
  root.appendChild(el);
  el.querySelector("#h-dexclose")!.addEventListener("click", () => el.remove());

  void loadDex().then((found) => {
    const dex = new Set(found);
    el.querySelector("#h-dexcount")!.textContent = `${dex.size}/${COMBO_TOTAL}`;
    el.querySelector("#dexlist")!.innerHTML = allComboKeys()
      .map((key) => {
        const ids = key.split("+");
        const known = dex.has(key);
        return `
          <div class="drow">
            <b class="${known ? "have" : "lack"}">${known ? comboResult(ids).name : "???"}</b>
            <span>${ids.map((i) => UNIT_BY_ID[i].name).join(" + ")}</span>
          </div>
        `;
      })
      .join("");
  });
}
