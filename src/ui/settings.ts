import { loadSettings, saveSettings, type Settings } from "../core/save";
import { setFullscreen } from "../core/platform";
import { sfx } from "../core/sfx";

/** 설정 오버레이 — #ui(씬마다 재생성)와 분리된 전역 DOM */
export class SettingsUI {
  private root: HTMLElement | null = null;
  private settings: Settings = { volume: 0.5, fullscreen: false };
  /** 인게임에서 열릴 때만 주입 — 있으면 포기하기 버튼 노출 */
  private onGiveUp: (() => void) | null = null;

  async init(): Promise<void> {
    this.settings = await loadSettings();
    sfx.setVolume(this.settings.volume);
    this.build();
    // 브라우저는 사용자 입력 없이 풀스크린 불가 → Tauri에서만 자동 복원
    if (this.settings.fullscreen) {
      setFullscreen(true).catch(() => {});
    }
  }

  private build(): void {
    if (this.root) return;
    const el = document.createElement("div");
    el.id = "settings";
    el.innerHTML = `
      <div class="spanel" id="set-main">
        <h2>⚙ 설정</h2>
        <label class="srow">
          볼륨
          <input type="range" id="set-vol" min="0" max="100" value="${Math.round(this.settings.volume * 100)}" />
        </label>
        <button class="big" id="set-fs">전체화면 전환</button>
        <button class="big" id="set-giveup" style="display:none;background:#8c3038">🏳 포기하기</button>
        <button class="big" id="set-close" style="background:#3a4152">닫기</button>
      </div>
      <div class="spanel" id="set-confirm" style="display:none">
        <h2>정말로 포기하시겠습니까?</h2>
        <p style="color:#8f96a3;margin:4px 0 12px">진행 중인 게임을 버리고 메인 화면으로 돌아갑니다.</p>
        <button class="big" id="set-giveup-ok" style="background:#8c3038">확인</button>
        <button class="big" id="set-giveup-cancel" style="background:#3a4152">취소</button>
      </div>
    `;
    document.getElementById("wrap")!.appendChild(el);
    this.root = el;

    const vol = el.querySelector<HTMLInputElement>("#set-vol")!;
    vol.addEventListener("input", () => {
      this.settings.volume = Number(vol.value) / 100;
      sfx.setVolume(this.settings.volume);
    });
    vol.addEventListener("change", () => {
      sfx.gacha(); // 볼륨 미리듣기
      void saveSettings(this.settings);
    });

    el.querySelector("#set-fs")!.addEventListener("click", () => {
      void this.toggleFullscreen();
    });
    el.querySelector("#set-close")!.addEventListener("click", () => this.close());
    // 패널 밖 클릭 시 닫기
    el.addEventListener("click", (e) => {
      if (e.target === el) this.close();
    });

    // 포기하기 — 확인 창으로 재확인 후 실행
    el.querySelector("#set-giveup")!.addEventListener("click", () => {
      this.showConfirm(true);
    });
    el.querySelector("#set-giveup-cancel")!.addEventListener("click", () => {
      this.showConfirm(false);
    });
    el.querySelector("#set-giveup-ok")!.addEventListener("click", () => {
      const cb = this.onGiveUp;
      this.close();
      cb?.();
    });
  }

  /** 설정 패널 ↔ 포기 확인 창 전환 */
  private showConfirm(on: boolean): void {
    this.root!.querySelector<HTMLElement>("#set-main")!.style.display = on ? "none" : "";
    this.root!.querySelector<HTMLElement>("#set-confirm")!.style.display = on ? "" : "none";
  }

  private async toggleFullscreen(): Promise<void> {
    const target = !this.settings.fullscreen;
    try {
      await setFullscreen(target);
      this.settings.fullscreen = target;
      await saveSettings(this.settings);
    } catch {
      // 브라우저 정책 등으로 실패 시 무시
    }
  }

  /** opts.onGiveUp: 인게임 전용 — 전달 시 포기하기 버튼 노출 */
  open(opts: { onGiveUp?: () => void } = {}): void {
    this.build();
    this.onGiveUp = opts.onGiveUp ?? null;
    this.root!.querySelector<HTMLElement>("#set-giveup")!.style.display =
      this.onGiveUp ? "" : "none";
    this.showConfirm(false); // 항상 설정 패널부터
    const vol = this.root!.querySelector<HTMLInputElement>("#set-vol")!;
    vol.value = String(Math.round(this.settings.volume * 100));
    this.root!.style.display = "flex";
  }

  close(): void {
    if (this.root) this.root.style.display = "none";
    this.onGiveUp = null;
  }
}

export const settingsUI = new SettingsUI();
