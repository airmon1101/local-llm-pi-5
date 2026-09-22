#!/usr/bin/env bash
# ==============================================================================
# PiLLM UFW Firewall Automation Script
# Restricts all inbound traffic to the active home LAN subnet ONLY.
# Ollama (11434) is strictly bound to localhost and blocked from LAN clients.
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== PiLLM LAN-Only Firewall Configuration ===${NC}"

# Verify root permissions
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Error: This script must be run as root (use sudo).${NC}"
   exit 1
fi

# 1. Detect primary active network interface and CIDR subnet
DETECTED_IP=""
DETECTED_CIDR=""
INTERFACE=""

# Find primary routing interface (excluding loopback and docker/virtual interfaces)
INTERFACE=$(ip route show default 2>/dev/null | awk '{print $5}' | head -n1 || true)

if [[ -z "$INTERFACE" ]]; then
    # Fallback to first non-loopback UP interface
    INTERFACE=$(ip -o link show up | awk -F': ' '{print $2}' | grep -v "lo" | head -n1 || true)
fi

if [[ -n "$INTERFACE" ]]; then
    CIDR_INFO=$(ip -o -f inet addr show "$INTERFACE" | awk '{print $4}' | head -n1 || true)
    if [[ -n "$CIDR_INFO" ]]; then
        DETECTED_IP=$(echo "$CIDR_INFO" | cut -d'/' -f1)
        # Calculate network address using python or ipcalc
        DETECTED_CIDR=$(python3 -c "import ipaddress; print(str(ipaddress.ip_network('$CIDR_INFO', strict=False)))" 2>/dev/null || echo "$CIDR_INFO")
    fi
fi

if [[ -z "$DETECTED_CIDR" ]]; then
    echo -e "${YELLOW}Warning: Could not auto-detect subnet. Defaulting to standard RFC1918 subnets.${NC}"
    DETECTED_CIDR="192.168.1.0/24"
fi

echo -e "Detected Network Interface: ${GREEN}${INTERFACE}${NC}"
echo -e "Detected Local IP:         ${GREEN}${DETECTED_IP}${NC}"
echo -e "Detected Local LAN Subnet: ${GREEN}${DETECTED_CIDR}${NC}"

# 2. Reset / Configure UFW Defaults
echo -e "\n${BLUE}Applying UFW Rules...${NC}"
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing

# 3. Allow HTTP (Port 80) from Local Subnet ONLY
echo -e "Permitting HTTP (Port 80) from ${DETECTED_CIDR}..."
ufw allow from "$DETECTED_CIDR" to any port 80 proto tcp comment 'PiLLM Web LAN'

# 4. Allow SSH (Port 22) from Local Subnet ONLY (prevents administrator lockout)
echo -e "Permitting SSH (Port 22) from ${DETECTED_CIDR}..."
ufw allow from "$DETECTED_CIDR" to any port 22 proto tcp comment 'PiLLM Admin SSH LAN'

# 5. Allow mDNS (Port 5353 UDP) for Avahi raspberrypi.local resolution
echo -e "Permitting mDNS (Port 5353/udp) for Avahi resolution..."
ufw allow from "$DETECTED_CIDR" to any port 5353 proto udp comment 'PiLLM mDNS Avahi'

# 6. Explicitly deny external or unauthorized access to Ollama port (11434)
ufw deny 11434/tcp comment 'Block External Ollama Port'

# 7. Enable UFW
echo -e "Enabling UFW..."
ufw --force enable

echo -e "\n${GREEN}======================================================${NC}"
echo -e "${GREEN}PiLLM Network Mode: LOCAL LAN ONLY${NC}"
echo -e "${GREEN}Internet Exposure: DISABLED${NC}"
echo -e "${GREEN}Allowed Inbound Subnet: ${DETECTED_CIDR}${NC}"
echo -e "${GREEN}======================================================${NC}"
