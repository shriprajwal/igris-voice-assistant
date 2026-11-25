"""
IGRIS Universal Page Navigation Controller
Handles navigating URLs, opening search results by ordinal (1st, 2nd, etc.),
history traversal (back/forward), and page refresh.
"""

import time
from typing import Dict, Optional, Any
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop.browser_engine.page_inspector import PageInspector
from igris_desktop.browser_engine.action_executor import ActionExecutor
from igris_desktop import ui_automation

class NavigationController:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()
        self.inspector = PageInspector.get_instance()
        self.executor = ActionExecutor.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def open_result(self, index: int = 1) -> Dict[str, Any]:
        """
        Opens the Nth organic search result on the active search or listing page
        (e.g. Google, YouTube, GitHub, Amazon, Documentation).
        """
        page = self.inspector.inspect_active_page(max_elements=40)
        links = page.get("links", [])

        # Filter out navigation metadata
        skip_words = ["sign in", "privacy", "terms", "settings", "feedback", "help", "about", "all", "images", "videos", "news", "maps"]
        organic_results = [
            l for l in links
            if len(l.get("name", "")) > 10 and not any(skip == l.get("name", "").lower().strip() for skip in skip_words)
        ]

        # Sort top-to-bottom by vertical position
        organic_results.sort(key=lambda x: (x.get("centerY", 0), x.get("centerX", 0)))

        if not organic_results:
            return {"success": False, "message": "No relevant search results detected on the current page."}

        target_idx = max(0, min(index - 1, len(organic_results) - 1))
        target_item = organic_results[target_idx]

        self.executor.click_element(target_item)
        item_title = target_item.get("name", f"result #{index}")
        self.context.record_action("OPEN_RESULT", item_title)

        return {
            "success": True,
            "item": target_item,
            "message": f"Opened result #{index}: '{item_title}'."
        }

    def navigate_url(self, url: str, in_new_tab: bool = False) -> Dict[str, Any]:
        """Navigates to a specific URL in the current tab or a new tab."""
        target_url = url.strip()
        if not target_url.startswith("http://") and not target_url.startswith("https://"):
            target_url = f"https://{target_url}"

        ui_automation.focus_application(self.context.active_browser)
        time.sleep(0.15)
        before_title = ui_automation.get_active_window().get("title", "")

        if in_new_tab:
            ui_automation.send_combo("ctrl+t")
            time.sleep(0.35)
        else:
            ui_automation.send_combo("ctrl+l")
            time.sleep(0.25)

        ui_automation.type_text(target_url, press_enter=True)
        time.sleep(1.0)
        after_win = ui_automation.get_active_window()
        after_title = after_win.get("title", "")
        self.context.update_page_state(target_url, after_title or target_url)
        return {
            "success": True,
            "url": target_url,
            "windowTitle": after_title,
            "verified": after_title != before_title or bool(after_title),
            "message": f"Navigated to '{target_url}'. Page: '{after_title}'."
        }

    def go_back(self) -> Dict[str, Any]:
        """Navigate back in browser history."""
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("alt+left")
        time.sleep(0.5)
        return {"success": True, "message": "Navigated back."}

    def go_forward(self) -> Dict[str, Any]:
        """Navigate forward in browser history."""
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("alt+right")
        time.sleep(0.5)
        return {"success": True, "message": "Navigated forward."}

    def refresh(self) -> Dict[str, Any]:
        """Reload the active webpage."""
        ui_automation.focus_application(self.context.active_browser)
        ui_automation.send_combo("ctrl+r")
        time.sleep(0.5)
        return {"success": True, "message": "Refreshed webpage."}
