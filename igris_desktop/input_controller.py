"""
IGRIS Input Controller — Unified Mouse & Keyboard via Win32 SendInput
Replaces legacy mouse_event() and PowerShell SendKeys with direct ctypes SendInput calls.
DPI-aware. No subprocess spawning. Verifiable actions.
"""

import ctypes
import ctypes.wintypes as wintypes
import time
from typing import Optional, Tuple

# ── Win32 structs ──────────────────────────────────────────────────────────────

class MOUSEINPUT(ctypes.Structure):
    _fields_ = [
        ("dx",          ctypes.c_long),
        ("dy",          ctypes.c_long),
        ("mouseData",   wintypes.DWORD),
        ("dwFlags",     wintypes.DWORD),
        ("time",        wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

class KEYBDINPUT(ctypes.Structure):
    _fields_ = [
        ("wVk",         wintypes.WORD),
        ("wScan",       wintypes.WORD),
        ("dwFlags",     wintypes.DWORD),
        ("time",        wintypes.DWORD),
        ("dwExtraInfo", ctypes.POINTER(ctypes.c_ulong)),
    ]

class _INPUT_UNION(ctypes.Union):
    _fields_ = [
        ("mi", MOUSEINPUT),
        ("ki", KEYBDINPUT),
    ]

class INPUT(ctypes.Structure):
    _fields_ = [
        ("type",    wintypes.DWORD),
        ("_input",  _INPUT_UNION),
    ]

INPUT_MOUSE    = 0
INPUT_KEYBOARD = 1

# Mouse flags
MOUSEEVENTF_MOVE       = 0x0001
MOUSEEVENTF_LEFTDOWN   = 0x0002
MOUSEEVENTF_LEFTUP     = 0x0004
MOUSEEVENTF_RIGHTDOWN  = 0x0008
MOUSEEVENTF_RIGHTUP    = 0x0010
MOUSEEVENTF_MIDDLEDOWN = 0x0020
MOUSEEVENTF_MIDDLEUP   = 0x0040
MOUSEEVENTF_WHEEL      = 0x0800
MOUSEEVENTF_HWHEEL     = 0x01000
MOUSEEVENTF_ABSOLUTE   = 0x8000

# Keyboard flags
KEYEVENTF_EXTENDEDKEY = 0x0001
KEYEVENTF_KEYUP       = 0x0002
KEYEVENTF_UNICODE     = 0x0004

EXTENDED_VKS = {
    0x21, 0x22, 0x23, 0x24,  # pageup, pagedown, end, home
    0x25, 0x26, 0x27, 0x28,  # left, up, right, down
    0x2D, 0x2E,              # insert, delete
    0x5B, 0x5C,              # lwin, rwin
}

user32   = ctypes.windll.user32
shcore   = ctypes.windll.shcore

# ── DPI awareness ──────────────────────────────────────────────────────────────

def _set_dpi_aware():
    """Mark process as DPI-aware so coordinates map to real pixels."""
    try:
        shcore.SetProcessDpiAwareness(2)   # PROCESS_PER_MONITOR_DPI_AWARE
    except Exception:
        try:
            user32.SetProcessDPIAware()
        except Exception:
            pass

_set_dpi_aware()

def _screen_size() -> Tuple[int, int]:
    return user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)   # SM_CXSCREEN, SM_CYSCREEN

# ── SendInput helpers ──────────────────────────────────────────────────────────

def _send_inputs(*inputs: INPUT) -> int:
    arr = (INPUT * len(inputs))(*inputs)
    return user32.SendInput(len(inputs), ctypes.byref(arr), ctypes.sizeof(INPUT))

def _mouse_input(flags: int, dx: int = 0, dy: int = 0, data: int = 0) -> INPUT:
    mi = MOUSEINPUT(dx=dx, dy=dy, mouseData=data, dwFlags=flags, time=0, dwExtraInfo=None)
    return INPUT(type=INPUT_MOUSE, _input=_INPUT_UNION(mi=mi))

def _key_input(vk: int, scan: int, flags: int) -> INPUT:
    ki = KEYBDINPUT(wVk=vk, wScan=scan, dwFlags=flags, time=0, dwExtraInfo=None)
    return INPUT(type=INPUT_KEYBOARD, _input=_INPUT_UNION(ki=ki))

# ── Mouse ──────────────────────────────────────────────────────────────────────

def move_mouse(x: int, y: int) -> dict:
    """Move cursor to absolute screen coordinates."""
    w, h = _screen_size()
    x_clamped = max(0, min(int(x), max(0, w - 1)))
    y_clamped = max(0, min(int(y), max(0, h - 1)))
    ax = int(round(x_clamped * 65535 / max(1, w - 1)))
    ay = int(round(y_clamped * 65535 / max(1, h - 1)))
    sent = _send_inputs(_mouse_input(MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE, ax, ay))
    if sent == 0:
        user32.SetCursorPos(x_clamped, y_clamped)
    time.sleep(0.03)
    # Verify
    pt = wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    moved_ok = sent > 0 or (abs(pt.x - x_clamped) <= 4 and abs(pt.y - y_clamped) <= 4)
    return {"success": True, "injected": moved_ok, "x": x_clamped, "y": y_clamped, "cursor_x": pt.x, "cursor_y": pt.y,
            "message": f"Moved mouse to ({x_clamped}, {y_clamped}). Cursor at ({pt.x}, {pt.y})."
            if moved_ok else f"Dispatched move to ({x_clamped}, {y_clamped}) (SendInput=0; desktop/UIPI restricted)."}

def click(button: str = "left", x: Optional[int] = None, y: Optional[int] = None) -> dict:
    """Click at current or given position using SendInput."""
    b = button.lower().strip()
    if b == "double":
        return double_click(x, y)

    if x is not None and y is not None:
        move_mouse(x, y)
        time.sleep(0.04)

    if b == "right":
        sent = _send_inputs(
            _mouse_input(MOUSEEVENTF_RIGHTDOWN),
            _mouse_input(MOUSEEVENTF_RIGHTUP),
        )
    elif b in ("middle", "center"):
        sent = _send_inputs(
            _mouse_input(MOUSEEVENTF_MIDDLEDOWN),
            _mouse_input(MOUSEEVENTF_MIDDLEUP),
        )
    else:   # left
        sent = _send_inputs(
            _mouse_input(MOUSEEVENTF_LEFTDOWN),
            _mouse_input(MOUSEEVENTF_LEFTUP),
        )
    return {"success": True, "injected": sent > 0, "button": button, "x": x, "y": y,
            "message": f"{button.capitalize()} click at ({x}, {y})."}

def double_click(x: Optional[int] = None, y: Optional[int] = None) -> dict:
    """Double-click at given or current position."""
    click("left", x, y)
    time.sleep(0.06)
    click("left", x, y)
    return {"success": True, "x": x, "y": y, "message": f"Double-clicked at ({x}, {y})."}

def right_click(x: Optional[int] = None, y: Optional[int] = None) -> dict:
    return click("right", x, y)

def drag(start_x: int, start_y: int, end_x: int, end_y: int, duration: float = 0.25, steps: int = 12) -> dict:
    """Drag mouse from (start_x, start_y) to (end_x, end_y) using smooth SendInput steps."""
    move_mouse(start_x, start_y)
    time.sleep(0.05)
    sent_down = _send_inputs(_mouse_input(MOUSEEVENTF_LEFTDOWN))
    time.sleep(0.04)

    w, h = _screen_size()
    step_count = max(2, steps)
    step_delay = max(0.005, duration / step_count)
    for i in range(1, step_count + 1):
        t = i / step_count
        cx = int(round(start_x + (end_x - start_x) * t))
        cy = int(round(start_y + (end_y - start_y) * t))
        cx_c = max(0, min(cx, max(0, w - 1)))
        cy_c = max(0, min(cy, max(0, h - 1)))
        ax = int(round(cx_c * 65535 / max(1, w - 1)))
        ay = int(round(cy_c * 65535 / max(1, h - 1)))
        _send_inputs(_mouse_input(MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE, ax, ay))
        time.sleep(step_delay)

    sent_up = _send_inputs(_mouse_input(MOUSEEVENTF_LEFTUP))
    pt = wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    return {
        "success": True,
        "injected": (sent_down > 0 and sent_up > 0),
        "start": (start_x, start_y),
        "end": (end_x, end_y),
        "cursor_x": pt.x,
        "cursor_y": pt.y,
        "message": f"Dragged from ({start_x}, {start_y}) to ({end_x}, {end_y})."
    }

def scroll(direction: str = "down", amount: int = 3) -> dict:
    """Scroll mouse wheel vertically (up/down) or horizontally (left/right)."""
    d = direction.lower().strip()
    if d in ("left", "right"):
        delta = -(120 * amount) if d == "left" else (120 * amount)
        sent = _send_inputs(_mouse_input(MOUSEEVENTF_HWHEEL, data=delta & 0xFFFFFFFF))
    else:
        delta = (120 * amount) if d == "up" else -(120 * amount)
        sent = _send_inputs(_mouse_input(MOUSEEVENTF_WHEEL, data=delta & 0xFFFFFFFF))
    return {"success": True, "injected": sent > 0, "direction": direction, "amount": amount,
            "message": f"Scrolled {direction} ({amount} detents)."}

def get_cursor_pos() -> Tuple[int, int]:
    """Return current cursor position."""
    pt = wintypes.POINT()
    user32.GetCursorPos(ctypes.byref(pt))
    return pt.x, pt.y

# ── Keyboard ──────────────────────────────────────────────────────────────────

# Virtual Key codes
VK_CODES: dict = {
    "backspace": 0x08, "tab": 0x09, "enter": 0x0D, "return": 0x0D,
    "shift": 0x10, "ctrl": 0x11, "control": 0x11, "alt": 0x12,
    "pause": 0x13, "capslock": 0x14,
    "escape": 0x1B, "esc": 0x1B,
    "space": 0x20, "pageup": 0x21, "pagedown": 0x22,
    "end": 0x23, "home": 0x24,
    "left": 0x25, "up": 0x26, "right": 0x27, "down": 0x28,
    "insert": 0x2D, "delete": 0x2E, "del": 0x2E,
    "win": 0x5B, "windows": 0x5B, "super": 0x5B, "cmd": 0x5B, "lwin": 0x5B, "rwin": 0x5C,
    "pgup": 0x21, "pgdn": 0x22, "prtsc": 0x2C, "printscreen": 0x2C,
    "0": 0x30, "1": 0x31, "2": 0x32, "3": 0x33, "4": 0x34,
    "5": 0x35, "6": 0x36, "7": 0x37, "8": 0x38, "9": 0x39,
    "a": 0x41, "b": 0x42, "c": 0x43, "d": 0x44, "e": 0x45,
    "f": 0x46, "g": 0x47, "h": 0x48, "i": 0x49, "j": 0x4A,
    "k": 0x4B, "l": 0x4C, "m": 0x4D, "n": 0x4E, "o": 0x4F,
    "p": 0x50, "q": 0x51, "r": 0x52, "s": 0x53, "t": 0x54,
    "u": 0x55, "v": 0x56, "w": 0x57, "x": 0x58, "y": 0x59,
    "z": 0x5A,
    "f1": 0x70, "f2": 0x71, "f3": 0x72, "f4": 0x73,
    "f5": 0x74, "f6": 0x75, "f7": 0x76, "f8": 0x77,
    "f9": 0x78, "f10": 0x79, "f11": 0x7A, "f12": 0x7B,
    "numlock": 0x90, "scrolllock": 0x91,
    "semicolon": 0xBA, "equals": 0xBB, "equal": 0xBB, "plus": 0xBB, "comma": 0xBC,
    "minus": 0xBD, "period": 0xBE, "slash": 0xBF,
    "backtick": 0xC0, "openbracket": 0xDB, "backslash": 0xDC,
    "closebracket": 0xDD, "quote": 0xDE,
}

def press_key(key: str) -> dict:
    """Press and release a single virtual key by name."""
    k = key.lower().strip()
    vk = VK_CODES.get(k)
    if vk is None:
        # Try treating as single character
        if len(key) == 1:
            return type_text(key)
        return {"success": False, "message": f"Unknown key: '{key}'"}
    ext = KEYEVENTF_EXTENDEDKEY if vk in EXTENDED_VKS else 0
    sent = _send_inputs(
        _key_input(vk, 0, ext),
        _key_input(vk, 0, ext | KEYEVENTF_KEYUP),
    )
    return {"success": True, "injected": sent > 0, "key": key, "vk": vk, "message": f"Pressed key '{key}'."}

def hotkey(*keys: str) -> dict:
    """Press a hotkey combination: all keys down in order, then up in reverse."""
    vks = []
    for k in keys:
        vk = VK_CODES.get(k.lower().strip())
        if vk is None:
            return {"success": False, "message": f"Unknown key in combo: '{k}'"}
        vks.append(vk)
    # Press down
    downs = [_key_input(vk, 0, KEYEVENTF_EXTENDEDKEY if vk in EXTENDED_VKS else 0) for vk in vks]
    ups   = [_key_input(vk, 0, (KEYEVENTF_EXTENDEDKEY if vk in EXTENDED_VKS else 0) | KEYEVENTF_KEYUP) for vk in reversed(vks)]
    sent = _send_inputs(*downs, *ups)
    return {"success": True, "injected": sent > 0, "keys": list(keys), "message": f"Hotkey: {'+'.join(keys)}."}

def type_text(text: str, press_enter: bool = False) -> dict:
    """Type a Unicode string character by character using KEYEVENTF_UNICODE."""
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    all_sent = True
    for char in normalized:
        if char == "\n":
            press_key("enter")
            time.sleep(0.01)
            continue
        if char == "\t":
            press_key("tab")
            time.sleep(0.01)
            continue
        code_units = char.encode("utf-16-le")
        for i in range(0, len(code_units), 2):
            scan = int.from_bytes(code_units[i:i+2], "little")
            sent = _send_inputs(
                _key_input(0, scan, KEYEVENTF_UNICODE),
                _key_input(0, scan, KEYEVENTF_UNICODE | KEYEVENTF_KEYUP),
            )
            if sent == 0:
                all_sent = False
        if len(normalized) > 1:
            time.sleep(0.002)
    if press_enter:
        time.sleep(0.04)
        press_key("enter")
    return {"success": True, "injected": all_sent, "typed": text, "message": f"Typed: '{text}'"}

def send_combo(combo: str) -> dict:
    """
    Parse and send a keyboard combo string like 'ctrl+t', 'ctrl+shift+n', 'alt+tab'.
    Keys are separated by '+'.
    """
    parts = [p.strip().lower() for p in combo.split("+")]
    return hotkey(*parts)
