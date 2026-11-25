"""
IGRIS Action Registry & Dispatcher
Maps strongly typed action directives to dedicated execution functions.
Guarantees absolute isolation between Bluetooth and Wi-Fi operations.
"""

from typing import Dict, Any
from igris_desktop.context_manager import DesktopContextManager
from igris_desktop import file_explorer
from igris_desktop import ui_automation
from igris_desktop.system_controls import bluetooth, wifi, volume, display
from igris_desktop.browser_engine.browser_manager import BrowserManager

def dispatch_action(action_type: str, params: Dict[str, Any], context: DesktopContextManager) -> Dict[str, Any]:
    """Execute a validated desktop action and return structured result."""

    # 1. Folder and File Explorer Navigation
    if action_type == "OPEN_FOLDER":
        target = params.get("folder", "downloads")
        res = file_explorer.open_folder(target, context)
        return res

    elif action_type == "NAVIGATE_NESTED_FOLDER":
        target = params.get("target", "")
        res = file_explorer.navigate_nested_folder(target, context)
        return res

    elif action_type == "OPEN_ORDINAL_ITEM":
        ordinal = params.get("ordinal", 0)
        item_type = params.get("item_type", "folder")
        res = file_explorer.open_ordinal_item(ordinal, item_type, context)
        return res

    elif action_type == "NAVIGATE_BACK":
        res = file_explorer.navigate_back(context)
        return res

    elif action_type == "OPEN_FILE":
        file_path = params.get("file_path", "")
        res = file_explorer.open_file(file_path, context)
        return res

    elif action_type == "CREATE_FOLDER":
        name = params.get("folder_name", "New Folder")
        parent = params.get("parent_folder")
        res = file_explorer.create_folder(name, parent, context)
        return res

    # 2. Dedicated Bluetooth Controls (Strictly Isolated)
    elif action_type == "GET_BLUETOOTH_STATE":
        res = bluetooth.get_bluetooth_state()
        context.record_action("GET_BLUETOOTH_STATE", f"Bluetooth is {res.get('state')}", res.get("success", False))
        return res

    elif action_type == "SET_BLUETOOTH_STATE":
        enable = params.get("enable", True)
        res = bluetooth.set_bluetooth_state(enable)
        context.record_action("SET_BLUETOOTH_STATE", f"Set Bluetooth {'on' if enable else 'off'}", res.get("success", False))
        return res

    # 3. Dedicated Wi-Fi Controls (Strictly Isolated)
    elif action_type == "GET_WIFI_STATE":
        res = wifi.get_wifi_state()
        context.record_action("GET_WIFI_STATE", f"Wi-Fi is {res.get('state')}", res.get("success", False))
        return res

    elif action_type == "SET_WIFI_STATE":
        enable = params.get("enable", True)
        res = wifi.set_wifi_state(enable)
        context.record_action("SET_WIFI_STATE", f"Set Wi-Fi {'on' if enable else 'off'}", res.get("success", False))
        return res

    # 4. Audio & Volume Controls
    elif action_type == "SET_VOLUME":
        direction = params.get("direction", "up")
        steps = params.get("steps", 2)
        if direction == "down":
            res = volume.volume_down(steps)
        else:
            res = volume.volume_up(steps)
        context.record_action("SET_VOLUME", f"Volume {direction} by {steps}")
        return res

    elif action_type == "MUTE_VOLUME":
        res = volume.toggle_mute()
        context.record_action("MUTE_VOLUME", "Toggled volume mute")
        return res

    # 5. Display & System Operations
    elif action_type == "SYSTEM_INFO":
        res = display.get_system_info()
        context.record_action("SYSTEM_INFO", "Retrieved system metrics")
        return res

    elif action_type == "LOCK_PC":
        res = display.lock_pc()
        context.record_action("LOCK_PC", "Locked workstation")
        return res

    # 6. Applications & Window Management
    elif action_type == "OPEN_APPLICATION":
        # Accept both camelCase (appName) and snake_case (app_name) param names
        app_name = params.get("appName") or params.get("app_name", "")
        args = params.get("args", "") or ""
        res = ui_automation.launch_application(app_name, args)
        if res.get("success"):
            context.update_active_window(app_name, app_name)
        context.record_action("OPEN_APPLICATION", f"Opened {app_name}", res.get("success", False))
        return res

    elif action_type == "FOCUS_APPLICATION":
        query = params.get("appName") or params.get("app_name", "")
        res = ui_automation.focus_application(query)
        if res.get("success") and "window" in res:
            w = res["window"]
            context.update_active_window(w["title"], w["process_name"], w["handle"])
        context.record_action("FOCUS_APPLICATION", f"Focused {query}", res.get("success", False))
        return res

    elif action_type == "MINIMIZE_WINDOW":
        res = ui_automation.minimize_window(params.get("appName") or params.get("app_name", ""))
        context.record_action("MINIMIZE_WINDOW", "Minimized window")
        return res

    elif action_type == "MAXIMIZE_WINDOW":
        res = ui_automation.maximize_window(params.get("appName") or params.get("app_name", ""))
        context.record_action("MAXIMIZE_WINDOW", "Maximized window")
        return res

    elif action_type == "CLOSE_WINDOW":
        res = ui_automation.close_window(params.get("appName") or params.get("app_name", ""))
        context.record_action("CLOSE_WINDOW", "Closed window")
        return res

    # 7. Mouse & Keyboard Interaction
    elif action_type == "MOUSE_MOVE":
        x = params.get("x", 0)
        y = params.get("y", 0)
        return ui_automation.mouse_move(x, y)

    elif action_type == "MOUSE_CLICK":
        button = params.get("button", "left")
        x = params.get("x")
        y = params.get("y")
        return ui_automation.mouse_click(button, x, y)

    elif action_type == "MOUSE_SCROLL":
        direction = params.get("direction", "down")
        amount = params.get("amount", 3)
        return ui_automation.mouse_scroll(direction, amount)

    elif action_type == "MOUSE_DRAG":
        sx = int(params.get("startX", params.get("start_x", 0)))
        sy = int(params.get("startY", params.get("start_y", 0)))
        ex = int(params.get("endX", params.get("end_x", 0)))
        ey = int(params.get("endY", params.get("end_y", 0)))
        return ui_automation.mouse_drag(sx, sy, ex, ey)

    elif action_type == "TYPE_TEXT":
        text = params.get("text", "")
        enter = bool(params.get("press_enter", params.get("pressEnter", False)))
        clear_first = bool(params.get("clear_first", params.get("clearFirst", False)))
        if clear_first:
            ui_automation.send_combo("ctrl+a")
            ui_automation.press_key("backspace")
        res = ui_automation.type_text(text, enter)
        # Verify via UIA focused element if accessible
        try:
            import time as _t
            _t.sleep(0.06)
            read_back = ui_automation.read_focused_text()
            if read_back.get("success") and read_back.get("text"):
                res["verifiedText"] = read_back["text"][:300]
                res["verified"] = (text.strip() in read_back["text"]) if text.strip() else True
        except Exception:
            pass
        return res

    elif action_type == "READ_FOCUSED_TEXT":
        return ui_automation.read_focused_text()

    elif action_type == "PERCEIVE_SCREEN":
        from igris_desktop.screen_perception import ScreenPerception
        include_ocr = bool(params.get("include_ocr", params.get("includeOcr", False)))
        max_el = int(params.get("max_elements", 35))
        return ScreenPerception.get_instance().perceive(include_ocr=include_ocr, max_elements=max_el)

    elif action_type == "PRESS_KEY":
        key = params.get("key", "enter")
        return ui_automation.press_key(key)

    elif action_type == "KEY_COMBO":
        combo = params.get("combo", "ctrl+t")
        return ui_automation.send_combo(combo)

    elif action_type == "CLICK_UI_ELEMENT":
        desc = params.get("description", "")
        ctype = params.get("control_type", "")
        res = ui_automation.click_ui_element(desc, ctype)
        return res

    # 8. Screen Awareness
    elif action_type == "GET_ACTIVE_WINDOW":
        win = ui_automation.get_active_window()
        context.update_active_window(win["title"], win["process_name"], win["handle"])
        return {"success": True, "window": win, "message": f"Active: {win['process_name']} - '{win['title']}'"}

    elif action_type == "SCREEN_ANALYSIS":
        res = ui_automation.capture_screen()
        win = ui_automation.get_active_window()
        context.update_active_window(win["title"], win["process_name"], win["handle"])
        return {
            "success": res.get("success", False),
            "screenshot": res.get("path"),
            "active_window": win,
            "message": f"Captured screen. Active window is {win['process_name']} ('{win['title']}')."
        }

    elif action_type in ["SCREEN_GET_FRAME", "SCREEN_CAPTURE"]:
        import os
        import ctypes as _ctypes
        from igris_desktop.screen_capture import NativeScreenCaptureManager
        mgr = NativeScreenCaptureManager.get_instance()
        if mgr._is_authorized:
            frame_data = mgr.get_latest_frame()
            if not frame_data.get("frame"):
                mgr.capture_single_frame(mgr._selected_monitor_id)
                frame_data = mgr.get_latest_frame()
            return {"success": True, **frame_data}
        res = ui_automation.capture_screen(params.get("outputPath") or params.get("output_path"))
        try:
            scr_w = _ctypes.windll.user32.GetSystemMetrics(0)
            scr_h = _ctypes.windll.user32.GetSystemMetrics(1)
        except Exception:
            scr_w, scr_h = 1920, 1080
        res["screenWidth"] = scr_w
        res["screenHeight"] = scr_h
        img_path = res.get("path", "")
        img_w, img_h = scr_w, scr_h
        if img_path and os.path.exists(img_path):
            try:
                from PIL import Image as _PILImage
                with _PILImage.open(img_path) as _im:
                    img_w, img_h = _im.size
            except Exception:
                pass
        res["imageWidth"] = img_w
        res["imageHeight"] = img_h
        res["imagePath"] = img_path
        return res

    # 9. Universal Browser Operations
    elif action_type in ["BROWSER_SEARCH", "WEB_SEARCH"]:
        query = params.get("query", "")
        stype = params.get("search_type", "web")
        res = BrowserManager.get_instance().universal_search(query, stype)
        context.record_action(action_type, f"Search '{query}' ({stype})")
        return res

    elif action_type in ["BROWSER_CLICK", "CLICK_ELEMENT"]:
        target = params.get("target") or params.get("description", "")
        res = BrowserManager.get_instance().universal_click(target)
        context.record_action(action_type, f"Clicked '{target}'")
        return res

    elif action_type in ["BROWSER_TYPE"]:
        target = params.get("target", "")
        text = params.get("text", "")
        enter = params.get("press_enter", False)
        clear = params.get("clear_first", False)
        res = BrowserManager.get_instance().universal_type(target, text, press_enter=enter, clear_first=clear)
        context.record_action(action_type, f"Typed '{text}'")
        return res

    elif action_type in ["BROWSER_SCROLL"]:
        direction = params.get("direction", "down")
        amount = params.get("amount", "normal")
        container = params.get("container")
        res = BrowserManager.get_instance().universal_scroll(direction, amount, container)
        context.record_action(action_type, f"Scrolled {direction} ({amount})")
        return res

    elif action_type in ["BROWSER_TAB", "SWITCH_TAB"]:
        subact = params.get("subaction", "switch")
        query = params.get("query", "")
        if action_type == "SWITCH_TAB":
            subact = "switch"
            query = params.get("tab_name") or params.get("query", "")
        res = BrowserManager.get_instance().universal_tab_action(subact, query)
        context.record_action(action_type, f"Tab {subact} '{query}'")
        return res

    elif action_type == "OPEN_NEW_TAB":
        url = params.get("url")
        res = BrowserManager.get_instance().universal_tab_action("new", url)
        context.record_action(action_type, f"New tab: {url or 'blank'}")
        return res

    elif action_type == "CLOSE_TAB":
        res = BrowserManager.get_instance().universal_tab_action("close")
        context.record_action(action_type, "Closed active tab")
        return res

    elif action_type in ["BROWSER_MEDIA"]:
        subact = params.get("subaction", "toggle")
        target = params.get("target")
        res = BrowserManager.get_instance().universal_media_action(subact, target)
        context.record_action(action_type, f"Media {subact}")
        return res

    elif action_type in ["BROWSER_NAVIGATE", "OPEN_SEARCH_RESULT", "OPEN_URL"]:
        if action_type == "OPEN_SEARCH_RESULT":
            idx = params.get("index", 1)
            res = BrowserManager.get_instance().universal_navigation("open_result", {"index": idx})
        elif action_type == "OPEN_URL":
            url = params.get("url", "")
            res = BrowserManager.get_instance().universal_navigation("open_url", {"url": url})
        else:
            subact = params.get("subaction", "open_result")
            res = BrowserManager.get_instance().universal_navigation(subact, params)
        context.record_action(action_type, "Navigation executed")
        return res

    elif action_type == "READ_BROWSER_PAGE":
        return BrowserManager.get_instance().read_page_summary()

    elif action_type == "BROWSER_MULTI_STEP":
        steps = params.get("steps", [])
        res = BrowserManager.get_instance().execute_multi_step_plan(steps)
        context.record_action(action_type, f"Multi-step ({len(steps)} steps)")
        return res

    elif action_type == "SCREEN_LIST_MONITORS":
        from igris_desktop.screen_capture import NativeScreenCaptureManager
        mons = NativeScreenCaptureManager.get_instance().list_monitors()
        return {"success": True, "monitors": mons}

    elif action_type == "SCREEN_AUTHORIZE":
        from igris_desktop.screen_capture import NativeScreenCaptureManager
        mon_id = params.get("monitor", 0)
        status = NativeScreenCaptureManager.get_instance().authorize(mon_id)
        context.record_action(action_type, f"Screen capture authorized (Monitor {mon_id})")
        return {"success": True, "status": status}

    elif action_type == "SCREEN_REVOKE":
        from igris_desktop.screen_capture import NativeScreenCaptureManager
        status = NativeScreenCaptureManager.get_instance().revoke()
        context.record_action(action_type, "Screen capture revoked")
        return {"success": True, "status": status}

    elif action_type == "SCREEN_GET_STATUS":
        from igris_desktop.screen_capture import NativeScreenCaptureManager
        status = NativeScreenCaptureManager.get_instance().get_status()
        return {"success": True, "status": status}

    elif action_type == "STOP_TASK":
        context.is_task_running = False
        return {"success": True, "message": "Directive halted by Monarch."}

    return {"success": False, "message": f"Unhandled action type: '{action_type}'."}
