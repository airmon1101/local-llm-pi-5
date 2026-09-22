#!/usr/bin/env bash
# ==============================================================================
# PiLLM Backup Utility
# Optimized for 64GB MicroSD flash card endurance.
# Backs up SQLite databases, configuration files, and systemd units into a
# compressed archive. Intentionally EXCLUDES heavy AI model files.
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${PROJECT_ROOT}/backups"
ARCHIVE_NAME="pillm_backup_${TIMESTAMP}.tar.gz"
ARCHIVE_PATH="${BACKUP_DIR}/${ARCHIVE_NAME}"

echo -e "${BLUE}${BOLD}=== Creating PiLLM Backup ===${NC}"
mkdir -p "$BACKUP_DIR"

# Checkpoint SQLite WAL mode to ensure DB file is clean
if [[ -f "${PROJECT_ROOT}/data/pillm.db" ]]; then
    echo -e "Checkpointing SQLite WAL log..."
    sqlite3 "${PROJECT_ROOT}/data/pillm.db" "PRAGMA wal_checkpoint(TRUNCATE);" 2>/dev/null || true
fi

# Create archive of critical data
echo -e "Compressing database, configuration, and deployment units..."
tar -czf "$ARCHIVE_PATH" \
    -C "$PROJECT_ROOT" \
    data \
    deploy \
    backend/.env.example \
    $(test -f "${PROJECT_ROOT}/backend/.env" && echo "backend/.env" || true)

ARCHIVE_SIZE=$(du -h "$ARCHIVE_PATH" | awk '{print $1}')

echo -e "\n${GREEN}${BOLD}✓ Backup successfully generated!${NC}"
echo -e "Location:  ${BOLD}${ARCHIVE_PATH}${NC}"
echo -e "Size:      ${BOLD}${ARCHIVE_SIZE}${NC}"
echo -e "Contents:  SQLite Database, Configuration, Nginx & Systemd units"
echo -e "Excluded:  Ollama model weights (saves 2.5+ GB on MicroSD)"

echo -e "\n${BLUE}To restore this backup:${NC}"
echo -e "  sudo ./scripts/restore.sh ${ARCHIVE_PATH}"
