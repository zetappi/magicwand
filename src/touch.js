/**
 * Controlli touch: joystick sempre visibile (in basso a sinistra) per il
 * movimento, due pulsanti fissi per salto e fuoco, un pulsante per lo schermo
 * intero. Attivi solo su device touch (Touch.isTouchDevice()).
 *
 * Vive come overlay HTML sopra il canvas, non come oggetti Phaser: cosi' la
 * posizione dei pulsanti resta ancorata allo schermo reale indipendentemente
 * da come Phaser.Scale.FIT scala/centra il canvas alle coordinate di gioco
 * (1920x1080), che altrimenti andrebbero convertite avanti e indietro.
 *
 * Interfaccia esposta compatibile con un Key di Phaser (isDown + JustDown),
 * cosi' GameScene la usa senza diramare la logica di input: vedi
 * VirtualButton.justDown(), letto allo stesso modo di
 * Phaser.Input.Keyboard.JustDown(key).
 */
const Touch = {
  /** true su telefoni/tablet e laptop touchscreen; false altrimenti. */
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * Crea l'overlay (joystick fisso in basso a sinistra, pulsanti fissi in
   * basso a destra) e restituisce { left, right, jump, fire }: quattro
   * oggetti con isDown, ciascuno pensato per essere lo stato di un input
   * frame per frame. jump e fire hanno in piu' justDown(), da chiamare una
   * sola volta per frame (consuma il flag, esattamente come Keyboard.JustDown).
   */
  create() {
    const root = document.createElement('div');
    root.id = 'touch-controls';
    Object.assign(root.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '10',
      // pointer-events lo riabilitano solo gli elementi dei singoli controlli:
      // il resto dell'overlay non deve intercettare tap destinati al gioco.
      pointerEvents: 'none',
      userSelect: 'none',
      WebkitUserSelect: 'none',
      touchAction: 'none',
    });
    document.body.appendChild(root);

    const joystick = this._createJoystick(root);
    const jumpBtn = this._createButton(root, '⤒', CFG.touch.buttonMarginX + CFG.touch.buttonGap, CFG.touch.buttonMarginY);
    const fireBtn = this._createButton(root, '★', CFG.touch.buttonMarginX, CFG.touch.buttonMarginY);
    this._createFullscreenButton(root);

    return {
      left: { get isDown() { return joystick.dx < 0; } },
      right: { get isDown() { return joystick.dx > 0; } },
      jump: jumpBtn,
      fire: fireBtn,
    };
  },

  /**
   * Pulsante per lo schermo intero, in alto a destra.
   *
   * La Fullscreen API concede la richiesta solo dentro il gestore di un
   * gesto utente diretto (non puo' scattare da sola al caricamento): da qui
   * un pulsante esplicito invece di un trigger automatico. Se il fullscreen
   * viene chiuso da fuori (gesture di sistema, cambio app), il tap successivo
   * lo ririchiede senza bisogno di un avviso: fullscreenchange tiene solo
   * l'icona (⛶/⛷) coerente con lo stato reale.
   */
  _createFullscreenButton(root) {
    const el = document.createElement('div');
    const r = CFG.touch.fullscreenRadius;

    Object.assign(el.style, {
      position: 'absolute',
      right: `${CFG.touch.fullscreenMargin - r}px`,
      top: `${CFG.touch.fullscreenMargin - r}px`,
      width: `${r * 2}px`,
      height: `${r * 2}px`,
      borderRadius: '50%',
      background: `rgba(255,255,255,${CFG.touch.opacity})`,
      border: '2px solid rgba(255,255,255,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      color: 'rgba(255,255,255,0.9)',
      pointerEvents: 'auto',
      touchAction: 'none',
    });
    el.textContent = '⛶';
    root.appendChild(el);

    const isFullscreen = () => !!document.fullscreenElement;

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      // Il target e' <html>, non #game: cosi' in fullscreen resta visibile
      // anche l'overlay dei controlli, che vive fuori da #game.
      if (isFullscreen()) {
        document.exitFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }, { passive: false });

    document.addEventListener('fullscreenchange', () => {
      el.textContent = isFullscreen() ? '⛷' : '⛶';
    });
  },

  /**
   * Joystick sempre visibile, ancorato in basso a sinistra: la base resta
   * ferma li' (non insegue piu' il primo tocco), solo la manopola si sposta
   * col drag, riportando dx/dy normalizzati in [-1, 1]. Sotto la deadzone
   * dx/dy restano 0; oltre joystickRadius si saturano a ±1.
   */
  _createJoystick(root) {
    const base = document.createElement('div');
    const knob = document.createElement('div');
    const r = CFG.touch.joystickRadius;
    const cx = CFG.touch.joystickMarginX;
    const cy = CFG.touch.joystickMarginY;

    Object.assign(base.style, {
      position: 'absolute',
      left: `${cx - r}px`,
      bottom: `${cy - r}px`,
      width: `${r * 2}px`,
      height: `${r * 2}px`,
      borderRadius: '50%',
      background: `rgba(255,255,255,${CFG.touch.opacity})`,
      border: '2px solid rgba(255,255,255,0.5)',
      pointerEvents: 'auto',
      touchAction: 'none',
    });
    Object.assign(knob.style, {
      position: 'absolute',
      width: `${r}px`,
      height: `${r}px`,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.8)',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    });
    base.appendChild(knob);
    root.appendChild(base);

    const state = { dx: 0, dy: 0, active: false, pointerId: null };

    const resetKnob = () => {
      knob.style.left = '50%';
      knob.style.top = '50%';
    };
    const move = (x, y) => {
      // Il centro e' sempre quello fisso della base (cx, cy misurati dal
      // bordo basso-sinistro): non c'e' piu' un "punto di comparsa" da cui
      // calcolare lo scarto, la base non si sposta mai.
      const originX = cx;
      const originY = window.innerHeight - cy;
      const dx = x - originX;
      const dy = y - originY;
      const dist = Math.hypot(dx, dy);

      if (dist < CFG.touch.joystickDeadzone) {
        state.dx = 0;
        state.dy = 0;
        resetKnob();
      } else {
        const clamped = Math.min(dist, r);
        const nx = (dx / dist) * clamped;
        const ny = (dy / dist) * clamped;
        state.dx = nx / r;
        state.dy = ny / r;
        knob.style.left = `${r + nx}px`;
        knob.style.top = `${r + ny}px`;
      }
    };

    // pointer-events:auto solo sulla base: il tocco deve partire li' (non su
    // tutto lo schermo sinistro come nella versione a comparsa), altrimenti
    // un tap altrove nella meta' sinistra muoverebbe il player senza che sia
    // visivamente chiaro perche'.
    base.addEventListener('touchstart', (e) => {
      if (state.active) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      state.active = true;
      state.pointerId = t.identifier;
      move(t.clientX, t.clientY);
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (!state.active) return;
      const t = [...e.changedTouches].find((t) => t.identifier === state.pointerId);
      if (t) move(t.clientX, t.clientY);
    }, { passive: true });

    const onEnd = (e) => {
      if (!state.active) return;
      const t = [...e.changedTouches].find((t) => t.identifier === state.pointerId);
      if (!t) return;
      state.dx = 0;
      state.dy = 0;
      state.active = false;
      state.pointerId = null;
      resetKnob();
    };
    window.addEventListener('touchend', onEnd, { passive: true });
    window.addEventListener('touchcancel', onEnd, { passive: true });

    return state;
  },

  /**
   * Pulsante circolare fisso in basso a destra. Restituisce un oggetto con
   * isDown (stato continuo) e justDown() (true una sola volta per pressione,
   * si autoconsuma: chiamarlo di nuovo nello stesso frame restituisce false).
   */
  _createButton(root, label, marginRight, marginBottom) {
    const el = document.createElement('div');
    const r = CFG.touch.buttonRadius;

    Object.assign(el.style, {
      position: 'absolute',
      right: `${marginRight - r}px`,
      bottom: `${marginBottom - r}px`,
      width: `${r * 2}px`,
      height: `${r * 2}px`,
      borderRadius: '50%',
      background: `rgba(255,255,255,${CFG.touch.opacity})`,
      border: '2px solid rgba(255,255,255,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '28px',
      color: 'rgba(255,255,255,0.9)',
      pointerEvents: 'auto',
      touchAction: 'none',
    });
    el.textContent = label;
    root.appendChild(el);

    const state = { isDown: false, _pressedThisFrame: false };

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      state.isDown = true;
      state._pressedThisFrame = true;
      el.style.background = 'rgba(255,255,255,0.6)';
    }, { passive: false });

    const release = () => {
      state.isDown = false;
      el.style.background = `rgba(255,255,255,${CFG.touch.opacity})`;
    };
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);

    // Semantica identica a Phaser.Input.Keyboard.JustDown: interroga e
    // consuma il flag, cosi' due letture nello stesso frame non duplicano
    // l'azione (un salto per pressione, non un salto per frame premuto).
    state.justDown = function () {
      if (this._pressedThisFrame) {
        this._pressedThisFrame = false;
        return true;
      }
      return false;
    };

    return state;
  },
};
