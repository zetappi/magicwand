/**
 * Client per l'endpoint dei punteggi (api/score.php).
 *
 * Path relativo ('api/score.php'): funziona sia in locale (servito dalla
 * stessa document root del gioco) sia in produzione, senza hardcodare un
 * dominio. Se il gioco venisse mai servito da un'origine diversa da quella
 * dell'API, andrebbe cambiato solo qui.
 */
const ScoreApi = {
  ENDPOINT: 'api/score.php',

  /**
   * Legge la top 10. Non lancia mai: in caso di errore di rete/parsing
   * restituisce un array vuoto, cosi' il chiamante (HudScene) non deve
   * gestire un try/catch per ogni lettura — un ranking vuoto e' un esito
   * legittimo quanto una lista vuota per davvero.
   */
  async getTopScores() {
    try {
      const res = await fetch(this.ENDPOINT);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.scores) ? data.scores : [];
    } catch {
      return [];
    }
  },

  /**
   * Salva un punteggio. Restituisce true/false invece di lanciare: la UI
   * (HudScene) deve poter mostrare "salvato" o "errore, riprova" senza un
   * try/catch a corredo di ogni chiamata.
   */
  async submitScore(nick, score, levelName) {
    try {
      const res = await fetch(this.ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nick, score, level: levelName }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Nick memorizzato dalla partita precedente, o stringa vuota. */
  getSavedNick() {
    return localStorage.getItem('magicwand-nick') || '';
  },

  saveNick(nick) {
    localStorage.setItem('magicwand-nick', nick);
  },
};
