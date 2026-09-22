# PiLLM Troubleshooting Playbook

Verified diagnostic and remediation commands for **Ubuntu Server 24.04 LTS** on **Raspberry Pi 5**.

---

## 1. Subsystem Status Diagnostic Commands

Run these baseline commands to assess appliance state:

```bash
# Check primary IP address
hostname -I

# Inspect available RAM
free -h

# Inspect MicroSD card disk storage
df -h /

# List models installed in Ollama
ollama list

# Test Qwen3 4B via CLI directly
ollama run qwen3:4b "Say test"

# Check systemd services
sudo systemctl status nginx pillm-backend pillm-frontend ollama
```

---

## 2. Issues & Solutions

### Issue 1: Ollama Service Not Running
**Symptoms:** Status badge shows `Ollama: Offline`, chat prompts fail immediately.
**Remediation:**
```bash
# Check Ollama service status
sudo systemctl status ollama

# Restart Ollama service
sudo systemctl restart ollama

# Inspect Ollama journal logs
sudo journalctl -u ollama -n 50 --no-pager
```

---

### Issue 2: Qwen3 Model Missing from Ollama
**Symptoms:** Health check reports `model_available: false`.
**Remediation:**
```bash
# Check installed models
ollama list

# Re-pull Qwen3 4B
ollama pull qwen3:4b

# Verify manual inference
ollama run qwen3:4b "Hello"
```

---

### Issue 3: MicroSD Running Out of Space
**Symptoms:** Storage warning banner appears, writes fail with HTTP 507.
**Remediation:**
```bash
# Check disk usage by directory
sudo du -sh /var/log/* /var/cache/* ~/.ollama

# Vacuum systemd journal logs to free space
sudo journalctl --vacuum-size=50M

# Clean apt caches
sudo apt-get clean
sudo apt-get autoremove -y

# Checkpoint and vacuum SQLite database
sqlite3 /home/$USER/antigravity/LLM_Raspberry_Pi_5/data/pillm.db "VACUUM;"
```

---

### Issue 4: High RAM Usage / System Swapping
**Symptoms:** Slow inference, response latency spikes.
**Remediation:**
```bash
# Inspect top memory processes
ps aux --sort=-%mem | head -n 10

# Drop Linux kernel pagecache/dentries
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches

# Restart PiLLM backend to release Python garbage collector memory
sudo systemctl restart pillm-backend
```

---

### Issue 5: Slow Inference Speed (<5 tokens/sec)
**Symptoms:** Tokens generate sluggishly.
**Remediation:**
- Ensure Raspberry Pi 5 has adequate cooling (active cooler or heatsink); CPU throttling occurs if core temperature exceeds 80°C:
  ```bash
  vcgencmd measure_temp 2>/dev/null || cat /sys/class/thermal/thermal_zone0/temp
  ```
- Verify Ollama threads setting in `backend/.env` is `OLLAMA_NUM_THREADS=4`.
- Reduce context window `OLLAMA_NUM_CTX=2048` in Settings modal.

---

### Issue 6: Frontend Unavailable (Port 80 returns 502 Bad Gateway)
**Symptoms:** Browser shows Nginx 502 Bad Gateway.
**Remediation:**
```bash
# Check if Next.js standalone process is active
sudo systemctl status pillm-frontend

# Inspect Next.js journal logs
sudo journalctl -u pillm-frontend -n 50 --no-pager

# Restart frontend service
sudo systemctl restart pillm-frontend
```

---

### Issue 7: Backend Unavailable (/api/health returns 502 or Connection Refused)
**Symptoms:** Frontend loads but chat shows "PiLLM is offline".
**Remediation:**
```bash
# Check FastAPI backend status
sudo systemctl status pillm-backend

# Inspect backend journal logs
sudo journalctl -u pillm-backend -n 50 --no-pager

# Test FastAPI directly on localhost
curl -i http://127.0.0.1:8000/api/health
```

---

### Issue 8: Nginx Configuration Errors
**Symptoms:** `sudo systemctl restart nginx` fails.
**Remediation:**
```bash
# Test Nginx syntax
sudo nginx -t

# Check Nginx error logs
sudo tail -n 50 /var/log/nginx/error.log
```

---

### Issue 9: UFW Blocking LAN Client Access
**Symptoms:** Client browser hangs or connection times out from phone/laptop.
**Remediation:**
```bash
# Check active UFW rules
sudo ufw status verbose

# Re-run subnet auto-discovery
sudo ./deploy/firewall/ufw-pillm.sh

# Or temporarily allow your specific client IP (e.g. 192.168.1.45)
sudo ufw allow from 192.168.1.45 to any port 80 proto tcp
```

---

### Issue 10: `http://raspberrypi.local` Not Resolving
**Symptoms:** Browser cannot find `raspberrypi.local`, but direct LAN IP works.
**Remediation:**
```bash
# Check Avahi daemon
sudo systemctl status avahi-daemon

# Restart Avahi daemon
sudo systemctl restart avahi-daemon

# Ensure UDP port 5353 (mDNS) is open in UFW
sudo ufw allow 5353/udp
```
*Note: On Android devices that lack native mDNS support, access PiLLM via `http://<LAN_IP>` directly.*

---

### Issue 11: Wi-Fi Disconnected / LAN IP Changed
**Symptoms:** Raspberry Pi IP changed after router reboot.
**Remediation:**
```bash
# Check new IP address
hostname -I

# Check Wi-Fi connection state
nmcli device status 2>/dev/null || ip link show

# Update UFW for new subnet if router DHCP changed subnet
sudo ./deploy/firewall/ufw-pillm.sh
```

---

### Issue 12: SQLite Database Locked or Corrupted
**Symptoms:** Logs report `sqlite3.OperationalError: database is locked`.
**Remediation:**
```bash
# Check SQLite file integrity
sqlite3 data/pillm.db "PRAGMA integrity_check;"

# Force WAL checkpoint
sqlite3 data/pillm.db "PRAGMA wal_checkpoint(TRUNCATE);"

# If corrupted, restore from latest backup:
sudo ./scripts/restore.sh backups/pillm_backup_<timestamp>.tar.gz
```

---

### Issue 13: Failed Building Wheel for psutil (`aarch64-linux-gnu-gcc` missing)
**Symptoms:** `pip install` fails with `psutil could not be installed from sources because gcc is not installed` or `No such file or directory: 'aarch64-linux-gnu-gcc'`.
**Remediation:**
Install the essential C compiler toolchain and Python development headers:
```bash
sudo apt-get update && sudo apt-get install -y build-essential gcc python3-dev
```
Then re-run the installer or update script:
```bash
sudo ./scripts/install.sh
```
*(The installer is idempotent and will automatically skip re-downloading Ollama and the Qwen3 4B model).*

