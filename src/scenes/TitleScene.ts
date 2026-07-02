import Phaser from "phaser";
import { GAME_H, GAME_W } from "../data/config";
import { sfx } from "../core/sfx";
import { loadRecords } from "../core/save";
import { settingsUI } from "../ui/settings";

export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  create(): void {
    const cx = GAME_W / 2;

    this.add
      .text(cx, GAME_H * 0.32, "랜덤 조합 디펜스", {
        fontSize: "64px",
        fontStyle: "bold",
        color: "#e8eaed",
        fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, GAME_H * 0.44, "in City", {
        fontSize: "36px",
        color: "#ffd166",
        fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
      })
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        GAME_H * 0.62,
        "무작위로 뽑히는 도시 수비대를 조합해\n40라운드 동안 도시를 지켜내세요",
        {
          fontSize: "20px",
          color: "#b8bcc4",
          align: "center",
          fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
        }
      )
      .setOrigin(0.5);

    const start = this.add
      .text(cx, GAME_H * 0.78, "▶ 게임 시작", {
        fontSize: "30px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#2f6fed",
        padding: { x: 28, y: 14 },
        fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    start.on("pointerover", () => start.setBackgroundColor("#4681f4"));
    start.on("pointerout", () => start.setBackgroundColor("#2f6fed"));
    start.on("pointerdown", () => {
      sfx.init();
      this.scene.start("game");
    });

    const records = this.add
      .text(cx, GAME_H * 0.9, "기록 불러오는 중...", {
        fontSize: "16px",
        color: "#b8bcc4",
        fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
      })
      .setOrigin(0.5);

    void loadRecords().then((r) => {
      records.setText(
        `최고 라운드 ${r.bestRound} · 승리 ${r.wins} · 플레이 ${r.plays}`
      );
    });

    const settings = this.add
      .text(GAME_W - 36, 32, "⚙", {
        fontSize: "28px",
        color: "#e8eaed",
        fontFamily: '"Segoe UI", "Malgun Gothic", sans-serif',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    settings.on("pointerover", () => settings.setColor("#ffd166"));
    settings.on("pointerout", () => settings.setColor("#e8eaed"));
    settings.on("pointerdown", () => settingsUI.open());
  }
}
