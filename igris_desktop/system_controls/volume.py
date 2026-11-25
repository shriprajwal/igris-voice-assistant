"""
IGRIS Volume Control Module
Direct master hardware volume control and mute toggling via Windows virtual key codes.
"""

import ctypes
from typing import Dict, Any

# Windows Virtual Key Codes for Audio
VK_VOLUME_MUTE = 0xAD
VK_VOLUME_DOWN = 0xAE
VK_VOLUME_UP = 0xAF
KEYEVENTF_KEYUP = 0x0002

def _send_key(vk_code: int):
    ctypes.windll.user32.keybd_event(vk_code, 0, 0, 0)
    ctypes.windll.user32.keybd_event(vk_code, 0, KEYEVENTF_KEYUP, 0)

def volume_up(steps: int = 2) -> Dict[str, Any]:
    """Increase master system volume."""
    count = max(1, min(steps, 20))
    for _ in range(count):
        _send_key(VK_VOLUME_UP)
    return {"success": True, "message": f"Increased volume by {count * 2}%."}

def volume_down(steps: int = 2) -> Dict[str, Any]:
    """Decrease master system volume."""
    count = max(1, min(steps, 20))
    for _ in range(count):
        _send_key(VK_VOLUME_DOWN)
    return {"success": True, "message": f"Decreased volume by {count * 2}%."}

def toggle_mute() -> Dict[str, Any]:
    """Toggle master audio mute."""
    _send_key(VK_VOLUME_MUTE)
    return {"success": True, "message": "Toggled master volume mute."}
