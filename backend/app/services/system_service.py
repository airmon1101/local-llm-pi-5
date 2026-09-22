"""System monitoring and hardware metrics service.

Optimized for Raspberry Pi 5 under Ubuntu Server 24.04 LTS.
Inspects CPU, RAM, storage, network interfaces, and temperature safely.
Never exposes environment secrets or credentials.
"""

import os
import platform
import socket
import shutil
import time
from typing import Optional

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

from app.config import settings
from app.core.logging import logger
from app.schemas.system import StorageInfoResponse, SystemInfoResponse


class SystemService:
    """Provides safe hardware, storage, and networking telemetry."""

    @staticmethod
    def get_storage_info() -> StorageInfoResponse:
        """Inspect storage usage on the filesystem hosting PiLLM."""
        target_path = os.path.abspath(settings.DATABASE_PATH)
        # Find mount point or containing path
        stat_path = target_path if os.path.exists(target_path) else os.path.dirname(target_path)
        while not os.path.exists(stat_path) and stat_path != "/":
            stat_path = os.path.dirname(stat_path)

        usage = shutil.disk_usage(stat_path)
        total_gb = round(usage.total / (1024 ** 3), 2)
        used_gb = round(usage.used / (1024 ** 3), 2)
        free_gb = round(usage.free / (1024 ** 3), 2)
        used_percent = round((usage.used / usage.total) * 100, 1)

        # Warning triggered if percentage free is below threshold or absolute free is below GB threshold
        free_percent = 100.0 - used_percent
        is_low = (
            free_percent <= settings.STORAGE_WARNING_THRESHOLD_PERCENT
            or free_gb <= settings.STORAGE_WARNING_THRESHOLD_GB
        )

        return StorageInfoResponse(
            total_bytes=usage.total,
            used_bytes=usage.used,
            free_bytes=usage.free,
            total_gb=total_gb,
            used_gb=used_gb,
            free_gb=free_gb,
            used_percent=used_percent,
            is_low=is_low,
            warning_threshold_percent=settings.STORAGE_WARNING_THRESHOLD_PERCENT,
            mount_point=stat_path,
        )

    @staticmethod
    def get_lan_ip() -> str:
        """Detect the primary local LAN IP address."""
        try:
            # Connect to an internal dummy IP to detect the routing interface
            # No actual packets are transmitted to internet
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.settimeout(0.5)
                s.connect(("10.255.255.255", 1))
                ip = s.getsockname()[0]
                return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return "127.0.0.1"

    @staticmethod
    def get_cpu_model() -> str:
        """Extract CPU model name, recognizing Raspberry Pi 5 Cortex-A76."""
        arch = platform.machine()
        if arch in ("aarch64", "arm64"):
            # Check /proc/cpuinfo if on Linux
            if os.path.exists("/proc/cpuinfo"):
                try:
                    with open("/proc/cpuinfo", "r") as f:
                        for line in f:
                            if "Model" in line or "Hardware" in line or "model name" in line:
                                return line.split(":", 1)[1].strip()
                except Exception:
                    pass
            return "ARM Cortex-A76 (Raspberry Pi 5)"
        return platform.processor() or arch

    @classmethod
    def get_system_info(cls, ollama_status: str, active_model: str) -> SystemInfoResponse:
        """Assemble safe hardware, OS, and status metrics."""
        ram_total_gb = 8.0
        ram_available_gb = 4.0
        ram_used_percent = 50.0
        cpu_cores = os.cpu_count() or 4
        uptime: Optional[float] = None

        if HAS_PSUTIL:
            try:
                ram = psutil.virtual_memory()
                ram_total_gb = round(ram.total / (1024 ** 3), 2)
                ram_available_gb = round(ram.available / (1024 ** 3), 2)
                ram_used_percent = round(ram.percent, 1)
                cpu_cores = psutil.cpu_count(logical=True) or (os.cpu_count() or 4)
                uptime = time.time() - psutil.boot_time()
            except Exception as e:
                logger.warning("psutil reading failed, falling back to /proc: %s", e)

        # Fallback to native /proc filesystem on Linux / Raspberry Pi
        if not HAS_PSUTIL or uptime is None:
            if os.path.exists("/proc/meminfo"):
                try:
                    with open("/proc/meminfo", "r") as f:
                        meminfo = {}
                        for line in f:
                            parts = line.split(":")
                            if len(parts) == 2:
                                meminfo[parts[0].strip()] = parts[1].strip()
                        if "MemTotal" in meminfo:
                            total_bytes = int(meminfo["MemTotal"].split()[0]) * 1024
                            ram_total_gb = round(total_bytes / (1024 ** 3), 2)
                        if "MemAvailable" in meminfo:
                            avail_bytes = int(meminfo["MemAvailable"].split()[0]) * 1024
                            ram_available_gb = round(avail_bytes / (1024 ** 3), 2)
                        if "MemTotal" in meminfo and "MemAvailable" in meminfo:
                            used_bytes = max(0, total_bytes - avail_bytes)
                            ram_used_percent = round((used_bytes / total_bytes) * 100, 1)
                except Exception:
                    pass

            if uptime is None and os.path.exists("/proc/uptime"):
                try:
                    with open("/proc/uptime", "r") as f:
                        uptime = float(f.read().split()[0])
                except Exception:
                    pass

        storage = cls.get_storage_info()

        return SystemInfoResponse(
            hostname=socket.gethostname(),
            lan_ip=cls.get_lan_ip(),
            os_name=f"{platform.system()} {platform.release()}",
            architecture=platform.machine(),
            cpu_model=cls.get_cpu_model(),
            cpu_cores=psutil.cpu_count(logical=True) or 4,
            ram_total_gb=ram_total_gb,
            ram_available_gb=ram_available_gb,
            ram_used_percent=ram_used_percent,
            storage=storage,
            ollama_status=ollama_status,
            active_model=active_model,
            app_version=settings.APP_VERSION,
            uptime_seconds=uptime,
        )


system_service = SystemService()
