/**
 * Generazione delle texture disegnate a runtime.
 *
 * Gli asset reali (sfondi, testa del personaggio, bacchetta, bancomat) sono
 * caricati da BootScene; qui restano gli elementi ancora segnaposto: il corpo
 * del mago, le gemme bonus, le piattaforme e le particelle.
 *
 * Il pavimento non ha una texture propria: e' dipinto dentro i layer di
 * parallasse, e la collisione e' un corpo invisibile alla quota groundY.
 *
 * Path previsti per gli sprite ancora da sostituire:
 *   assets/sprites/player.png   40 x 56 per frame  (corpo, senza testa)
 *   assets/sprites/bonus.png    28 x 28
 */
const Assets = {
  KEYS: {
    // Generate a runtime.
    player: 'player',
    bonus: 'bonus',
    particle: 'particle',
    spark: 'spark',
    platform: 'platform',
    egg: 'egg',
    // Immagini caricate da file (assets/game/).
    head: 'head',
    wand: 'wand',
    explosive: 'atm',
    coin: 'euro',
    poop: 'cacca',
    eagle: 'aquila',
  },

  /**
   * Chiavi degli effetti sonori (assets/audio/), caricati da BootScene.
   * Separate da KEYS perche' 'coin' li' e' gia' la texture della moneta
   * drop (euro.png): stesso nome concettuale, oggetto diverso per evitare
   * la collisione.
   */
  SOUNDS: {
    coin: 'sfx-coin',
    explosion: 'sfx-explosion',
    shot: 'sfx-shot',
    hurt: 'sfx-hurt',
    jump: 'sfx-jump',
    victory: 'sfx-victory',
  },

  /** Crea tutte le texture placeholder in un colpo solo. */
  generateAll(scene) {
    this.makePlayer(scene);
    this.makeBonus(scene);
    this.makeParticle(scene);
    this.makeSpark(scene);
    this.makePlatform(scene);
    this.makeEgg(scene);
  },

  /** Uovo lanciato dall'aquila: ovale bianco con un'ombreggiatura leggera. */
  makeEgg(scene) {
    const w = 24;
    const h = 30;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xf5f0e6, 1);
    g.fillEllipse(w / 2, h / 2, w - 2, h - 2);
    g.fillStyle(0xd8cfb8, 1);
    g.fillEllipse(w / 2 + 3, h / 2 + 4, w / 3, h / 3);

    g.generateTexture(this.KEYS.egg, w, h);
    g.destroy();
  },

  /**
   * Piastrella per le piattaforme sospese, unico elemento di scenario ancora
   * generato: gli sfondi non ne includono di praticabili.
   */
  makePlatform(scene) {
    const w = 64;
    const h = 32;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x6b4a2f, 1);
    g.fillRect(0, 0, w, h);
    // Fascia erbosa superiore, per leggere il bordo calpestabile.
    g.fillStyle(0x5b8f3a, 1);
    g.fillRect(0, 0, w, 8);
    g.fillStyle(0x74ad4a, 1);
    g.fillRect(0, 0, w, 4);
    g.lineStyle(2, 0x4a3220, 1);
    g.strokeRect(1, 9, w - 2, h - 10);

    g.generateTexture(this.KEYS.platform, w, h);
    g.destroy();
  },

  /**
   * Corpo del player: 4 frame affiancati in una spritesheet 160x56.
   * frame 0 = idle, frame 1-2 = camminata, frame 3 = salto.
   *
   * La testa non e' disegnata qui: e' lo sprite fotografico head.png, agganciato
   * al corpo come oggetto separato (vedi GameScene.createPlayer). Il corpo parte
   * quindi dal collo, all'altezza di BODY_NECK_Y.
   *
   * generateTexture() produce una texture piatta priva di frame, quindi la
   * disegniamo su una chiave temporanea e la ri-registriamo come spritesheet.
   */
  makePlayer(scene) {
    const fw = 40;
    const fh = 56;
    const frames = 4;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    for (let i = 0; i < frames; i++) {
      const ox = i * fw;

      // Tunica da mago: piu' larga in basso, cosi' si legge come veste.
      g.fillStyle(0x5b3fa0, 1);
      g.fillTriangle(ox + 12, 14, ox + 28, 14, ox + 32, 46);
      g.fillTriangle(ox + 12, 14, ox + 32, 46, ox + 8, 46);
      // Bordo chiaro lungo l'orlo.
      g.fillStyle(0x7a5cc4, 1);
      g.fillRect(ox + 9, 42, 22, 4);

      // Braccio che impugna la bacchetta, verso il lato "avanti" dello sprite.
      g.fillStyle(0x6b4ab5, 1);
      g.fillRect(ox + 26, 20, 9, 6);

      // Gambe: variano per frame, cosi' l'animazione si legge.
      g.fillStyle(0x2f2a45, 1);
      if (i === 3) {
        g.fillRect(ox + 13, 46, 7, 8);
        g.fillRect(ox + 21, 46, 7, 8);
      } else if (i === 1) {
        g.fillRect(ox + 11, 46, 7, 10);
        g.fillRect(ox + 23, 46, 7, 7);
      } else if (i === 2) {
        g.fillRect(ox + 13, 46, 7, 7);
        g.fillRect(ox + 21, 46, 7, 10);
      } else {
        g.fillRect(ox + 13, 46, 7, 10);
        g.fillRect(ox + 21, 46, 7, 10);
      }
    }

    const rawKey = '__player_raw';
    g.generateTexture(rawKey, fw * frames, fh);
    g.destroy();

    scene.textures.addSpriteSheet(
      this.KEYS.player,
      scene.textures.get(rawKey).getSourceImage(),
      { frameWidth: fw, frameHeight: fh }
    );
    scene.textures.remove(rawKey);
  },

  /** Bonus da raccogliere: gemma romboidale con luce interna. */
  makeBonus(scene) {
    const s = 28;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffd24a, 1);
    g.fillTriangle(s / 2, 0, s, s / 2, s / 2, s);
    g.fillTriangle(s / 2, 0, 0, s / 2, s / 2, s);
    g.fillStyle(0xfff3b0, 1);
    g.fillTriangle(s / 2, 5, s / 2 + 7, s / 2, s / 2, s - 5);
    g.fillTriangle(s / 2, 5, s / 2 - 7, s / 2, s / 2, s - 5);

    g.generateTexture(this.KEYS.bonus, s, s);
    g.destroy();
  },

  /** Quadratino usato dagli emitter di particelle per esplosioni e raccolte. */
  makeParticle(scene) {
    const s = 6;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, s, s);
    g.generateTexture(this.KEYS.particle, s, s);
    g.destroy();
  },

  /**
   * Scintilla dell'incantesimo: dischetto con alone sfumato.
   *
   * Gli anelli concentrici a opacita' calante simulano un bagliore morbido,
   * che si legge molto meglio del quadratino netto quando le particelle si
   * sovrappongono lungo la scia della magia.
   */
  makeSpark(scene) {
    const s = 16;
    const c = s / 2;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });

    for (let r = c; r > 0; r--) {
      g.fillStyle(0xffffff, 0.16 * (1 - r / c) + 0.06);
      g.fillCircle(c, c, r);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, 2.5);

    g.generateTexture(this.KEYS.spark, s, s);
    g.destroy();
  },
};
