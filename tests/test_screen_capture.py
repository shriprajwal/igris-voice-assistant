"""
Tests for IGRIS Native Windows Desktop Screen Capture Manager
Verifies monitor enumeration, authorization lifecycle, frame metadata,
coordinate scaling, and IPC directive dispatch.
"""

import unittest
from igris_desktop.screen_capture import NativeScreenCaptureManager
from igris_desktop.action_validator import ActionValidator
from igris_desktop.engine import DesktopEngine

class TestScreenCaptureManager(unittest.TestCase):
    def setUp(self):
        self.mgr = NativeScreenCaptureManager.get_instance()
        self.engine = DesktopEngine.get_instance()

    def tearDown(self):
        self.mgr.revoke()

    def test_list_monitors(self):
        monitors = self.mgr.list_monitors()
        self.assertIsInstance(monitors, list)
        self.assertGreaterEqual(len(monitors), 1)
        m0 = monitors[0]
        self.assertIn("id", m0)
        self.assertIn("width", m0)
        self.assertIn("height", m0)
        self.assertGreater(m0["width"], 0)
        self.assertGreater(m0["height"], 0)

    def test_authorization_lifecycle(self):
        # 1. Initially revoked
        self.mgr.revoke()
        st0 = self.mgr.get_status()
        self.assertFalse(st0["isAuthorized"])
        self.assertFalse(st0["isCapturing"])

        # 2. Authorize
        st1 = self.mgr.authorize(monitor_id=0)
        self.assertTrue(st1["isAuthorized"])
        self.assertTrue(st1["isCapturing"])
        self.assertEqual(st1["selectedMonitorId"], 0)

        # 3. Revoke
        st2 = self.mgr.revoke()
        self.assertFalse(st2["isAuthorized"])
        self.assertFalse(st2["isCapturing"])

    def test_coordinate_mapping(self):
        # Setup simulated dimensions
        self.mgr._screen_width = 2560
        self.mgr._screen_height = 1600
        self.mgr._frame_width = 1280
        self.mgr._frame_height = 800
        self.mgr._monitor_left = 0
        self.mgr._monitor_top = 0

        # Center point
        sx, sy = self.mgr.map_to_screen_coordinates(640, 400)
        self.assertEqual(sx, 1280)
        self.assertEqual(sy, 800)

        # Origin
        ox, oy = self.mgr.map_to_screen_coordinates(0, 0)
        self.assertEqual(ox, 0)
        self.assertEqual(oy, 0)

    def test_action_validator_screen_directives(self):
        validator = ActionValidator()
        directives = [
            "SCREEN_LIST_MONITORS",
            "SCREEN_AUTHORIZE",
            "SCREEN_REVOKE",
            "SCREEN_GET_STATUS",
            "SCREEN_GET_FRAME",
            "SCREEN_CAPTURE"
        ]
        for d in directives:
            valid, msg, params = validator.validate(d, {})
            self.assertTrue(valid, f"Directive {d} failed validation: {msg}")

    def test_engine_screen_directives(self):
        # Test SCREEN_LIST_MONITORS
        res_mon = self.engine.execute_directive("SCREEN_LIST_MONITORS", {})
        self.assertTrue(res_mon.get("success"))
        self.assertIn("monitors", res_mon)

        # Test SCREEN_AUTHORIZE
        res_auth = self.engine.execute_directive("SCREEN_AUTHORIZE", {"monitor": 0})
        self.assertTrue(res_auth.get("success"))
        self.assertTrue(res_auth["status"]["isAuthorized"])

        # Test SCREEN_GET_STATUS
        res_st = self.engine.execute_directive("SCREEN_GET_STATUS", {})
        self.assertTrue(res_st.get("success"))
        self.assertTrue(res_st["status"]["isAuthorized"])

        # Test SCREEN_REVOKE
        res_rev = self.engine.execute_directive("SCREEN_REVOKE", {})
        self.assertTrue(res_rev.get("success"))

    def test_mjpeg_stream_support(self):
        self.mgr.authorize(0)
        status = self.mgr.get_status()
        self.assertTrue(status["isAuthorized"])
        # Frame count should increment as observation runs
        import time
        time.sleep(0.15)
        self.assertGreater(self.mgr._frame_count, 0)
        self.assertIsNotNone(self.mgr.get_latest_jpeg_bytes())
        rev_st = self.mgr.revoke()
        self.assertFalse(rev_st["isAuthorized"])

if __name__ == "__main__":
    unittest.main()
