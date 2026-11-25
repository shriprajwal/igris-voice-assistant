"""
IGRIS Universal Browser Manager
Central coordinator for universal webpage inspection, tab management, clicking,
searching, scrolling, and media controls.
"""

import time
from typing import Dict, List, Optional, Any
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop.browser_engine.tab_manager import TabManager
from igris_desktop.browser_engine.page_inspector import PageInspector
from igris_desktop.browser_engine.element_resolver import ElementResolver
from igris_desktop.browser_engine.action_executor import ActionExecutor
from igris_desktop.browser_engine.media_controller import MediaController
from igris_desktop.browser_engine.navigation_controller import NavigationController
from igris_desktop.browser_engine.verification_engine import VerificationEngine
from igris_desktop import ui_automation

class BrowserManager:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()
        self.tab_mgr = TabManager.get_instance()
        self.inspector = PageInspector.get_instance()
        self.resolver = ElementResolver.get_instance()
        self.executor = ActionExecutor.get_instance()
        self.media_ctrl = MediaController.get_instance()
        self.nav_ctrl = NavigationController.get_instance()
        self.verifier = VerificationEngine.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _ensure_browser_active(self) -> None:
        """Focus existing browser window or launch it if not running (never duplicates)."""
        res = ui_automation.focus_application(self.context.active_browser)
        if not res.get("success"):
            res_edge = ui_automation.focus_application("msedge")
            if not res_edge.get("success"):
                ui_automation.launch_application(self.context.active_browser or "chrome")
                time.sleep(0.8)

    def read_page_summary(self) -> Dict[str, Any]:
        """Read structured summary of the currently active browser webpage (title, headings, links, inputs)."""
        self._ensure_browser_active()
        page = self.inspector.inspect_active_page(max_elements=45)
        win = ui_automation.get_active_window()
        return {
            "success": True,
            "windowTitle": win.get("title", ""),
            "process": win.get("process_name", ""),
            "headings": [h.get("name") for h in page.get("headings", [])[:8]],
            "links": [l.get("name") for l in page.get("links", [])[:12]],
            "inputs": [i.get("name") for i in page.get("inputs", [])[:6]],
            "buttons": [b.get("name") for b in page.get("buttons", [])[:10]],
        }

    def universal_search(self, query: str, search_type: str = "web") -> Dict[str, Any]:
        """
        Universal Search:
        - If search_type is 'page', finds search field on current page and types query.
        - If search_type is 'youtube', searches on YouTube.
        - If search_type is 'web', searches Google/search engine.
        """
        self._ensure_browser_active()

        if search_type == "page":
            search_input = self.inspector.find_search_input()
            if search_input:
                self.executor.type_into_element(search_input, query, press_enter=True, clear_first=True)
                self.context.set_search_results(query, [], engine="current_page")
                return {"success": True, "message": f"Searched this page for '{query}'."}

        if search_type == "youtube":
            url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}"
            self.tab_mgr.smart_open_or_switch(url)
            self.context.set_search_results(query, [], engine="youtube")
            return {"success": True, "message": f"Searching YouTube for '{query}'."}

        # General web search (Google)
        url = f"https://www.google.com/search?q={query.replace(' ', '+')}"
        self.tab_mgr.smart_open_or_switch(url)
        self.context.set_search_results(query, [], engine="google")
        return {"success": True, "message": f"Searching for '{query}'."}

    def universal_click(self, target_description: str) -> Dict[str, Any]:
        """
        Resolves any natural language element reference and clicks it.
        e.g. "first link", "login button", "search icon", "second result".
        """
        ui_automation.focus_application(self.context.active_browser)
        matched_elem, candidates, is_ambiguous = self.resolver.resolve(target_description)

        if not matched_elem:
            return {
                "success": False,
                "message": f"Could not find element matching '{target_description}' on the active page."
            }

        res = self.executor.click_element(matched_elem)
        self.context.record_action("CLICK", matched_elem.get("name", target_description))
        return res

    def universal_type(self, target_description: str, text: str, press_enter: bool = False, clear_first: bool = False) -> Dict[str, Any]:
        """
        Finds input field and types text.
        """
        ui_automation.focus_application(self.context.active_browser)
        target_elem = None
        if target_description:
            target_elem, _, _ = self.resolver.resolve(target_description, preferred_type="input")

        res = self.executor.type_into_element(target_elem, text, press_enter=press_enter, clear_first=clear_first)
        self.context.record_action("TYPE", f"{text} into {target_description or 'active field'}")
        return res

    def universal_scroll(self, direction: str = "down", amount: str = "normal", container: Optional[str] = None) -> Dict[str, Any]:
        """
        Scrolls active page or specific container.
        """
        ui_automation.focus_application(self.context.active_browser)
        container_elem = None
        if container:
            container_elem, _, _ = self.resolver.resolve(container)

        res = self.executor.scroll_page(direction=direction, amount=amount, container=container_elem)
        self.context.record_action("SCROLL", f"{direction} ({amount})")
        return res

    def universal_tab_action(self, action: str, query: Optional[str] = None) -> Dict[str, Any]:
        """
        Handles tab operations:
        - "switch": switches to tab by query
        - "next": switches to next tab
        - "prev": switches to previous tab
        - "new": opens new tab
        - "close": closes active tab
        - "enumerate": lists all open tabs
        """
        act = action.lower()
        if act == "switch":
            return self.tab_mgr.switch_to_tab(query or "")
        elif act in ["next", "next_tab"]:
            return self.tab_mgr.switch_next_tab()
        elif act in ["prev", "previous", "previous_tab"]:
            return self.tab_mgr.switch_previous_tab()
        elif act in ["new", "new_tab", "open"]:
            return self.tab_mgr.open_new_tab(query)
        elif act in ["close", "close_tab"]:
            return self.tab_mgr.close_current_tab()
        elif act == "enumerate":
            tabs = self.tab_mgr.enumerate_tabs()
            return {"success": True, "tabs": tabs, "count": len(tabs), "message": f"Found {len(tabs)} open tabs."}
        return {"success": False, "message": f"Unknown tab action: '{action}'."}

    def universal_media_action(self, action: str, target: Optional[Any] = None) -> Dict[str, Any]:
        """
        Handles media controls:
        - "play", "pause", "toggle"
        - "mute", "unmute"
        - "volume_up", "volume_down"
        - "play_selected": plays target video by ordinal or title
        - "list_videos": lists visible video titles
        """
        act = action.lower()
        ui_automation.focus_application(self.context.active_browser)

        if act in ["play", "resume"]:
            return self.media_ctrl.play()
        elif act in ["pause", "stop"]:
            return self.media_ctrl.pause()
        elif act == "toggle":
            return self.media_ctrl.toggle_playback()
        elif act in ["mute", "unmute", "toggle_mute"]:
            return self.media_ctrl.toggle_mute()
        elif act in ["volume_up", "volume_down"]:
            return self.media_ctrl.adjust_volume("up" if act == "volume_up" else "down")
        elif act == "play_selected":
            return self.media_ctrl.play_selected_video(target or 1)
        elif act == "list_videos":
            vids = self.media_ctrl.identify_visible_videos()
            return {"success": True, "videos": vids, "count": len(vids), "message": f"Found {len(vids)} video elements."}

        return {"success": False, "message": f"Unknown media action: '{action}'."}

    def universal_navigation(self, subaction: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Handles navigation:
        - "open_result": opens result #N
        - "back", "forward", "refresh"
        - "navigate_url"
        """
        p = params or {}
        sub = subaction.lower()
        ui_automation.focus_application(self.context.active_browser)

        if sub in ["open_result", "first_result", "open_first_result"]:
            idx = p.get("index", 1)
            return self.nav_ctrl.open_result(idx)
        elif sub == "back":
            return self.nav_ctrl.go_back()
        elif sub == "forward":
            return self.nav_ctrl.go_forward()
        elif sub == "refresh":
            return self.nav_ctrl.refresh()
        elif sub == "open_url":
            return self.nav_ctrl.navigate_url(p.get("url", ""), in_new_tab=p.get("in_new_tab", False))

        return {"success": False, "message": f"Unknown navigation subaction: '{subaction}'."}

    def execute_multi_step_plan(self, steps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Executes a sequence of browser actions with observation and verification at each step.
        """
        completed = []
        for idx, step in enumerate(steps):
            action = step.get("action", "")
            params = step.get("params", {})
            desc = step.get("description", f"Step #{idx+1}")

            res = {"success": False, "message": "unhandled step"}
            if action in ["WEB_SEARCH", "SEARCH"]:
                res = self.universal_search(params.get("query", ""), params.get("search_type", "web"))
            elif action in ["OPEN_RESULT", "CLICK_RESULT"]:
                res = self.nav_ctrl.open_result(params.get("index", 1))
            elif action in ["CLICK", "CLICK_ELEMENT"]:
                res = self.universal_click(params.get("target", ""))
            elif action in ["SCROLL"]:
                res = self.universal_scroll(params.get("direction", "down"), params.get("amount", "normal"))
            elif action in ["SWITCH_TAB"]:
                res = self.tab_mgr.switch_to_tab(params.get("query", ""))
            elif action in ["TYPE_TEXT"]:
                res = self.universal_type(params.get("target", ""), params.get("text", ""), params.get("press_enter", False))
            elif action in ["MEDIA"]:
                res = self.universal_media_action(params.get("subaction", "toggle"), params.get("target"))

            completed.append({"step": desc, "result": res})
            if not res.get("success"):
                return {
                    "success": False,
                    "completed_steps": completed,
                    "failed_step": desc,
                    "message": f"Failed at step: '{desc}' - {res.get('message')}"
                }
            time.sleep(0.5)

        return {
            "success": True,
            "completed_steps": completed,
            "message": f"Successfully completed all {len(steps)} plan steps."
        }
