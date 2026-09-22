# PiLLM — Private Local AI Chat Server on Raspberry Pi 5

> **Your AI. Your Raspberry Pi. Your Data.**

PiLLM is a production-grade, self-hosted private AI chat appliance built specifically for the **Raspberry Pi 5 (8 GB RAM)** running **Ubuntu Server 24.04 LTS**. It enables devices connected to your **home Wi-Fi/LAN** (MacBook, iPhone, Android, PC, iPad) to converse with a local **Qwen3 4B** large language model through a modern, responsive web interface.

PiLLM operates under a **Strict Home LAN Only** security policy with **zero public internet exposure** and zero cloud dependencies.

---

## Architecture Overview

```text
MacBook ─────┐
iPhone ──────┤
Laptop ──────┼──► Home Wi-Fi / LAN (Port 80)
Desktop ─────┘         │
                       │ http://raspberrypi.local or http://<LAN_IP>
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 Raspberry Pi 5 (8 GB RAM)                   │
│                                                             │
│   [UFW Firewall] (Subnet Whitelist Only • No WAN Access)    │
│          │                                                  │
│          ▼                                                  │
│   [Nginx Reverse Proxy] (:80)                               │
│          │                                                  │
│          ├──────────────► Next.js Frontend (:3000)          │
│          │                (React, TypeScript, Tailwind)     │
│          │                                                  │
│          └──────────────► FastAPI Backend (:8000)           │
│                            │                                │
│                            ├── SQLite Database (WAL Mode)   │
│                            │   (/data/pillm.db)             │
│                            │                                │
│                            └── Ollama Service (Async HTTP)  │
│                                  │                          │
│                                  ▼ (localhost:11434 only)   │
│                            [Ollama Daemon]                  │
│                                  │                          │
│                                  ▼                          │
│                             [Qwen3 4B]                      │
│                      (CPU Inference - 4 Cores)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

- **Local CPU Inference:** Powered by **Qwen3 4B** (`qwen3:4b`) running natively on 4 ARM Cortex-A76 cores.
- **Progressive Token Streaming:** Full Server-Sent Events (SSE) streaming with live generation indicators, stop-generation button, and instant message regeneration.
- **Home LAN Only Security:** Operates strictly on private Wi-Fi/Ethernet. No router port forwarding, no UPnP, no Cloudflare/ngrok tunnels, no Tailscale Funnel.
- **Zero Internet Dependency:** Inference and web chat remain 100% operational offline if the home internet goes down (as long as local router Wi-Fi is active).
- **mDNS Hostname Resolution:** Connect via `http://raspberrypi.local` or direct LAN IP via Avahi daemon.
- **MicroSD Storage Preservation:** Engineered specifically for a **64 GB microSD card**:
  - SQLite Write-Ahead Logging (WAL) with `PRAGMA synchronous = NORMAL`.
  - In-memory temporary tables (`PRAGMA temp_store = MEMORY`).
  - Systemd journal retention capped at 100 MB (`SystemMaxUse=100M`).
  - Next.js standalone build footprint (~45 MB vs ~400 MB).
  - Storage telemetry with live low-capacity alert banners.
- **Persistent Conversation History:** Date-grouped history (Today, Yesterday, Previous 7 Days, Older), instant client-side search, rename, and cascading deletion.
- **Rich Markdown Experience:** GitHub Flavored Markdown (GFM), tables, blockquotes, and syntax-highlighted code blocks with a one-click "Copy Code" button.
- **System Health & Hardware Telemetry:** Live diagnostics monitoring FastAPI, Ollama daemon, Qwen3 model availability, SQLite health, RAM usage, and microSD capacity.

---

## Hardware Specifications

PiLLM is designed and validated for the following exact hardware:

| Component | Specification |
|---|---|
| **Board** | Raspberry Pi 5 Model B |
| **SoC** | Broadcom BCM2712 quad-core ARM Cortex-A76 @ 2.4 GHz |
| **RAM** | 8 GB LPDDR4X SDRAM |
| **Storage** | 64 GB microSD card (Class 10 / A2 recommended) |
| **Operating System** | Ubuntu Server 24.04 LTS (ARM64) |
| **Networking** | Wi-Fi 802.11ac or Gigabit Ethernet |
| **GPU / CUDA** | None (100% CPU inference) |
| **Accelerators** | None required initially |
| **SSD / NVMe** | Not required (supported as optional future upgrade) |

---

## Software Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, Lucide Icons, React Markdown.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, Uvicorn, aiosqlite, httpx, psutil.
- **AI Runtime:** Ollama local daemon (`http://127.0.0.1:11434`), Qwen3 4B (`qwen3:4b`).
- **Database:** SQLite 3 with WAL journal mode.
- **Reverse Proxy:** Nginx with SSE proxy buffering disabled.
- **Service Management:** systemd unit files with journald logging.
- **Firewall:** Ubuntu UFW with dynamic subnet detection.
- **Discovery:** Avahi mDNS daemon (`raspberrypi.local`).

---

## Quick Installation

Clone the repository to your Raspberry Pi 5 and execute the automated installer:

```bash
cd ~
git clone https://github.com/your-username/pi-llm.git
cd pi-llm

# Run automated installer (requires sudo)
sudo ./scripts/install.sh
```

### What `install.sh` Does Automatically:
1. Detects ARM64 architecture and validates Ubuntu Server 24.04 LTS.
2. Checks available RAM (verifies >= 7.5 GB) and microSD space (requires >= 8.0 GB free).
3. Installs system packages: `python3-venv`, `nodejs`, `npm`, `nginx`, `avahi-daemon`, `ufw`, `curl`, `jq`, `sqlite3`.
4. Installs and configures Ollama local daemon.
5. Downloads the **Qwen3 4B** model (`ollama pull qwen3:4b`).
6. Sets up Python virtual environment and installs backend dependencies.
7. Builds the Next.js frontend in standalone mode.
8. Initializes the SQLite database schema in WAL mode.
9. Deploys systemd service units for backend and frontend.
10. Cursors systemd journal retention at 100 MB to protect microSD flash cells.
11. Configures Nginx with unbuffered SSE streaming and security headers.
12. Configures Avahi mDNS for `http://raspberrypi.local`.
13. Auto-detects your home Wi-Fi/LAN subnet and configures UFW rules.
14. Executes end-to-end health verification.

---

## First Run & Access

Once installation completes, open any web browser on your MacBook, iPhone, Android, or PC connected to the **same home Wi-Fi network**:

```text
http://raspberrypi.local
```

Or connect directly via the Raspberry Pi's local IP:

```text
http://<RASPBERRY_PI_LAN_IP>
```

Interactive OpenAPI documentation is available at:

```text
http://raspberrypi.local/api/docs
```

---

## Network & Firewall Configuration

PiLLM enforces strict **LAN-Only isolation**:

```text
                 INTERNET
                    X
                    │  (No WAN Access)
              HOME ROUTER
                    │
              HOME Wi-Fi/LAN (e.g. 192.168.1.0/24)
           ┌────────┼────────┐
           │        │        │
         Mac      Phone     PC
           │        │        │
           └────────┼────────┘
                    │ Port 80
                    ▼
              Raspberry Pi 5
              [UFW Firewall]
```

### Firewall Rules Applied
```bash
# Display active UFW configuration
sudo ufw status verbose
```
Output:
```text
Status: active
Logging: on (low)
Default: deny (incoming), allow (outgoing), disabled (routed)

To                         Action      From
--                         ------      ----
80/tcp (PiLLM Web LAN)     ALLOW IN    192.168.1.0/24
22/tcp (PiLLM Admin SSH)   ALLOW IN    192.168.1.0/24
5353/udp (PiLLM mDNS)      ALLOW IN    192.168.1.0/24
11434/tcp                  DENY IN     Anywhere
```

To re-apply or update firewall rules after changing routers or Wi-Fi subnets:
```bash
sudo ./deploy/firewall/ufw-pillm.sh
```

---

## Storage & MicroSD Optimization

PiLLM incorporates specific optimizations to maximize the lifetime and stability of a **64 GB microSD card**:

1. **Write-Ahead Logging (WAL):** Sequential append-only commits replace random page writes.
2. **Synchronous = NORMAL:** Drops fsync frequency from every transaction to checkpoint boundaries.
3. **In-Memory Temporary Tables:** `PRAGMA temp_store = MEMORY;` keeps sort/group operations in RAM.
4. **Journald Retention Cap:** Systemd logs are strictly limited to 100 MB via `/etc/systemd/journald.conf.d/pillm.conf`.
5. **No Model Bloat:** Ollama stores the Qwen3 4B GGUF weights once in standard storage; no duplicate model files exist in the project directory.
6. **Storage Alerting:** The backend checks free space every request and warns the user if available capacity drops below 10% (or 5.0 GB).

---

## Service Management (systemd)

PiLLM runs as native systemd services that automatically start on boot and restart on failure:

```bash
# Check status of all PiLLM services
sudo systemctl status pillm-backend pillm-frontend nginx ollama

# Restart services
sudo systemctl restart pillm-backend
sudo systemctl restart pillm-frontend
sudo systemctl restart nginx

# Stop services
sudo systemctl stop pillm-backend pillm-frontend

# Inspect live logs via journald
sudo journalctl -u pillm-backend -f
sudo journalctl -u pillm-frontend -f
```

---

## Development Mode

To run PiLLM locally in development mode:

### 1. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Backup & Restore

Because PiLLM operates on a microSD card, regular backups are strongly encouraged.

### Create a Backup
```bash
sudo ./scripts/backup.sh
```
This generates a compressed archive in `backups/` containing:
- SQLite database (`data/pillm.db`)
- Environment configuration (`backend/.env`)
- Nginx and systemd unit files
*(Intentionally excludes the 2.5 GB model weights to conserve space).*

### Restore from Backup
```bash
sudo ./scripts/restore.sh backups/pillm_backup_YYYYMMDD_HHMMSS.tar.gz
```

---

## Updating PiLLM

To update PiLLM while preserving all conversations, settings, and models:

```bash
git pull origin main
sudo ./scripts/update.sh
```

---

## Testing

### Backend Unit & Integration Tests
```bash
cd backend
source venv/bin/activate
pytest -v
```

### Frontend Utility Tests
```bash
cd frontend
npm test
```

---

## Essential Diagnostic Commands

```bash
# Check local IP address
hostname -I

# Check memory and swap usage
free -h

# Check microSD disk space
df -h /

# List models downloaded in Ollama
ollama list

# Test Qwen3 inference directly
ollama run qwen3:4b "Say hello from Raspberry Pi 5"

# Monitor CPU temperature (throttling check)
cat /sys/class/thermal/thermal_zone0/temp
```

---

## Future Extensibility Roadmap

PiLLM is architected to support future modular expansions without refactoring core components:

- **Phase 2 — Search & Portability:** Full-text conversation search, Markdown/JSON export, and chat import.
- **Phase 3 — Local RAG:** Document parsing (PDF, TXT, Markdown) with lightweight embeddings for retrieval-augmented generation.
- **Phase 4 — Vision Capabilities:** Optional second vision-capable model (e.g. `moondream2` or `llava-phi3`) with dedicated image upload endpoints.
- **Phase 5 — IoT / Smart Home:** Optional MQTT integration for sensor telemetry reading (ESP32/ESP8266) with explicit user opt-in.

---

## License

MIT License. Built for private local AI computing on edge devices.
