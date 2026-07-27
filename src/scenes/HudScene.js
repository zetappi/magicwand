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
   *         fine del gioco. Quando e' vero il punteggio non e' ancora
   *         definitivo (si continua a giocare), quindi niente classifica:
   *         quella si mostra solo su un esito realmente finale (game over,
   *         o vittoria dell'ultimo livello).
   * levelName nome del livello in corso, salvato insieme al punteggio.
   * onContinue callback per proseguire (restart del livello 0, o del
   *         successivo): centralizzata qui perche' ora ci sono piu' punti
   *         da cui si puo' scatenare (bottone "Continua" sempre, bottone
   *         "Invia" solo se si e' in top 10).
   */
  showEndMessage(won, score, hasNext, levelName, onContinue) {
    const title = won
      ? (hasNext ? 'LIVELLO COMPLETATO' : 'HAI FINITO IL GIOCO')
      : 'GAME OVER';
    const color = won ? '#6ee7b7' : '#f0776a';
    const isFinal = !hasNext;

    if (isFinal) {
      // Esito finale: prima la sola scritta per qualche secondo (nessuna
      // classifica, nessun pannello a piena altezza), poi si passa alla
      // schermata con lastpage.jpg. Le due fasi sono scene separate: la
      // prima si autodistrugge, la seconda parte da zero pulita.
      this.showTitleOnly(title, color, score, levelName, onContinue);
      return;
    }

    // Livello intermedio: comportamento invariato, fascia centrale.
    const panelHeight = 320;
    const top = CFG.height / 2 - panelHeight / 2;

    this.add
      .rectangle(CFG.width / 2, CFG.height / 2, CFG.width, panelHeight, 0x000000, 0.88)
      .setDepth(50);

    this.add
      .text(CFG.width / 2, top + 60, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 72,
        color,
        stroke: '#000000',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(CFG.width / 2, top + 150, `Punteggio: ${score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: 40,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(51);

    this.add
      .text(CFG.width / 2, top + 230, 'Premi un tasto per il livello successivo', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '28px',
        color: '#c9d1d9',
      })
      .setOrigin(0.5)
      .setDepth(51);
  }

  /**
   * Fase 1 dell'esito finale: solo la scritta grande, su sfondo scuro
   * pieno schermo (non lastpage.jpg — quella arriva nella fase 2), per
   * CFG.finalTitleMs. Nessun input possibile qui: e' un momento puramente
   * di pausa scenica, non ancora la schermata interattiva.
   *
   * setTimeout, non this.time.delayedCall(): i timer di Phaser avanzano solo
   * dentro update(), e a fisica in pausa (endLevel() la ferma subito prima
   * di chiamare showEndMessage()) il ciclo di update rallenta al punto da
   * rendere il delay inaffidabile — la schermata restava bloccata sulla
   * scritta ben oltre i secondi previsti. Stesso identico problema gia'
   * risolto in GameScene.endLevel() per il "premi un tasto": vedi il
   * commento li' per il ragionamento completo.
   */
  showTitleOnly(title, color, score, levelName, onContinue) {
    this.add.rectangle(CFG.width / 2, CFG.height / 2, CFG.width, CFG.height, 0x000000, 0.92).setDepth(50);

    this.add
      .text(CFG.width / 2, CFG.height / 2, title, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '96px',
        color,
        stroke: '#000000',
        strokeThickness: 12,
      })
      .setOrigin(0.5)
      .setDepth(51);

    setTimeout(() => {
      // Guardia minima: se per qualche motivo la scena non fosse piu' attiva
      // quando il timeout scatta, non ha senso disegnarci sopra.
      if (this.scene.isActive()) this.showFinalScreen(score, levelName, onContinue);
    }, CFG.finalTitleMs);
  }

  /**
   * Fase 2 dell'esito finale: lastpage.jpg a piena schermo, punteggio,
   * classifica (recuperata in modo asincrono) e form nick/pulsante sopra.
   *
   * Ripulisce prima tutto quello che la fase 1 aveva disegnato
   * (removeAll(true) su questa scena): titolo e sfondo scuro non servono
   * piu', e lasciarli sotto lastpage.jpg sprecherebbe solo depth inutili.
   */
  async showFinalScreen(score, levelName, onContinue) {
    this.children.removeAll(true);

    this.add.image(CFG.width / 2, CFG.height / 2, 'lastpage').setDepth(50);

    // Fascia semitrasparente dietro punteggio/classifica: lastpage.jpg e'
    // un motivo decorativo colorato, il testo bianco da solo rischierebbe
    // di perdersi contro alcune zone piu' chiare dell'immagine.
    this.add.rectangle(CFG.width / 2, 230, CFG.width, 300, 0x000000, 0.55).setDepth(51);

    this.add
      .text(CFG.width / 2, 110, `Punteggio: ${score}`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '44px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(52);

    const listY = 190;

    const loadingText = this.add
      .text(CFG.width / 2, listY, 'Caricamento classifica…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '26px',
        color: '#c9d1d9',
      })
      .setOrigin(0.5, 0)
      .setDepth(52);

    const scores = await ScoreApi.getTopScores();
    loadingText.destroy();

    // In top 10 se la classifica ha meno di 10 voci, o se il punteggio batte
    // l'ultimo della lista. Un pareggio esatto con l'ultimo posto conta come
    // "dentro" (>=): con pochi punteggi in classifica e' il caso piu' comune
    // da incontrare, meglio includerlo che escluderlo.
    const madeTop10 = scores.length < 10 || score >= scores[scores.length - 1].score;

    this.renderScoreList(scores, listY);

    if (madeTop10) {
      this.showNickForm(score, levelName, onContinue);
    } else {
      this.showContinueButton(onContinue);
    }
  }

  /** Elenco dei migliori punteggi, in colonna. */
  renderScoreList(scores, y) {
    if (scores.length === 0) {
      this.add
        .text(CFG.width / 2, y, 'Nessun punteggio registrato ancora', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          color: '#8b949e',
        })
        .setOrigin(0.5)
        .setDepth(52);
      return;
    }

    const lines = scores
      .map((s, i) => `${i + 1}. ${s.nick}  —  ${s.score}`)
      .join('\n');

    this.add
      .text(CFG.width / 2, y, lines, {
        fontFamily: 'system-ui, monospace',
        fontSize: '24px',
        color: '#e6edf3',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5, 0)
      .setDepth(52);
  }

  /**
   * Converte una coordinata Y in pixel di gioco (0..CFG.height) nella
   * percentuale di viewport che le corrisponde. Necessario per l'overlay
   * HTML (che vive fuori dal canvas Phaser e non conosce le sue coordinate
   * interne): usare una percentuale arbitraria della finestra invece che
   * derivata da CFG.height, come nella prima versione, disallineava
   * l'input dal testo Phaser ogni volta che Scale.FIT scalava il canvas in
   * modo diverso dalla finestra — causa esatta della sovrapposizione vista
   * nello screenshot di verifica.
   */
  gameYToPercent(y) {
    return `${(y / CFG.height) * 100}%`;
  }

  /**
   * Campo nick + pulsante invio, per chi rientra in top 10. Overlay HTML
   * (non oggetti Phaser) perche' serve un vero input di testo con cursore,
   * tastiera virtuale su mobile, incolla: tutte cose che un Phaser.Text non
   * offre. Rimosso esplicitamente all'uscita dalla schermata (remove()),
   * altrimenti resterebbe nel DOM oltre il ciclo di vita della scena.
   *
   * formY e' in coordinate di gioco, converitta con gameYToPercent(): cosi'
   * il form resta nella stessa fascia orizzontale del bottone "Continua"
   * sottostante (anch'esso in coordinate di gioco), qualunque sia lo
   * scaling reale del canvas.
   */
  showNickForm(score, levelName, onContinue) {
    const formY = CFG.height - 220;

    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'fixed',
      left: '50%',
      top: this.gameYToPercent(formY),
      transform: 'translate(-50%, -50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px',
      zIndex: '20',
      fontFamily: 'system-ui, sans-serif',
    });

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', gap: '10px' });

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 20;
    input.placeholder = 'Il tuo nome';
    input.value = ScoreApi.getSavedNick();
    Object.assign(input.style, {
      fontSize: '20px',
      padding: '8px 12px',
      borderRadius: '6px',
      border: '2px solid #6ee7b7',
      width: '240px',
    });

    const button = document.createElement('button');
    button.textContent = 'Invia punteggio';
    Object.assign(button.style, {
      fontSize: '20px',
      padding: '8px 18px',
      borderRadius: '6px',
      border: 'none',
      background: '#6ee7b7',
      color: '#0d1117',
      cursor: 'pointer',
      fontWeight: 'bold',
    });

    const status = document.createElement('div');
    Object.assign(status.style, {
      fontSize: '18px',
      color: '#c9d1d9',
      minHeight: '22px',
    });

    const submit = async () => {
      const nick = input.value.trim();
      if (nick === '') {
        status.textContent = 'Inserisci un nome prima di inviare';
        return;
      }

      button.disabled = true;
      status.textContent = 'Invio in corso…';

      ScoreApi.saveNick(nick);
      const ok = await ScoreApi.submitScore(nick, score, levelName);

      status.textContent = ok ? 'Punteggio salvato!' : 'Invio non riuscito, riprova';
      button.disabled = false;
    };

    button.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      // Ferma la propagazione: altrimenti i tasti finiscono anche al
      // listener 'keydown' di GameScene.endLevel(), che farebbe ripartire
      // il livello mentre si sta ancora scrivendo il nome.
      e.stopPropagation();
      if (e.key === 'Enter') submit();
    });

    row.appendChild(input);
    row.appendChild(button);
    wrap.appendChild(row);
    wrap.appendChild(status);
    document.body.appendChild(wrap);

    this.events.once('shutdown', () => wrap.remove());

    // Il bottone "Continua" resta sotto il form, con margine di sicurezza:
    // non serve inviare per proseguire, l'invio e la prosecuzione sono
    // azioni indipendenti.
    this.showContinueButton(onContinue, wrap);
  }

  /**
   * Pulsante "Continua": sostituisce il vecchio "premi un tasto qualsiasi",
   * necessario ora perche' un tasto premuto mentre si scrive il nick non
   * deve far ripartire la partita (vedi stopPropagation in showNickForm).
   */
  showContinueButton(onContinue, formToCleanup) {
    const hint = this.add
      .text(CFG.width / 2, CFG.height - 90, 'Continua', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '32px',
        color: '#0d1117',
        backgroundColor: '#c9d1d9',
        padding: { x: 24, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(52)
      .setInteractive({ useHandCursor: true });

    hint.on('pointerup', () => {
      if (formToCleanup) formToCleanup.remove();
      onContinue();
    });
  }
}
