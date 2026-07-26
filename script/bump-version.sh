#!/bin/bash
# Aggiorna il numero di build in index.html (query string ?v=... sugli
# script) al timestamp corrente, cosi' il browser (anche su mobile, dove
# manca un ricarica-forzato equivalente a Ctrl+Shift+R) non serve mai una
# versione vecchia dei sorgenti dopo un deploy.
#
# Uso: eseguire prima di ogni rsync verso il server, dalla root del progetto.
set -euo pipefail
cd "$(dirname "$0")/.."

BUILD=$(date +%s)
sed -i -E "s/\?v=[0-9]+/?v=$BUILD/g" index.html

echo "Versione build aggiornata a ?v=$BUILD"
