"""
IGRIS Universal Browser Action Executor
Performs clicking, typing, scrolling, and keyboard actions on browser webpages.
"""

import time
from typing import Dict, Optional, Any
from igris_desktop import ui_automation

class ActionExecutor:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def click_element(self, element: Dict[str, Any]) -> Dict[str, Any]:
        """Click the center of the specified element."""
        cx = element.get("centerX", 0)
        cy = element.get("centerY", 0)
        name = element.get("name", "element")

        if cx > 0 and cy > 0:
            ui_automation.mouse_move(cx, cy)
            time.sleep(0.1)
            ui_automation.mouse_click("left", cx, cy)
            time.sleep(0.3)
            return {"success": True, "message": f"Clicked '{name}'."}

        return {"success": False, "message": f"Invalid coordinates for element '{name}'."}

    def type_into_element(self, element: Optional[Dict[str, Any]], text: str, press_enter: bool = False, clear_first: bool = False) -> Dict[str, Any]:
        """Focus an element, optionally clear it, and type text."""
        if element:
            self.click_element(element)
            time.sleep(0.2)

        if clear_first:
            ui_automation.send_combo("ctrl+a")
            time.sleep(0.1)
            ui_automation.press_key("backspace")
            time.sleep(0.1)

        ui_automation.type_text(text, press_enter=press_enter)
        time.sleep(0.3)
        return {"success": True, "typed": text, "message": f"Entered text: '{text}'."}

    def scroll_page(self, direction: str = "down", amount: str = "normal", container: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Universal scrolling.
        Supports:
        - "up", "down"
        - amounts: "little" (150px), "normal" (400px), "page" (800px), "top" (Home), "bottom" (End)
        """
        dir_lower = direction.lower()
        amt_lower = amount.lower()

        # If a specific container was specified, move mouse into its bounds first
        if container:
            cx = container.get("centerX", 0)
            cy = container.get("centerY", 0)
            if cx > 0 and cy > 0:
                ui_automation.mouse_move(cx, cy)
                time.sleep(0.1)

        if amt_lower in ["top", "to the top"]:
            ui_automation.send_combo("ctrl+home")
            return {"success": True, "message": "Scrolled to top of page."}

        if amt_lower in ["bottom", "to the bottom"]:
            ui_automation.send_combo("ctrl+end")
            return {"success": True, "message": "Scrolled to bottom of page."}

        if amt_lower in ["page", "one page"]:
            key = "pagedown" if dir_lower == "down" else "pageup"
            ui_automation.press_key(key)
            return {"success": True, "message": f"Scrolled one page {dir_lower}."}

        pixel_map = {
            "little": 150,
            "slow": 200,
            "normal": 400,
            "fast": 700,
            "faster": 850
        }
        pixels = pixel_map.get(amt_lower, 400)
        ui_automation.mouse_scroll(dir_lower, pixels)
        return {"success": True, "message": f"Scrolled {dir_lower} ({pixels}px)."}
