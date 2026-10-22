#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Defina DATABASE_URL}"
: "${1:?Informe o arquivo .dump de backup}"
if [[ "${CONFIRM_RESTORE:-}" != 'RESTAURAR_BLUESCALE' ]]; then
 echo 'Restauração bloqueada. Defina CONFIRM_RESTORE=RESTAURAR_BLUESCALE após validar o destino e ter outro backup.' >&2
 exit 2
fi
pg_restore --dbname="$DATABASE_URL" --clean --if-exists --no-owner "$1"
