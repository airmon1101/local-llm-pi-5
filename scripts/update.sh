#!/usr/bin/env bash
# ==============================================================================
# PiLLM Update Script
# Updates application code and dependencies while preserving all SQLite data,
# user preferences, and downloaded Ollama AI models.
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CURRENT_USER="${SUDO_USER:-$(whoami)}"

echo -e "${BLUE}${BOLD}=== Updating PiLLM Application ===${NC}"

# Check for root
if [[ $EUID -ne 0 ]]; then
    echo -e "${YELLOW}Warning: For system service restarts, running with sudo is recommended.${NC}"
fi

# 1. Update Python dependencies
echo -e "${BLUE}1. Updating backend virtualenv dependencies...${NC}"
su - "$CURRENT_USER" -c "${PROJECT_ROOT}/backend/venv/bin/pip install --upgrade -r ${PROJECT_ROOT}/backend/requirements.txt"

# 2. Database migrations check
echo -e "${BLUE}2. Ensuring SQLite schema migrations are applied...${NC}"
su - "$CURRENT_USER" -c "cd ${PROJECT_ROOT}/backend && ${PROJECT_ROOT}/backend/venv/bin/python3 -c 'import asyncio; from app.db.database import init_db; asyncio.run(init_db())'"

# 3. Update Frontend dependencies & Rebuild
echo -e "${BLUE}3. Rebuilding Next.js frontend...${NC}"
su - "$CURRENT_USER" -c "cd ${PROJECT_ROOT}/frontend && npm install"
su - "$CURRENT_USER" -c "cd ${PROJECT_ROOT}/frontend && npm run build"

# 4. Restart Services
echo -e "${BLUE}4. Restarting systemd application services...${NC}"
systemctl restart pillm-backend
systemctl restart pillm-frontend
systemctl restart nginx

# 5. Health Check
echo -e "${BLUE}5. Verifying system health post-update...${NC}"
sleep 2
HEALTH_RES=$(curl -s http://127.0.0.1/api/health || echo "{}")
echo -e "Health response: ${HEALTH_RES}"

echo -e "\n${GREEN}${BOLD}✓ PiLLM updated successfully! All conversations, settings, and models preserved.${NC}"
