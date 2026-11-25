"""
Tests for IGRIS input_controller — SendInput mouse & keyboard.
Tests run without opening visible windows; they verify cursor movement and key encoding.
"""
import sys
import os
import time
import ctypes
import ctypes.wintypes as wintypes
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from igris_desktop import input_controller


class TestMouseMove(unittest.TestCase):
    def test_move_returns_success(self):
        """move_mouse() must return success=True."""
        result = input_controller.move_mouse(10, 10)
        self.assertTrue(result["success"])
        self.assertEqual(result["x"], 10)
        self.assertEqual(result["y"], 10)

    def test_move_to_center_returns_success(self):
        """move_mouse() to center must return success=True."""
        w = ctypes.windll.user32.GetSystemMetrics(0)
        h = ctypes.windll.user32.GetSystemMetrics(1)
        cx, cy = w // 2, h // 2
        result = input_controller.move_mouse(cx, cy)
        self.assertTrue(result["success"])

    def test_get_cursor_pos_returns_tuple(self):
        """get_cursor_pos() must return a 2-tuple of ints."""
        pos = input_controller.get_cursor_pos()
        self.assertIsInstance(pos, tuple)
        self.assertEqual(len(pos), 2)
        self.assertIsInstance(pos[0], int)
        self.assertIsInstance(pos[1], int)


class TestMouseClick(unittest.TestCase):
    def test_left_click_returns_success(self):
        """Left click at desktop area should return success."""
        # Move to safe area first
        input_controller.move_mouse(10, 10)
        time.sleep(0.05)
        result = input_controller.click("left", 10, 10)
        self.assertTrue(result["success"])
        self.assertEqual(result["button"], "left")

    def test_right_click_returns_success(self):
        input_controller.move_mouse(10, 10)
        time.sleep(0.05)
        result = input_controller.right_click(10, 10)
        self.assertTrue(result["success"])

    def test_double_click_returns_success(self):
        input_controller.move_mouse(10, 10)
        time.sleep(0.05)
        result = input_controller.double_click(10, 10)
        self.assertTrue(result["success"])


class TestMouseScroll(unittest.TestCase):
    def test_scroll_down(self):
        result = input_controller.scroll("down", 2)
        self.assertTrue(result["success"])
        self.assertEqual(result["direction"], "down")

    def test_scroll_up(self):
        result = input_controller.scroll("up", 2)
        self.assertTrue(result["success"])
        self.assertEqual(result["direction"], "up")


class TestKeyboardPressKey(unittest.TestCase):
    def test_press_enter(self):
        result = input_controller.press_key("enter")
        self.assertTrue(result["success"])
        self.assertEqual(result["key"], "enter")

    def test_press_escape(self):
        result = input_controller.press_key("escape")
        self.assertTrue(result["success"])

    def test_press_tab(self):
        result = input_controller.press_key("tab")
        self.assertTrue(result["success"])

    def test_press_unknown_key(self):
        result = input_controller.press_key("INVALIDKEY_XYZ_ABC")
        self.assertFalse(result["success"])

    def test_press_arrow_keys(self):
        for k in ("up", "down", "left", "right"):
            result = input_controller.press_key(k)
            self.assertTrue(result["success"], msg=f"Failed for '{k}'")


class TestHotkey(unittest.TestCase):
    def test_ctrl_a(self):
        result = input_controller.hotkey("ctrl", "a")
        self.assertTrue(result["success"])

    def test_ctrl_c(self):
        result = input_controller.hotkey("ctrl", "c")
        self.assertTrue(result["success"])

    def test_alt_tab(self):
        # alt+tab will switch windows — just verify it doesn't crash
        result = input_controller.hotkey("alt", "tab")
        self.assertTrue(result["success"])
        # Switch back
        time.sleep(0.3)
        input_controller.hotkey("alt", "tab")

    def test_bad_key_in_hotkey(self):
        result = input_controller.hotkey("ctrl", "BADKEY_ZZZ")
        self.assertFalse(result["success"])


class TestSendCombo(unittest.TestCase):
    def test_combo_ctrl_a(self):
        result = input_controller.send_combo("ctrl+a")
        self.assertTrue(result["success"])

    def test_combo_ctrl_shift_n(self):
        result = input_controller.send_combo("ctrl+shift+n")
        self.assertTrue(result["success"])


class TestTypeText(unittest.TestCase):
    def test_type_simple_ascii(self):
        """type_text should return success for simple ASCII."""
        result = input_controller.type_text("hello")
        self.assertTrue(result["success"])
        self.assertEqual(result["typed"], "hello")

    def test_type_unicode(self):
        """type_text should handle unicode without crashing."""
        result = input_controller.type_text("IGRIS — Monarch 🦾")
        self.assertTrue(result["success"])

    def test_type_with_enter(self):
        result = input_controller.type_text("test", press_enter=True)
        self.assertTrue(result["success"])

    def test_type_empty_string(self):
        result = input_controller.type_text("")
        self.assertTrue(result["success"])


class TestVKCodeMap(unittest.TestCase):
    def test_all_documented_vk_codes_are_integers(self):
        for name, code in input_controller.VK_CODES.items():
            self.assertIsInstance(code, int, msg=f"VK_CODES['{name}'] is not int")
            self.assertGreater(code, 0, msg=f"VK_CODES['{name}'] is 0")


if __name__ == "__main__":
    unittest.main(verbosity=2)
