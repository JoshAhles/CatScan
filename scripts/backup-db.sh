#!/usr/bin/env bash
set -euo pipefail
DB=${CATSCAN_DB:-/opt/catscan/data/catscan.db}
DEST=${CATSCAN_BACKUP_DIR:-/opt/catscan/data/backups}
mkdir -p "$DEST"
TS=$(date -u +%Y%m%dT%H%M%SZ)
sqlite3 "$DB" ".backup '$DEST/catscan-$TS.db'"
# keep last 14
ls -1t "$DEST"/catscan-*.db | tail -n +15 | xargs -r rm -f
