#!/usr/bin/env bash
# ==============================================================================
# PiLLM Restore Utility
# Restores SQLite database and configuration from a backup archive.
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ $# -ne 1 ]]; then
    echo -e "${RED}Usage: sudo $0 <path_to_backup_archive.tar.gz>${NC}"
    exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
    echo -e "${RED}Error: Backup file not found at ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${BLUE}${BOLD}=== Restoring PiLLM from Backup ===${NC}"
echo -e "Archive: ${BACKUP_FILE}"

# Stop services to prevent database write conflicts
echo -e "Stopping services..."
systemctl stop pillm-backend || true
systemctl stop pillm-frontend || true

# Extract archive into project root
echo -e "Extracting archive..."
tar -xzf "$BACKUP_FILE" -C "$PROJECT_ROOT"

# Ensure correct permissions
CURRENT_USER="${SUDO_USER:-$(whoami)}"
chown -R "${CURRENT_USER}:${CURRENT_USER}" "${PROJECT_ROOT}/data" "${PROJECT_ROOT}/backend"

# Restart services
echo -e "Restarting services..."
systemctl start pillm-backend
systemctl start pillm-frontend

echo -e "\n${GREEN}${BOLD}✓ PiLLM successfully restored from backup!${NC}"
