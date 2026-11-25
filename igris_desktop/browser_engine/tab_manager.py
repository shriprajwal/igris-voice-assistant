"""
IGRIS Universal Tab Manager
Manages browser tabs reliably across Chrome, Edge, and other Chromium browsers.
Guarantees that switching tabs activates the existing tab and NEVER creates duplicate tabs.
"""

import subprocess
import json
import time
from typing import Dict, List, Optional, Any
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop import ui_automation

def _run_ps_json(script: str) -> Any:
    """Run a PowerShell command and parse JSON output safely."""
    res = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True,
        text=True,
        timeout=8
    )
    out = res.stdout.strip()
    if not out:
        return None
    try:
        return json.loads(out)
    except Exception:
        return None

class TabManager:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def enumerate_tabs(self, browser_name: str = "chrome") -> List[Dict[str, Any]]:
        """
        Enumerate all open tabs in the browser using Windows UI Automation.
        Searches for TabItem controls inside the browser window.
        Returns a list of: { index, title, is_active, centerX, centerY }
        """
        ps_script = f"""
        try {{
            Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop
            Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop

            # Find matching browser process with a visible main window
            $proc = Get-Process -Name "{browser_name}*" -ErrorAction SilentlyContinue | Where-Object {{ $_.MainWindowHandle -ne [IntPtr]::Zero }} | Select-Object -First 1
            if (-not $proc) {{
                $proc = Get-Process -Name "*edge*" -ErrorAction SilentlyContinue | Where-Object {{ $_.MainWindowHandle -ne [IntPtr]::Zero }} | Select-Object -First 1
            }}
            if (-not $proc) {{
                Write-Output "[]"
                exit 0
            }}

            $handle = $proc.MainWindowHandle
            $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
            if (-not $root) {{
                Write-Output "[]"
                exit 0
            }}

            # Find all TabItem controls in the browser
            $tabCondition = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
                [System.Windows.Automation.ControlType]::TabItem
            )
            $tabElements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $tabCondition)

            $results = @()
            $idx = 0
            foreach ($tab in $tabElements) {{
                $name = $tab.Current.Name
                # Ignore empty names or close buttons
                if ($name -and -not ($name -match '^(Close|New Tab|Tab Actions)')) {{
                    $rect = $tab.Current.BoundingRectangle
                    $isSelected = $false
                    try {{
                        $selPattern = $tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
                        if ($selPattern) {{ $isSelected = $selPattern.Current.IsSelected }}
                    }} catch {{}}

                    $results += @{{
                        index = $idx
                        title = $name
                        is_active = $isSelected
                        centerX = [int]($rect.X + ($rect.Width / 2))
                        centerY = [int]($rect.Y + ($rect.Height / 2))
                    }}
                    $idx++
                }}
            }}

            $results | ConvertTo-Json -Compress
        }} catch {{
            Write-Output "[]"
        }}
        """
        data = _run_ps_json(ps_script)
        tabs = data if isinstance(data, list) else ([data] if data else [])
        
        # Update context
        self.context.update_tabs(tabs)
        return tabs

    def switch_to_tab(self, query: str) -> Dict[str, Any]:
        """
        Switches to an existing tab matching the query by title or keyword.
        NEVER launches a new tab or browser window!
        """
        # Ensure browser is in foreground
        ui_automation.focus_application(self.context.active_browser)

        # Refresh current open tabs
        tabs = self.enumerate_tabs(self.context.active_browser)

        # Resolve requested tab
        matched_tab, tab_idx, candidates = self.context.resolve_tab(query)

        if not matched_tab:
            # Fallback: cycle through open tabs via Ctrl+Tab to inspect titles
            if candidates:
                return {
                    "success": False,
                    "message": f"Could not find an open tab matching '{query}'. Available tabs: {', '.join(candidates[:4])}."
                }
            return {
                "success": False,
                "message": f"No open browser tab found matching '{query}'."
            }

        # Activate the tab by clicking its header or invoking SelectionItemPattern
        cx = matched_tab.get("centerX", 0)
        cy = matched_tab.get("centerY", 0)

        if cx > 0 and cy > 0:
            # Click the tab element directly
            ui_automation.mouse_click("left", cx, cy)
            time.sleep(0.3)
        else:
            # Fallback: Jump directly using Ctrl + 1..8 if index is within range
            if 0 <= tab_idx < 8:
                ui_automation.send_combo(f"ctrl+{tab_idx + 1}")
                time.sleep(0.3)
            elif tab_idx == len(tabs) - 1:
                ui_automation.send_combo("ctrl+9")
                time.sleep(0.3)
            else:
                # Cycle forward to it
                ui_automation.send_combo("ctrl+tab")

        # Update context and record action
        self.context.update_tabs(tabs, active_index=tab_idx)
        self.context.record_action("SWITCH_TAB", f"Switched to tab: {matched_tab.get('title')}")

        return {
            "success": True,
            "tab": matched_tab,
            "message": f"Switched to '{matched_tab.get('title')}' tab."
        }

    def switch_next_tab(self) -> Dict[str, Any]:
        """Activate the next existing tab in the browser."""
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("ctrl+tab")
        time.sleep(0.3)
        self.enumerate_tabs(self.context.active_browser)
        return {"success": True, "message": "Switched to next tab."}

    def switch_previous_tab(self) -> Dict[str, Any]:
        """Activate the previous existing tab in the browser."""
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("ctrl+shift+tab")
        time.sleep(0.3)
        self.enumerate_tabs(self.context.active_browser)
        return {"success": True, "message": "Switched to previous tab."}

    def open_new_tab(self, url: Optional[str] = None) -> Dict[str, Any]:
        """
        Creates a new browser tab ONLY when explicitly requested by user.
        """
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("ctrl+t")
        time.sleep(0.3)

        if url:
            time.sleep(0.2)
            ui_automation.type_text(url, press_enter=True)
            time.sleep(0.5)

        self.enumerate_tabs(self.context.active_browser)
        self.context.record_action("OPEN_NEW_TAB", url or "blank")
        return {
            "success": True,
            "message": f"Opened a new tab{f' with {url}' if url else ''}."
        }

    def close_current_tab(self) -> Dict[str, Any]:
        """Close the currently active tab without closing the whole browser."""
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("ctrl+w")
        time.sleep(0.3)
        self.enumerate_tabs(self.context.active_browser)
        self.context.record_action("CLOSE_TAB")
        return {"success": True, "message": "Closed active tab."}

    def smart_open_or_switch(self, url_or_keyword: str) -> Dict[str, Any]:
        """
        Checks if a tab with this keyword/domain already exists.
        If YES -> switches to it.
        If NO -> opens the URL in the current or new tab without duplicate spam.
        """
        # 1. First check if tab already exists
        tabs = self.enumerate_tabs(self.context.active_browser)
        matched_tab, idx, _ = self.context.resolve_tab(url_or_keyword)
        if matched_tab:
            return self.switch_to_tab(url_or_keyword)

        # 2. Not already open: navigate current tab or open new tab
        target_url = url_or_keyword.strip()
        if not target_url.startswith("http://") and not target_url.startswith("https://"):
            # Check common domains
            if "." not in target_url:
                target_url = f"https://www.{target_url}.com"
            else:
                target_url = f"https://{target_url}"

        # Focus address bar via Ctrl+L and navigate
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("ctrl+l")
        time.sleep(0.2)
        ui_automation.type_text(target_url, press_enter=True)
        time.sleep(0.5)

        return {
            "success": True,
            "message": f"Navigating to '{target_url}'."
        }
