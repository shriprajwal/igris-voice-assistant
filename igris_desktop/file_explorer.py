"""
IGRIS Contextual File Explorer & Navigation Engine
Solves conversational folder navigation, nested folders, ordinal selections, and contextual awareness.
Uses Shell.Application COM (via win32com) to navigate existing Explorer windows in-place.
Only opens a new Explorer window when no existing window is available.
"""

import os
import subprocess
import urllib.parse
import time
from typing import Dict, Any, Optional
from igris_desktop.context_manager import DesktopContextManager

# ── Shell.Application helpers ──────────────────────────────────────────────────

def _url_to_path(url: str) -> str:
    """Convert a file:///C:/... URL to a Windows path."""
    if url.startswith("file:///"):
        p = url[8:].replace("/", "\\")
        return urllib.parse.unquote(p)
    return url

def _get_explorer_windows():
    """
    Return a list of dicts describing open File Explorer windows.
    Each entry: {"com_window": w, "path": str, "hwnd": int}
    Returns [] if win32com is not available.
    """
    try:
        import win32com.client
        shell = win32com.client.Dispatch("Shell.Application")
        windows = shell.Windows()
        result = []
        for i in range(windows.Count):
            try:
                w = windows.Item(i)
                if w is None:
                    continue
                loc = getattr(w, "LocationURL", "") or ""
                path = _url_to_path(loc) if loc.startswith("file:///") else ""
                if path and os.path.isdir(path):
                    hwnd = getattr(w, "HWND", 0)
                    result.append({"com_window": w, "path": path, "hwnd": int(hwnd)})
            except Exception:
                continue
        return result
    except Exception:
        return []

def _navigate_or_open(target_path: str, force_new: bool = False) -> Dict[str, Any]:
    """
    If a File Explorer window already exists and force_new is False, navigate it
    in-place.  Otherwise open a new Explorer window.
    """
    if not force_new:
        windows = _get_explorer_windows()
        if windows:
            # Prefer the front-most / first enumerated window
            w_info = windows[0]
            w = w_info["com_window"]
            try:
                w.Navigate(target_path)
                time.sleep(0.3)
                # Bring window to front
                try:
                    import ctypes
                    hwnd = w_info["hwnd"]
                    if hwnd:
                        ctypes.windll.user32.ShowWindow(hwnd, 9)   # SW_RESTORE
                        ctypes.windll.user32.SetForegroundWindow(hwnd)
                except Exception:
                    pass
                return {"success": True, "reused_window": True, "path": target_path}
            except Exception as e:
                # Fall through to open new window
                pass

    # Open new Explorer window
    try:
        subprocess.Popen(["explorer.exe", target_path])
        time.sleep(0.5)
        return {"success": True, "reused_window": False, "path": target_path}
    except Exception as e:
        return {"success": False, "reused_window": False, "path": target_path,
                "error": str(e)}

def get_active_explorer_path() -> Optional[str]:
    """Return the current path of the topmost File Explorer window, or None."""
    windows = _get_explorer_windows()
    if windows:
        return windows[0]["path"]
    return None

def open_folder(folder_target: str, context: DesktopContextManager) -> Dict[str, Any]:
    """
    Open File Explorer at a standard folder, alias, or specific path.
    Updates context directory and catalogs visible folder contents.
    """
    target_clean = folder_target.lower().strip()

    # 1. Resolve alias from known directories
    resolved_path = context.known_directories.get(target_clean)
    if not resolved_path:
        # Check if direct path or relative to current directory
        if os.path.exists(folder_target):
            resolved_path = os.path.abspath(folder_target)
        elif context.current_directory:
            candidate = os.path.join(context.current_directory, folder_target)
            if os.path.exists(candidate):
                resolved_path = os.path.abspath(candidate)

    if not resolved_path or not os.path.exists(resolved_path):
        return {
            "success": False,
            "message": f"Could not find or locate folder '{folder_target}'.",
            "current_directory": context.current_directory
        }

    # Navigate in existing Explorer window or open new one
    try:
        nav_result = _navigate_or_open(resolved_path)
        if not nav_result["success"]:
            return {"success": False, "message": f"Failed to open File Explorer: {nav_result.get('error', 'unknown')}"}
    except Exception as e:
        return {"success": False, "message": f"Failed to launch File Explorer: {e}"}

    # Update context directory and catalog visible items
    context.set_current_directory(resolved_path)
    context.update_active_window(os.path.basename(resolved_path), "explorer.exe")
    context.record_action("OPEN_FOLDER", f"Opened folder: {resolved_path}")

    folders = context.get_visible_folders()
    files = context.get_visible_files()
    sample_folders = [f["name"] for f in folders[:4]]

    details = f"Opened {os.path.basename(resolved_path)}. Contains {len(folders)} folders and {len(files)} files."
    if sample_folders:
        details += f" Folders include: {', '.join(sample_folders)}."

    return {
        "success": True,
        "path": resolved_path,
        "folder_name": os.path.basename(resolved_path),
        "folders_count": len(folders),
        "files_count": len(files),
        "folders": sample_folders,
        "message": details
    }

def navigate_nested_folder(target: str, context: DesktopContextManager) -> Dict[str, Any]:
    """
    Contextual navigation: Open a subfolder inside the currently active folder.
    e.g. 'Open the NEON ESCAPE folder', 'open the folder inside Downloads', 'the project folder'
    """
    current_dir = context.get_current_directory()
    if not current_dir or not os.path.exists(current_dir):
        return {
            "success": False,
            "message": "No active folder context found. Please specify which folder to open first.",
            "current_directory": None
        }

    item, candidates, is_ambiguous = context.resolve_contextual_item(target, item_type="folder")

    if is_ambiguous:
        return {
            "success": False,
            "is_ambiguous": True,
            "candidates": candidates,
            "message": f"Multiple folders found in {os.path.basename(current_dir)}: {', '.join(candidates)}. Which one should I open, Monarch?"
        }

    if not item:
        folders = [f["name"] for f in context.get_visible_folders()]
        folder_list = f" Available folders: {', '.join(folders[:5])}." if folders else " This folder has no subfolders."
        return {
            "success": False,
            "message": f"Could not find folder '{target}' inside {os.path.basename(current_dir)}.{folder_list}",
            "current_directory": current_dir
        }

    # Navigate in existing Explorer window or open new one
    subfolder_path = item["path"]
    try:
        nav_result = _navigate_or_open(subfolder_path)
        if not nav_result["success"]:
            return {"success": False, "message": f"Failed to open folder: {nav_result.get('error', 'unknown')}"}
    except Exception as e:
        return {"success": False, "message": f"Failed to open folder: {e}"}

    context.set_current_directory(subfolder_path)
    context.update_active_window(item["name"], "explorer.exe")
    context.record_action("NAVIGATE_NESTED_FOLDER", f"Opened nested folder: {subfolder_path}")

    sub_folders = context.get_visible_folders()
    sub_files = context.get_visible_files()

    return {
        "success": True,
        "path": subfolder_path,
        "folder_name": item["name"],
        "parent_folder": os.path.basename(current_dir),
        "folders_count": len(sub_folders),
        "files_count": len(sub_files),
        "message": f"Opened folder '{item['name']}' inside {os.path.basename(current_dir)}."
    }

def open_ordinal_item(ordinal_index: int, item_type: str, context: DesktopContextManager) -> Dict[str, Any]:
    """
    Opens the N-th item in the current folder (e.g. 'the first folder', 'the second file', 'the third item').
    """
    current_dir = context.get_current_directory()
    context.refresh_visible_items()

    if item_type == "folder":
        pool = context.get_visible_folders()
        label = "folder"
    elif item_type == "file":
        pool = context.get_visible_files()
        label = "file"
    else:
        pool = context.visible_items
        label = "item"

    if not pool:
        return {
            "success": False,
            "message": f"No {label}s found in {os.path.basename(current_dir)}.",
            "current_directory": current_dir
        }

    # Normalize index
    idx = ordinal_index
    if idx == -1:
        target_item = pool[-1]
    elif 0 <= idx < len(pool):
        target_item = pool[idx]
    else:
        return {
            "success": False,
            "message": f"Requested index {ordinal_index + 1} exceeds the {len(pool)} available {label}s in {os.path.basename(current_dir)}.",
            "available_count": len(pool)
        }

    # Execute opening
    if target_item["is_dir"]:
        return open_folder(target_item["path"], context)
    else:
        return open_file(target_item["path"], context)

def navigate_back(context: DesktopContextManager) -> Dict[str, Any]:
    """
    Navigate back to the parent folder in context.
    """
    current_dir = context.get_current_directory()
    parent = os.path.dirname(current_dir)
    if parent and parent != current_dir and os.path.exists(parent):
        return open_folder(parent, context)

    return {
        "success": False,
        "message": f"Already at the root of {current_dir}.",
        "current_directory": current_dir
    }

def open_file(file_path: str, context: DesktopContextManager) -> Dict[str, Any]:
    """
    Open a specific file in its default associated Windows application.
    """
    resolved = file_path
    if not os.path.isabs(resolved) and context.current_directory:
        candidate = os.path.join(context.current_directory, resolved)
        if os.path.exists(candidate):
            resolved = candidate

    if not os.path.exists(resolved):
        # Try matching in visible files
        match, _, _ = context.resolve_contextual_item(file_path, item_type="file")
        if match:
            resolved = match["path"]
        else:
            return {"success": False, "message": f"File '{file_path}' does not exist."}

    try:
        os.startfile(resolved)
        context.record_action("OPEN_FILE", f"Opened file: {resolved}")
        return {
            "success": True,
            "path": resolved,
            "file_name": os.path.basename(resolved),
            "message": f"Opened '{os.path.basename(resolved)}' in its default application."
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to open file: {e}"}

def create_folder(folder_name: str, parent_folder: Optional[str], context: DesktopContextManager) -> Dict[str, Any]:
    """
    Create a new folder inside parent_folder or the current directory.
    """
    parent = parent_folder or context.get_current_directory()
    if not os.path.exists(parent):
        parent = context.known_directories.get("documents", os.path.expanduser("~"))

    # Sanitize folder name
    sanitized = "".join(c for c in folder_name if c not in '<>:"/\\|?*').strip()
    if not sanitized:
        return {"success": False, "message": "Invalid folder name provided."}

    target_path = os.path.join(parent, sanitized)
    try:
        if os.path.exists(target_path):
            return {
                "success": True,
                "path": target_path,
                "message": f"Folder '{sanitized}' already exists in {os.path.basename(parent)}."
            }
        os.makedirs(target_path, exist_ok=True)
        context.refresh_visible_items()
        context.record_action("CREATE_FOLDER", f"Created folder: {target_path}")
        return {
            "success": True,
            "path": target_path,
            "folder_name": sanitized,
            "message": f"Created folder '{sanitized}' in {os.path.basename(parent)}."
        }
    except Exception as e:
        return {"success": False, "message": f"Failed to create folder: {e}"}
