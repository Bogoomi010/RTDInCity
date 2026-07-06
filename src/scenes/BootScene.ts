import Phaser from "phaser";
import {
  attackKey,
  passiveKey,
  skillAttackKey,
  UNIT_ART,
  WALK_DIRS,
  walkKey,
} from "../data/art";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    // 에셋 파일이 아직 없는 유닛은 경고만 남기고 진행 (레지스트리 선등록 허용)
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn(`[art] 스프라이트 누락: ${file.key} (${file.url})`);
    });
    // 아트 레지스트리에 등록된 유닛 스프라이트 로드
    for (const [id, art] of Object.entries(UNIT_ART)) {
      if (art.attack) {
        this.load.spritesheet(attackKey(id), art.attack.url, {
          frameWidth: art.attack.frameW,
          frameHeight: art.attack.frameH,
        });
      }
      if (art.skillAttack) {
        this.load.spritesheet(skillAttackKey(id), art.skillAttack.url, {
          frameWidth: art.skillAttack.frameW,
          frameHeight: art.skillAttack.frameH,
        });
      }
      if (art.passive) {
        this.load.spritesheet(passiveKey(id), art.passive.url, {
          frameWidth: art.passive.frameW,
          frameHeight: art.passive.frameH,
        });
      }
      if (art.walk) {
        for (const dir of WALK_DIRS) {
          this.load.spritesheet(walkKey(id, dir), art.walk[dir], {
            frameWidth: art.walk.frameW,
            frameHeight: art.walk.frameH,
          });
        }
      }
    }
  }

  create(): void {
    // 애니메이션 등록 (전역 — 씬 재시작에도 유지). 로드 실패한 텍스처는 건너뜀
    for (const [id, art] of Object.entries(UNIT_ART)) {
      if (art.attack && this.textures.exists(attackKey(id))) {
        this.anims.create({
          key: attackKey(id),
          frames: this.anims.generateFrameNumbers(attackKey(id), {
            start: 0,
            end: art.attack.frames - 1,
          }),
          frameRate: art.attack.rate,
          repeat: 0,
        });
      }
      if (art.skillAttack && this.textures.exists(skillAttackKey(id))) {
        this.anims.create({
          key: skillAttackKey(id),
          frames: this.anims.generateFrameNumbers(skillAttackKey(id), {
            start: 0,
            end: art.skillAttack.frames - 1,
          }),
          frameRate: art.skillAttack.rate,
          repeat: 0,
        });
      }
      if (art.passive && this.textures.exists(passiveKey(id))) {
        this.anims.create({
          key: passiveKey(id),
          frames: this.anims.generateFrameNumbers(passiveKey(id), {
            start: 0,
            end: art.passive.frames - 1,
          }),
          frameRate: art.passive.rate,
          repeat: 0,
        });
      }
      if (art.walk) {
        for (const dir of WALK_DIRS) {
          if (!this.textures.exists(walkKey(id, dir))) continue;
          this.anims.create({
            key: walkKey(id, dir),
            frames: this.anims.generateFrameNumbers(walkKey(id, dir), {
              start: 0,
              end: art.walk.frames - 1,
            }),
            frameRate: art.walk.rate,
            repeat: -1,
          });
        }
      }
    }

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
