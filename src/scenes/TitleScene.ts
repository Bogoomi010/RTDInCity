import Phaser from "phaser";
import { GAME_H, GAME_W } from "../data/config";
import { sfx } from "../core/sfx";
import { loadRecords } from "../core/save";
import { settingsUI } from "../ui/settings";
import { openDeckSelect } from "../ui/deckselect";
import { openDex } from "../ui/dex";

const FONT = '"Segoe UI", "Malgun Gothic", sans-serif';
const P = 4; // 픽셀 단위 — 배경은 전부 이 크기의 사각형으로만 그린다

/** 거리 위를 지나가는 픽셀 몹 */
interface Walker {
  obj: Phaser.GameObjects.Rectangle;
  speed: number;
  baseY: number;
  phase: number;
}

export class TitleScene extends Phaser.Scene {
  private walkers: Walker[] = [];

  constructor() {
    super("title");
  }

  create(): void {
    this.walkers = [];
    this.drawTown();
    this.drawTitle();
    this.drawMenu();
    this.drawRecords();
  }

  update(t: number, delta: number): void {
    for (const w of this.walkers) {
      w.obj.x += (w.speed * delta) / 1000;
      if (w.obj.x > GAME_W + 20) w.obj.x = -20;
      // 픽셀 단위로 총총 뛰는 느낌 (반올림으로 계단식 이동)
      w.obj.y = w.baseY + Math.round(Math.sin(t / 130 + w.phase)) * 2;
    }
  }

  // ---------- 배경: 한낮의 픽셀 도시 ----------

  private drawTown(): void {
    const g = this.add.graphics();

    // 맑은 하늘 (플랫 블루 + 지평선 쪽 밝은 띠)
    g.fillStyle(0x58b4f0, 1);
    g.fillRect(0, 0, GAME_W, 440);
    g.fillStyle(0x8ed0f7, 1);
    g.fillRect(0, 360, GAME_W, 80);

    // 해
    this.sun(g, 96, 84);

    // 구름
    this.cloud(g, 260, 70, 1.4);
    this.cloud(g, 640, 120, 1);
    this.cloud(g, 980, 60, 1.7);
    this.cloud(g, 1180, 150, 0.9);

    // 뒷줄 — 멀리 보이는 옅은 건물들
    let x = -8;
    while (x < GAME_W) {
      const w = (16 + Math.floor(Math.random() * 10)) * P;
      const h = (14 + Math.floor(Math.random() * 12)) * P;
      g.fillStyle(0xc4d6e6, 1);
      g.fillRect(x, 440 - h, w, h);
      g.fillStyle(0xa8bdd2, 1);
      g.fillRect(x - P, 440 - h - P * 2, w + P * 2, P * 2);
      x += w + P * 2;
    }

    // 앞줄 — 지붕 있는 픽셀 집들 + 가로수
    const roofs = [0xd9534f, 0x3f5b9e, 0x4caf50, 0x8a5a44, 0xd9534f, 0x3f5b9e];
    const walls = [0xfff4e0, 0xffffff, 0xdff1ff, 0xfff4e0, 0xffffff, 0xdff1ff];
    x = 8;
    let i = 0;
    while (x < GAME_W - 40) {
      const w = (22 + Math.floor(Math.random() * 12)) * P;
      const h = (20 + Math.floor(Math.random() * 10)) * P;
      this.house(g, x, 568, w, h, walls[i % 6], roofs[i % 6]);
      x += w + P * 4;
      if (i % 2 === 1 && x < GAME_W - 60) {
        this.tree(g, x, 568);
        x += P * 8;
      }
      i++;
    }

    // 인도 (타일 줄눈)
    g.fillStyle(0xd7d2c8, 1);
    g.fillRect(0, 568, GAME_W, P * 6);
    g.fillStyle(0xc2bcb0, 1);
    for (let tx = 0; tx < GAME_W; tx += P * 10) g.fillRect(tx, 568, P, P * 6);

    // 도로 + 중앙선 + 횡단보도
    g.fillStyle(0xb9bec6, 1);
    g.fillRect(0, 592, GAME_W, P * 22);
    g.fillStyle(0xffffff, 1);
    for (let lx = 0; lx < GAME_W; lx += P * 16) g.fillRect(lx, 592 + P * 10, P * 8, P);
    for (let cx = 150; cx < 150 + P * 26; cx += P * 4) g.fillRect(cx, 592 + P * 2, P * 2, P * 18);

    // 아래쪽 인도
    g.fillStyle(0xd7d2c8, 1);
    g.fillRect(0, 680, GAME_W, GAME_H - 680);
    g.fillStyle(0xc2bcb0, 1);
    for (let tx = P * 5; tx < GAME_W; tx += P * 10) g.fillRect(tx, 680, P, GAME_H - 680);

    // 거리를 지나는 하찮은 것들 (몹 색 + 황금 비둘기 1)
    const colors = [0x9e9e9e, 0x81d4fa, 0x8bc34a, 0x9e9e9e, 0x81d4fa, 0x8bc34a, 0xffd700];
    colors.forEach((c, k) => {
      const gold = c === 0xffd700;
      const baseY = 612 + (k % 3) * 20;
      const obj = this.add
        .rectangle(Math.random() * GAME_W, baseY, gold ? 10 : 14, gold ? 10 : 14, c)
        .setStrokeStyle(2, 0x2b3140, 0.9);
      this.walkers.push({
        obj,
        speed: 24 + Math.random() * 36 + (gold ? 70 : 0),
        baseY,
        phase: k * 1.3,
      });
    });
  }

  private house(
    g: Phaser.GameObjects.Graphics,
    x: number,
    ground: number,
    w: number,
    h: number,
    wall: number,
    roof: number
  ): void {
    g.fillStyle(wall, 1);
    g.fillRect(x, ground - h, w, h);
    // 계단형 지붕
    g.fillStyle(roof, 1);
    g.fillRect(x - P * 2, ground - h - P * 3, w + P * 4, P * 3);
    g.fillRect(x + P, ground - h - P * 6, w - P * 2, P * 3);
    // 창문 (하늘색 + 진한 창틀)
    for (let wx = x + P * 2; wx < x + w - P * 4; wx += P * 6) {
      for (let wy = ground - h + P * 3; wy < ground - P * 8; wy += P * 8) {
        g.fillStyle(0x2b3140, 1);
        g.fillRect(wx, wy, P * 4, P * 4);
        g.fillStyle(0x9adcf5, 1);
        g.fillRect(wx + 1, wy + 1, P * 4 - 2, P * 4 - 2);
      }
    }
    // 문
    g.fillStyle(0x8a5a44, 1);
    g.fillRect(x + Math.floor(w / 2 / P) * P - P * 2, ground - P * 7, P * 4, P * 7);
  }

  private tree(g: Phaser.GameObjects.Graphics, x: number, ground: number): void {
    g.fillStyle(0x7a5230, 1);
    g.fillRect(x + P * 2, ground - P * 6, P * 2, P * 6);
    g.fillStyle(0x58b368, 1);
    g.fillRect(x, ground - P * 14, P * 6, P * 8);
    g.fillRect(x + P, ground - P * 16, P * 4, P * 2);
    g.fillStyle(0x46945a, 1);
    g.fillRect(x + P, ground - P * 8, P * 4, P * 2);
  }

  private cloud(g: Phaser.GameObjects.Graphics, x: number, y: number, s: number): void {
    g.fillStyle(0xffffff, 0.95);
    g.fillRect(x, y, P * 14 * s, P * 4);
    g.fillRect(x + P * 3 * s, y - P * 3, P * 8 * s, P * 3);
    g.fillRect(x + P * 2 * s, y + P * 4, P * 10 * s, P * 2);
  }

  private sun(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.fillStyle(0xffe07a, 1);
    g.fillRect(x - P * 4, y - P * 6, P * 8, P * 12);
    g.fillRect(x - P * 6, y - P * 4, P * 12, P * 8);
    g.fillStyle(0xffd14d, 1);
    g.fillRect(x - P * 3, y - P * 3, P * 6, P * 6);
  }

  // ---------- 타이틀 (작게 렌더 → 확대 = 도트 글꼴 느낌) ----------

  private drawTitle(): void {
    const cx = GAME_W / 2;

    const title = this.add
      .text(cx, 128, "랜덤 조합 디펜스", {
        fontSize: "19px",
        fontStyle: "bold",
        color: "#ffffff",
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setStroke("#2b3a6b", 5)
      .setShadow(0, 2, "#1c2440", 0, true, true)
      .setScale(4);

    const sub = this.add
      .text(cx, 196, "in City", {
        fontSize: "14px",
        fontStyle: "bold italic",
        color: "#ffd14d",
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setStroke("#a03c3c", 4)
      .setScale(4);

    this.tweens.add({
      targets: [title, sub],
      y: "+=4",
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.add
      .text(cx, 252, " 돌멩이와 비둘기와 쓰레기로부터 도시를 지켜라 ", {
        fontSize: "9px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#3f5b9e",
        padding: { x: 6, y: 3 },
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setScale(2);
  }

  // ---------- 메뉴 (흰 상자 + 두꺼운 테두리) ----------

  private menuButton(y: number, label: string, primary: boolean, onClick: () => void): void {
    const w = primary ? 264 : 216;
    const h = primary ? 58 : 46;
    const box = this.add
      .rectangle(GAME_W / 2, y, w, h, 0xffffff)
      .setStrokeStyle(P, primary ? 0x3f5b9e : 0x5a6478)
      .setInteractive({ useHandCursor: true });
    // 픽셀 그림자
    this.add.rectangle(GAME_W / 2 + P, y + P, w, h, 0x1c2440, 0.25).setDepth(box.depth - 1);
    box.setDepth(1);

    // 텍스트는 인터랙티브로 만들지 않는다 — Phaser는 인터랙티브 객체만 히트 테스트하므로
    // 상자 하나로 충분하고, 양쪽에 걸면 클릭이 두 번 발생해 오버레이가 겹겹이 쌓인다
    this.add
      .text(GAME_W / 2, y, label, {
        fontSize: primary ? "13px" : "11px",
        fontStyle: "bold",
        color: primary ? "#2b3a6b" : "#3a4152",
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setScale(3)
      .setDepth(2);

    box.on("pointerover", () => box.setFillStyle(0xfff4c8));
    box.on("pointerout", () => box.setFillStyle(0xffffff));
    box.on("pointerdown", onClick);
  }

  private drawMenu(): void {
    this.menuButton(388, "▶ 출격", true, () => {
      sfx.init();
      openDeckSelect((deck) => this.scene.start("game", { deck }));
    });
    this.menuButton(456, "도감", false, () => openDex());
    this.menuButton(516, "설정", false, () => settingsUI.open());
  }

  // ---------- 기록 ----------

  private drawRecords(): void {
    const records = this.add
      .text(GAME_W / 2, 656, "", {
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        backgroundColor: "#2b3140",
        padding: { x: 8, y: 4 },
        fontFamily: FONT,
      })
      .setOrigin(0.5)
      .setScale(2)
      .setDepth(2);

    void loadRecords().then((r) => {
      records.setText(
        ` 🏆 최고 라운드 ${r.bestRound} · 승리 ${r.wins} · 플레이 ${r.plays} `
      );
    });

    this.add
      .text(GAME_W - 10, GAME_H - 8, "v0.1.0", {
        fontSize: "9px",
        color: "#6b7078",
        fontFamily: FONT,
      })
      .setOrigin(1, 1)
      .setScale(2);
  }
}
