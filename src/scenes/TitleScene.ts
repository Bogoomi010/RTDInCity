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
    start.on("