<?php
/**
 * Endpoint punteggi: GET restituisce la classifica, POST ne salva uno nuovo.
 *
 * Nessuna autenticazione o validazione della sessione di gioco (scelta
 * esplicita, vedi README): chiunque puo' chiamare questo endpoint via
 * richiesta HTTP diretta e inviare un punteggio falso. Accettabile per un
 * gioco amatoriale; se in futuro servisse irrobustirlo, il punto da toccare
 * e' solo qui, il client non sa nulla di come i punteggi vengono verificati.
 *
 * Storage: SQLite in un singolo file (score.sqlite), fuori dalla document
 * root servibile via URL diretto solo perche' non c'e' un modo pulito per
 * escluderlo altrove in questo setup — mitigato negando l'accesso diretto
 * al file .sqlite via .htaccess (vedi api/.htaccess).
 */

header('Content-Type: application/json; charset=utf-8');

// Il gioco gira su un altro (sotto)dominio in locale/dev; senza questo il
// browser bloccherebbe la fetch per CORS. '*' va bene qui: l'endpoint non usa
// cookie/sessioni, quindi non c'e' nulla da proteggere con un'origine specifica.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    // Preflight CORS: nessun corpo, solo gli header sopra.
    exit;
}

const DB_PATH = __DIR__ . '/score.sqlite';
const MAX_NICK_LEN = 20;
const TOP_N = 10;

function getDb(): PDO
{
    $isNew = !file_exists(DB_PATH);
    $db = new PDO('sqlite:' . DB_PATH);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if ($isNew) {
        $db->exec('
            CREATE TABLE scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nick TEXT NOT NULL,
                score INTEGER NOT NULL,
                level_name TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        ');
        // Il file nasce con i permessi dell'utente PHP-FPM: nessun chmod
        // aggiuntivo necessario, la cartella api/ e' gia' scrivibile da lui.
    }

    return $db;
}

function respond(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

try {
    $db = getDb();
} catch (PDOException $e) {
    respond(['error' => 'db_unavailable'], 500);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $db->prepare('SELECT nick, score, level_name, created_at FROM scores ORDER BY score DESC LIMIT :limit');
    $stmt->bindValue(':limit', TOP_N, PDO::PARAM_INT);
    $stmt->execute();

    respond(['scores' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input)) {
        respond(['error' => 'invalid_json'], 400);
    }

    $nick = trim((string) ($input['nick'] ?? ''));
    $score = $input['score'] ?? null;
    $levelName = trim((string) ($input['level'] ?? ''));

    // Validazione minima: tipi corretti e lunghezze sane. Nessun controllo
    // sulla plausibilita' del punteggio (vedi il commento in testa al file).
    if ($nick === '' || !is_int($score) || $score < 0 || $levelName === '') {
        respond(['error' => 'invalid_input'], 400);
    }

    $nick = mb_substr($nick, 0, MAX_NICK_LEN);

    $stmt = $db->prepare('INSERT INTO scores (nick, score, level_name) VALUES (:nick, :score, :level)');
    $stmt->execute([':nick' => $nick, ':score' => $score, ':level' => $levelName]);

    respond(['ok' => true]);
}

respond(['error' => 'method_not_allowed'], 405);
