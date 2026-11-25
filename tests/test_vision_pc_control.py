"""
Tests for IGRIS Screen-Vision Based PC Control and Mouse/Keyboard Dispatch.
Verifies:
1. SCREEN_CAPTURE action validation and execution
2. Screen and image dimension reporting
3. Coordinate transformation and DPI scaling accuracy
4. Mouse and keyboard control via dispatch_action
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from igris_desktop.action_validator import ActionValidator
from igris_desktop.action_registry import dispatch_action
from igris_desktop.context_manager import DesktopContextManager
from igris_desktop import input_controller


class TestVisionActionValidation(unittest.TestCase):
    def setUp(self):
        self.validator = ActionValidator()

    def test_screen_capture_allowed(self):
        valid, err, params = self.validator.validate("SCREEN_CAPTURE", {})
        self.assertTrue(valid, msg=err)

    def test_screen_capture_with_output_path(self):
        valid, err, params = self.validator.validate("SCREEN_CAPTURE", {"outputPath": "C:\\temp\\shot.jpg"})
        self.assertTrue(valid, msg=err)

    def test_mouse_actions_allowed(self):
        for act in ["MOUSE_MOVE", "MOUSE_CLICK", "MOUSE_SCROLL", "TYPE_TEXT", "PRESS_KEY", "KEY_COMBO"]:
            valid, err, _ = self.validator.validate(act, {})
            self.assertTrue(valid, msg=f"Action {act} was rejected: {err}")


class TestScreenCaptureExecution(unittest.TestCase):
    def setUp(self):
        self.ctx = DesktopContextManager.get_instance()

    def test_screen_capture_returns_required_fields(self):
        res = dispatch_action("SCREEN_CAPTURE", {}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))
        self.assertIn("path", res)
        self.assertIn("screenWidth", res)
        self.assertIn("screenHeight", res)
        self.assertIn("imageWidth", res)
        self.assertIn("imageHeight", res)
        self.assertGreater(res["screenWidth"], 0)
        self.assertGreater(res["screenHeight"], 0)
        self.assertGreater(res["imageWidth"], 0)
        self.assertGreater(res["imageHeight"], 0)
        self.assertTrue(os.path.exists(res["path"]))
        self.assertGreater(os.path.getsize(res["path"]), 100)


class TestCoordinateScaling(unittest.TestCase):
    """
    Test coordinate mapping formula:
    scaleX = screenWidth / imageWidth
    scaleY = screenHeight / imageHeight
    realX = clamp(0, screenWidth, round(imageX * scaleX))
    realY = clamp(0, screenHeight, round(imageY * scaleY))
    """
    def scale_coords(self, img_x, img_y, img_w, img_h, scr_w, scr_h):
        scale_x = scr_w / img_w
        scale_y = scr_h / img_h
        real_x = min(scr_w, max(0, round(img_x * scale_x)))
        real_y = min(scr_h, max(0, round(img_y * scale_y)))
        return real_x, real_y

    def test_exact_1to1_scaling(self):
        rx, ry = self.scale_coords(500, 300, 1920, 1080, 1920, 1080)
        self.assertEqual(rx, 500)
        self.assertEqual(ry, 300)

    def test_150_percent_dpi_scaling(self):
        # 2560x1600 physical display with 1.5x Windows scaling -> 1707x1067 logical capture
        rx, ry = self.scale_coords(853, 533, 1707, 1067, 2560, 1600)
        self.assertAlmostEqual(rx, 1280, delta=2)
        self.assertAlmostEqual(ry, 800, delta=2)

    def test_coordinate_clamping_to_screen_bounds(self):
        # Even if visual model returns coordinates near or slightly past edge
        rx, ry = self.scale_coords(1200, 900, 1024, 768, 1920, 1080)
        self.assertEqual(rx, 1920)
        self.assertEqual(ry, 1080)

        rx_neg, ry_neg = self.scale_coords(-10, -5, 1024, 768, 1920, 1080)
        self.assertEqual(rx_neg, 0)
        self.assertEqual(ry_neg, 0)


class TestMouseKeyboardDispatch(unittest.TestCase):
    def setUp(self):
        self.ctx = DesktopContextManager.get_instance()

    def test_dispatch_mouse_move(self):
        res = dispatch_action("MOUSE_MOVE", {"x": 150, "y": 150}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))

    def test_dispatch_mouse_click_left(self):
        res = dispatch_action("MOUSE_CLICK", {"button": "left", "x": 150, "y": 150}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))

    def test_dispatch_mouse_click_right(self):
        res = dispatch_action("MOUSE_CLICK", {"button": "right", "x": 150, "y": 150}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))

    def test_dispatch_mouse_scroll(self):
        res = dispatch_action("MOUSE_SCROLL", {"direction": "down", "amount": 2}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))

    def test_dispatch_type_text(self):
        res = dispatch_action("TYPE_TEXT", {"text": "IGRIS Vision Control", "pressEnter": False}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))

    def test_dispatch_press_key(self):
        res = dispatch_action("PRESS_KEY", {"key": "escape"}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))

    def test_dispatch_key_combo(self):
        res = dispatch_action("KEY_COMBO", {"combo": "ctrl+c"}, self.ctx)
        self.assertTrue(res.get("success"), msg=res.get("message"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
