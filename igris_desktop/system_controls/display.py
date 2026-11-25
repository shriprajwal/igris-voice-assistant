"""
IGRIS Display & System Telemetry Module
"""

import os
import platform
import psutil
import ctypes
from typing import Dict, Any

def get_system_info() -> Dict[str, Any]:
    """Retrieve system, battery, and disk storage metrics."""
    try:
        drives = []
        for part in psutil.disk_partitions(all=False):
            if os.name == 'nt' and 'cdrom' in part.opts or part.fstype == '':
                continue
            try:
                usage = psutil.disk_usage(part.mountpoint)
                drives.append({
                    "mount": part.mountpoint,
                    "total_gb": round(usage.total / (1024**3), 1),
                    "free_gb": round(usage.free / (1024**3), 1),
                    "percent_used": usage.percent
                })
            except (PermissionError, OSError):
                continue

        battery_info = None
        if hasattr(psutil, "sensors_battery"):
            batt = psutil.sensors_battery()
            if batt:
                battery_info = {
                    "percent": batt.percent,
                    "power_plugged": batt.power_plugged,
                    "seconds_left": batt.secsleft if batt.secsleft != psutil.POWER_TIME_UNLIMITED else None
                }

        mem = psutil.virtual_memory()
        cpu_pct = psutil.cpu_percent(interval=0.1)

        return {
            "success": True,
            "os": f"Windows {platform.version()}",
            "machine_name": platform.node(),
            "cpu_percent": cpu_pct,
            "memory_free_gb": round(mem.available / (1024**3), 1),
            "memory_total_gb": round(mem.total / (1024**3), 1),
            "drives": drives,
            "battery": battery_info,
            "message": "System telemetry retrieved."
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to retrieve system info: {e}"}

def lock_pc() -> Dict[str, Any]:
    """Lock the Windows workstation immediately."""
    try:
        ctypes.windll.user32.LockWorkStation()
        return {"success": True, "message": "Workstation locked successfully."}
    except Exception as e:
        return {"success": False, "message": f"Failed to lock workstation: {e}"}
