# Game1 — Platform a scorrimento orizzontale

Gioco 2D a scorrimento orizzontale in **Phaser 3.90**, senza build step:
si apre `index.html` e funziona.

## Come si gioca

| Tasto | Azione |
|---|---|
| ← → | Movimento |
| SPAZIO | Salto |
| Z | Fuoco |

Su device touch (telefoni/tablet) compaiono in automatico un joystick fisso
in basso a sinistra per il movimento e due pulsanti fissi in basso a destra
per salto e fuoco — vedi [Controlli touch](#controlli-touch).

Impersoni una maga con bacchetta. Obiettivo: raggiungere il traguardo in fondo
al livello raccogliendo più punti possibile.

- **Gemme gialle** — si raccolgono al contatto: +100 punti.
- **Bancomat** — avanzano lentamente verso il player. Vanno distrutti con un
  incantesimo (Z): +250 punti, e lasciano cadere una moneta (+150 punti extra)
  o una cacca (una vita persa al contatto), 50/50 a caso. Toccarli intatti
  costa una vita; in alternativa si possono scavalcare saltando.
- **Traguardo** — colonna verde a fine livello: +1000 punti.

La bacchetta punta sempre nella direzione di marcia, e l'incantesimo parte
dalla sua punta.

Si parte con 3 vite. Dopo un colpo il giocatore resta invulnerabile ~1,2 s
(lampeggia). Completando un livello si passa al successivo mantenendo il
punteggio; a vite esaurite si ricomincia da capo.

I tre livelli usano i tre scenari: colline → città → foresta notturna.

## Avvio

Serve un server HTTP (con `file://` il browser blocca il caricamento delle
immagini). In locale il progetto è già servito da Apache: basta l'URL del
vhost (es. `http://localhost/game1/`), senza avviare nulla a parte.

In produzione: `magicwand.mz-lab.eu` (ISPConfig, utente `web8`).

## Struttura

```
index.html          markup e ordine di caricamento degli script
lib/phaser.min.js   Phaser 3.90 (locale, nessuna CDN)
src/
  config.js         parametri regolabili (fisica, punteggi, parallasse)
  backgrounds.js    manifest degli sfondi: layer, quota pavimento, primo piano
  assets.js         texture generate a runtime (corpo, gemme, particelle)
  level.js          i tre livelli come dati puri
  touch.js          controlli touch (joystick + pulsanti), overlay HTML
  scoreApi.js       client per l'endpoint dei punteggi (fetch verso api/)
  main.js           bootstrap di Phaser
  scenes/
    StartScene.js   schermata iniziale (copertina + invito a iniziare)
    BootScene.js    caricamento sfondi e definizione animazioni
    GameScene.js    mondo, giocatore, collisioni, punteggio
    HudScene.js     interfaccia sovrapposta, incluso game over + classifica
api/
  score.php         endpoint REST (GET classifica, POST nuovo punteggio)
  score.sqlite      database, generato al primo avvio — non versionato
  .htaccess         nega l'accesso diretto al file .sqlite via URL
assets/
  bg/{forest,city,night}/layer_NN.png    sfondi pronti all'uso
  game/{head,wand,atm,bomb,startingpage,lastpage}.png/.jpg   asset di gioco, ritagliati
  sprites/                               asset originali come scaricati
```

## Gli sfondi

Set *Forest Game Background* di Mobile Game Graphics, tre scenari:

| Chiave | Scenario | Layer | Pavimento a y |
|---|---|---|---|
| `forest` | Colline al tramonto | 5 | 910 |
| `city` | Città al tramonto | 8 | 841 |
| `night` | Foresta notturna | 7 | 795 |

**Il pavimento è dipinto dentro i layer**, non è una tile separata: il gioco non
disegna alcun terreno: mette solo un corpo di collisione invisibile alla quota
`groundY` dichiarata in [src/backgrounds.js](src/backgrounds.js). Quelle quote
sono state misurate sui PNG analizzando il canale alfa, colonna per colonna.

Gli asset originali numerano i layer **in ordine opposto da un set all'altro**
(in *Background 01* l'indice cresce dallo sfondo al primo piano, in *03* e *07*
il contrario). I file in `assets/bg/` sono già stati rinormalizzati su
un'unica convenzione — `layer_01` = il più lontano — quindi il codice non ha
casi speciali. Normalizzata anche una anomalia dell'originale: un layer di
*Background 01* era largo 1922px invece di 1920.

`night` ha una particolarità: il suo layer più vicino non è il pavimento ma un
boschetto di sterpi, che va disegnato **davanti** al giocatore. Se ne occupa il
campo `foregroundFrom` del manifest.

### Quota dei bancomat

Tutti a `y: 40` su ogni livello, appoggiati come in `forest`. L'altezza del
bancomat (`CFG.explosive.height`, 150px) basta da sola a superarli sopra la
vegetazione di `city` e `night` — non serve sollevarli oltre.

### Usare un altro sfondo

Cambia il campo `background` del livello in [src/level.js](src/level.js) con una
delle tre chiavi. Le quote delle entità sono espresse come *altezza dal
pavimento*, quindi il layout resta valido anche se il nuovo scenario ha il
terreno a un'altra quota.

### Aggiungere uno scenario

1. Metti i PNG in `assets/bg/<nome>/` come `layer_01.png` … `layer_NN.png`,
   ordinati dal più lontano al più vicino.
2. Aggiungi la voce in `BACKGROUNDS` con `layers`, `groundY` e
   `foregroundFrom` (o `null`).

Per misurare `groundY` su un asset nuovo, cerca la prima riga in cui il canale
alfa diventa pieno su tutta la larghezza del layer del terreno.

## Il personaggio

La maga è composta da tre pezzi distinti, non da un unico sprite:

| Pezzo | Origine | Come è gestito |
|---|---|---|
| Testa | `assets/game/head.png` | Foto ritagliata, agganciata sopra le spalle |
| Corpo | disegnato a runtime | Tunica viola, 4 frame di animazione |
| Bacchetta | `assets/game/wand.png` | Ruotata all'orizzontale, impugnata in avanti |

Testa e bacchetta non sono figli di un Container: il corpo è già un oggetto
fisico, quindi vengono riposizionati a ogni frame in `updatePlayerParts()`,
che è anche il punto dove si specchiano al cambio di direzione.

Un dettaglio non ovvio: `wand.png` è disegnata **verticale con la stella in
alto**, quindi l'origine è fissata sull'impugnatura e la rotazione è ±90° per
farla puntare avanti.

Le proporzioni si regolano da [src/config.js](src/config.js): `headWidth`,
`wandLength` e gli offset di testa e mano. `handOffsetY` è negativo perché il
braccio è disegnato sopra la metà del corpo.

### L'oscillazione della bacchetta

A ogni incantesimo la punta scatta all'indietro e rientra con un piccolo
rimbalzo (`Back.easeOut`). L'ampiezza e la durata sono `wandSwing` e
`wandSwingMs`.

Lo scarto è animato su `this.wandSwing.value` — un oggetto dedicato, non una
proprietà della scena: i tween di Phaser vogliono come target un oggetto
semplice, e passare la scena stessa non produce alcun avanzamento.
`updatePlayerParts()` somma quel valore alla rotazione di base, così
l'oscillazione resta indipendente dalla direzione in cui guarda la maga.

### L'incantesimo

Sostituisce il vecchio proiettile e ha lo stesso effetto sugli ostacoli. Lo
sprite portante è **invisibile**: serve solo da ancora per la fisica, mentre la
magia è resa da tre emitter di particelle — il lampo al lancio (`castFx`), la
scia che insegue l'incantesimo (`trail`, uno per colpo) e la dissolvenza
all'impatto (`spellHitFx`).

Ogni scia viene distrutta quando l'incantesimo si esaurisce (`disableBullet`),
altrimenti resterebbe appesa allo sprite riciclato dal pool.

### Il bancomat

`atm.png` sostituisce le vecchie mine. È dimensionato **per altezza**
(`CFG.explosive.height`) perché l'immagine è verticale, e pulsa leggermente con
un tween di scala (`pumpScale`, `pumpMs`), sfasato in base alla posizione così
gli oggetti non respirano all'unisono.

Ogni bancomat avanza lentamente verso il player (`updateExplosives()`,
chiamato a ogni frame), solo in orizzontale: resta alla sua quota, coerente con
l'essere appoggiato a terra o su una piattaforma. La velocità è
`CFG.explosive.chaseSpeed` — molto più bassa di quella del player, così resta
un ostacolo da scavalcare con un salto e non un nemico da cui scappare.
Nessun limite di raggio: ogni bancomat del livello insegue fin dall'inizio.

Sotto `chaseStopDistance` smette di avanzare, altrimenti continuerebbe a
spingere il player una volta a contatto. Il gruppo non è più `immovable`
(necessario perché `updateExplosives()` lo sposti con `setVelocityX`), ma il
contatto col player resta gestito da `onHitExplosive()` via `overlap`, non da
un collider fisico: i due non si spingono a vicenda.

### Il drop: moneta, bomba o cacca

Quando un incantesimo distrugge un bancomat, `onBulletHitsExplosive()` chiama
`spawnDrop()`, che genera un solo gruppo fisico per tre esiti possibili,
distinti dalla stringa `drop.dropType` letta in `onTouchDrop()`:

- **moneta** (`euro.png`) — `CFG.explosive.dropChance` di probabilità (50%).
  Bonus: `CFG.drop.coinScore` punti aggiuntivi ai 250 della distruzione.
- **bomba** (`bomb.png`) — della quota restante,
  `CFG.explosive.bombChance` di probabilità (10%: 5% sul totale). Raccoglierla
  chiama `triggerBomb()`, che distrugge **tutti** i bancomat ancora vivi nel
  livello con lo stesso punteggio ed effetti di un colpo singolo, più
  `CFG.drop.bombScore` di bonus. Deliberatamente rara: è il drop più potente
  del gioco, spazza via l'intero livello in un colpo.
- **cacca** (`cacca.png`) — il resto della quota malus (45%). Al contatto
  funziona come un bancomat intatto: una vita persa, rispettando la finestra
  di invulnerabilità.

Il drop appare **nel punto x dell'esplosione ma alla quota del pavimento**
(`this.floorY`, non `explosive.y`): il bancomat può essersi spostato inseguendo
il player e trovarsi a mezz'aria rispetto allo sprite, ma il drop deve comunque
appoggiarsi a terra. Resta lì finché il player non lo raccoglie/tocca — nessun
timer di scomparsa, coerente con gemme e bancomat che già non scadono.

Moneta e bomba ondeggiano come le gemme bonus (`coinBobAmount`, `coinBobMs`),
per leggersi entrambe come "premio da raccogliere"; la cacca resta ferma a
terra, coerente con l'essere un pericolo.

`triggerBomb()` **non richiama `spawnDrop()`** sui bancomat che distrugge: la
bomba spazza via gli ostacoli, non ne genera altri a cascata.

## Sprite ancora segnaposto

Corpo della maga, gemme, piattaforme e particelle sono disegnati a runtime da
[src/assets.js](src/assets.js). Per sostituirli:

1. Metti i file in `assets/sprites/`.
2. In [src/scenes/BootScene.js](src/scenes/BootScene.js) aggiungi il `load`.
3. In `Assets.generateAll()` togli la corrispondente `make*()`.

| File | Dimensioni | Note |
|---|---|---|
| `player.png` | 40 × 56 per frame | 4 frame: idle, corsa ×2, salto. **Senza testa** |
| `bonus.png` | 28 × 28 | |

Il corpo è disegnato a scala 3× (`CFG.player.scale`) per stare in proporzione
agli sfondi a piena risoluzione. Con un asset nativamente più grande, riduci
quella scala e adegua `bodyWidth`/`bodyHeight`.

## Effetti sonori

Sei SFX in `assets/audio/`, tutti CC0 (fonti e licenze in
[assets/audio/CREDITS.md](assets/audio/CREDITS.md)):

| File | Evento | Punto in GameScene.js |
|---|---|---|
| `coin` | Raccolta gemma o moneta drop | `onCollectBonus`, `onTouchDrop` (ramo `dropType === 'coin'`) |
| `explosion` | Bancomat distrutto con l'incantesimo | `onBulletHitsExplosive` |
| `shot` | Lancio dell'incantesimo | `handleFire` |
| `hurt` | Perdita di una vita | `damagePlayer` — un solo punto, richiamato da tutte e tre le fonti di danno (bancomat, cacca, uovo) |
| `jump` | Salto | `handleJump` |
| `victory` | Traguardo raggiunto | `onReachGoal` (non in `endLevel`, che gestisce anche la sconfitta) |

Ogni chiave sta in `Assets.SOUNDS`, separato da `Assets.KEYS`: quest'ultimo ha
già `coin` come nome della *texture* della moneta drop (`euro.png`), un nome
diverso nello stesso oggetto avrebbe creato un conflitto.

**Punto unico di riproduzione**: `GameScene.playSfx(key, volumeKey)`, non
`this.sound.play()` sparso nel codice — se in futuro serve un mute globale o
un volume master, si tocca solo lì. Il volume di ciascun effetto è in
`CFG.sfxVolume`.

I file sono caricati in coppia mp3+ogg (`this.load.audio(key, [mp3, ogg])` in
BootScene): Phaser sceglie il primo formato che il browser sa decodificare.
Il mp3 viene prima nell'array perché copre anche Safari/iOS, dove il supporto
per ogg è storicamente incompleto.

## Fine partita e riavvio

Alla sconfitta o al completamento di un livello la fisica va in pausa e
compare la schermata di fine partita. Il comportamento dipende da `hasNext`
(esiste un livello successivo):

- **Livello intermedio** (`hasNext=true`): comportamento originale, invariato.
  Un tasto o un tocco qualsiasi prosegue al livello successivo. Per i primi
  `CFG.restartDelayMs` (700ms) l'input è ignorato, così la schermata non viene
  saltata dal tasto/tocco ancora attivo al momento della morte.
- **Esito finale** (`hasNext=false`: game over, o vittoria dell'ultimo
  livello — l'unico caso in cui il punteggio è davvero definitivo): mostra la
  classifica (vedi sotto), niente più "premi un tasto qualsiasi". Il
  proseguimento passa da un pulsante "Continua" esplicito dentro `HudScene`,
  perché un tasto premuto mentre si scrive il nick non deve far ripartire la
  partita.

Tre dettagli che hanno causato altrettanti bug, tutti risolti:

- **La finestra di attesa usa `Date.now()`, non `this.time.delayedCall()`.**
  I timer di Phaser avanzano solo dentro `update()`: se il gioco perde frame,
  l'attesa si dilata a piacere e il listener non viene mai registrato — la
  partita resta bloccata sul game over, senza modo di ripartire.
- **`syncHud()` attende l'evento `create` dell'HUD.** `scene.launch()` è
  asincrono, e al riavvio la vecchia istanza può essere ancora in fase di
  distruzione: aggiornarne i testi solleva un errore, perché la loro texture
  interna è già stata liberata.
- **Il riavvio ascoltava solo `keydown`.** Su mobile non c'è tastiera: senza
  un secondo listener su `touchend`, il gioco restava bloccato per sempre sulla
  schermata di fine partita — non un edge case, il flusso normale su ogni
  device touch. `touchend` (non `touchstart`) evita che lo stesso tocco che ha
  appena causato la sconfitta (es. il rilascio del joystick) faccia scattare
  subito il restart. Un flag `restarted` impedisce che i due listener (tastiera
  e touch) richiamino `scene.restart()` due volte se scattano quasi assieme.

## Schermata iniziale

[src/scenes/StartScene.js](src/scenes/StartScene.js): mostra `startingpage.jpg`
(1920×1080, stessa risoluzione del gioco — nessuno scaling necessario) e
attende un tasto o un tocco, con la stessa logica anti tocco-accidentale del
game over (finestra di cortesia `CFG.restartDelayMs`, `Date.now()` non
`delayedCall`). È la prima scena della sequenza (`main.js`): precede
`BootScene`.

## Classifica e punteggi (high-score)

**Nessuna protezione anti-cheat.** L'endpoint (`api/score.php`) accetta
qualunque punteggio via richiesta HTTP diretta, senza validare che provenga
da una vera sessione di gioco — scelta deliberata per un gioco amatoriale, non
una svista. Se in futuro servisse irrobustirlo, il punto da toccare è solo
quello: il client non sa nulla di come i punteggi vengono verificati.

**Backend**: PHP + SQLite (`api/score.sqlite`, un singolo file, creato al
primo avvio — non versionato, escluso via `.gitignore`). Un solo endpoint,
due metodi:

- `GET api/score.php` → `{"scores": [...]}`, i migliori 10 per punteggio
  decrescente.
- `POST api/score.php` con `{"nick", "score", "level"}` → salva una riga.

Il file `.sqlite` è protetto da accesso diretto via URL da
[api/.htaccess](api/.htaccess) (`Require all denied` su `*.sqlite`): non c'è
modo pulito in questo setup di tenerlo fuori dalla document root, quindi si
nega l'accesso invece di spostarlo.

**Un bug non ovvio incontrato in sviluppo**: la colonna `created_at` con
default `datetime("now")` fallisce in SQLite (`default value of column
[created_at] is not constant`) — SQLite accetta come default solo espressioni
letteralmente costanti, non funzioni arbitrarie. La sintassi corretta è
`DEFAULT CURRENT_TIMESTAMP`, il keyword nativo di SQLite per questo scopo.

**Client**: [src/scoreApi.js](src/scoreApi.js), un modulo che non lancia mai
(restituisce array/booleano anche in caso di errore di rete): l'HUD non deve
avvolgere ogni chiamata in un try/catch, un ranking vuoto è un esito
legittimo quanto un errore di connessione silenzioso.

**Flusso in `HudScene.showEndMessage()`**, solo sull'esito finale (due fasi,
scene distinte):

1. **Fase 1 — `showTitleOnly()`**: per `CFG.finalTitleMs` (3,5s) resta a
   schermo solo la scritta grande ("GAME OVER" / "HAI FINITO IL GIOCO") su
   sfondo scuro pieno schermo, nessun input possibile. Passato il tempo,
   `this.children.removeAll(true)` ripulisce tutto e si passa alla fase 2.
2. **Fase 2 — `showFinalScreen()`**: `lastpage.jpg` a piena schermo, con
   punteggio e classifica su una fascia scura semitrasparente in alto (il
   motivo decorativo dell'immagine da solo rischia di far perdere il testo
   bianco). La classifica viene recuperata in modo asincrono; un'etichetta
   "Caricamento classifica…" occupa lo spazio nel frattempo, così non c'è
   uno scatto quando i dati arrivano.
3. Si è in top 10 se la classifica ha meno di 10 voci, o se il punteggio
   batte l'ultimo posto (`>=`, un pareggio conta come "dentro").
4. **In top 10**: campo nick (nome ricordato in `localStorage`, chiave
   `magicwand-nick`) + pulsante "Invia punteggio", overlay HTML sopra
   `lastpage.jpg`. Il pulsante "Continua" resta comunque disponibile,
   indipendente dall'invio.
5. **Fuori classifica**: solo la lista e il pulsante "Continua".

Sui livelli intermedi (`hasNext=true`) nessuna di queste due fasi: resta il
pannello a fascia centrale originale, "premi un tasto per il livello
successivo".

**Bug non ovvio incontrato qui**: la fase 1 usava `this.time.delayedCall()`
per il timeout di 3,5s — la schermata restava bloccata sulla scritta ben oltre
il tempo previsto. Stesso identico problema già risolto altrove in
`GameScene.endLevel()` (vedi sopra): i timer di Phaser avanzano solo dentro
`update()`, e con la fisica in pausa il ciclo rallenta al punto da rendere il
delay inaffidabile. Corretto con `setTimeout()` nativo del browser, non
legato al loop di Phaser.

**Il form nick è HTML, non oggetti Phaser**: serve un vero input di testo con
cursore, tastiera virtuale su mobile, incolla — cose che `Phaser.Text` non
offre. Due dettagli che ne derivano:

- **Le coordinate vanno convertite esplicitamente.** L'overlay HTML vive fuori
  dal canvas e non conosce le coordinate di gioco (1920×1080): posizionarlo
  con una percentuale arbitraria della finestra del browser lo disallinea dal
  testo Phaser ogni volta che `Scale.FIT` scala il canvas in modo diverso
  dalla finestra reale — è il bug che ha causato la sovrapposizione vista
  durante la verifica. `gameYToPercent()` converte una coordinata Y in pixel
  di gioco nella percentuale di viewport corrispondente, così l'HTML resta
  sempre nella stessa fascia del testo Phaser.
- **`stopPropagation()` sui tasti dell'input.** Senza, i tasti premuti mentre
  si scrive il nick arriverebbero anche al listener `keydown` di
  `GameScene.endLevel()` — che sui livelli intermedi farebbe ripartire la
  partita mentre si sta ancora scrivendo il nome.

## Controlli touch

[src/touch.js](src/touch.js) crea un overlay HTML (non oggetti Phaser) attivo
solo su device touch (`Touch.isTouchDevice()`, `'ontouchstart' in window ||
navigator.maxTouchPoints > 0`): un joystick **sempre visibile** in basso a
sinistra per il movimento, due pulsanti fissi in basso a destra per salto e
fuoco, un pulsante ⛶ in alto a destra per lo schermo intero. La base del
joystick non si sposta mai (a differenza di un joystick "a comparsa" che
appare dove tocchi): solo la manopola si muove col drag, riportando `dx`/`dy`
normalizzati in `[-1, 1]` rispetto al centro fisso.

**Overlay HTML, non canvas.** I pulsanti vivono fuori dal canvas Phaser,
ancorati allo schermo reale: se fossero oggetti di gioco, la loro posizione
andrebbe ricalcolata ogni volta che `Scale.FIT` ridimensiona/centra il canvas
rispetto alla risoluzione logica (1920×1080), che non coincide quasi mai con
lo schermo reale di un telefono.

**Interfaccia compatibile con un `Key` di Phaser.** `Touch.create()` restituisce
`{ left, right, jump, fire }`: `left`/`right` espongono solo `isDown` (letti in
OR con `this.cursors` in `handleMovement`), mentre `jump`/`fire` espongono anche
`justDown()` — stessa semantica di `Phaser.Input.Keyboard.JustDown()`, cioè
vero una sola volta per pressione, poi si autoconsuma. Grazie a questo,
`handleJump`/`handleFire` restano quasi identici: leggono `this.touch` (`null`
su desktop) accanto alla tastiera, senza diramare la logica di gioco.

**Attenzione al corto circuito.** `keyboardJustDown || touchJustDown` è
sbagliato: se la tastiera è già `true`, JS non valuta il lato destro, e il
flag `justDown` del touch resterebbe inconsumato — pronto a scattare (in modo
spurio, un frame dopo) anche se il tasto touch non è stato ripremuto. Entrambe
le fonti vanno sempre interrogate esplicitamente, mai in OR diretto.

### Schermo intero (equivalente di F11 su mobile)

`_createFullscreenButton()` aggiunge un pulsante ⛶ in alto a destra, sopra
`VITE`: sui telefoni la barra degli indirizzi resta visibile anche in
landscape e sottrae altezza al canvas, la Fullscreen API la fa sparire.

**Serve un pulsante esplicito, non un trigger automatico.** La Fullscreen API
concede la richiesta solo dentro il gestore di un gesto utente diretto — non
può scattare da sola al caricamento della pagina, il browser la rifiuterebbe.

**Il target è `<html>`, non `#game`.** L'overlay dei controlli vive fuori dal
div del canvas: se il fullscreen venisse richiesto su `#game`, i pulsanti
touch (che sono `position: fixed` ma figli di `<body>`) sparirebbero insieme
alla barra degli indirizzi.

**`fullscreenchange` tiene l'icona coerente** (⛶ fuori, ⛷ dentro) anche
quando il fullscreen viene chiuso da fuori — gesture di sistema, cambio app —
senza bisogno di un avviso: il tap successivo lo ririchiede da capo.

Un dettaglio emerso testando in Chrome headless con touch emulato via CDP: il
**primissimo** tap sulla pagina intera (non solo sul pulsante) può fallire con
`Permissions check failed`, perché l'emulazione non marca ancora la
`navigator.userActivation` della pagina. Non è un bug del codice — su un
device reale il solo atto di toccare lo schermo per orientarsi la marca già,
quindi il pulsante funziona al primo tentativo utile. Verificato forzando un
tap preliminare prima di quello sul pulsante: da lì in poi il toggle
entra/esce sempre in un colpo solo.

### Forzare il landscape

Il gioco è un platform a scorrimento **orizzontale**: in portrait il canvas
16:9 usa meno di un terzo dell'altezza schermo, il resto sono bande nere.
Invece di adattare l'aspect ratio (che avrebbe richiesto toccare camera e
livelli), un overlay CSS puro in [index.html](index.html) copre lo schermo con
un invito a ruotare, attivo solo quando serve:

```css
@media (pointer: coarse) and (orientation: portrait) {
  #rotate-overlay { display: flex; }
}
```

`pointer: coarse` (non `Touch.isTouchDevice()` via JS) perché è valutato
immediatamente dal browser, senza attese, ed è il criterio semanticamente
corretto per "puntamento impreciso" — coerente con l'essere lo stesso genere
di device per cui serve l'overlay dei controlli.

### Dimensioni tarate per il landscape stretto

`CFG.touch.buttonRadius`/`joystickRadius` e i margini sono deliberatamente
piccoli: forzando il landscape, l'altezza reale disponibile su un telefono
medio è spesso solo 380-430px, molto meno del solito per un joystick virtuale.
Pulsanti troppo grandi finiscono per sovrapporsi alla scena di gioco invece di
starci nell'angolo — è successo durante lo sviluppo, verificato con
screenshot prima di ridimensionare.

## Bilanciamento

Tutti i numeri stanno in [src/config.js](src/config.js): velocità, salto,
gravità, cadenza e gittata del fuoco, punteggi.

### Salto e piattaforme: vincolo da rispettare

L'altezza massima del salto è `jumpVelocity² / (2 × gravity)` — con i valori
attuali (−1840 e 3600) sono **470px**, per una salita di ~0,5s.

Le piattaforme dei livelli stanno entro **430px**, così resta un margine di
manovra invece di richiedere il salto perfetto. **Se cambi `jumpVelocity` o
`gravity`, ricontrolla che le quote in [src/level.js](src/level.js) restino
raggiungibili**: è un errore silenzioso, il gioco non segnala nulla e le
piattaforme diventano semplicemente irraggiungibili.

Verifica rapida da riga di comando:

```bash
node -e "
const fs=require('fs');
const CFG=new Function(fs.readFileSync('src/config.js','utf8')+'; return CFG;')();
const L=new Function(fs.readFileSync('src/level.js','utf8')+'; return LEVELS;')();
const h=CFG.player.jumpVelocity**2/(2*CFG.player.gravity);
console.log('salto:', h.toFixed(0)+'px');
L.forEach((l,i)=>console.log('L'+(i+1), 'irraggiungibili:',
  l.platforms.filter(p=>p.y>h).length+'/'+l.platforms.length));"
```

La parallasse non ha più un fattore per singolo layer: `CFG.parallax.farthest` e
`.nearest` sono gli estremi, e ogni layer riceve un valore interpolato secondo
la sua profondità. La stessa regola vale per set da 5, 7 o 8 layer.

`CFG.debug = true` mostra i corpi di collisione, incluso il pavimento invisibile.

## Note

La risoluzione logica è 1920×1080, pari a quella nativa degli sfondi; Phaser
scala il canvas alla finestra. Le coordinate `y` in `level.js` sono altezze dal
pavimento (0 = a terra), non coordinate schermo.

### Cache: due livelli di difesa

Un telefono può continuare a servire una versione vecchia dei sorgenti anche
con un deploy corretto e verificato sul server — è già successo (pulsante
fullscreen e joystick assenti). Su mobile non c'è un ricarica-forzato
equivalente a Ctrl+Shift+R, quindi la cache va spezzata dal lato server, non
demandata all'utente:

1. **[.htaccess](.htaccess)** imposta `Cache-Control: no-cache, no-store,
   must-revalidate` su tutti i file `.js`/`.html`. Le immagini restano
   cacheabili normalmente (pesano di più, cambiano raramente).
2. **Query string di versione** (`?v=<timestamp>`) su ogni `<script>` in
   [index.html](index.html). È il livello che conta davvero: alcuni browser
   mobili ignorano `Cache-Control` in certe condizioni (cache offline,
   ottimizzazioni del vendor), ma un URL con query string diversa è per
   definizione una risorsa diversa — non c'è cache che tenga.

**Prima di ogni deploy che tocca `src/`**, eseguire dalla root del progetto:

```bash
./script/bump-version.sh
```

Rigenera il timestamp in `index.html`. Poi procedere con il rsync verso il
server come al solito. Saltare questo passaggio vanifica il secondo livello di
difesa: il primo (`.htaccess`) da solo si è dimostrato insufficiente su
device reali.
