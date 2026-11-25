"""
IGRIS Desktop Context Manager
Maintains conversational and environmental desktop context across consecutive voice commands.
Tracks active application, active window, current directory, visible folder items, and last actions.
"""

import os
import sys
import time
from typing import Dict, List, Optional, Tuple, Any

class DesktopContextManager:
    _instance = None

    def __init__(self):
        self.active_app: str = "Desktop"
        self.active_window_title: str = ""
        self.active_window_handle: int = 0
        self.current_directory: Optional[str] = None
        self.visible_items: List[Dict[str, Any]] = []
        self.last_action: Optional[str] = None
        self.last_selected_item: Optional[str] = None
        self.current_task: Optional[str] = None
        self.command_history: List[Dict[str, Any]] = []
        self.is_task_running: bool = False
        # Explorer window tracking
        self.open_explorer_windows: List[Dict[str, Any]] = []  # [{hwnd, path}]

        # Default directories dictionary
        user_profile = os.environ.get("USERPROFILE", os.path.expanduser("~"))
        self.known_directories = {
            "downloads": os.path.join(user_profile, "Downloads"),
            "documents": os.path.join(user_profile, "Documents"),
            "desktop": os.path.join(user_profile, "Desktop"),
            "pictures": os.path.join(user_profile, "Pictures"),
            "music": os.path.join(user_profile, "Music"),
            "videos": os.path.join(user_profile, "Videos"),
            "project": os.getcwd(),
            "igris": os.getcwd(),
        }

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def update_active_window(self, title: str, app_name: str, handle: int = 0):
        """Update the currently active window and app in context."""
        self.active_window_title = title or ""
        self.active_app = app_name or "Unknown"
        self.active_window_handle = handle

        # If active window is File Explorer, try extracting path from title
        if "explorer" in self.active_app.lower() and self.active_window_title:
            # Common Explorer window titles are the folder name (e.g., 'Downloads', 'Documents')
            title_lower = self.active_window_title.lower().strip()
            for alias, path in self.known_directories.items():
                if os.path.basename(path).lower() == title_lower:
                    self.set_current_directory(path)
                    break

    def set_current_directory(self, path: str):
        """Set the current folder context and refresh visible items."""
        if path and os.path.exists(path) and os.path.isdir(path):
            self.current_directory = os.path.abspath(path)
            self.refresh_visible_items()

    def get_current_directory(self) -> str:
        """Get the active directory context or default to Downloads."""
        if self.current_directory and os.path.exists(self.current_directory):
            return self.current_directory
        return self.known_directories.get("downloads", os.path.expanduser("~"))

    def refresh_visible_items(self):
        """Inspect and catalog all items inside the current directory."""
        if not self.current_directory or not os.path.exists(self.current_directory):
            self.visible_items = []
            return

        try:
            entries = []
            for item in os.listdir(self.current_directory):
                full_path = os.path.join(self.current_directory, item)
                try:
                    is_dir = os.path.isdir(full_path)
                    stat = os.stat(full_path)
                    entries.append({
                        "name": item,
                        "path": full_path,
                        "is_dir": is_dir,
                        "size": stat.st_size if not is_dir else 0,
                        "modified": stat.st_mtime
                    })
                except (PermissionError, OSError):
                    continue

            # Sort: Directories first (alphabetically), then files (alphabetically)
            folders = sorted([e for e in entries if e["is_dir"]], key=lambda x: x["name"].lower())
            files = sorted([e for e in entries if not e["is_dir"]], key=lambda x: x["name"].lower())
            self.visible_items = folders + files
        except Exception as e:
            print(f"[ContextManager] Error reading items in {self.current_directory}: {e}")
            self.visible_items = []

    def get_visible_folders(self) -> List[Dict[str, Any]]:
        """Return list of folders in current directory view."""
        self.refresh_visible_items()
        return [item for item in self.visible_items if item["is_dir"]]

    def get_visible_files(self) -> List[Dict[str, Any]]:
        """Return list of files in current directory view."""
        self.refresh_visible_items()
        return [item for item in self.visible_items if not item["is_dir"]]

    def resolve_contextual_item(
        self, target: str, item_type: str = "any"
    ) -> Tuple[Optional[Dict[str, Any]], List[str], bool]:
        """
        Resolves an item inside the current context.
        Supports:
        - Exact and case-insensitive names (e.g. 'NEON ESCAPE', 'project')
        - Ordinal words (e.g. 'first', 'second', 'third', 'last', 'top')
        - Relative requests (e.g. 'the folder inside Downloads')
        Returns: (matched_item, list_of_candidates, is_ambiguous)
        """
        self.refresh_visible_items()

        folders = self.get_visible_folders()
        files = self.get_visible_files()

        pool = folders if item_type == "folder" else (files if item_type == "file" else self.visible_items)
        if not pool:
            return None, [], False

        cleaned = target.lower().strip()

        # Check for generic references like 'the folder inside ...'
        if cleaned in ["the folder", "folder", "subfolder", "the folder inside", "folder inside"]:
            if len(folders) == 1:
                return folders[0], [folders[0]["name"]], False
            elif len(folders) > 1:
                return None, [f["name"] for f in folders], True
            else:
                return None, [], False

        # Ordinal mapping
        ordinals = {
            "first": 0, "1st": 0, "one": 0, "top": 0,
            "second": 1, "2nd": 1, "two": 1,
            "third": 2, "3rd": 2, "three": 2,
            "fourth": 3, "4th": 3, "four": 3,
            "fifth": 4, "5th": 4, "five": 4,
            "last": -1, "bottom": -1
        }

        for ord_word, index in ordinals.items():
            if ord_word in cleaned.split():
                target_pool = folders if (item_type == "folder" or "folder" in cleaned) else (files if (item_type == "file" or "file" in cleaned) else pool)
                if index == -1 and target_pool:
                    return target_pool[-1], [target_pool[-1]["name"]], False
                elif 0 <= index < len(target_pool):
                    return target_pool[index], [target_pool[index]["name"]], False
                else:
                    return None, [f["name"] for f in target_pool], False

        # Exact and prefix/substring matching
        exact_matches = [e for e in pool if e["name"].lower() == cleaned]
        if len(exact_matches) == 1:
            return exact_matches[0], [exact_matches[0]["name"]], False

        # Substring search
        fuzzy_matches = [e for e in pool if cleaned in e["name"].lower()]
        if len(fuzzy_matches) == 1:
            return fuzzy_matches[0], [fuzzy_matches[0]["name"]], False
        elif len(fuzzy_matches) > 1:
            return None, [f["name"] for f in fuzzy_matches], True

        return None, [f["name"] for f in pool[:5]], False

    def record_action(self, action: str, details: str, success: bool = True):
        """Append to command history and update last action."""
        entry = {
            "timestamp": time.time(),
            "action": action,
            "details": details,
            "success": success,
            "directory": self.current_directory,
            "active_app": self.active_app
        }
        self.last_action = action
        self.command_history.append(entry)
        if len(self.command_history) > 30:
            self.command_history.pop(0)

    def get_summary(self) -> Dict[str, Any]:
        """Return a snapshot of current desktop context."""
        return {
            "active_app": self.active_app,
            "active_window_title": self.active_window_title,
            "current_directory": self.current_directory,
            "visible_folders_count": len(self.get_visible_folders()),
            "visible_files_count": len(self.get_visible_files()),
            "last_action": self.last_action,
            "last_selected_item": self.last_selected_item
        }

    def refresh_explorer_windows(self) -> List[Dict[str, Any]]:
        """
        Query Shell.Application to enumerate all open File Explorer windows.
        Updates self.open_explorer_windows and returns the list.
        """
        try:
            import win32com.client
            import urllib.parse
            shell = win32com.client.Dispatch("Shell.Application")
            windows = shell.Windows()
            result = []
            for i in range(windows.Count):
                try:
                    w = windows.Item(i)
                    if w is None:
                        continue
                    loc = getattr(w, "LocationURL", "") or ""
                    if loc.startswith("file:///"):
                        p = urllib.parse.unquote(loc[8:].replace("/", "\\"))
                        if os.path.isdir(p):
                            result.append({"hwnd": int(getattr(w, "HWND", 0)), "path": p})
                except Exception:
                    continue
            self.open_explorer_windows = result
        except Exception:
            self.open_explorer_windows = []
        return self.open_explorer_windows

    def get_active_explorer_window(self) -> Optional[Dict[str, Any]]:
        """Return the topmost File Explorer window entry, or None."""
        windows = self.refresh_explorer_windows()
        return windows[0] if windows else None
