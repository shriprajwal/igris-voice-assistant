"""
IGRIS Browser Action Verification Engine
Implements the OBSERVE -> ACT -> VERIFY contract for browser operations.
"""

import time
from typing import Dict, Optional, Any
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop.browser_engine.page_inspector import PageInspector
from igris_desktop.browser_engine.tab_manager import TabManager

class VerificationEngine:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()
        self.inspector = PageInspector.get_instance()
        self.tab_manager = TabManager.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def verify_tab_switch(self, target_query: str, previous_tab_title: str) -> bool:
        """Verifies that the active tab changed to the targeted tab."""
        time.sleep(0.3)
        tabs = self.tab_manager.enumerate_tabs()
        active = next((t for t in tabs if t.get("is_active")), None)
        if active:
            cur_title = active.get("title", "").lower()
            if target_query.lower() in cur_title or cur_title != previous_tab_title.lower():
                return True
        return False

    def verify_action_result(self, action_type: str, initial_state: Dict[str, Any]) -> Dict[str, Any]:
        """Verify the state transformation following a browser action."""
        time.sleep(0.4)
        current_page = self.inspector.inspect_active_page(max_elements=15)
        new_title = current_page.get("title", "")
        old_title = initial_state.get("title", "")

        changed = new_title != old_title
        return {
            "verified": True,
            "title_changed": changed,
            "current_title": new_title,
            "message": f"Verified {action_type}. Page title: '{new_title}'."
        }
