/**
 * Scena principale: mondo, giocatore, entita' e collisioni.
 *
 * Comandi:
 *   Freccia sinistra / destra  movimento
 *   Spazio                     salto
 *   Z                          fuoco
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.levelIndex = data.levelIndex || 0;
    this.level = LEVELS[this.levelIndex];
    this.bg = BACKGROUNDS[this.level.background];
    this.score = data.score || 0;
    this.lives = CFG.player.maxLives;
    this.lastFiredAt = 0;
    this.invulnerableUntil = 0;
    // Impedisce che piu' eventi di fine partita si accavallino.
    this.levelEnded = false;

    // Stato dell'attacco dell'aquila: quando il player e' considerato fermo
    // da ultimo, se un attacco e' in corso, e fino a quando il cooldown lo
    // rende di nuovo invocabile dopo un attacco.
    this.idleSince = null;
    this.eagleActive = false;
    this.eagleCooldownUntil = 0;
  }

  create() {
    // La quota del pavimento e' dipinta dentro gli sfondi: la si legge dal
    // manifest anziche' ricavarla dall'altezza di una tile.
    this.floorY = this.bg.groundY;

    this.createParallax();
    this.createGround();
    this.createPlatforms();
    this.createPlayer();
    this.createBullets();
    this.createBonuses();
    this.createExplosives();
    this.createDrops();
    this.createGoal();
    this.createEagle();
    this.createEmitters();
    this.createColliders();
    this.createInput();
    this.createCamera();

    // L'HUD gira in una scena separata, cosi' resta fisso a schermo
    // senza risentire dello scorrimento della camera.
    //
    // launch() e' asincrono: al riavvio di un livello la vecchia istanza puo'
    // essere ancora in fase di distruzione, con i testi gia' invalidati. Si
    // aspetta quindi il segnale di creazione prima di aggiornarla, altrimenti
    // setText() lavora su oggetti smontati e solleva un errore.
    this.scene.launch('Hud');
    this.hud = this.scene.get('Hud');
    this.hud.events.once('create', () => this.syncHud());
  }

  // ---------------------------------------------------------------- scenario

  /**
   * Sfondo a parallasse con un numero variabile di layer (5, 7 o 8 secondo il
   * set). Ogni layer e' un tileSprite ancorato alla camera con
   * setScrollFactor(0): lo scorrimento apparente si ottiene spostando
   * tilePositionX in update(), cosi' l'immagine si ripete all'infinito
   * indipendentemente dalla lunghezza del livello.
   *
   * Il fattore di scorrimento e' interpolato fra CFG.parallax.farthest e
   * .nearest in base alla profondita' del layer: la stessa regola vale per
   * tutti i set, senza tabelle di valori per singola immagine.
   *
   * I layer da foregroundFrom in poi (gli sterpi della foresta notturna)
   * finiscono davanti al giocatore invece che dietro.
   */
  createParallax() {
    this.parallaxLayers = [];
    const n = this.bg.layers;

    for (let i = 1; i <= n; i++) {
      // t va da 0 (layer di fondo) a 1 (layer piu' vicino).
      const t = n > 1 ? (i - 1) / (n - 1) : 0;
      const factor = Phaser.Math.Linear(
        CFG.parallax.farthest,
        CFG.parallax.nearest,
        t
      );

      const isForeground =
        this.bg.foregroundFrom !== null && i >= this.bg.foregroundFrom;

      const layer = this.add
        .tileSprite(0, 0, CFG.width, CFG.height, BootScene.layerKey(this.level.background, i))
        .setOrigin(0, 0)
        .setScrollFactor(0)
        // Gli sfondi stanno sotto tutto (-100 in su), il primo piano sopra il
        // giocatore, che e' a depth 10.
        .setDepth(isForeground ? 20 + i : -100 + i);

      this.parallaxLayers.push({ sprite: layer, factor });
    }
  }

  /**
   * Collisione del pavimento.
   *
   * Il terreno e' gia' dipinto dentro i layer di parallasse, quindi qui serve
   * solo il corpo fisico: un rettangolo statico invisibile allineato alla
   * superficie calpestabile, esteso per tutta la lunghezza del livello.
   * Con CFG.debug attivo lo si vede evidenziato.
   */
  createGround() {
    const thickness = CFG.height - this.floorY;

    this.ground = this.add.rectangle(
      0,
      this.floorY,
      this.level.width,
      thickness,
      0xff0000,
      0
    );
    this.ground.setOrigin(0, 0);

    this.physics.add.existing(this.ground, true);
  }

  /** Piattaforme sospese, ricavate dai dati del livello. */
  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();

    for (const p of this.level.platforms) {
      const y = this.floorY - p.y;
      const plat = this.add
        .tileSprite(p.x, y, p.width, 32, Assets.KEYS.platform)
        .setOrigin(0, 0)
        .setDepth(8);

      this.physics.add.existing(plat, true);
      this.platforms.add(plat);
    }
  }

  createPlayer() {
    this.player = this.physics.add.sprite(240, this.floorY - 200, Assets.KEYS.player);
    this.player.setScale(CFG.player.scale);
    this.player.setDepth(10);
    this.player.setCollideWorldBounds(true);
    this.player.body.setGravityY(CFG.player.gravity);

    // Corpo piu' stretto dello sprite: i salti risultano meno severi.
    //
    // setSize/setOffset si esprimono in coordinate della texture, ma Arcade
    // Physics moltiplica poi il corpo per la scala dello sprite: le misure di
    // CFG, che sono in pixel a schermo, vanno quindi divise per la scala prima
    // di passarle e l'offset resta anch'esso in coordinate texture.
    // Il terzo argomento false disattiva il ricentraggio automatico, altrimenti
    // sovrascriverebbe l'offset impostato subito dopo.
    const bw = CFG.player.bodyWidth / CFG.player.scale;
    const bh = CFG.player.bodyHeight / CFG.player.scale;

    this.player.body.setSize(bw, bh, false);
    this.player.body.setOffset(
      (this.player.width - bw) / 2,
      this.player.height - bh
    );

    // Direzione di tiro, aggiornata a ogni input orizzontale.
    this.facing = 1;

    this.createPlayerParts();
  }

  /**
   * Testa e bacchetta, sprite distinti agganciati al corpo.
   *
   * Non sono figli di un Container perche' il corpo e' gia' un oggetto fisico:
   * li si riposiziona a ogni frame in updatePlayerParts(), che e' anche il
   * punto in cui si specchiano quando il mago cambia direzione.
   */
  createPlayerParts() {
    // Testa fotografica, ridimensionata rispetto alla larghezza delle spalle.
    this.head = this.add.image(0, 0, Assets.KEYS.head);
    this.head.setScale((CFG.player.headWidth / this.head.width));
    this.head.setDepth(11);

    // Bacchetta: l'immagine e' verticale con la stella in cima, mentre va
    // impugnata puntando in avanti. La rotazione la porta all'orizzontale e
    // l'origine sull'impugnatura, cosi' ruota attorno alla mano.
    this.wand = this.add.image(0, 0, Assets.KEYS.wand);
    this.wand.setScale(CFG.player.wandLength / this.wand.height);
    this.wand.setOrigin(0.5, 1);
    this.wand.setDepth(12);

    // Scarto angolare temporaneo impresso dal lancio.
    //
    // Vive in un oggetto proprio invece che direttamente sulla scena: i tween
    // di Phaser vogliono come target un oggetto semplice di cui animare una
    // proprieta', e passare la scena stessa non produce alcun avanzamento.
    this.wandSwing = { value: 0 };
  }

  /**
   * Incantesimi lanciati dalla bacchetta.
   *
   * Ogni incantesimo e' un corpo fisico che porta con se' un emitter: la
   * collisione resta quella di uno sprite (stessa logica del proiettile che
   * sostituisce), mentre la resa e' interamente particellare. Lo sprite
   * portante e' quindi invisibile e serve solo da ancora per la fisica.
   */
  createBullets() {
    this.bullets = this.physics.add.group({
      defaultKey: Assets.KEYS.spark,
      maxSize: 16,
      allowGravity: false,
    });
  }

  createBonuses() {
    this.bonuses = this.physics.add.group({ allowGravity: false, immovable: true });

    for (const b of this.level.bonuses) {
      const bonus = this.bonuses.create(b.x, this.floorY - b.y - 28, Assets.KEYS.bonus);
      bonus.setScale(CFG.entityScale);
      bonus.setDepth(9);

      // Oscillazione verticale: rende i bonus visibili senza costo di logica.
      this.tweens.add({
        targets: bonus,
        y: bonus.y - 20,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        // Sfasamento in base alla x, per evitare che pulsino all'unisono.
        delay: (b.x % 7) * 120,
      });
    }
  }

  /**
   * Bancomat, che ora avanzano lentamente verso il player.
   *
   * immovable:false li rende corpi dinamici, necessario perche' updateExplosives()
   * li sposti con setVelocityX(). Restano pero' "immovable" nei confronti del
   * player: e' onHitExplosive() a gestire il contatto (danno + distruzione),
   * non una collisione fisica che li farebbe scontrare come solidi.
   */
  createExplosives() {
    this.explosives = this.physics.add.group({ allowGravity: false, immovable: false });

    for (const e of this.level.explosives) {
      const ex = this.explosives.create(e.x, 0, Assets.KEYS.explosive);

      // Lo sprite e' verticale: lo si dimensiona per altezza, cosi' resta
      // in proporzione al mago qualunque sia la risoluzione dell'immagine.
      const scale = CFG.explosive.height / ex.height;
      ex.setScale(scale);
      ex.setDepth(9);

      // Appoggiato a terra: y del livello e' l'altezza da cui parte la base.
      ex.setY(this.floorY - e.y - (ex.height * scale) / 2);

      // Corpo rettangolare, un po' piu' stretto della grafica: evita colpi
      // percepiti come ingiusti sui bordi.
      ex.body.setSize(ex.width * 0.8, ex.height * 0.92, true);

      // Pumping: leggera pulsazione di scala, sfasata in base alla posizione
      // cosi' gli oggetti non respirano all'unisono.
      this.tweens.add({
        targets: ex,
        scaleX: scale * CFG.explosive.pumpScale,
        scaleY: scale * CFG.explosive.pumpScale,
        duration: CFG.explosive.pumpMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: (e.x % 5) * 120,
      });
    }
  }

  /**
   * Drop lasciati dai bancomat distrutti: monete (bonus) o cacche (malus).
   *
   * Un solo gruppo per entrambi i tipi: la distinzione fra i due avviene per
   * texture (spawnDrop() la legge in onCollectCoin/onHitPoop). Popolato a
   * runtime, quindi vuoto alla creazione del livello.
   */
  createDrops() {
    this.drops = this.physics.add.group({ allowGravity: false, immovable: true });
  }

  /**
   * Genera un drop nel punto in cui un bancomat e' stato distrutto.
   *
   * 50/50 fra moneta e cacca (CFG.explosive.dropChance). La moneta ondeggia
   * come le gemme bonus; la cacca resta ferma a terra, coerente con l'essere
   * un ostacolo/pericolo piuttosto che un premio.
   */
  spawnDrop(x, groundY) {
    const isCoin = Math.random() < CFG.explosive.dropChance;
    const key = isCoin ? Assets.KEYS.coin : Assets.KEYS.poop;

    const drop = this.drops.create(x, 0, key);
    const scale = CFG.explosive.dropHeight / drop.height;
    drop.setScale(scale);
    drop.setDepth(9);
    drop.isCoin = isCoin;

    // Appoggiato a terra, come i bancomat: dropHeight e' l'altezza a schermo.
    drop.setY(groundY - (drop.height * scale) / 2);
    drop.body.setSize(drop.width * 0.8, drop.height * 0.85, true);

    if (isCoin) {
      this.tweens.add({
        targets: drop,
        y: drop.y - CFG.drop.coinBobAmount,
        duration: CFG.drop.coinBobMs,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Traguardo: una colonna luminosa che chiude il livello. */
  createGoal() {
    const x = this.level.goal.x;
    this.goal = this.add.rectangle(x, this.floorY - 140, 32, 280, 0x6ee7b7, 0.85);
    this.goal.setDepth(9);
    this.physics.add.existing(this.goal, true);

    this.tweens.add({
      targets: this.goal,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Aquila e uova: elemento di difficolta' che punisce l'immobilita'.
   *
   * L'aquila e' un singolo sprite riusato a ogni attacco (non serve un pool:
   * ce n'e' al piu' una in scena per volta). Le uova invece stanno in un
   * gruppo fisico, perche' ce ne sono piu' d'una contemporaneamente durante
   * la raffica ed escono di scena in momenti diversi.
   */
  createEagle() {
    this.eagle = this.add.sprite(0, -200, Assets.KEYS.eagle);
    const scale = CFG.eagle.height / this.eagle.height;
    this.eagle.setScale(scale);
    this.eagle.setDepth(22);
    this.eagle.setVisible(false);

    this.eggs = this.physics.add.group({ allowGravity: false, immovable: true });
  }

  createEmitters() {
    // Esplosioni degli oggetti distrutti.
    this.explosionFx = this.add.particles(0, 0, Assets.KEYS.particle, {
      speed: { min: 180, max: 520 },
      lifespan: 520,
      quantity: 18,
      scale: { start: 2.8, end: 0 },
      tint: [0xffd24a, 0xf0776a, 0xc4453f],
      emitting: false,
    });
    this.explosionFx.setDepth(20);

    // Scintille alla raccolta di un bonus.
    this.pickupFx = this.add.particles(0, 0, Assets.KEYS.particle, {
      speed: { min: 100, max: 260 },
      lifespan: 380,
      quantity: 10,
      scale: { start: 2, end: 0 },
      tint: [0xffd24a, 0xfff3b0],
      emitting: false,
    });
    this.pickupFx.setDepth(20);

    // Lampo alla punta della bacchetta quando parte un incantesimo.
    this.castFx = this.add.particles(0, 0, Assets.KEYS.spark, {
      speed: { min: 60, max: 240 },
      lifespan: 320,
      scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x9b6cff, 0x63d6ff, 0xffffff],
      blendMode: 'ADD',
      emitting: false,
    });
    this.castFx.setDepth(13);

    // Dissolvenza magica quando l'incantesimo colpisce il bersaglio.
    this.spellHitFx = this.add.particles(0, 0, Assets.KEYS.spark, {
      speed: { min: 120, max: 420 },
      lifespan: 620,
      scale: { start: 2.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: [0x9b6cff, 0x63d6ff, 0xffffff, 0xd8b4ff],
      blendMode: 'ADD',
      emitting: false,
    });
    this.spellHitFx.setDepth(21);
  }

  createColliders() {
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.player, this.platforms);

    this.physics.add.overlap(this.player, this.bonuses, this.onCollectBonus, null, this);
    this.physics.add.overlap(this.player, this.explosives, this.onHitExplosive, null, this);
    this.physics.add.overlap(this.bullets, this.explosives, this.onBulletHitsExplosive, null, this);
    this.physics.add.overlap(this.player, this.drops, this.onTouchDrop, null, this);
    this.physics.add.overlap(this.player, this.goal, this.onReachGoal, null, this);
    this.physics.add.overlap(this.player, this.eggs, this.onHitEgg, null, this);
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyJump = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyFire = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);

    // Impedisce che spazio e frecce facciano scorrere la pagina.
    this.input.keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);

    // Overlay touch (joystick + salto/fuoco), solo su device che lo supportano.
    // handleMovement/handleJump/handleFire leggono sempre this.touch, che resta
    // null su desktop: nessun ramo if sparso nel resto della logica di input.
    this.touch = Touch.isTouchDevice() ? Touch.create() : null;
  }

  createCamera() {
    this.physics.world.setBounds(0, 0, this.level.width, CFG.height);
    this.cameras.main.setBounds(0, 0, this.level.width, CFG.height);
    // Il lerp orizzontale ammorbidisce l'inseguimento; quello verticale e'
    // pieno perche' la camera resta di fatto ferma in altezza.
    this.cameras.main.startFollow(this.player, true, 0.1, 1);
    // Sposta il giocatore a sinistra dello schermo: si vede di piu' davanti.
    this.cameras.main.setFollowOffset(-320, 0);
  }

  // ------------------------------------------------------------------- input

  update(time) {
    if (this.levelEnded) return;

    this.handleMovement();
    this.handleJump();
    this.handleFire(time);
    this.updatePlayerParts();
    this.updateParallax();
    this.updateBullets();
    this.updateExplosives();
    this.updateEagle(time);
    this.updateEggs();
    this.updateInvulnerability(time);
  }

  handleMovement() {
    const body = this.player.body;

    // Tastiera e touch sono entrambe sempre lette (this.touch e' null su
    // desktop): se una preme sinistra e l'altra destra nello stesso frame,
    // vince la tastiera, semplicemente perche' e' controllata per prima.
    const left = this.cursors.left.isDown || (this.touch && this.touch.left.isDown);
    const right = this.cursors.right.isDown || (this.touch && this.touch.right.isDown);

    // Il flip dello sprite lo applica updatePlayerParts() a partire da facing.
    if (left) {
      body.setVelocityX(-CFG.player.speed);
      this.facing = -1;
    } else if (right) {
      body.setVelocityX(CFG.player.speed);
      this.facing = 1;
    } else {
      body.setVelocityX(0);
    }

    if (!body.blocked.down && !body.touching.down) {
      this.player.anims.play('player-jump', true);
    } else if (body.velocity.x !== 0) {
      this.player.anims.play('player-run', true);
    } else {
      this.player.anims.play('player-idle', true);
    }
  }

  handleJump() {
    const onGround = this.player.body.blocked.down || this.player.body.touching.down;

    // Entrambe le fonti vanno interrogate sempre, non in corto circuito: sia
    // JustDown() che touch.jump.justDown() consumano il proprio flag interno,
    // quindi valutarne una sola quando l'altra e' gia' true lascerebbe il
    // flag inconsumato e pronto a scattare (in modo spurio) al frame dopo.
    const keyboardJump = Phaser.Input.Keyboard.JustDown(this.keyJump);
    const touchJump = this.touch ? this.touch.jump.justDown() : false;

    // JustDown evita il salto continuo tenendo premuto lo spazio/il pulsante.
    if (onGround && (keyboardJump || touchJump)) {
      this.player.body.setVelocityY(CFG.player.jumpVelocity);
      this.playSfx(Assets.SOUNDS.jump, 'jump');
    }
  }

  /**
   * Lancia un incantesimo dalla punta della bacchetta.
   *
   * Lo sprite portante resta invisibile: a rappresentare la magia e' l'emitter
   * che gli viene agganciato con startFollow, cosi' la scia insegue il corpo
   * fisico senza che la logica di collisione debba conoscere le particelle.
   */
  handleFire(time) {
    // Entrambe le fonti vanno interrogate sempre: vedi il commento in
    // handleJump() sul perche' non si puo' usare un corto circuito qui.
    const keyboardFire = Phaser.Input.Keyboard.JustDown(this.keyFire);
    const touchFire = this.touch ? this.touch.fire.justDown() : false;

    if (!keyboardFire && !touchFire) return;
    if (time < this.lastFiredAt + CFG.bullet.cooldownMs) return;

    this.lastFiredAt = time;

    const tip = this.wandTip();
    const spell = this.bullets.get(tip.x, tip.y);
    if (!spell) return;

    this.playSfx(Assets.SOUNDS.shot, 'shot');

    spell.setActive(true).setVisible(false);
    spell.body.reset(tip.x, tip.y);
    spell.body.setAllowGravity(false);
    spell.body.setSize(CFG.bullet.hitSize, CFG.bullet.hitSize, true);
    spell.setVelocityX(this.facing * CFG.bullet.speed);
    // Origine del colpo: serve a scartare gli incantesimi fuori portata.
    spell.originX = spell.x;

    // Scia: un emitter per incantesimo, distrutto insieme a esso.
    spell.trail = this.add.particles(0, 0, Assets.KEYS.spark, {
      speed: { min: 20, max: 90 },
      lifespan: 420,
      frequency: 14,
      quantity: 2,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 0.95, end: 0 },
      tint: [0x9b6cff, 0x63d6ff, 0xffffff, 0xd8b4ff],
      blendMode: 'ADD',
    });
    spell.trail.setDepth(12);
    spell.trail.startFollow(spell);

    // Lampo alla punta della bacchetta, nel momento del lancio.
    this.castFx.emitParticleAt(tip.x, tip.y, 14);

    this.swingWand();
  }

  /**
   * Colpo di bacchetta: la punta scatta all'indietro e rientra oscillando.
   *
   * Anima wandSwing, che updatePlayerParts() somma alla rotazione di base:
   * cosi' l'oscillazione resta indipendente dalla direzione in cui guarda la
   * maga e non va riscritta a ogni cambio di verso.
   */
  swingWand() {
    if (this.wandSwingTween) this.wandSwingTween.stop();

    this.wandSwing.value = -CFG.player.wandSwing;
    this.wandSwingTween = this.tweens.add({
      targets: this.wandSwing,
      value: 0,
      duration: CFG.player.wandSwingMs,
      ease: 'Back.easeOut',
      // Azzera comunque a fine corsa: l'easing con rimbalzo puo' fermarsi a
      // una frazione di grado dallo zero, e la bacchetta resterebbe storta.
      onComplete: () => { this.wandSwing.value = 0; },
    });
  }

  /** Punta della bacchetta, da cui parte l'incantesimo. */
  wandTip() {
    return {
      x: this.player.x + this.facing * (CFG.player.handOffsetX + CFG.player.wandLength),
      y: this.player.y + CFG.player.handOffsetY,
    };
  }

  // ------------------------------------------------------------------ update

  /**
   * Riaggancia testa e bacchetta al corpo.
   *
   * Il corpo ha origine centrale, quindi player.y e' il centro dello sprite:
   * la testa va sopra il bordo superiore, la bacchetta all'altezza della mano.
   * Entrambe seguono this.facing, cosi' il mago punta sempre dove si muove.
   */
  updatePlayerParts() {
    const p = this.player;
    const halfH = (p.height * CFG.player.scale) / 2;
    const dir = this.facing;

    // Il corpo segue sempre la direzione, anche da fermo: cosi' il braccio che
    // impugna la bacchetta resta dallo stesso lato in cui punta la magia.
    p.setFlipX(dir < 0);

    // Testa appoggiata sulle spalle, leggermente avanzata nel verso di marcia.
    // head.png ritrae il volto gia' rivolto a destra, quindi si specchia
    // quando la maga va a sinistra.
    this.head.setPosition(
      p.x + dir * CFG.player.headOffsetX,
      p.y - halfH + CFG.player.headOffsetY
    );
    this.head.setFlipX(dir < 0);

    // Mano all'altezza del petto, sul lato verso cui guarda.
    this.wand.setPosition(
      p.x + dir * CFG.player.handOffsetX,
      p.y + CFG.player.handOffsetY
    );
    // L'immagine e' verticale con la stella in alto e l'origine sul manico:
    // +90 gradi la fa puntare a destra, -90 a sinistra. wandSwing e' lo
    // scarto temporaneo impresso dal lancio di un incantesimo.
    const base = (dir > 0 ? 1 : -1) * Math.PI / 2;
    this.wand.setRotation(base + dir * this.wandSwing.value);

    // Durante l'invulnerabilita' il corpo lampeggia: testa e bacchetta devono
    // seguire, altrimenti restano visibili mentre il resto sparisce.
    this.head.setAlpha(p.alpha);
    this.wand.setAlpha(p.alpha);
  }

  updateParallax() {
    const scrollX = this.cameras.main.scrollX;

    for (const { sprite, factor } of this.parallaxLayers) {
      sprite.tilePositionX = scrollX * factor;
    }
  }

  /** Ricicla i proiettili usciti dal mondo o oltre la gittata massima. */
  updateBullets() {
    for (const bullet of this.bullets.getChildren()) {
      if (!bullet.active) continue;

      const traveled = Math.abs(bullet.x - bullet.originX);
      const outOfWorld = bullet.x < 0 || bullet.x > this.level.width;

      if (traveled > CFG.bullet.maxRange || outOfWorld) {
        this.disableBullet(bullet);
      }
    }
  }

  /**
   * Fa avanzare ogni bancomat verso la posizione attuale del player.
   *
   * Solo movimento orizzontale: l'ostacolo resta alla sua quota, coerente con
   * l'essere appoggiato a terra o su una piattaforma. Sotto chaseStopDistance
   * si ferma, altrimenti continuerebbe a spingere il player una volta a contatto.
   *
   * Nessun limite di raggio: ogni bancomat del livello insegue fin dall'inizio,
   * indipendentemente da quanto e' lontano dal player.
   */
  updateExplosives() {
    for (const ex of this.explosives.getChildren()) {
      const dx = this.player.x - ex.x;

      if (Math.abs(dx) < CFG.explosive.chaseStopDistance) {
        ex.body.setVelocityX(0);
      } else {
        ex.body.setVelocityX(Math.sign(dx) * CFG.explosive.chaseSpeed);
      }
    }
  }

  /**
   * Traccia l'immobilita' del player e invoca l'aquila quando si protrae
   * oltre idleTriggerMs.
   *
   * "Fermo" = nessun input orizzontale e a terra: un player a mezz'aria dopo
   * un salto non deve essere punito solo perche' non sta premendo una freccia.
   * idleSince si azzera appena il player si muove o salta, cosi' il timer
   * riparte da capo a ogni interruzione dell'immobilita'.
   */
  updateEagle(time) {
    const body = this.player.body;
    const isIdle = body.velocity.x === 0 && (body.blocked.down || body.touching.down);

    if (!isIdle) {
      this.idleSince = null;
      return;
    }
    if (this.idleSince === null) this.idleSince = time;

    if (
      !this.eagleActive &&
      time >= this.eagleCooldownUntil &&
      time - this.idleSince >= CFG.eagle.idleTriggerMs
    ) {
      this.launchEagleAttack();
    }
  }

  /**
   * Fa entrare l'aquila dall'alto, sorvolare il player e uscire dal lato
   * opposto, lasciando cadere una raffica di uova durante il sorvolo.
   *
   * L'attraversamento e' orizzontale sull'intera larghezza dello schermo (in
   * coordinate di mondo, calcolate dallo scroll della camera): cosi' l'aquila
   * e' visibile dall'ingresso all'uscita qualunque sia la posizione del player.
   */
  /**
   * L'aquila entra da un lato, vola dritta sopra il player (non attraversa
   * tutto lo schermo lanciando lungo il tragitto: punta la sua x e lascia
   * cadere li' la raffica), poi esce dal lato opposto.
   *
   * Il bersaglio si fissa all'istante del lancio: l'aquila non insegue il
   * player durante l'attacco, cosi' spostarsi subito e' sempre una difesa
   * valida contro le uova gia' in volo, anche se non contro quelle non ancora
   * lanciate (l'attacco resta prevedibile una volta scattato).
   */
  launchEagleAttack() {
    this.eagleActive = true;

    const scrollX = this.cameras.main.scrollX;
    const targetX = this.player.x;
    const fromRight = this.facing >= 0;
    const startX = scrollX + (fromRight ? CFG.width + 100 : -100);
    const endX = scrollX + (fromRight ? -100 : CFG.width + 100);
    const y = this.floorY - CFG.eagle.flyY;

    this.eagle.setPosition(startX, y);
    this.eagle.setFlipX(fromRight);
    this.eagle.setVisible(true);
    this.eagle.setDepth(22);

    // Tre tappe: fino sopra il player, pausa per la raffica, poi l'uscita.
    // La velocita' di volo resta quella configurata; solo la sosta centrale
    // ha una durata propria, cosi' la raffica ha tempo di lanciarsi tutta.
    const inMs = (Math.abs(targetX - startX) / CFG.eagle.speed) * 1000;
    const outMs = (Math.abs(endX - targetX) / CFG.eagle.speed) * 1000;
    const burstMs = (CFG.eagle.eggCount - 1) * CFG.eagle.eggIntervalMs + 300;

    this.tweens.chain({
      targets: this.eagle,
      tweens: [
        { x: targetX, duration: inMs, ease: 'Linear' },
        { x: targetX, duration: burstMs }, // sosta: nessuno spostamento
        { x: endX, duration: outMs, ease: 'Linear' },
      ],
      onComplete: () => {
        this.eagle.setVisible(false);
        this.eagleActive = false;
        this.eagleCooldownUntil = this.time.now + CFG.eagle.cooldownMs;
      },
    });

    // La raffica parte quando l'aquila e' arrivata sopra il player (dopo inMs),
    // non da subito. Un piccolo jitter orizzontale evita che le uova cadano
    // tutte sullo stesso identico pixel.
    for (let i = 0; i < CFG.eagle.eggCount; i++) {
      this.time.delayedCall(inMs + i * CFG.eagle.eggIntervalMs, () => {
        if (this.levelEnded) return;
        const jitter = (i - (CFG.eagle.eggCount - 1) / 2) * 40;
        this.dropEgg(this.eagle.x + jitter, this.eagle.y);
      });
    }
  }

  /** Genera un uovo nel punto in cui si trova l'aquila in quel momento. */
  dropEgg(x, y) {
    const egg = this.eggs.create(x, y, Assets.KEYS.egg);
    egg.setScale(CFG.egg.height / egg.height);
    egg.setDepth(21);
    egg.body.setAllowGravity(false);
    egg.body.setVelocityY(CFG.egg.fallSpeed);

    this.tweens.add({
      targets: egg,
      angle: 360,
      duration: 500,
      repeat: -1,
      ease: 'Linear',
    });
  }

  /**
   * Rimuove le uova uscite dal mondo (sotto il pavimento o oltre i bordi):
   * senza questo, un uovo che manca il player resterebbe in memoria per sempre.
   */
  updateEggs() {
    for (const egg of this.eggs.getChildren()) {
      if (egg.y > this.floorY + 100) egg.destroy();
    }
  }

  /**
   * Ritira un incantesimo esaurito.
   *
   * L'emitter della scia va staccato e distrutto, altrimenti resterebbe
   * appeso allo sprite riciclato dal pool e continuerebbe a emettere.
   * stop() lascia sfumare le particelle gia' emesse invece di farle sparire
   * di colpo; la distruzione avviene a dissolvenza completata.
   */
  disableBullet(spell) {
    spell.setActive(false).setVisible(false);
    spell.body.stop();

    if (spell.trail) {
      const trail = spell.trail;
      spell.trail = null;
      trail.stopFollow();
      trail.stop();
      this.time.delayedCall(500, () => trail.destroy());
    }
  }

  /** Lampeggio durante l'invulnerabilita', con ripristino alla scadenza. */
  updateInvulnerability(time) {
    if (this.invulnerableUntil === 0) return;

    if (time >= this.invulnerableUntil) {
      this.invulnerableUntil = 0;
      this.player.setAlpha(1);
      return;
    }

    this.player.setAlpha(Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
  }

  // --------------------------------------------------------------- collisioni

  onCollectBonus(player, bonus) {
    this.pickupFx.emitParticleAt(bonus.x, bonus.y);
    bonus.destroy();
    this.playSfx(Assets.SOUNDS.coin, 'coin');

    this.score += CFG.scoring.bonus;
    this.syncHud();
  }

  /**
   * Il proiettile fa esplodere la mina: punti al giocatore, nessun danno.
   * Il controllo su bullet.active evita che un singolo colpo, sovrapposto a
   * due mine nello stesso frame, venga conteggiato due volte.
   */
  onBulletHitsExplosive(bullet, explosive) {
    if (!bullet.active) return;

    this.disableBullet(bullet);
    // Doppio effetto: la dissolvenza magica dell'incantesimo sopra i detriti
    // dell'oggetto che si sfascia.
    this.spellHitFx.emitParticleAt(explosive.x, explosive.y, 26);
    this.explosionFx.emitParticleAt(explosive.x, explosive.y);
    // La x resta quella dell'esplosione (il bancomat puo' essersi spostato
    // inseguendo il player), ma il drop va appoggiato a terra: floorY, non
    // explosive.y, che e' il centro dello sprite a mezz'aria.
    this.spawnDrop(explosive.x, this.floorY);
    explosive.destroy();
    this.playSfx(Assets.SOUNDS.explosion, 'explosion');

    this.cameras.main.shake(120, 0.006);
    this.score += CFG.scoring.explosiveDestroyed;
    this.syncHud();
  }

  /**
   * Contatto con un drop lasciato da un bancomat: moneta o cacca.
   * isCoin, impostato in spawnDrop(), distingue premio da penalita'.
   */
  onTouchDrop(player, drop) {
    if (drop.isCoin) {
      this.pickupFx.emitParticleAt(drop.x, drop.y);
      drop.destroy();
      this.playSfx(Assets.SOUNDS.coin, 'coin');
      this.score += CFG.drop.coinScore;
      this.syncHud();
    } else {
      if (this.time.now < this.invulnerableUntil) return;
      this.explosionFx.emitParticleAt(drop.x, drop.y);
      drop.destroy();
      this.damagePlayer();
    }
  }

  /** Contatto con una mina intatta: costa una vita. */
  onHitExplosive(player, explosive) {
    if (this.time.now < this.invulnerableUntil) return;

    this.explosionFx.emitParticleAt(explosive.x, explosive.y);
    explosive.destroy();
    this.damagePlayer();
  }

  /** Un uovo colpisce il player: stessa gravita' del contatto col bancomat. */
  onHitEgg(player, egg) {
    if (this.time.now < this.invulnerableUntil) return;

    this.explosionFx.emitParticleAt(egg.x, egg.y);
    egg.destroy();
    this.damagePlayer();
  }

  damagePlayer() {
    this.lives -= 1;
    this.invulnerableUntil = this.time.now + CFG.player.invulnerableMs;
    this.playSfx(Assets.SOUNDS.hurt, 'hurt');

    this.cameras.main.shake(200, 0.012);
    this.cameras.main.flash(160, 200, 60, 60);

    // Contraccolpo all'indietro, per staccare il giocatore dal pericolo.
    this.player.body.setVelocity(-this.facing * 460, -320);
    this.syncHud();

    if (this.lives <= 0) this.endLevel(false);
  }

  onReachGoal() {
    if (this.levelEnded) return;
    this.score += CFG.scoring.levelComplete;
    this.syncHud();
    this.playSfx(Assets.SOUNDS.victory, 'victory');
    this.endLevel(true);
  }

  // -------------------------------------------------------------------- esiti

  endLevel(won) {
    this.levelEnded = true;
    this.player.body.setVelocity(0, 0);
    this.player.body.setAllowGravity(false);
    this.physics.pause();

    const hasNext = won && this.levelIndex + 1 < LEVELS.length;
    this.hud.showEndMessage(won, this.score, hasNext);

    // Vinto: si prosegue col livello successivo mantenendo il punteggio.
    // Perso, o finiti i livelli: si ricomincia da capo.
    const next = hasNext
      ? { levelIndex: this.levelIndex + 1, score: this.score }
      : { levelIndex: 0, score: 0 };

    // I listener si registrano subito, ma ignorano l'input finche' non e'
    // passata la finestra di cortesia: cosi' la schermata di fine partita non
    // viene saltata dal tasto/tocco ancora attivo al momento della morte.
    //
    // La finestra si misura con Date.now() e non con this.time.delayedCall():
    // i timer di Phaser avanzano solo dentro update(), quindi se il gioco
    // perde frame l'attesa si dilata e il listener non verrebbe mai armato,
    // lasciando la partita bloccata sul game over.
    const acceptFrom = Date.now() + CFG.restartDelayMs;
    let restarted = false;

    const restart = () => {
      if (Date.now() < acceptFrom || restarted) return;
      restarted = true;

      this.input.keyboard.off('keydown', restart);
      window.removeEventListener('touchend', restart);
      this.scene.stop('Hud');
      this.scene.restart(next);
    };

    // Su desktop c'e' la tastiera; su mobile non esiste alcun keydown, quindi
    // senza questo secondo listener il gioco resta bloccato per sempre sulla
    // schermata di fine partita (il bug che si voleva risolvere qui).
    // touchend, non touchstart: evita che lo stesso tocco che ha appena perso
    // la partita (es. rilascio del joystick) faccia scattare subito il restart.
    this.input.keyboard.on('keydown', restart);
    window.addEventListener('touchend', restart);
  }

  syncHud() {
    if (this.hud) this.hud.updateStats(this.score, this.lives);
  }

  /**
   * Riproduce un effetto sonoro con il volume dedicato in CFG.sfxVolume.
   * Punto unico invece di chiamare this.sound.play() sparso nel codice: se in
   * futuro serve un mute globale o un volume master, si tocca solo qui.
   */
  playSfx(key, volumeKey) {
    this.sound.play(key, { volume: CFG.sfxVolume[volumeKey] });
  }
}
