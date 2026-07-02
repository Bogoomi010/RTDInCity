import { loadSettings, saveSettings, type Settings } from "../core/save";
import { setFullscreen } from "../core/platform";
import { sfx } from "../core/sfx";

/** 설정 오버레이 — #ui(씬마다 재생성)와 분리된 전역 DOM */
export class SettingsUI {
  private root: HTMLElement | null = null;
  private settings: Settings = { volume: 0.5, fullscreen: false };

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
      <div class="spanel">
        <h2>⚙ 설정</h2>
        <label class="srow">
          볼륨
          <input type="range" id="set-vol" min="0" max="100" value="${Math.round(this.settings.volume * 100)}" />
        </label>
        <button class="big" id="set-fs">전체화면 전환</button>
        <button class="big" id="set-close" style="background:#3a4152">닫기</button>
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

  open(): void {
    this.build();
    const vol = this.root!.querySelector<HTMLInputElement>("#set-vol")!;
    vol.value = String(Math.round(this.settings.volume * 100));
    this.root!.style.display = "flex";
  }

  close(): void {
    if (this.root) this.root.style.display = "none";
  }
}

export const settingsUI = new SettingsUI();
