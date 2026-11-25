"""
IGRIS Action Validator Module
Strict security validation for all incoming desktop directives.
Enforces parameter constraints and guarantees zero cross-calling between settings.
"""

import re
from typing import Dict, Any, Tuple

DISALLOWED_CHARS = re.compile(r"[;&|`$<>\"']")

class ActionValidator:
    ALLOWED_ACTIONS = {
        "OPEN_APPLICATION",
        "FOCUS_APPLICATION",
        "MINIMIZE_WINDOW",
        "MAXIMIZE_WINDOW",
        "CLOSE_WINDOW",
        "OPEN_FOLDER",
        "NAVIGATE_NESTED_FOLDER",
        "OPEN_ORDINAL_ITEM",
        "NAVIGATE_BACK",
        "OPEN_FILE",
        "CREATE_FOLDER",
        "MOUSE_MOVE",
        "MOUSE_CLICK",
        "MOUSE_DRAG",
        "MOUSE_SCROLL",
        "TYPE_TEXT",
        "PRESS_KEY",
        "KEY_COMBO",
        "CLICK_UI_ELEMENT",
        "READ_FOCUSED_TEXT",
        "PERCEIVE_SCREEN",
        "GET_ACTIVE_WINDOW",
        "SCREEN_ANALYSIS",
        "SCREEN_CAPTURE",
        "SCREEN_LIST_MONITORS",
        "SCREEN_AUTHORIZE",
        "SCREEN_REVOKE",
        "SCREEN_GET_STATUS",
        "SCREEN_GET_FRAME",
        "GET_BLUETOOTH_STATE",
        "SET_BLUETOOTH_STATE",
        "GET_WIFI_STATE",
        "SET_WIFI_STATE",
        "GET_VOLUME",
        "SET_VOLUME",
        "MUTE_VOLUME",
        "SYSTEM_INFO",
        "LOCK_PC",
        "STOP_TASK",
        "BROWSER_SEARCH",
        "BROWSER_CLICK",
        "BROWSER_TYPE",
        "BROWSER_SCROLL",
        "BROWSER_TAB",
        "BROWSER_MEDIA",
        "BROWSER_NAVIGATE",
        "BROWSER_MULTI_STEP",
        "READ_BROWSER_PAGE",
        "WEB_SEARCH",
        "OPEN_URL",
        "SWITCH_TAB",
        "OPEN_NEW_TAB",
        "CLOSE_TAB",
        "OPEN_SEARCH_RESULT"
    }

    @classmethod
    def validate(cls, action_type: str, params: Dict[str, Any]) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Validates action type and parameters.
        Returns: (is_valid, error_message, sanitized_params)
        """
        if action_type not in cls.ALLOWED_ACTIONS:
            return False, f"Unregistered action type '{action_type}'.", {}

        clean_params = {}
        for k, v in params.items():
            if isinstance(v, str):
                # Check for command injection characters
                if DISALLOWED_CHARS.search(v) and action_type not in ["TYPE_TEXT"]:
                    return False, f"Parameter '{k}' contains disallowed special characters.", {}
                clean_params[k] = v.strip()
            else:
                clean_params[k] = v

        # Action-specific parameter rules
        if action_type in ["SET_BLUETOOTH_STATE", "SET_WIFI_STATE"]:
            if "enable" not in clean_params:
                return False, "Missing required boolean parameter 'enable'.", {}
            clean_params["enable"] = bool(clean_params["enable"])

        if action_type == "OPEN_ORDINAL_ITEM":
            if "ordinal" not in clean_params:
                clean_params["ordinal"] = 0  # Default to first
            try:
                clean_params["ordinal"] = int(clean_params["ordinal"])
            except ValueError:
                return False, "Parameter 'ordinal' must be an integer.", {}

        return True, "", clean_params
