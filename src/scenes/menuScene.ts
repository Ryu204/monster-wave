import { Scene } from "phaser";
import { fonts, keys, scenes, texts } from "../constants";
import { centerOnCamera, setBackground } from "../utils/layout";
import { createIconButton } from "../components/button";
import LayeredMusic from "../components/layeredMusic";
import assets, { Icon } from "../assets";
import { ButtonColor } from "../assets/ui/buttons";
import { Modal } from "../components/modal";
import HighscoreModal from "../components/highscoreModal";
import SettingsModal from "../components/settingsModal";

type ModalType = "settings" | "highscore" | "howToPlay";

export default class MenuScene extends Scene {
  private music!: LayeredMusic;
  private modals!: Record<ModalType, Modal>;

  constructor() {
    super({ key: scenes.menu });
  }

  create(): void {
    const bgr = this.add.image(0, 0, keys.background);
    setBackground(bgr, this.cameras.main);

    this.music = new LayeredMusic(this, Object.keys(assets.music.menu))
      .setLayers("all")
      .play();

    const title = this.add
      .image(this.scale.width / 2, 400, keys.title)
      .setOrigin(0.5);
    title.setScale((this.scale.width * 0.8) / title.width);

    this.modals = this.createModals();
    this.createButtons();
    this.setupSceneEvent();
  }

  private setupSceneEvent(): void {
    this.events.on("wake", () => this.music.play());
    this.events.on("sleep", () => this.music.stop());
  }

  private createButtons(): void {
    const startButton = createIconButton(
      this,
      { texture: Icon.play, scale: 0.5 },
      () => {
        this.scene.switch(scenes.game);
      },
      ButtonColor.yellow
    );
    const settingsButton = createIconButton(
      this,
      { texture: Icon.settings, scale: 0.5 },
      () => {
        this.modals.settings.show();
        this.music.setLayers([0, 2]);
      },
      ButtonColor.purple,
      0.6
    );
    const highscoreButton = createIconButton(
      this,
      { texture: Icon.rankings, scale: 0.5 },
      () => {
        this.modals.highscore.show();
        this.music.setLayers([1, 2]);
      },
      ButtonColor.green,
      0.7
    );
    const howToPlayButton = createIconButton(
      this,
      { texture: Icon.question, scale: 0.7 },
      () => {
        this.modals.howToPlay.show();
        this.music.setLayers([1]);
      },
      ButtonColor.blue,
      0.6
    );

    const spacing = 250;
    centerOnCamera(startButton, this.cameras.main);
    settingsButton.setPosition(
      startButton.x - spacing,
      this.scale.height - 200
    );
    highscoreButton.setPosition(startButton.x, this.scale.height - 150);
    howToPlayButton.setPosition(
      startButton.x + spacing,
      this.scale.height - 200
    );
  }

  private createModals(): Record<ModalType, Modal> {
    const width = 700;
    const howToPlayText = [
      "1. Swipe to attack\n\n",
      "2. Enemies can dodge attack while attacking\n\n",
      "3. Get the most score before time runs out",
    ];
    const howToPlay = [
      this.add
        .text(0, 0, howToPlayText, {
          fontFamily: fonts.primary,
          fontSize: 46,
          color: texts.colors.black,
          wordWrap: { width: width - 100 },
        })
        .setOrigin(0.5, 0.5),
    ];

    const resetMusic = this.music.setLayers.bind(this.music, "all");
    const result = {
      settings: new SettingsModal(this, this.music, width, 400, resetMusic),
      highscore: new HighscoreModal(this, width, 900, resetMusic),
      howToPlay: new Modal(this, howToPlay, width, 620, true, resetMusic),
    };
    Object.values(result).forEach((modal) => {
      modal.setVisible(false);
      centerOnCamera(modal, this.cameras.main);
    });
    return result;
  }
}
