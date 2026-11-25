"""
IGRIS Universal Page Inspector
Dynamically inspects and catalogs interactive elements on the currently active webpage
across any website using Windows UI Automation and accessibility semantics.
"""

import subprocess
import json
import re
from typing import Dict, List, Optional, Any
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop import ui_automation

def _run_ps_json(script: str) -> Any:
    res = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True,
        text=True,
        timeout=10
    )
    out = res.stdout.strip()
    if not out:
        return None
    try:
        return json.loads(out)
    except Exception:
        return None

class PageInspector:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def inspect_active_page(self, max_elements: int = 50) -> Dict[str, Any]:
        """
        Inspect the active webpage inside the browser window.
        Extracts title, search fields, buttons, links, inputs, and media items.
        """
        win = ui_automation.get_active_window()
        fg_hwnd = win.get("handle", 0)
        ps_script = f"""
        try {{
            Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop
            Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop

            $handle = [IntPtr]{fg_hwnd}
            if (-not $handle -or $handle -eq [IntPtr]::Zero) {{
                # Fallback to browser process window
                $proc = Get-Process -Name "chrome*", "*edge*", "firefox*" -ErrorAction SilentlyContinue | Where-Object {{ $_.MainWindowHandle -ne [IntPtr]::Zero }} | Select-Object -First 1
                if ($proc) {{ $handle = $proc.MainWindowHandle }}
            }}

            if (-not $handle -or $handle -eq [IntPtr]::Zero) {{
                @{{ error = "No browser window in focus" }} | ConvertTo-Json -Compress
                exit 0
            }}

            $root = [System.Windows.Automation.AutomationElement]::FromHandle($handle)
            if (-not $root) {{
                @{{ error = "Could not attach to window root element" }} | ConvertTo-Json -Compress
                exit 0
            }}

            $windowTitle = $root.Current.Name

            # Find all interactive descendants
            $allElements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)

            $buttons = @()
            $links = @()
            $inputs = @()
            $searchFields = @()
            $videos = @()
            $headings = @()

            foreach ($elem in $allElements) {{
                $name = $elem.Current.Name
                $ctrlType = $elem.Current.ControlType.ProgrammaticName
                $className = $elem.Current.ClassName
                $rect = $elem.Current.BoundingRectangle

                # Ignore invisible elements (zero width/height)
                if ($rect.Width -le 4 -or $rect.Height -le 4) {{ continue }}
                # Ignore browser chrome buttons if outside page area
                if ($rect.Y -lt 40 -and ($name -match 'Close|Minimize|Maximize|Tab Actions')) {{ continue }}

                $item = @{{
                    name = $name
                    type = $ctrlType
                    className = $className
                    x = [int]$rect.X
                    y = [int]$rect.Y
                    width = [int]$rect.Width
                    height = [int]$rect.Height
                    centerX = [int]($rect.X + ($rect.Width / 2))
                    centerY = [int]($rect.Y + ($rect.Height / 2))
                }}

                # Search field detection
                if ($ctrlType -match 'Edit' -or $name -match '(?i)search|query|find|ask|lookup') {{
                    if ($ctrlType -match 'Edit|Document' -or $name -match '(?i)search') {{
                        $searchFields += $item
                    }}
                }}

                # General inputs
                if ($ctrlType -match 'Edit' -or $ctrlType -match 'ComboBox') {{
                    $inputs += $item
                }}

                # Buttons
                if ($ctrlType -match 'Button') {{
                    # Check for video play button
                    if ($name -match '(?i)play|pause|watch|video') {{
                        $videos += $item
                    }}
                    $buttons += $item
                }}

                # Hyperlinks & Search results
                if ($ctrlType -match 'Hyperlink') {{
                    $links += $item
                    if ($name -match '(?i)video|watch|view|tutorial|episode|clip') {{
                        $videos += $item
                    }}
                }}

                # Headings & Text cards
                if ($ctrlType -match 'Header|Text' -and $name.Length -gt 15) {{
                    $headings += $item
                }}

                if ($links.Count + $buttons.Count + $inputs.Count -ge {max_elements}) {{ break }}
            }}

            @{{
                title = $windowTitle
                search_fields = $searchFields
                inputs = $inputs
                buttons = $buttons
                links = $links
                videos = $videos
                headings = $headings
            }} | ConvertTo-Json -Depth 3 -Compress
        }} catch {{
            @{{ error = $_.Exception.Message }} | ConvertTo-Json -Compress
        }}
        """
        data = _run_ps_json(ps_script) or {}
        
        # Update context
        if data.get("title"):
            self.context.update_page_state(data["title"])
        
        self.context.visible_elements = {
            "search_fields": data.get("search_fields", []),
            "inputs": data.get("inputs", []),
            "buttons": data.get("buttons", []),
            "links": data.get("links", []),
            "videos": data.get("videos", []),
            "headings": data.get("headings", [])
        }

        return data

    def find_search_input(self) -> Optional[Dict[str, Any]]:
        """
        Dynamically finds the prominent search bar or input field on the page.
        """
        page = self.inspect_active_page(max_elements=30)
        search_fields = page.get("search_fields", [])
        if search_fields:
            # Pick the most prominent (widest) search field
            return max(search_fields, key=lambda f: f.get("width", 0))

        # Fallback to any prominent input
        inputs = page.get("inputs", [])
        if inputs:
            return max(inputs, key=lambda f: f.get("width", 0))

        return None
