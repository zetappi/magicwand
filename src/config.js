/**
 * Parametri di gioco centralizzati.
 * Tutti i valori regolabili (fisica, punteggi, velocita') stanno qui,
 * cosi' il bilanciamento non richiede di toccare la logica delle scene.
 */
const CFG = {
  // Risoluzione logica interna, pari a quella nativa degli sfondi: gli asset
  // 1920x1080 vengono cosi' disegnati senza riduzioni. Il canvas viene poi
  // scalato alla finestra, ma la logica lavora sempre su questa griglia.
  width: 1920,
  height: 1080,

  player: {
    speed: 520,
    // Salto: con questa gravita' la quota massima e' v^2/(2g) = ~470px, e la
    // salita dura ~0.5s. Le piattaforme dei livelli stanno entro 430px, cosi'
    // resta un margine di manovra invece di richiedere il salto perfetto.
    // Cambiando questi valori, verifica che level.js resti raggiungibile.
    jumpVelocity: -1840,
    gravity: 3600,
    // Finestra di invulnerabilita' dopo un colpo, in millisecondi.
    invulnerableMs: 1200,
    maxLives: 3,
    // Corpo di collisione, piu' stretto dello sprite per rendere i salti meno
    // frustranti. Lo sprite del player e' scalato di playerScale.
    bodyWidth: 70,
    bodyHeight: 160,
    // Ingrandimento dello sprite placeholder (40x56) per stare in proporzione
    // agli sfondi: a 3x il giocatore e' alto ~170px, circa un sesto
    // dell'altezza dello scenario, come negli sfondi di riferimento.
    scale: 3,

    // Testa fotografica (head.png), agganciata sopra le spalle.
    // La larghezza determina la scala; gli offset la posizionano rispetto al
    // centro del corpo, e seguono la direzione di marcia.
    headWidth: 54,
    headOffsetX: 3,
    headOffsetY: 8,

    // Bacchetta: lunghezza a schermo e posizione della mano che la impugna,
    // sempre relativa al centro del corpo. handOffsetY e' negativo perche' il
    // braccio e' disegnato sopra la meta' del corpo.
    wandLength: 58,
    handOffsetX: 26,
    handOffsetY: -18,

    // Oscillazione al lancio dell'incantesimo: ampiezza in radianti e durata
    // del rientro. La punta scatta all'indietro e torna con un rimbalzo.
    wandSwing: 0.45,
    wandSwingMs: 260,
  },

  // Oggetti da far esplodere (il bancomat).
  explosive: {
    // Altezza a schermo: lo sprite e' verticale, si dimensiona su questa.
    height: 150,
    // Pulsazione: quanto si dilata e in quanto tempo.
    pumpScale: 1.06,
    pumpMs: 900,
    // Velocita' con cui avanza verso il player, solo in orizzontale. Molto
    // piu' lenta del player (che ha speed:520): resta un ostacolo da evitare
    // con un salto, non un nemico da cui scappare.
    chaseSpeed: 90,
    // Sotto questa distanza smette di avanzare, per non sovrapporsi al player
    // e continuare a spingerlo mentre lo tocca.
    chaseStopDistance: 60,

    // Probabilita' che, distrutto, lasci una moneta bonus invece di un
    // malus (cacca o bomba). Il drop resta a terra finche' il player non lo
    // raccoglie o lo tocca: nessun timer di scomparsa.
    dropChance: 0.5,
    // Della quota "malus" (1 - dropChance), la frazione che e' bomba invece
    // di cacca. Tenuta bassa apposta: la bomba spazza via ogni bancomat del
    // livello in un colpo solo, un drop cosi' potente deve restare raro.
    bombChance: 0.1,
    dropHeight: 70,
  },

  // Drop lasciato da un bancomat distrutto: moneta (bonus), cacca (malus) o
  // bomba (super bonus raro, vedi CFG.explosive.bombChance).
  drop: {
    coinScore: 150,
    // Punti per aver raccolto la bomba, oltre ai punti dei bancomat che fa
    // esplodere (CFG.scoring.explosiveDestroyed ciascuno).
    bombScore: 100,
    // Ampiezza e durata dell'oscillazione verticale di moneta e bomba,
    // identica nello spirito a quella delle gemme bonus.
    coinBobAmount: 18,
    coinBobMs: 850,
  },

  /**
   * Aquila: punisce l'immobilita' prolungata, per impedire di restare fermi
   * ad aspettare senza rischio. Entra in scena dall'alto, sorvola il player
   * e lascia cadere una raffica di uova, poi esce ed e' di nuovo invocabile
   * solo dopo cooldownMs.
   */
  eagle: {
    // Tempo di immobilita' (nessun input orizzontale, a terra) che la evoca.
    idleTriggerMs: 1000,
    // Quota di volo, alta sopra la testa del player (che arriva a ~470px di
    // salto): l'aquila deve restare ben visibile in alto, non rasoterra.
    flyY: 780,
    height: 130,
    // Attraversamento lento: da bordo a bordo schermo (1920+200px) ci mette
    // qualche secondo, cosi' resta ben visibile e prevedibile in arrivo.
    speed: 420,
    // Quante uova lascia cadere durante il sorvolo e ogni quanto (ms).
    eggCount: 4,
    eggIntervalMs: 220,
    // Dopo l'attacco, tempo minimo prima che l'immobilita' possa richiamarla.
    cooldownMs: 5000,
  },

  egg: {
    height: 34,
    // Caduta verticale pura: nessuna velocita' orizzontale propria. Con
    // l'aquila alta a flyY:780, questa velocita' porta la caduta a ~1.3s:
    // abbastanza da poter reagire, non cosi' lenta da sembrare fluttuante.
    fallSpeed: 600,
  },

  // Incantesimi lanciati dalla bacchetta. Lo sprite portante e' invisibile:
  // la magia e' resa da particelle, ma la collisione resta quella di un corpo.
  bullet: {
    speed: 1240,
    // Cadenza di fuoco: intervallo minimo fra due lanci.
    cooldownMs: 300,
    // Gli incantesimi si dissolvono oltre questa distanza dal giocatore.
    maxRange: 1400,
    // Lato del corpo di collisione, in pixel.
    hitSize: 46,
  },

  scoring: {
    bonus: 100,
    explosiveDestroyed: 250,
    // Bonus assegnato al completamento del livello.
    levelComplete: 1000,
  },

  /**
   * Parallasse.
   *
   * Il fattore di scorrimento non e' piu' fissato per singolo layer: viene
   * interpolato fra questi due estremi in base alla profondita', cosi' la
   * stessa regola vale per set con 5, 7 o 8 layer.
   *   farthest = layer di fondo (quasi immobile)
   *   nearest  = layer di primo piano (quasi solidale col mondo)
   */
  parallax: {
    farthest: 0.05,
    nearest: 0.9,
  },

  // Scala degli sprite di gioco. Piu' contenuta di quella del player: le mine
  // a 2x risultavano piu' grandi della testa del giocatore.
  entityScale: 1.6,

  // Quanto la schermata di fine partita ignora i tasti, per non essere saltata
  // dal tasto ancora premuto al momento della sconfitta.
  restartDelayMs: 700,

  // Sull'esito finale (game over o fine del gioco), quanto resta a schermo
  // la sola scritta (GAME OVER / HAI FINITO IL GIOCO) prima di passare alla
  // schermata con lastpage.jpg, punteggio e classifica.
  finalTitleMs: 3500,

  /**
   * Controlli touch (joystick fisso + due pulsanti fissi), attivi solo su
   * device con supporto touch: vedi Touch.isTouchDevice() in touch.js.
   */
  touch: {
    // Raggio oltre il quale il drag del joystick e' considerato al massimo:
    // sopra questa distanza dal centro, il player si muove alla velocita'
    // piena in quella direzione (nessun'accelerazione graduale). Piu' piccolo
    // dei classici joystick virtuali perche' in landscape su telefono
    // l'altezza disponibile e' stretta (vedi nota su buttonRadius).
    joystickRadius: 56,
    // Sotto questa distanza dal centro, il drag non produce movimento: evita
    // che un tocco quasi fermo (tremore del dito) faccia vibrare il player.
    joystickDeadzone: 12,
    // Posizione del centro del joystick dal bordo basso-sinistro dello
    // schermo: e' fisso li', non compare piu' al primo tocco.
    joystickMarginX: 90,
    joystickMarginY: 90,
    // Raggio dei due pulsanti fissi (salto, fuoco) e loro posizione dal bordo
    // basso-destro dello schermo, in pixel a schermo (non coordinate di gioco:
    // l'overlay HTML vive fuori dal canvas Phaser).
    //
    // Il gioco forza il landscape su mobile (vedi #rotate-overlay in
    // index.html): l'altezza reale dello schermo e' quindi quella corta,
    // spesso 380-430px su un telefono medio. Dimensioni e margini restano
    // piccoli apposta, per non occupare una fetta enorme di quel poco spazio
    // ne' sovrapporsi alla scena di gioco.
    buttonRadius: 34,
    buttonMarginX: 60,
    buttonMarginY: 46,
    buttonGap: 84,
    // Pulsante schermo intero: piu' piccolo dei pulsanti di gioco (si tocca
    // una volta ogni tanto, non serve la stessa area comoda) e in alto a
    // destra, lontano dall'HUD (punti/vite in alto, ma ai due estremi opposti).
    fullscreenRadius: 26,
    fullscreenMargin: 40,
    // Opacita' dell'overlay: basso per non coprire la scena, ma visibile.
    opacity: 0.35,
  },

  // Volume dei singoli effetti sonori (0-1). Coin/hurt/jump/shot sono brevi
  // e frequenti, tenuti piu' bassi per non affaticare; explosion e victory
  // sono eventi rari, possono stare piu' in evidenza.
  sfxVolume: {
    coin: 0.5,
    explosion: 0.6,
    shot: 0.35,
    hurt: 0.55,
    jump: 0.3,
    victory: 0.7,
  },

  debug: false,
};
