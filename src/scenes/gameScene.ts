import { Scene } from "phaser";
import { dataKeys, depth, game, keys, scenes } from "../constants";
import { setBackground } from "../utils/layout";
import LayeredMusic from "../components/layeredMusic";
import assets, { ButtonColor, Icon } from "../assets";
import { HeartRow } from "../components/heartRow";
import Sword from "../components/sword";
import Enemy, { Events as EnemyEvents } from "../components/enemy";
import SpawnManager from "../components/spawner/spawnManager";
import waves, { waveMusics } from "../data/waveData";
import ScoreText from "../components/scoreText";
import SpawnText from "../components/spawner/spawnText";
import ProgressBar from "../components/gameProgressBar";
import { createIconButton } from "../components/button";
import { playRandomPitch, playSound } from "../utils/sound";
import { randomElement } from "../utils/math";
import {
  emitBloodEffect,
  initializeParticlePool,
} from "../components/bloodParticle";

export default class GameScene extends Scene {
  private sword!: Sword;
  private hearts!: HeartRow;
  private music!: LayeredMusic;
  private score!: ScoreText;
  private spawnText!: SpawnText;

  constructor() {
    super({ key: scenes.game });
  }

  create(): void {
    const bgr = this.add.image(0, 0, keys.background);
    setBackground(bgr, this.cameras.main);

    this.music = new LayeredMusic(this, Object.keys(assets.music.game))
      .setVolume(this.registry.get(dataKeys.musicLevel) ?? 1)
      .setLayers([0, 1])
      .play();

    this.hearts = new HeartRow(this, game.playerHealth).setScale(2);
    this.positionHearts(this.hearts);

    this.sword = new Sword(this).setDepth(1);

    this.score = new ScoreText(this, this.sword.x, this.hearts.y + 150);

    this.spawnText = new SpawnText(this);

    const onBossSpawn = () => this.music.setLayers("all");
    const onBossCutscene = () => this.music.setLayers([0]);

    const spawner = new SpawnManager(
      this,
      waves,
      this.onNewEnemy.bind(this),
      this.onNewWave.bind(this),
      this.switchToGameOver.bind(this, { won: true }),
      onBossSpawn,
      onBossCutscene
    );

    const bar = new ProgressBar(
      this,
      spawner.getTotalGameTime(),
      keys.swordUi,
      this.scale.width * 0.8,
      30,
      0.5,
      1.5
    ).startTimer();
    bar.copyPosition(this.sword).y += 170;

    const pauseButton = createIconButton(
      this,
      { texture: Icon.pause, scale: 0.5 },
      () => {
        this.scene.launch(scenes.pause);
        this.scene.pause();
        this.music.pause();
        this.scene
          .get(scenes.pause)
          .events.once("shutdown", this.music.resume, this.music);
      },
      ButtonColor.pink,
      0.4
    );
    pauseButton.setPosition(this.scale.width - 80, 80).setDepth(depth.ui);

    initializeParticlePool(this);

    this.setupSceneEvents();
  }

  private positionHearts(hearts: HeartRow): void {
    const camera = this.cameras.main;
    hearts.setPosition(camera.centerX, camera.y + 50);
  }

  private onNewEnemy(enemy: Enemy) {
    enemy
      .on(EnemyEvents.hit, this.onEnemyHit, this)
      .on(EnemyEvents.defended, this.sword.onAttackingEnemyHit, this.sword)
      .on(EnemyEvents.attackFrameStarted, this.onPlayerAttacked, this)
      .on(EnemyEvents.dead, this.onEnemyKilled, this);
  }

  private onEnemyKilled(enemy: Enemy): void {
    this.score.increase(enemy.getPoint());
  }

  private onEnemyHit(enemy: Enemy) {
    const { x, y } = enemy;
    this.sword.onEnemyHit();
    emitBloodEffect(x, y);
  }

  private onPlayerAttacked(damage: number): void {
    playRandomPitch(
      this,
      randomElement([assets.sfx.hurt1.name, assets.sfx.hurt2.name])!
    );
    const tryDecrease = this.hearts.decrease(damage);
    if (tryDecrease === false) {
      return;
    }
    this.cameras.main.shake(200, 0.01);
    const zeroHealth = this.hearts.getRemainingHearts() === 0;
    if (zeroHealth) {
      this.onZeroHealth();
    }
  }

  private onZeroHealth(): void {
    this.cameras.main.postFX.addVignette(0.5, 0.5, 0.9);
    this.cameras.main.postFX.add;
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.05,
      duration: 2000,
      ease: "Power1",
      onComplete: this.switchToGameOver.bind(this, { won: false }),
    });
    this.anims.globalTimeScale = 0;
  }

  private onNewWave(waveNumber: number, overrideName?: string) {
    this.spawnText.showWave(waveNumber, overrideName);
    this.music.setLayers((waveMusics as any)[waveNumber]);
  }

  private setupSceneEvents(): void {
    this.events.on("shutdown", () => this.music.destroy());
    this.events.on("shutdown", () => (this.anims.globalTimeScale = 1));
  }

  private switchToGameOver({ won }: { won: boolean }) {
    if (won) {
      playSound(this, assets.sfx.victory.name);
    } else {
      playSound(this, assets.sfx.gameOver.name);
    }

    this.cameras.main.postFX.addBlur(0, 4, 4, 0.7);

    const gameOverScene = this.scene.get(scenes.gameOver);
    gameOverScene.data
      .set(dataKeys.score, this.score.getScore())
      .set(dataKeys.won, won);
    this.scene.launch(scenes.gameOver);
    this.scene.pause();
  }
}
