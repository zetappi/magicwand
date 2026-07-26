/**
 * Manifest degli sfondi.
 *
 * Gli asset originali (Forest Game Background, Mobile Game Graphics) numerano
 * i layer in ordine opposto da un set all'altro: in "Background 01" l'indice
 * cresce dallo sfondo al primo piano, in "Background 03" e "07" e' il contrario.
 * I file sono gia' stati rinormalizzati in assets/bg/<set>/layer_NN.png con
 * un'unica convenzione:
 *
 *     layer_01 = il piu' lontano   ...   layer_NN = il piu' vicino
 *
 * Ogni PNG e' 1920x1080 a piena tela e i layer sono gia' allineati fra loro:
 * si sovrappongono senza alcun calcolo di posizionamento.
 *
 * Il pavimento e' dipinto dentro i layer, non e' una tile separata. Il campo
 * groundY indica a quale altezza si trova la superficie calpestabile, misurata
 * sull'immagine a piena risoluzione: e' da li' che il gioco ricava la quota
 * di collisione, che non ha quindi alcuna controparte visiva propria.
 */
const BACKGROUNDS = {
  // Colline al tramonto. Superficie piatta e uniforme.
  forest: {
    path: 'assets/bg/forest/',
    layers: 5,
    groundY: 910,
    // Nessun layer davanti al giocatore.
    foregroundFrom: null,
  },

  // Citta' al tramonto. Il set con piu' profondita' (8 layer).
  city: {
    path: 'assets/bg/city/',
    layers: 8,
    groundY: 841,
    foregroundFrom: null,
  },

  /*
   * Foresta notturna. Caso particolare: l'ultimo layer non e' il pavimento ma
   * un boschetto di sterpi in primo piano, con profilo irregolare (852-1055).
   * Il piano calpestabile e' quello grigio del penultimo layer, a y=795.
   * Gli sterpi vanno quindi disegnati DAVANTI al giocatore: foregroundFrom
   * indica il primo layer (1-based) da spostare sopra di lui.
   */
  night: {
    path: 'assets/bg/night/',
    layers: 7,
    groundY: 795,
    foregroundFrom: 7,
  },
};
