"""
IGRIS Windows UI Automation & Desktop Interaction Module
Implements mouse, keyboard, window management, screen awareness, and UI element detection.
Uses ctypes, win32 user32/kernel32 APIs, and Windows UI Automation.
Mouse & keyboard now delegate to input_controller (SendInput-based, DPI-aware).
"""

import os
import time
import ctypes
from ctypes import wintypes
import subprocess
import json
from typing import Dict, List, Optional, Any

from igris_desktop import input_controller

# Win32 Constants
SW_HIDE = 0
SW_SHOWNORMAL = 1
SW_SHOWMINIMIZED = 2
SW_MAXIMIZE = 3
SW_RESTORE = 9
WM_CLOSE = 0x0010

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

class POINT(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]

def get_active_window() -> Dict[str, Any]:
    """Retrieve details of the currently focused foreground window."""
    hwnd = user32.GetForegroundWindow()
    if not hwnd:
        return {"handle": 0, "title": "", "process_name": "Desktop", "pid": 0}

    length = user32.GetWindowTextLengthW(hwnd)
    title_buf = ctypes.create_unicode_buffer(length + 1)
    user32.GetWindowTextW(hwnd, title_buf, length + 1)
    title = title_buf.value

    pid = wintypes.DWORD()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

    proc_name = "Unknown"
    try:
        import psutil
        p = psutil.Process(pid.value)
        proc_name = p.name()
    except Exception:
        pass

    return {
        "handle": int(hwnd),
        "title": title,
        "process_name": proc_name,
        "pid": pid.value
    }

def list_running_applications() -> List[Dict[str, Any]]:
    """Enumerate running applications with non-empty window titles."""
    results = []

    def enum_windows_proc(hwnd, extra):
        if user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            if length > 0:
                buf = ctypes.create_unicode_buffer(length + 1)
                user32.GetWindowTextW(hwnd, buf, length + 1)
                title = buf.value
                if title.strip():
                    pid = wintypes.DWORD()
                    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                    pname = "Unknown"
                    try:
                        import psutil
                        pname = psutil.Process(pid.value).name()
                    except Exception:
                        pass
                    results.append({
                        "handle": int(hwnd),
                        "title": title,
                        "process_name": pname,
                        "pid": pid.value
                    })
        return True

    WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_bool, wintypes.HWND, wintypes.LPARAM)
    user32.EnumWindows(WNDENUMPROC(enum_windows_proc), 0)
    return results

def launch_application(app_name: str, args: str = "", force_new: bool = False) -> Dict[str, Any]:
    """Launch an application by name, alias, or executable path. Reuses existing window if already running."""
    app_clean = app_name.lower().strip()

    # Full path fallbacks for apps not on PATH — discovered at runtime
    _CHROME_PATHS = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
    ]
    _SPOTIFY_PATHS = [
        os.path.expanduser(r"~\AppData\Roaming\Spotify\Spotify.exe"),
        os.path.expanduser(r"~\AppData\Local\Microsoft\WindowsApps\Spotify.exe"),
    ]
    _EDGE_PATHS = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]

    def _resolve_full_path(candidates):
        for p in candidates:
            if os.path.isfile(p):
                return p
        return None

    _chrome_full = _resolve_full_path(_CHROME_PATHS)
    _edge_full   = _resolve_full_path(_EDGE_PATHS)
    _spotify_full = _resolve_full_path(_SPOTIFY_PATHS)

    known_apps = {
        "chrome": _chrome_full or "chrome.exe",
        "google chrome": _chrome_full or "chrome.exe",
        "edge": _edge_full or "msedge.exe",
        "microsoft edge": _edge_full or "msedge.exe",
        "vscode": "code",
        "vs code": "code",
        "code": "code",
        "visual studio code": "code",
        "notepad": "notepad.exe",
        "calc": "calc.exe",
        "calculator": "calc.exe",
        "explorer": "explorer.exe",
        "file explorer": "explorer.exe",
        "terminal": "wt.exe",
        "windows terminal": "wt.exe",
        "powershell": "powershell.exe",
        "cmd": "cmd.exe",
        "command prompt": "cmd.exe",
        "task manager": "taskmgr.exe",
        "taskmgr": "taskmgr.exe",
        "settings": "ms-settings:",
        "spotify": _spotify_full or "spotify.exe",
        "paint": "mspaint.exe",
        "word": "winword.exe",
        "excel": "excel.exe",
        "powerpoint": "powerpnt.exe",
        "teams": "teams.exe",
        "discord": "discord.exe",
        "steam": "steam.exe",
        "vlc": "vlc.exe",
        "obs": "obs64.exe",
        "zoom": "zoom.exe",
        "slack": "slack.exe",
        "snipping tool": "snippingtool.exe",
        "snip": "snippingtool.exe",
        "registry": "regedit.exe",
        "regedit": "regedit.exe",
        "control panel": "control.exe",
        "control": "control.exe",
        "device manager": "devmgmt.msc",
        "wordpad": "wordpad.exe",
        "sticky notes": "stikynot.exe",
    }

    target = known_apps.get(app_clean, app_name)
    proc_hint = os.path.splitext(os.path.basename(target))[0].lower()

    # Check if already running (unless explicit args or force_new)
    if not args and not force_new and not target.startswith("ms-settings:"):
        apps = list_running_applications()
        for app in apps:
            pname = app["process_name"].lower()
            title = app["title"].lower()
            if proc_hint and (proc_hint in pname or app_clean in pname or app_clean in title):
                _force_foreground(app["handle"])
                time.sleep(0.1)
                return {
                    "success": True,
                    "reused_window": True,
                    "verified": True,
                    "app_name": app_name,
                    "window": app,
                    "message": f"Switched to running '{app['title']}' ({app['process_name']})."
                }

    try:
        if target.startswith("ms-settings:"):
            os.startfile(target)
        elif target.endswith(".msc"):
            subprocess.Popen(["mmc.exe", target], shell=False)
        else:
            # Build the launch command properly
            use_shell = not os.path.isabs(target)   # only use shell for unqualified names
            cmd = [target]
            if args:
                # Allow multiple args (split if string)
                import shlex
                cmd.extend(shlex.split(args) if isinstance(args, str) else args)
            subprocess.Popen(cmd, shell=use_shell, creationflags=0x00000010)  # CREATE_NEW_CONSOLE

        # Verify window appears (poll up to 3.5s — give slower apps time)
        deadline = time.time() + 3.5
        found_win = None
        while time.time() < deadline:
            time.sleep(0.3)
            for app in list_running_applications():
                pname = app["process_name"].lower()
                title = app["title"].lower()
                if proc_hint and (proc_hint in pname or app_clean in pname or app_clean in title):
                    found_win = app
                    break
            if found_win:
                _force_foreground(found_win["handle"])
                break

        return {
            "success": True,
            "reused_window": False,
            "verified": found_win is not None,
            "app_name": app_name,
            "window": found_win,
            "message": f"Launched {app_name}." + (f" Window '{found_win['title']}' active." if found_win else "")
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to launch '{app_name}': {e}"}

def _force_foreground(hwnd: int) -> bool:
    """Reliably bring a window to the foreground on Windows 10/11."""
    if not hwnd:
        return False
    try:
        if user32.IsIconic(hwnd):
            user32.ShowWindow(hwnd, SW_RESTORE)
        fg_hwnd = user32.GetForegroundWindow()
        if fg_hwnd == hwnd:
            return True
        fg_tid = user32.GetWindowThreadProcessId(fg_hwnd, None) if fg_hwnd else 0
        cur_tid = kernel32.GetCurrentThreadId()
        attached = False
        if fg_tid and fg_tid != cur_tid:
            attached = bool(user32.AttachThreadInput(cur_tid, fg_tid, True))
        try:
            user32.BringWindowToTop(hwnd)
            user32.SetForegroundWindow(hwnd)
        finally:
            if attached:
                user32.AttachThreadInput(cur_tid, fg_tid, False)
        return user32.GetForegroundWindow() == hwnd or True
    except Exception:
        user32.ShowWindowAsync(hwnd, SW_RESTORE)
        user32.SetForegroundWindow(hwnd)
        return True

def focus_application(query: str) -> Dict[str, Any]:
    """Find a window matching query and bring it to foreground."""
    query_lower = query.lower().strip()
    apps = list_running_applications()
    match = None

    for app in apps:
        if query_lower in app["title"].lower() or query_lower in app["process_name"].lower():
            match = app
            break

    if match:
        hwnd = match["handle"]
        _force_foreground(hwnd)
        time.sleep(0.08)
        return {"success": True, "window": match, "message": f"Switched to '{match['title']}'."}

    return {"success": False, "message": f"No active window found matching '{query}'."}

def minimize_window(query: str = "") -> Dict[str, Any]:
    """Minimize active window or window matching query."""
    hwnd = None
    if query:
        res = focus_application(query)
        if res["success"]:
            hwnd = res["window"]["handle"]
    else:
        hwnd = user32.GetForegroundWindow()

    if hwnd:
        user32.ShowWindow(hwnd, SW_SHOWMINIMIZED)
        return {"success": True, "message": "Minimized window."}
    return {"success": False, "message": "No window to minimize."}

def maximize_window(query: str = "") -> Dict[str, Any]:
    """Maximize active window or window matching query."""
    hwnd = None
    if query:
        res = focus_application(query)
        if res["success"]:
            hwnd = res["window"]["handle"]
    else:
        hwnd = user32.GetForegroundWindow()

    if hwnd:
        user32.ShowWindow(hwnd, SW_MAXIMIZE)
        return {"success": True, "message": "Maximized window."}
    return {"success": False, "message": "No window to maximize."}

def close_window(query: str = "") -> Dict[str, Any]:
    """Close active window or window matching query normally."""
    hwnd = None
    if query:
        res = focus_application(query)
        if res["success"]:
            hwnd = res["window"]["handle"]
    else:
        hwnd = user32.GetForegroundWindow()

    if hwnd:
        user32.PostMessageW(hwnd, WM_CLOSE, 0, 0)
        return {"success": True, "message": "Closed window normally."}
    return {"success": False, "message": "No window to close."}

def mouse_move(x: int, y: int) -> Dict[str, Any]:
    """Move cursor to coordinate (x, y) — DPI-aware via SendInput."""
    return input_controller.move_mouse(x, y)

def mouse_click(button: str = "left", x: Optional[int] = None, y: Optional[int] = None) -> Dict[str, Any]:
    """Click mouse button at current or specified coordinate — via SendInput."""
    b = button.lower()
    if b == "double":
        return input_controller.double_click(x, y)
    return input_controller.click(button, x, y)

def mouse_scroll(direction: str = "down", amount: int = 3) -> Dict[str, Any]:
    """Scroll mouse wheel vertically or horizontally — via SendInput."""
    return input_controller.scroll(direction, amount)

def mouse_drag(start_x: int, start_y: int, end_x: int, end_y: int, duration: float = 0.25) -> Dict[str, Any]:
    """Drag mouse from (start_x, start_y) to (end_x, end_y) — via SendInput."""
    return input_controller.drag(start_x, start_y, end_x, end_y, duration=duration)

def type_text(text: str, press_enter: bool = False) -> Dict[str, Any]:
    """Type Unicode text via SendInput (KEYEVENTF_UNICODE). No PowerShell, no subprocess."""
    return input_controller.type_text(text, press_enter)

def press_key(key: str) -> Dict[str, Any]:
    """Press a single key by name — via SendInput VK codes. No PowerShell."""
    return input_controller.press_key(key)

def send_combo(combo: str) -> Dict[str, Any]:
    """Send a keyboard shortcut combo (e.g. ctrl+t, ctrl+w, alt+tab) — via SendInput."""
    return input_controller.send_combo(combo)

def inspect_ui_tree(hwnd: Optional[int] = None, max_elements: int = 45) -> Dict[str, Any]:
    """Inspect interactive UI controls in the target/foreground window via pywinauto UIA."""
    target_hwnd = hwnd or user32.GetForegroundWindow()
    if not target_hwnd:
        return {"success": False, "elements": [], "text_values": []}

    interactive_types = {
        "Button", "Edit", "Document", "TabItem", "MenuItem",
        "ListItem", "ComboBox", "CheckBox", "RadioButton", "Hyperlink", "TreeItem"
    }
    elements: List[Dict[str, Any]] = []
    text_values: List[str] = []

    try:
        from pywinauto import Desktop
        win = Desktop(backend="uia").window(handle=target_hwnd)
        win_title = win.window_text() or ""
        for ctrl in win.descendants():
            if len(elements) >= max_elements:
                break
            try:
                info = ctrl.element_info
                ctype = info.control_type or ""
                if ctype not in interactive_types:
                    continue
                rect = info.rectangle
                w = rect.width()
                h = rect.height()
                if w <= 4 or h <= 4:
                    continue
                name = (info.name or "").strip()
                val = ""
                if ctype in ("Edit", "Document"):
                    try:
                        val = (ctrl.get_value() or "").strip() if hasattr(ctrl, "get_value") else ""
                    except Exception:
                        try:
                            val = (ctrl.window_text() or "").strip()
                        except Exception:
                            val = ""
                    if val:
                        text_values.append(val[:300])
                if not name and not val:
                    continue
                elements.append({
                    "name": name or f"({ctype})",
                    "type": ctype,
                    "value": val[:200] if val else "",
                    "x": int(rect.left),
                    "y": int(rect.top),
                    "width": int(w),
                    "height": int(h),
                    "centerX": int(rect.left + w / 2),
                    "centerY": int(rect.top + h / 2),
                })
            except Exception:
                continue
        return {
            "success": True,
            "windowTitle": win_title,
            "elements": elements,
            "text_values": text_values
        }
    except Exception:
        return {"success": False, "elements": [], "text_values": []}

def read_focused_text() -> Dict[str, Any]:
    """Read text from the currently focused UIA Edit/Document control if accessible."""
    try:
        from pywinauto.uia_defines import IUIA
        iuia = IUIA()
        focused = iuia.iuia.GetFocusedElement()
        if focused:
            from pywinauto.controls.uiawrapper import UIAWrapper
            from pywinauto.uia_element_info import UIAElementInfo
            wrapper = UIAWrapper(UIAElementInfo(focused))
            text = ""
            try:
                text = wrapper.iface_value.CurrentValue or ""
            except Exception:
                try:
                    text = wrapper.iface_text.DocumentRange.GetText(-1) or ""
                except Exception:
                    text = wrapper.window_text() or ""
            return {"success": True, "text": text, "controlType": wrapper.element_info.control_type}
    except Exception as e:
        return {"success": False, "text": "", "message": str(e)}
    return {"success": False, "text": ""}

def find_ui_elements(name_pattern: str = "", control_type: str = "") -> List[Dict[str, Any]]:
    """Search for visible UI elements in the active window via pywinauto UIA, with PowerShell fallback."""
    pat_lower = name_pattern.lower().strip()
    type_lower = control_type.lower().strip()
    tree = inspect_ui_tree(max_elements=60)
    if tree.get("success") and tree.get("elements"):
        matched = []
        for el in tree["elements"]:
            if pat_lower and pat_lower not in el["name"].lower():
                continue
            if type_lower and type_lower not in el["type"].lower():
                continue
            matched.append(el)
            if len(matched) >= 10:
                break
        if matched:
            return matched

    ps_script = f"""
    try {{
        Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop
        Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop

        $handle = [IntPtr]{user32.GetForegroundWindow()}
        $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
        $elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

        $list = @()
        foreach ($e in $elements) {{
            $name = $e.Current.Name
            $type = $e.Current.ControlType.ProgrammaticName
            $matched = $true
            if ('{name_pattern}' -and -not ($name -like '*{name_pattern}*')) {{ $matched = $false }}
            if ('{control_type}' -and -not ($type -like '*{control_type}*')) {{ $matched = $false }}

            if ($matched -and $name) {{
                $r = $e.Current.BoundingRectangle
                $list += @{{
                    name = $name
                    type = $type
                    centerX = [int]($r.X + ($r.Width / 2))
                    centerY = [int]($r.Y + ($r.Height / 2))
                }}
                if ($list.Count -ge 8) {{ break }}
            }}
        }}
        $list | ConvertTo-Json -Compress
    }} catch {{
        Write-Output "[]"
    }}
    """
    res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, timeout=8)
    try:
        data = json.loads(res.stdout.strip())
        return data if isinstance(data, list) else ([data] if data else [])
    except Exception:
        return []

def click_ui_element(description: str, control_type: str = "") -> Dict[str, Any]:
    """Find an element by description in the active window and click its center."""
    matches = find_ui_elements(description, control_type)
    if matches:
        target = matches[0]
        cx = target.get("centerX", 0)
        cy = target.get("centerY", 0)
        if cx > 0 and cy > 0:
            mouse_click("left", cx, cy)
            return {"success": True, "element": target["name"], "message": f"Clicked '{target['name']}'."}

    return {"success": False, "message": f"Could not find UI element matching '{description}'."}

def _optimize_screenshot(path: str, max_dim: int = 1280) -> None:
    """Downscale and compress screenshot to ensure fast network transmission for vision AI."""
    try:
        from PIL import Image
        if os.path.exists(path):
            with Image.open(path) as im:
                w, h = im.size
                if max(w, h) > max_dim:
                    if w > h:
                        nw, nh = max_dim, max(1, int(h * max_dim / w))
                    else:
                        nw, nh = max(1, int(w * max_dim / h)), max_dim
                    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
                im.convert("RGB").save(path, "JPEG", quality=80)
    except Exception as e:
        print(f"[ScreenCapture] Optimization note: {e}")

def capture_screen(output_path: Optional[str] = None) -> Dict[str, Any]:
    """Capture a screenshot of the primary display — Python-first, no PowerShell."""
    target_path = output_path or os.path.join(
        os.environ.get("TEMP", "."), f"igris_screen_{int(time.time())}.jpg"
    )

    # 1. Try mss (fastest, most reliable, no PowerShell)
    try:
        import mss
        import mss.tools
        sct_cls = getattr(mss, "MSS", getattr(mss, "mss", None))
        if sct_cls:
            with sct_cls() as sct:
                monitor = sct.monitors[1]  # Primary monitor
                sct_img = sct.grab(monitor)
                png_path = target_path.replace(".jpg", ".png")
                mss.tools.to_png(sct_img.rgb, sct_img.size, output=png_path)
                try:
                    from PIL import Image as PILImage
                    with PILImage.open(png_path) as pil_img:
                        pil_img.convert("RGB").save(target_path, "JPEG", quality=85)
                    if os.path.exists(png_path):
                        os.remove(png_path)
                except Exception:
                    target_path = png_path
            if os.path.exists(target_path):
                _optimize_screenshot(target_path)
                return {"success": True, "path": target_path, "message": "Screenshot captured via mss."}
    except ImportError:
        pass
    except Exception as e:
        print(f"[ScreenCapture] mss failed: {e}")

    # 2. Try PIL ImageGrab
    try:
        from PIL import ImageGrab
        img = ImageGrab.grab(all_screens=False)
        img.save(target_path, "JPEG", quality=85)
        if os.path.exists(target_path):
            _optimize_screenshot(target_path)
            return {"success": True, "path": target_path, "message": "Screenshot captured via PIL."}
    except ImportError:
        pass
    except Exception as e:
        print(f"[ScreenCapture] PIL failed: {e}")

    # 3. Last resort: PowerShell
    ps_script = (
        "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; "
        "$b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; "
        "$bmp=New-Object System.Drawing.Bitmap($b.Width,$b.Height); "
        "$g=[System.Drawing.Graphics]::FromImage($bmp); "
        "$g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); "
        f"$bmp.Save('{target_path}',[System.Drawing.Imaging.ImageFormat]::Jpeg); "
        "$g.Dispose();$bmp.Dispose()"
    )
    subprocess.run(
        ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
        capture_output=True, timeout=10
    )
    if os.path.exists(target_path):
        _optimize_screenshot(target_path)
        return {"success": True, "path": target_path, "message": "Screenshot captured via PowerShell."}
    return {"success": False, "path": "", "message": "All screenshot methods failed."}
