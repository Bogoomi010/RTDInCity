import Phaser from "phaser";
import { GAME_H, GAME_W } from "./data/config";
import { BootScene } from "./scenes/BootScene";
import { TitleScene } from "./scenes/TitleScene";
import { GameScene } from "./scenes/GameScene";
import { settingsUI } from "./ui/settings";

void settingsUI.init();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#12151c",
  pixelArt: true, // 도트 감성 — 확대 시 네모 픽셀 유지 (텍스처 스무딩 끔)
  // DOM 오버레이(덱 선택·도감 등) 위의 클릭이 window 이벤트로 Phaser 버튼까지
  // 뚫고 들어가는 것을 차단 — 캔버스에서 시작된 입력만 처리한다
  input: { windowEvents: false },
  scene: [BootScene, TitleScene, GameScene],
});

// 창 크기에 맞춰 1280x720 전체(#wrap: 캔버스 + DOM UI)를 스케일
function fitToWindow(): void {
  const wrap = document.getElementById("wrap")!;
  const s = Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H);
  const tx = (window.innerWidth - GAME_W * s) / 2;
  const ty = (window.innerHeight - GAME_H * s) / 2;
  wrap.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  // CSS transform 이후 포인터 좌표 보정을 위해 Phaser에 캔버스 경계 갱신을 알림
  game.scale.updateBounds();
}

fitToWindow();
window.addEventListener("resize", fitToWindow);
