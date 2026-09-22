#!/usr/bin/env bash
# ==============================================================================
# PiLLM Complete Automated Installer
# Target: Raspberry Pi 5 (8 GB RAM, 64 GB MicroSD, Ubuntu Server 24.04 LTS)
# Network Mode: STRICT LOCAL LAN ONLY (No Public Internet Exposure)
# Default Model: Qwen3 4B (qwen3:4b via Ollama)
# ==============================================================================

set -euo pipefail

# Color palette
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CURRENT_USER="${SUDO_USER:-$(whoami)}"

echo -e "${CYAN}${BOLD}"
echo "  ██████╗ ██╗██╗     ██╗     ███╗   ███╗"
echo "  ██╔══██╗██║██║     ██║     ████╗ ████║"
echo "  ██████╔╝██║██║     ██║     ██╔████╔██║"
echo "  ██╔═══╝ ██║██║     ██║     ██║╚██╔╝██║"
echo "  ██║     ██║███████╗███████╗██║ ╚═╝ ██║"
echo "  ╚═╝     ╚═╝╚══════╝╚══════╝╚═╝     ╚═╝"
echo -e "   Private Local AI Appliance for Raspberry Pi 5${NC}\n"

# 1. Root / Sudo Check
if [[ $EUID -ne 0 ]]; then
    echo -e "${RED}Error: The PiLLM installer must be run with sudo privileges.${NC}"
    echo "Usage: sudo ./scripts/install.sh"
    exit 1
fi

echo -e "${BLUE}[1/26] Validating Target Hardware & Architecture...${NC}"
ARCH=$(uname -m)
if [[ "$ARCH" != "aarch64" && "$ARCH" != "arm64" ]]; then
    echo -e "${YELLOW}Warning: Architecture is $ARCH. Target is ARM64 (Raspberry Pi 5). Continuing anyway...${NC}"
else
    echo -e "${GREEN}✓ Detected ARM64 architecture (${ARCH})${NC}"
fi

echo -e "${BLUE}[2/26] Verifying Operating System (Ubuntu Server 24.04 LTS)...${NC}"
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    echo -e "${GREEN}✓ Detected OS: ${NAME} ${VERSION_ID}${NC}"
    if [[ "${ID:-}" != "ubuntu" ]]; then
        echo -e "${YELLOW}Warning: Target is Ubuntu Server 24.04 LTS. Detected ${ID}. Proceeding...${NC}"
    fi
fi

echo -e "${BLUE}[3/26] Checking System RAM (8 GB target)...${NC}"
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_MB=$(( TOTAL_RAM_KB / 1024 ))
echo -e "Total Detected RAM: ${TOTAL_RAM_MB} MB"
if [[ $TOTAL_RAM_MB -lt 7000 ]]; then
    echo -e "${YELLOW}Warning: PiLLM is optimized for 8 GB RAM. Running on less than 8GB may cause swapping with Qwen3 4B.${NC}"
else
    echo -e "${GREEN}✓ RAM requirement satisfied (${TOTAL_RAM_MB} MB)${NC}"
fi

echo -e "${BLUE}[4/26] Checking MicroSD Storage Space...${NC}"
AVAILABLE_KB=$(df -k "$PROJECT_ROOT" | awk 'NR==2 {print $4}')
AVAILABLE_GB=$(awk "BEGIN {printf \"%.1f\", $AVAILABLE_KB/1048576}")
echo -e "Available disk space: ${AVAILABLE_GB} GB"
if (( $(awk "BEGIN {print ($AVAILABLE_GB < 8.0)}") )); then
    echo -e "${RED}Error: Insufficient storage. PiLLM requires at least 8.0 GB free for Qwen3 4B and dependencies.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Storage check passed (${AVAILABLE_GB} GB free on MicroSD)${NC}"

echo -e "${BLUE}[5/26] Updating Package Index & Installing System Dependencies...${NC}"
apt-get update -y
apt-get install -y --no-install-recommends \
    python3 \
    python3-venv \
    python3-pip \
    python3-dev \
    build-essential \
    gcc \
    nodejs \
    npm \
    nginx \
    avahi-daemon \
    avahi-utils \
    ufw \
    curl \
    jq \
    sqlite3

echo -e "${BLUE}[6/26] Verifying Node.js & Python environments...${NC}"
echo -e "Python Version: $(python3 --version)"
echo -e "Node Version:   $(node -v)"
echo -e "NPM Version:    $(npm -v)"

echo -e "${BLUE}[7/26] Checking / Installing Ollama Local AI Runtime...${NC}"
if ! command -v ollama >/dev/null 2>&1; then
    echo -e "Ollama not found. Installing Ollama runtime..."
    curl -fsSL https://ollama.com/install.sh | sh
    systemctl daemon-reload
    systemctl enable ollama
    systemctl start ollama
else
    echo -e "${GREEN}✓ Ollama is already installed.${NC}"
    systemctl enable ollama || true
    systemctl start ollama || true
fi

echo -e "${BLUE}[8/26] Verifying Ollama Connectivity on 127.0.0.1:11434...${NC}"
for i in {1..10}; do
    if curl -s http://127.0.0.1:11434/api/tags >/dev/null; then
        echo -e "${GREEN}✓ Ollama daemon is active and responding locally.${NC}"
        break
    fi
    echo "Waiting for Ollama service to bind... ($i/10)"
    sleep 2
done

echo -e "${BLUE}[9/26] Pre-checking storage & Pulling Qwen3 4B Model...${NC}"
if ollama list | grep -q "qwen3:4b"; then
    echo -e "${GREEN}✓ Model 'qwen3:4b' is already installed in Ollama.${NC}"
else
    echo -e "${CYAN}Pulling model 'qwen3:4b' (this may take several minutes depending on network speed)...${NC}"
    ollama pull qwen3:4b
    echo -e "${GREEN}✓ Qwen3 4B downloaded and verified.${NC}"
fi

echo -e "${BLUE}[10/26] Creating Project Data & Directory Structure...${NC}"
mkdir -p "${PROJECT_ROOT}/data"
mkdir -p "${PROJECT_ROOT}/backups"
mkdir -p "${PROJECT_ROOT}/logs"
chown -R "${CURRENT_USER}:${CURRENT_USER}" "${PROJECT_ROOT}/data" "${PROJECT_ROOT}/backups"

echo -e "${BLUE}[11/26] Setting Up Python Virtual Environment...${NC}"
if [[ ! -d "${PROJECT_ROOT}/backend/venv" ]]; then
    su - "$CURRENT_USER" -c "python3 -m venv ${PROJECT_ROOT}/backend/venv"
fi
su - "$CURRENT_USER" -c "${PROJECT_ROOT}/backend/venv/bin/pip install --upgrade pip"
su - "$CURRENT_USER" -c "${PROJECT_ROOT}/backend/venv/bin/pip install -r ${PROJECT_ROOT}/backend/requirements.txt"
echo -e "${GREEN}✓ Backend Python dependencies installed successfully.${NC}"

echo -e "${BLUE}[12/26] Initializing SQLite Database (WAL Mode)...${NC}"
su - "$CURRENT_USER" -c "cd ${PROJECT_ROOT}/backend && ${PROJECT_ROOT}/backend/venv/bin/python3 -c 'import asyncio; from app.db.database import init_db; asyncio.run(init_db())'"
echo -e "${GREEN}✓ SQLite database initialized with MicroSD endurance pragmas.${NC}"

echo -e "${BLUE}[13/26] Installing Frontend Dependencies & Building Next.js UI...${NC}"
su - "$CURRENT_USER" -c "cd ${PROJECT_ROOT}/frontend && npm install"
su - "$CURRENT_USER" -c "cd ${PROJECT_ROOT}/frontend && npm run build"
echo -e "${GREEN}✓ Frontend built in standalone mode for minimal RAM and storage footprint.${NC}"

echo -e "${BLUE}[14/26] Configuring Systemd Journal Retention for MicroSD Flash Endurance...${NC}"
mkdir -p /etc/systemd/journald.conf.d
cp "${PROJECT_ROOT}/deploy/systemd/journald-pillm.conf" /etc/systemd/journald.conf.d/pillm.conf
systemctl restart systemd-journald
echo -e "${GREEN}✓ Systemd logs capped at 100MB to minimize MicroSD flash cell wear.${NC}"

echo -e "${BLUE}[15/26] Deploying PiLLM Systemd Services...${NC}"
# Configure backend service
sed -e "s|%USER%|${CURRENT_USER}|g" -e "s|%PILLM_DIR%|${PROJECT_ROOT}|g" \
    "${PROJECT_ROOT}/deploy/systemd/pillm-backend.service" > /etc/systemd/system/pillm-backend.service

# Configure frontend service
sed -e "s|%USER%|${CURRENT_USER}|g" -e "s|%PILLM_DIR%|${PROJECT_ROOT}|g" \
    "${PROJECT_ROOT}/deploy/systemd/pillm-frontend.service" > /etc/systemd/system/pillm-frontend.service

systemctl daemon-reload
systemctl enable pillm-backend
systemctl enable pillm-frontend
systemctl restart pillm-backend
systemctl restart pillm-frontend

echo -e "${BLUE}[16/26] Configuring Nginx Reverse Proxy (Streaming SSE Buffering Disabled)...${NC}"
cp "${PROJECT_ROOT}/deploy/nginx/pillm.conf" /etc/nginx/sites-available/pillm.conf
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/pillm.conf /etc/nginx/sites-enabled/pillm.conf

nginx -t
systemctl enable nginx
systemctl restart nginx
echo -e "${GREEN}✓ Nginx configured and active on port 80.${NC}"

echo -e "${BLUE}[17/26] Configuring Avahi Daemon (mDNS for raspberrypi.local)...${NC}"
systemctl enable avahi-daemon
systemctl restart avahi-daemon
echo -e "${GREEN}✓ Avahi mDNS active (resolves http://raspberrypi.local).${NC}"

echo -e "${BLUE}[18/26] Configuring UFW Firewall for Strict Local LAN Isolation...${NC}"
chmod +x "${PROJECT_ROOT}/deploy/firewall/ufw-pillm.sh"
"${PROJECT_ROOT}/deploy/firewall/ufw-pillm.sh"

echo -e "${BLUE}[19/26] Running Automated Post-Installation Health Verification...${NC}"
sleep 3
HEALTH_CHECK=$(curl -s http://127.0.0.1/api/health || echo "{}")
BACKEND_STATUS=$(echo "$HEALTH_CHECK" | jq -r '.backend // "offline"')
OLLAMA_STATUS=$(echo "$HEALTH_CHECK" | jq -r '.ollama // "offline"')
DB_STATUS=$(echo "$HEALTH_CHECK" | jq -r '.database // "offline"')
MODEL_STATUS=$(echo "$HEALTH_CHECK" | jq -r '.model_available // false')

echo -e "Health Summary: Backend=${BACKEND_STATUS}, Ollama=${OLLAMA_STATUS}, DB=${DB_STATUS}, ModelAvailable=${MODEL_STATUS}"

# Detect LAN IP
LAN_IP=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -n1 || hostname -I | awk '{print $1}')

echo -e "\n${GREEN}${BOLD}================================================================${NC}"
echo -e "${GREEN}${BOLD}       PiLLM Local AI Appliance Installed Successfully!         ${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}"
echo -e " ${BOLD}Hardware Target:${NC}     Raspberry Pi 5 (8 GB RAM / ARM64 / 64 GB MicroSD)"
echo -e " ${BOLD}AI Engine:${NC}           Ollama Local Daemon (:11434 localhost only)"
echo -e " ${BOLD}Default Model:${NC}       Qwen3 4B (CPU Inference - 4 Threads)"
echo -e " ${BOLD}Network Policy:${NC}      ${CYAN}STRICT HOME LAN ONLY${NC}"
echo -e " ${BOLD}Internet Exposure:${NC}   ${RED}DISABLED (Zero Public Inbound Access)${NC}"
echo -e " ${BOLD}Firewall (UFW):${NC}      Enabled (Subnet Whitelist Only)"
echo -e " --------------------------------------------------------------"
echo -e " ${BOLD}Web Access URLs:${NC}"
echo -e "   • Primary:  ${GREEN}http://raspberrypi.local${NC}"
echo -e "   • Direct:   ${GREEN}http://${LAN_IP}${NC}"
echo -e "   • API Docs: ${GREEN}http://${LAN_IP}/api/docs${NC}"
echo -e "${GREEN}${BOLD}================================================================${NC}\n"
