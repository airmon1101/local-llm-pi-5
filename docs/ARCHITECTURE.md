# PiLLM System Architecture

**PiLLM** is an edge AI chat server architected specifically for the **Raspberry Pi 5 (8 GB RAM, ARM64, 64 GB MicroSD card, Ubuntu Server 24.04 LTS)**.

---

## 1. High-Level Topology

```
                  Local Home Network (Wi-Fi / Ethernet)
            [MacBook, iPhone, Android Phone, Linux Laptop, PC]
                                    │
                                    │ HTTP (Port 80)
                                    │ http://raspberrypi.local
                                    ▼
┌───────────────────────── Raspberry Pi 5 (Ubuntu 24.04 LTS) ─────────────────────────┐
│                                                                                     │
│  [UFW Firewall]                                                                     │
│    └── Whitelists Port 80 & 22 for Local LAN Subnet Only                            │
│                                                                                     │
│  [Nginx Reverse Proxy] (:80)                                                        │
│    ├── /api/*   ──► FastAPI (:8000) [Uvicorn, proxy_buffering off]                  │
│    └── /        ──► Next.js (:3000) [Node.js Standalone]                            │
│                                                                                     │
│  [FastAPI Backend] (:8000)                                                          │
│    ├── Chat Management, SSE Streaming, Hardware Telemetry, Settings               │
│    ├── SQLite Database (/data/pillm.db)                                            │
│    │     └── PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;                    │
│    └── Ollama Service Client (httpx Async)                                         │
│          │                                                                          │
│          ▼ (HTTP localhost:11434 only)                                              │
│  [Ollama Daemon] (:11434)                                                           │
│    └── Qwen3 4B Model (qwen3:4b)                                                    │
│          └── CPU Inference (4 Cortex-A76 Cores, num_ctx: 2048)                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Reverse Proxy (Nginx)
- **Port:** 80 (HTTP)
- **Functions:**
  - Serves as the single LAN ingress point.
  - Proxies `/` to Next.js on `127.0.0.1:3000`.
  - Proxies `/api/` to FastAPI on `127.0.0.1:8000`.
  - Disables buffering for Server-Sent Events (`proxy_buffering off; chunked_transfer_encoding on;`).
  - Sets security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`).

### 2.2 Frontend (Next.js 14 / React / TypeScript / Tailwind CSS)
- **Runtime:** Node.js standalone server on `127.0.0.1:3000`.
- **Features:**
  - Token-by-token streaming response display.
  - Markdown rendering with GFM tables and syntax-highlighted code blocks.
  - Date-grouped conversation history (Today, Yesterday, Previous 7 Days, Older).
  - Client-side search and instant filtering.
  - Hardware telemetry and health dashboard.
  - Dark/Light mode theme engine.

### 2.3 Backend (Python / FastAPI / aiosqlite / Pydantic)
- **Runtime:** Uvicorn on `127.0.0.1:8000`.
- **Features:**
  - SSE streaming endpoint (`POST /api/chat`) yielding tokens as they arrive.
  - Generation abort endpoint (`POST /api/chat/stop`) via `asyncio.Event`.
  - CRUD operations for conversations and message history.
  - Safe system metrics inspecting CPU, RAM, MicroSD storage without leaking environment secrets.
  - Automatic title generation on the first user turn.

### 2.4 Persistence (SQLite)
- **Path:** `data/pillm.db`
- **Endurance Optimizations:**
  - **WAL Mode (`PRAGMA journal_mode=WAL`):** Sequential append-only writes eliminate random flash writes.
  - **Synchronous Normal (`PRAGMA synchronous=NORMAL`):** Cuts disk fsync calls drastically without risking corrupting WAL database pages.
  - **In-Memory Temporary Store (`PRAGMA temp_store=MEMORY`):** Keeps temporary sorting and index operations in RAM.

### 2.5 AI Runtime (Ollama & Qwen3 4B)
- **Binding:** `127.0.0.1:11434` (Strictly localhost; unreachable from LAN).
- **Model:** `qwen3:4b` (4-billion parameter dense model).
- **Execution:** CPU inference utilizing all 4 ARM Cortex-A76 cores (`num_thread: 4`).
- **Context Window:** Default 2048 tokens (`num_ctx: 2048`) to preserve the 8 GB RAM memory pool.
