import Phaser from "phaser";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff);

    g.fillCircle(10, 10, 10);
    g.generateTexture("mob", 20, 20);
    g.clear();

    g.fillStyle(0xffffff);
    g.fillCircle(20, 20, 20);
    g.generateTexture("boss", 40, 40);
    g.clear();

    g.fillStyle(0xffffff);
    g.fillRoundedRect(0, 0, 48, 48, 10);
    g.generateTexture("unit", 48, 48);
    g.destroy();

    this.scene.start("title");
  }
}
