/**
 * Definizione dei livelli.
 *
 * Le entita' sono dichiarate come dati puri: GameScene le legge e istanzia
 * gli sprite. Per costruire un nuovo livello basta aggiungere un oggetto a
 * LEVELS, senza toccare la logica di gioco.
 *
 * Campi:
 *   background  chiave di un set dichiarato in backgrounds.js
 *   width       lunghezza del mondo in pixel; la camera non va oltre
 *
 * Coordinate:
 *   x  = posizione orizzontale nel mondo, in pixel
 *   y  = altezza dal pavimento, in pixel (0 = appoggiato a terra)
 *        La quota del pavimento cambia da uno sfondo all'altro (e' dipinta
 *        dentro i layer), ma esprimendo le altezze in modo relativo lo stesso
 *        layout resta valido su qualunque set.
 *
 * Gli oggetti da distruggere (i bancomat) stanno tutti a y=40 su ogni
 * livello: l'altezza del bancomat (CFG.explosive.height, 150px) basta da sola
 * a superarli sopra la vegetazione di "city" e "night", senza bisogno di
 * sollevarli oltre. Restano comunque scavalcabili con un salto.
 */
const LEVELS = [
  {
    name: 'Livello 1 — Le Colline',
    background: 'forest',
    width: 10800,

    platforms: [
      { x: 1800, y: 200, width: 380 },
      { x: 2480, y: 350, width: 300 },
      { x: 3240, y: 220, width: 420 },
      { x: 4900, y: 250, width: 340 },
      { x: 5520, y: 400, width: 280 },
      { x: 6900, y: 230, width: 400 },
      { x: 7640, y: 380, width: 320 },
      { x: 9000, y: 270, width: 440 },
    ],

    bonuses: [
      { x: 840,  y: 60 },  { x: 1240, y: 60 },
      { x: 1880, y: 250 }, { x: 1980, y: 250 },
      { x: 2580, y: 400 },
      { x: 3360, y: 270 }, { x: 3480, y: 270 },
      { x: 4200, y: 60 },  { x: 4320, y: 60 },
      { x: 5000, y: 300 },
      { x: 5620, y: 450 },
      { x: 6300, y: 60 },
      { x: 7000, y: 280 }, { x: 7120, y: 280 },
      { x: 7740, y: 430 },
      { x: 8400, y: 60 },  { x: 8520, y: 60 },
      { x: 9120, y: 320 }, { x: 9240, y: 320 },
      { x: 10100, y: 60 },
    ],

    explosives: [
      { x: 1520, y: 40 },
      { x: 2300, y: 40 },
      { x: 2900, y: 40 },
      { x: 3800, y: 40 },  { x: 3920, y: 40 },
      { x: 4600, y: 40 },
      { x: 5280, y: 40 },
      { x: 5900, y: 40 },  { x: 6020, y: 40 },
      { x: 6600, y: 40 },
      { x: 7400, y: 40 },
      { x: 8100, y: 40 },  { x: 8220, y: 40 },
      { x: 8760, y: 40 },
      { x: 9600, y: 40 },  { x: 9720, y: 40 },
      { x: 10400, y: 40 },
    ],

    goal: { x: 10640 },
  },

  {
    name: 'Livello 2 — La Città',
    background: 'city',
    width: 12000,

    platforms: [
      { x: 1600, y: 220, width: 340 },
      { x: 2200, y: 360, width: 280 },
      { x: 2900, y: 230, width: 380 },
      { x: 3700, y: 410, width: 300 },
      { x: 4600, y: 250, width: 360 },
      { x: 5400, y: 380, width: 320 },
      { x: 6400, y: 230, width: 400 },
      { x: 7300, y: 400, width: 300 },
      { x: 8200, y: 270, width: 380 },
      { x: 9200, y: 410, width: 320 },
      { x: 10200, y: 280, width: 400 },
    ],

    bonuses: [
      { x: 700,  y: 60 },  { x: 820,  y: 60 },
      { x: 1680, y: 270 }, { x: 1800, y: 270 },
      { x: 2300, y: 410 },
      { x: 3000, y: 280 }, { x: 3120, y: 280 },
      { x: 3800, y: 460 },
      { x: 4300, y: 60 },
      { x: 4700, y: 300 }, { x: 4820, y: 300 },
      { x: 5500, y: 430 },
      { x: 6100, y: 60 },
      { x: 6500, y: 280 }, { x: 6620, y: 280 },
      { x: 7400, y: 450 },
      { x: 8300, y: 320 }, { x: 8420, y: 320 },
      { x: 9300, y: 460 },
      { x: 10300, y: 330 }, { x: 10420, y: 330 },
      { x: 11200, y: 60 },
    ],

    explosives: [
      { x: 1200, y: 40 },
      { x: 1950, y: 40 },
      { x: 2600, y: 40 },  { x: 2720, y: 40 },
      { x: 3350, y: 40 },
      { x: 4100, y: 40 },
      { x: 4400, y: 40 },
      { x: 5100, y: 40 },  { x: 5220, y: 40 },
      { x: 5900, y: 40 },
      { x: 6800, y: 40 },
      { x: 7000, y: 40 },
      { x: 7800, y: 40 },  { x: 7920, y: 40 },
      { x: 8700, y: 40 },
      { x: 8900, y: 40 },
      { x: 9700, y: 40 },  { x: 9820, y: 40 },
      { x: 10700, y: 40 },
      { x: 11400, y: 40 }, { x: 11520, y: 40 },
    ],

    goal: { x: 11800 },
  },

  {
    name: 'Livello 3 — La Foresta Notturna',
    background: 'night',
    width: 13200,

    platforms: [
      { x: 1500, y: 230, width: 320 },
      { x: 2100, y: 380, width: 260 },
      { x: 2800, y: 250, width: 340 },
      { x: 3500, y: 430, width: 280 },
      { x: 4300, y: 270, width: 320 },
      { x: 5100, y: 400, width: 280 },
      { x: 6000, y: 250, width: 360 },
      { x: 6900, y: 410, width: 280 },
      { x: 7800, y: 280, width: 340 },
      { x: 8700, y: 430, width: 280 },
      { x: 9700, y: 270, width: 360 },
      { x: 10700, y: 400, width: 300 },
      { x: 11700, y: 280, width: 380 },
    ],

    bonuses: [
      { x: 700,  y: 60 },
      { x: 1580, y: 280 }, { x: 1700, y: 280 },
      { x: 2200, y: 430 },
      { x: 2900, y: 300 }, { x: 3020, y: 300 },
      { x: 3600, y: 480 },
      { x: 4400, y: 320 }, { x: 4520, y: 320 },
      { x: 5200, y: 450 },
      { x: 6100, y: 300 }, { x: 6220, y: 300 },
      { x: 7000, y: 460 },
      { x: 7900, y: 330 }, { x: 8020, y: 330 },
      { x: 8800, y: 480 },
      { x: 9800, y: 320 }, { x: 9920, y: 320 },
      { x: 10800, y: 450 },
      { x: 11800, y: 330 }, { x: 11920, y: 330 },
      { x: 12600, y: 60 },
    ],

    explosives: [
      { x: 1100, y: 40 },  { x: 1220, y: 40 },
      { x: 1900, y: 40 },
      { x: 2500, y: 40 },  { x: 2620, y: 40 },
      { x: 3250, y: 40 },
      { x: 4000, y: 40 },  { x: 4120, y: 40 },
      { x: 4800, y: 40 },
      { x: 5600, y: 40 },  { x: 5720, y: 40 },
      { x: 6500, y: 40 },
      { x: 7400, y: 40 },  { x: 7520, y: 40 },
      { x: 8300, y: 40 },
      { x: 9200, y: 40 },  { x: 9320, y: 40 },
      { x: 10200, y: 40 },
      { x: 11200, y: 40 }, { x: 11320, y: 40 },
      { x: 12200, y: 40 }, { x: 12320, y: 40 },
    ],

    goal: { x: 13000 },
  },
];
