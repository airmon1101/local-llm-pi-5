# Hardware & MicroSD Storage Optimization Guide

**Target Platform:** Raspberry Pi 5 (8 GB RAM, ARM64 Cortex-A76, 64 GB MicroSD Card, Ubuntu Server 24.04 LTS).

---

## 1. Why 64 GB MicroSD Requires Specific Optimization

MicroSD cards use NAND flash memory with limited write-erase cycle endurance. Conventional server software can wear out flash cells prematurely through:
- Constant random writes to SQLite databases.
- Unbounded system logs (`/var/log/journal`).
- Temporary files written to disk rather than RAM.
- Unbounded model weight duplication.

PiLLM incorporates five architectural optimizations to maximize MicroSD card lifespan and maintain system performance:

### 1. SQLite Write-Ahead Logging (WAL)
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
```
- **Sequential Writes:** WAL converts random page updates into sequential append-only writes, which matches the block architecture of flash memory.
- **Synchronous Normal:** Eliminates redundant `fsync()` system calls per commit while remaining fully transaction-safe under WAL mode.
- **In-Memory Temporary Tables:** All sort operations and temporary query tables reside in RAM rather than writing scratch files to flash memory.

### 2. Capped Systemd Journal Logging
In `/etc/systemd/journald.conf.d/pillm.conf`:
```ini
SystemMaxUse=100M
SystemKeepFree=1G
RuntimeMaxUse=50M
MaxRetentionSec=1month
```
Prevents logs from growing without bound and consuming the 64GB card.

### 3. Model Weight De-Duplication
Ollama manages the `qwen3:4b` GGUF blobs in `/usr/share/ollama/.ollama/models`. PiLLM's Python backend communicates over HTTP and **never** copies, extracts, or duplicates model weights inside the project directory.

### 4. Next.js Standalone Build
Building the Next.js frontend with `output: 'standalone'` extracts only necessary node_modules, reducing disk consumption from ~400 MB to ~45 MB.

### 5. MicroSD Capacity Alerts
The backend tracks free space via `shutil.disk_usage()`. If free space drops below 10% or 5.0 GB, the UI presents an alert banner and halts aggressive writes.

---

## 2. RAM Budgeting for 8 GB Shared Memory

The Raspberry Pi 5 does not have dedicated VRAM; its 8 GB LPDDR4X SDRAM is shared between the CPU, OS, and Ollama inference runtime:

| Process | Memory Allocation | Notes |
|---|---|---|
| **Ubuntu Server 24.04 LTS** | ~400 MB | Minimal headless server footprint |
| **Nginx Reverse Proxy** | ~25 MB | Extremely lightweight event-driven proxy |
| **Next.js Frontend Server** | ~120 MB | Standalone Node.js process |
| **FastAPI + Uvicorn Backend** | ~90 MB | Asynchronous Python process |
| **Ollama Daemon + Qwen3 4B** | ~2,800 MB | ~2.5 GB model weights + 2048 context buffer |
| **OS Page Cache & Buffer Pool** | ~1,500 MB | Disk caching for smooth I/O |
| **Available Headroom** | **~3,000 MB** | Safety buffer preventing swap usage |
| **Total** | **8,192 MB** | 100% stable without Out-Of-Memory (OOM) kills |

---

## 3. CPU Core Allocation

The Raspberry Pi 5 Broadcom BCM2712 processor features a **quad-core 2.4 GHz ARM Cortex-A76**:
- `num_thread: 4` is configured in Ollama generation options to saturate all 4 physical cores during inference, maximizing tokens-per-second (typically ~10–14 tokens/sec for Qwen3 4B on Pi 5).
- Background services (Nginx, FastAPI) yield CPU time gracefully via async epoll event loops.
