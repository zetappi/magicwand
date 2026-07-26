/**
 * Interfaccia sovrapposta al gioco.
 *
 * Vive in una scena separata da GameScene: cosi' i testi restano ancorati allo
 * schermo senza dover compensare lo scorrimento della camera, e la pausa della
 * fisica di gioco non blocca l'HUD.
 */
class HudScene extends Phaser.Scene {
  constructor() {
    super('Hud');
  }

  create() {
    const style = {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
    };

    this.scoreText = this.add.text(40, 32, 'PUNTI 0', style);
    this.livesText = this.add.text(CFG.width - 40, 32, 'VITE 3', style).setOrigin(1, 0);

    // Nome del livello, al centro: aiuta a riconoscere l'avanzamento.
    const game = this.scene.get('Game');
    this.add
      .text(CFG.width / 2, 40, game.level.name, {
        ...style,
        fontSize: '28px',
        color: '#e8e8e8',
      })
      .setOrigin(0.5, 0);

    // Sotto il punteggio, non a fondo schermo: la fascia bassa e' occupata
    // dal terreno e il testo vi si confonderebbe.
    this.add.text(40, 88, '← → muovi    SPAZIO salta    Z spara', {
      ...style,
      fontSize: '26px',
      color: '#e0e0e0',
      strokeThickness: 6,
    });
  }

  updateStats(score, lives) {
    // I testi possono non esistere ancora (create() non eseguito) oppure
    // essere gia' stati smontati da un cambio di scena: in quel caso la
    // texture interna e' liberata e setText() fallirebbe. active copre
    // entrambi i casi.
    if (!this.scoreText || !this.scoreText.active) return;

    this.scoreText.setText(`PUNTI ${score}`);
    this.livesText.setText(`VITE ${Math.max(0, lives)}`);
  }

  /**
   * Schermata di fine livello.
   *
   * won     esito della partita
   * hasNext se esiste un livello successivo: distingue l'avanzamento dalla
   *         fine del gioco, cosi' il messaggio dice davvero cosa accadra'
   *         premendo un tasto.
   */
  showEndMessage(won, score, hasNext) {
    const title = won
      ? (hasNext ? 'LIVELLO COMPLETATO' : 'HAI FINITO IL GIOCO')
      : 'GAME OVER';
    const color = won ? '#6ee7b7' : '#f0776a';
    const hint = hasNext
      ? 'Premi un tasto per il livello successivo'
      : 'Premi un tasto per ricominciare';

    this.add
      .rectangle(CFG.width / 2, CFG.height / 2, CFG.width, 320, 0x000000, 0.78)
      .setDepth(50);

    this.add
      .text(CFG.width / 2, CFG.height / 2 - 60, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '84px',
        color,
        stroke: '#000000',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(CFG.width / 2, CFG.height / 2 + 40, `Punteggio: ${score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(CFG.width / 2, CFG.height / 2 + 110, hint, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '30px',
        color: '#c9d1d9',
      })
      .setOrigin(0.5)
      .setDepth(51);
  }
}
