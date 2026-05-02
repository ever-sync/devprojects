#!/usr/bin/env bash
# Backup automatizado do banco Supabase via pg_dump
# Uso: ./scripts/backup.sh
# Agendamento sugerido (crontab): 0 3 * * * /caminho/para/scripts/backup.sh
#
# Variáveis necessárias (exportar antes ou colocar em .env.backup):
#   DB_URL  — connection string PostgreSQL (veja Supabase > Project Settings > Database)
#   BACKUP_DIR — diretório de destino (padrão: ./backups)
#   RETENTION_DAYS — dias para manter backups (padrão: 7)

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "$ROOT_DIR/.env.backup" ]; then
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env.backup"
fi

DB_URL="${DB_URL:?Variável DB_URL não definida. Veja o header deste script.}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/portal_backup_$TIMESTAMP.sql.gz"

# ── Preparar destino ──────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Dump ─────────────────────────────────────────────────────────────────────
echo "[backup] Iniciando dump em $BACKUP_FILE"
pg_dump \
  --no-owner \
  --no-acl \
  --schema=public \
  "$DB_URL" | gzip > "$BACKUP_FILE"

TAMANHO=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[backup] Concluído: $BACKUP_FILE ($TAMANHO)"

# ── Limpeza de backups antigos ────────────────────────────────────────────────
echo "[backup] Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -name "portal_backup_*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
echo "[backup] Limpeza concluída."

# ── Verificar integridade (opcional) ─────────────────────────────────────────
if command -v sha256sum &>/dev/null; then
  sha256sum "$BACKUP_FILE" >> "$BACKUP_DIR/checksums.txt"
  echo "[backup] Checksum registrado."
fi

echo "[backup] OK — $(date)"
