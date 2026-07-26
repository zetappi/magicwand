/**
 * Bootstrap di Phaser.
 *
 * La risoluzione logica e' fissa (CFG.width x CFG.height) e viene scalata a
 * schermo con Scale.FIT: la logica di gioco lavora sempre sulle stesse
 * coordinate, indipendentemente dalla finestra.
 */
// Esposta su window per ispezione da console durante lo sviluppo.
window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: CFG.width,
  height: CFG.height,
  backgroundColor: '#0d1117',
  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: CFG.debug,
    },
  },

  scene: [BootScene, GameScene, HudScene],
});
