/**
 * Scena di avvio: carica gli sfondi, genera i placeholder delle entita',
 * definisce le animazioni e cede il controllo al gioco.
 *
 * Gli sfondi di tutti i set dichiarati in BACKGROUNDS vengono caricati in
 * anticipo: sono pochi MB complessivi e cosi' il cambio di livello non
 * introduce attese.
 */
class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.showLoadingBar();

    for (const [name, bg] of Object.entries(BACKGROUNDS)) {
      for (let i = 1; i <= bg.layers; i++) {
        const n = String(i).padStart(2, '0');
        this.load.image(BootScene.layerKey(name, i), `${bg.path}layer_${n}.png`);
      }
    }

    // Asset reali gia' ritagliati dai margini trasparenti degli originali
    // in assets/sprites/personaggi/.
    this.load.image(Assets.KEYS.head, 'assets/game/head.png');
    this.load.image(Assets.KEYS.wand, 'assets/game/wand.png');
    this.load.image(Assets.KEYS.explosive, 'assets/game/atm.png');
    this.load.image(Assets.KEYS.coin, 'assets/game/euro.png');
    this.load.image(Assets.KEYS.poop, 'assets/game/cacca.png');
    this.load.image(Assets.KEYS.eagle, 'assets/game/aquila.png');
    this.load.image(Assets.KEYS.bomb, 'assets/game/bomb.png');
    this.load.image('lastpage', 'assets/game/lastpage.jpg');

    // Effetti sonori: mp3 prima di ogg nell'array, Phaser sceglie il primo
    // formato che il browser sa decodificare (mp3 copre anche Safari/iOS,
    // dove il supporto per ogg e' storicamente incompleto).
    const S = Assets.SOUNDS;
    this.load.audio(S.coin, ['assets/audio/coin.mp3', 'assets/audio/coin.ogg']);
    this.load.audio(S.explosion, ['assets/audio/explosion.mp3', 'assets/audio/explosion.ogg']);
    this.load.audio(S.shot, ['assets/audio/shot.mp3', 'assets/audio/shot.ogg']);
    this.load.audio(S.hurt, ['assets/audio/hurt.mp3', 'assets/audio/hurt.ogg']);
    this.load.audio(S.jump, ['assets/audio/jump.mp3', 'assets/audio/jump.ogg']);
    this.load.audio(S.victory, ['assets/audio/victory.mp3', 'assets/audio/victory.ogg']);

    // Ancora segnaposto; per sostituirli, aggiungere qui il load e togliere
    // la corrispondente make*() da Assets.generateAll().
    //
    // this.load.image(Assets.KEYS.bonus, 'assets/sprites/bonus.png');
    // this.load.spritesheet(Assets.KEYS.player, 'assets/sprites/player.png',
    //   { frameWidth: 40, frameHeight: 56 });
  }

  /** Chiave con cui una singola immagine di sfondo e' registrata in Phaser. */
  static layerKey(setName, index) {
    return `bg-${setName}-${index}`;
  }

  /** Barra di avanzamento: i layer a piena risoluzione richiedono qualche istante. */
  showLoadingBar() {
    const cx = CFG.width / 2;
    const cy = CFG.height / 2;
    const w = 520;

    this.add.text(cx, cy - 60, 'Caricamento…', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#c9d1d9',
    }).setOrigin(0.5);

    this.add.rectangle(cx, cy, w, 12, 0x30363d);
    const bar = this.add.rectangle(cx - w / 2, cy, 0, 12, 0x6ee7b7).setOrigin(0, 0.5);

    this.load.on('progress', (p) => bar.setSize(w * p, 12));
  }

  create() {
    Assets.generateAll(this);
    this.createAnimations();
    this.scene.start('Game', { levelIndex: 0, score: 0 });
  }

  createAnimations() {
    this.anims.create({
      key: 'player-idle',
      frames: [{ key: Assets.KEYS.player, frame: 0 }],
      frameRate: 1,
    });

    this.anims.create({
      key: 'player-run',
      frames: this.anims.generateFrameNumbers(Assets.KEYS.player, { start: 1, end: 2 }),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'player-jump',
      frames: [{ key: Assets.KEYS.player, frame: 3 }],
      frameRate: 1,
    });
  }
}
