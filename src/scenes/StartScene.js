/**
 * Schermata iniziale: immagine di copertina, invito a premere un tasto o
 * toccare per cominciare. Prima scena del gioco, precede BootScene.
 *
 * L'immagine e' 1920x1080, la stessa risoluzione logica del gioco: nessuno
 * scaling necessario, riempie l'intero canvas.
 */
class StartScene extends Phaser.Scene {
  constructor() {
    super('Start');
  }

  preload() {
    this.load.image('startingpage', 'assets/game/startingpage.jpg');
  }

  create() {
    this.add.image(CFG.width / 2, CFG.height / 2, 'startingpage');

    // Fascia scura dietro il testo: il logo "Magic Wand" nell'immagine
    // arriva quasi al bordo inferiore, senza uno sfondo proprio il testo di
    // invito vi si sovrapporrebbe illeggibile.
    this.add.rectangle(CFG.width / 2, CFG.height - 36, CFG.width, 72, 0x000000, 0.55);

    const hint = this.add
      .text(CFG.width / 2, CFG.height - 36, 'Premi un tasto o tocca per iniziare', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // Lampeggio per farla notare senza essere invadente.
    this.tweens.add({
      targets: hint,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // Stessa logica anti tocco-accidentale del game over: la finestra di
    // cortesia evita che un tap gia' in corso (es. sul dispositivo appena
    // aperto) salti subito la schermata. Vedi endLevel() in GameScene.js per
    // il ragionamento completo su Date.now() invece di delayedCall().
    const acceptFrom = Date.now() + CFG.restartDelayMs;
    let started = false;

    const start = () => {
      if (Date.now() < acceptFrom || started) return;
      started = true;

      this.input.keyboard.off('keydown', start);
      window.removeEventListener('touchend', start);
      this.scene.start('Boot');
    };

    this.input.keyboard.on('keydown', start);
    window.addEventListener('touchend', start);
  }
}
