"""
IGRIS 2.0 Desktop Automation Engine Test Suite
Tests context management, contextual folder navigation, strict Bluetooth/Wi-Fi isolation,
action validation, registry dispatching, and system controls.
"""

import os
import sys
import unittest

# Ensure root directory is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from igris_desktop.context_manager import DesktopContextManager
from igris_desktop.action_validator import ActionValidator
from igris_desktop.action_registry import dispatch_action
from igris_desktop.engine import DesktopEngine
from igris_desktop.file_explorer import open_folder, navigate_nested_folder
from igris_desktop.system_controls import bluetooth, wifi, volume, display


class TestDesktopContextManager(unittest.TestCase):
    def setUp(self):
        self.ctx = DesktopContextManager.get_instance()
        self.ctx.current_directory = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.ctx.refresh_visible_items()

    def test_context_directory_tracking(self):
        """Verify context manager accurately tracks current directory and visible items."""
        self.assertTrue(os.path.isdir(self.ctx.current_directory))
        folders = self.ctx.get_visible_folders()
        self.assertIsInstance(folders, list)
        self.assertTrue(len(folders) > 0)
        folder_names = [f["name"] for f in folders]
        self.assertIn("src", folder_names)
        self.assertIn("igris_desktop", folder_names)

    def test_ordinal_item_resolution(self):
        """Verify ordinal language ('first', 'second', 'last') resolves to items."""
        first_folder, _, _ = self.ctx.resolve_contextual_item("first folder", "folder")
        self.assertIsNotNone(first_folder)
        
        last_folder, _, _ = self.ctx.resolve_contextual_item("last folder", "folder")
        self.assertIsNotNone(last_folder)

    def test_substring_and_case_insensitive_resolution(self):
        """Verify exact and case-insensitive resolution of folders."""
        item, _, ambiguous = self.ctx.resolve_contextual_item("SRC", "folder")
        self.assertIsNotNone(item)
        self.assertEqual(item["name"].lower(), "src")
        self.assertFalse(ambiguous)

    def test_nested_navigation_updates_context(self):
        """Verify navigating into nested folder updates context directory."""
        initial_dir = self.ctx.current_directory
        res = navigate_nested_folder("src", self.ctx)
        self.assertTrue(res.get("success"))
        self.assertEqual(self.ctx.current_directory, os.path.join(initial_dir, "src"))
        
        # Reset back to project root
        self.ctx.set_current_directory(initial_dir)


class TestBluetoothWifiIsolation(unittest.TestCase):
    """
    STRICT ISOLATION REQUIREMENT:
    Bluetooth controls must NEVER interact with or affect Wi-Fi adapters.
    Wi-Fi controls must NEVER interact with or affect Bluetooth adapters.
    """

    def test_bluetooth_state_never_mentions_wifi(self):
        """Calling get_bluetooth_state() must only query Bluetooth."""
        res = bluetooth.get_bluetooth_state()
        self.assertIsInstance(res, dict)
        self.assertIn("state", res)
        # Verify isolation: Bluetooth results must never report Wi-Fi
        msg_str = (res.get("message", "") + " " + res.get("name", "")).lower()
        self.assertNotIn("wi-fi", msg_str)
        self.assertNotIn("wlan", msg_str)

    def test_wifi_state_never_mentions_bluetooth(self):
        """Calling get_wifi_state() must only query Wi-Fi."""
        res = wifi.get_wifi_state()
        self.assertIsInstance(res, dict)
        self.assertIn("state", res)
        # Verify isolation: Wi-Fi results must never report Bluetooth
        msg_str = (res.get("message", "") + " " + res.get("ssid", "")).lower()
        self.assertNotIn("bluetooth", msg_str)
        self.assertNotIn("bthserv", msg_str)

    def test_registry_bluetooth_isolation(self):
        """Dispatching GET_BLUETOOTH_STATE must invoke Bluetooth module only."""
        ctx = DesktopContextManager.get_instance()
        res = dispatch_action("GET_BLUETOOTH_STATE", {}, ctx)
        self.assertIn("state", res)
        self.assertNotIn("wi-fi", str(res).lower())

    def test_registry_wifi_isolation(self):
        """Dispatching GET_WIFI_STATE must invoke Wi-Fi module only."""
        ctx = DesktopContextManager.get_instance()
        res = dispatch_action("GET_WIFI_STATE", {}, ctx)
        self.assertIn("state", res)
        self.assertNotIn("bluetooth", str(res).lower())


class TestActionValidatorSecurity(unittest.TestCase):
    def setUp(self):
        self.validator = ActionValidator()

    def test_valid_action_accepted(self):
        valid, err, _ = self.validator.validate("SYSTEM_INFO", {})
        self.assertTrue(valid)
        self.assertEqual(err, "")

    def test_injection_characters_rejected(self):
        """Verify command injection characters (; & | ` $ < >) are blocked."""
        valid, err, _ = self.validator.validate("OPEN_APPLICATION", {"app_name": "calc; calc"})
        self.assertFalse(valid)
        self.assertIn("disallowed", err.lower())

        valid2, err2, _ = self.validator.validate("NAVIGATE_FOLDER", {"folder": "Downloads | del *.*"})
        self.assertFalse(valid2)

    def test_unregistered_action_rejected(self):
        valid, err, _ = self.validator.validate("RUN_ARBITRARY_CODE", {"code": "print(1)"})
        self.assertFalse(valid)
        self.assertIn("unregistered", err.lower())


class TestSystemControls(unittest.TestCase):
    def test_system_info_retrieval(self):
        info = display.get_system_info()
        self.assertIn("os", info)
        self.assertIn("drives", info)
        self.assertIsInstance(info["drives"], list)

    def test_volume_controls(self):
        res = volume.volume_up(1)
        self.assertTrue(res.get("success"))
        res2 = volume.volume_down(1)
        self.assertTrue(res2.get("success"))


class TestDesktopEngineExecutionLoop(unittest.TestCase):
    def setUp(self):
        self.engine = DesktopEngine.get_instance()

    def test_directive_observe_execute_verify(self):
        res = self.engine.execute_directive("SYSTEM_INFO", {})
        self.assertIsInstance(res, dict)
        self.assertIn("context", res)
        self.assertEqual(res.get("action"), "SYSTEM_INFO")


class TestUniversalBrowserEngine(unittest.TestCase):
    def setUp(self):
        from igris_desktop.browser_engine.browser_context import BrowserContextManager
        from igris_desktop.browser_engine.browser_manager import BrowserManager
        from igris_desktop.browser_engine.element_resolver import ElementResolver

        self.b_ctx = BrowserContextManager.get_instance()
        self.b_mgr = BrowserManager.get_instance()
        self.resolver = ElementResolver.get_instance()

        # Seed realistic tab context
        self.b_ctx.update_tabs([
            {"index": 0, "title": "Google Search - Blender 3D", "is_active": False, "centerX": 100, "centerY": 20},
            {"index": 1, "title": "YouTube - Blender Guru Tutorials", "is_active": True, "centerX": 250, "centerY": 20},
            {"index": 2, "title": "GitHub - prajwal/igris-voice-assistant", "is_active": False, "centerX": 400, "centerY": 20},
            {"index": 3, "title": "Unity Documentation & Manual", "is_active": False, "centerX": 550, "centerY": 20}
        ])

    def test_tab_resolution_never_duplicates(self):
        """Verify tab switching identifies existing tabs by title and keyword without spawning new tabs."""
        # Query 'YouTube' -> matches tab index 1
        tab_yt, idx_yt, _ = self.b_ctx.resolve_tab("YouTube")
        self.assertIsNotNone(tab_yt)
        self.assertEqual(idx_yt, 1)

        # Query 'GitHub' -> matches tab index 2
        tab_gh, idx_gh, _ = self.b_ctx.resolve_tab("GitHub")
        self.assertIsNotNone(tab_gh)
        self.assertEqual(idx_gh, 2)

        # Relative ordinals: 'first tab', 'next tab', 'previous tab'
        tab_first, idx_first, _ = self.b_ctx.resolve_tab("first tab")
        self.assertEqual(idx_first, 0)

        tab_next, idx_next, _ = self.b_ctx.resolve_tab("next tab")
        self.assertEqual(idx_next, 2)

        tab_prev, idx_prev, _ = self.b_ctx.resolve_tab("previous tab")
        self.assertEqual(idx_prev, 0)

    def test_universal_element_resolution_on_unfamiliar_page(self):
        """Verify dynamic discovery and resolution of elements on any unfamiliar website without hardcoding."""
        mock_page = {
            "title": "Unfamiliar College Portal - Student Services",
            "search_fields": [
                {"name": "Search courses, faculty, or library...", "type": "Edit", "width": 450, "centerX": 500, "centerY": 90}
            ],
            "buttons": [
                {"name": "Sign In", "type": "Button", "centerX": 1150, "centerY": 50},
                {"name": "Apply Now", "type": "Button", "centerX": 600, "centerY": 450},
                {"name": "Submit Form", "type": "Button", "centerX": 600, "centerY": 900}
            ],
            "links": [
                {"name": "Academic Calendar 2026-2027", "type": "Hyperlink", "centerX": 300, "centerY": 300},
                {"name": "Download Course Syllabus PDF", "type": "Hyperlink", "centerX": 300, "centerY": 380},
                {"name": "Campus Map & Directions", "type": "Hyperlink", "centerX": 300, "centerY": 460}
            ],
            "videos": [
                {"name": "Campus Tour & Orientation Video", "type": "Hyperlink", "centerX": 700, "centerY": 320}
            ]
        }
        self.resolver.inspector.inspect_active_page = lambda max_elements=40: mock_page

        # 1. Resolve login button (synonym matching 'Sign In')
        elem_login, _, _ = self.resolver.resolve("login button")
        self.assertIsNotNone(elem_login)
        self.assertEqual(elem_login["name"], "Sign In")

        # 2. Resolve first link
        first_link, _, _ = self.resolver.resolve("first link")
        self.assertIsNotNone(first_link)
        self.assertEqual(first_link["name"], "Academic Calendar 2026-2027")

        # 3. Resolve second link
        second_link, _, _ = self.resolver.resolve("second link")
        self.assertIsNotNone(second_link)
        self.assertEqual(second_link["name"], "Download Course Syllabus PDF")

        # 4. Resolve download option
        dl_elem, _, _ = self.resolver.resolve("download option")
        self.assertIsNotNone(dl_elem)
        self.assertIn("Download", dl_elem["name"])

        # 5. Resolve video
        video_elem, _, _ = self.resolver.resolve("campus tour video")
        self.assertIsNotNone(video_elem)
        self.assertIn("Campus Tour", video_elem["name"])

    def test_universal_search_and_context_persistence(self):
        """Verify search context tracks recent query, results count, and allows follow-up 'open first result'."""
        res = self.b_mgr.universal_search("React tutorial", search_type="web")
        self.assertTrue(res.get("success"))
        self.assertEqual(self.b_ctx.search_state["query"], "React tutorial")
        self.assertEqual(self.b_ctx.search_state["engine"], "google")

        # Context summary should reflect active search
        summary = self.b_ctx.get_summary()
        self.assertEqual(summary["recent_search_query"], "React tutorial")

    def test_universal_media_controls(self):
        """Verify media playback commands update media state."""
        res_play = self.b_mgr.universal_media_action("play")
        self.assertTrue(res_play.get("success"))

        res_mute = self.b_mgr.universal_media_action("mute")
        self.assertTrue(res_mute.get("success"))

    def test_failure_handling_and_ambiguity(self):
        """Verify graceful error reporting when element does not exist."""
        mock_empty_page = {"title": "Empty Page", "buttons": [], "links": [], "search_fields": [], "inputs": []}
        self.resolver.inspector.inspect_active_page = lambda max_elements=40: mock_empty_page

        elem, candidates, is_ambiguous = self.resolver.resolve("nonexistent submit button")
        self.assertIsNone(elem)
        self.assertEqual(len(candidates), 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
