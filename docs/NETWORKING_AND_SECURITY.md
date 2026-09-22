# PiLLM Networking & Security Guide

This document explains the security architecture of **PiLLM**, detailing how the server enforces strict **Local Home LAN Only** access with **zero public internet exposure**.

---

## 1. Zero-Exposure Security Model

PiLLM operates under a strict defense-in-depth posture:

| Vector | Status | Rationale |
|---|---|---|
| **Router Port Forwarding** | **DISABLED** | Never expose port 80 or any service to the WAN. |
| **Router UPnP** | **DISABLED** | Automatic port opening protocols are strictly avoided. |
| **Cloudflare Tunnels** | **PROHIBITED** | No outbound tunnel agents allowed. |
| **ngrok / Localtunnel** | **PROHIBITED** | No public proxy tunnels allowed. |
| **Tailscale Funnel** | **PROHIBITED** | No public exposure through mesh networks. |
| **Ollama LAN Exposure** | **BLOCKED** | Ollama binds exclusively to `127.0.0.1:11434`. |
| **FastAPI LAN Exposure** | **BLOCKED** | FastAPI binds exclusively to `127.0.0.1:8000`. |
| **Nginx LAN Ingress** | **RESTRICTED** | Port 80 is accessible only from the detected home subnet. |

---

## 2. Dynamic Subnet Firewall (UFW)

Rather than assuming a static network like `192.168.1.0/24`, the script `deploy/firewall/ufw-pillm.sh` inspects the active network route:

```bash
# Detect network subnet dynamically:
INTERFACE=$(ip route show default | awk '{print $5}' | head -n1)
CIDR_INFO=$(ip -o -f inet addr show "$INTERFACE" | awk '{print $4}' | head -n1)
DETECTED_CIDR=$(python3 -c "import ipaddress; print(str(ipaddress.ip_network('$CIDR_INFO', strict=False)))")
```

### Applied Rules
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow from $DETECTED_CIDR to any port 80 proto tcp comment 'PiLLM Web LAN'
ufw allow from $DETECTED_CIDR to any port 22 proto tcp comment 'PiLLM Admin SSH LAN'
ufw allow from $DETECTED_CIDR to any port 5353 proto udp comment 'PiLLM mDNS Avahi'
ufw deny 11434/tcp comment 'Block External Ollama Port'
ufw enable
```

Any packets arriving from outside the detected local subnet are silently discarded.

---

## 3. Local Hostname Resolution (Avahi / mDNS)

To allow access via:
```text
http://raspberrypi.local
```
the installer configures **Avahi** (`avahi-daemon`). This advertises the `.local` domain over multicast DNS (UDP port 5353) inside the home LAN.

- **Apple Devices (macOS, iOS):** Natively resolve `.local` domains via Bonjour.
- **Android / Windows / Linux:** Modern versions resolve `.local` automatically over mDNS, or users can connect directly to `http://<LAN_IP>`.

---

## 4. Offline-First Operation

Because all models (`qwen3:4b`), backend logic, database, and web assets are stored entirely on the Raspberry Pi 5, **PiLLM functions even if your home internet goes down**. Provided your local Wi-Fi router powers the LAN, your devices can continue prompting and chatting with full functionality.
