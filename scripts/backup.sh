#!/usr/bin/env bash
set -euo pipefail
: "${DATABASE_URL:?Configure DATABASE_URL sem informar credenciais em terminal compartilhado}"
mkdir -p ./backups
FILE="./backups/bluescale-$(date -u +%Y%m%dT%H%M%SZ).dump"
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --file="$FILE"
chmod 600 "$FILE"
echo "Backup local criado: $FILE"
