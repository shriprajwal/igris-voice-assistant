"""
Tests for IGRIS File Explorer engine.
Verifies:
- _get_explorer_windows() returns a list (may be empty if no Explorer is open)
- open_folder resolves known directories
- navigate_nested_folder works with context
- _url_to_path converts file:/// URLs correctly
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from igris_desktop import file_explorer
from igris_desktop.context_manager import DesktopContextManager


class TestUrlToPath(unittest.TestCase):
    def test_converts_file_url(self):
        url = "file:///C:/Users/Test/Downloads"
        result = file_explorer._url_to_path(url)
        self.assertEqual(result, "C:\\Users\\Test\\Downloads")

    def test_non_file_url_passthrough(self):
        url = "https://example.com"
        result = file_explorer._url_to_path(url)
        self.assertEqual(result, url)

    def test_encoded_spaces(self):
        url = "file:///C:/Users/Test/My%20Documents"
        result = file_explorer._url_to_path(url)
        self.assertIn("My Documents", result)


class TestGetExplorerWindows(unittest.TestCase):
    def test_returns_list(self):
        """_get_explorer_windows() must return a list (may be empty)."""
        result = file_explorer._get_explorer_windows()
        self.assertIsInstance(result, list)

    def test_each_entry_has_path_and_hwnd(self):
        result = file_explorer._get_explorer_windows()
        for entry in result:
            self.assertIn("path", entry)
            self.assertIn("hwnd", entry)
            self.assertTrue(os.path.isdir(entry["path"]),
                            msg=f"Explorer path not a directory: {entry['path']}")


class TestOpenFolder(unittest.TestCase):
    def setUp(self):
        self.ctx = DesktopContextManager()

    def test_open_downloads(self):
        result = file_explorer.open_folder("downloads", self.ctx)
        self.assertTrue(result["success"], msg=result.get("message"))
        self.assertIn("Downloads", result["path"])

    def test_open_documents(self):
        result = file_explorer.open_folder("documents", self.ctx)
        self.assertTrue(result["success"], msg=result.get("message"))

    def test_open_nonexistent_folder(self):
        result = file_explorer.open_folder("THISDOESNOTEXIST_XYZ_12345", self.ctx)
        self.assertFalse(result["success"])

    def test_context_updated_after_open(self):
        file_explorer.open_folder("downloads", self.ctx)
        ctx_dir = self.ctx.get_current_directory()
        self.assertIsNotNone(ctx_dir)
        self.assertTrue(ctx_dir.lower().endswith("downloads"))


class TestNavigateNestedFolder(unittest.TestCase):
    def setUp(self):
        self.ctx = DesktopContextManager()
        # Set context to a real directory with known sub-items
        user = os.environ.get("USERPROFILE", os.path.expanduser("~"))
        self.ctx.set_current_directory(user)

    def test_no_context_returns_failure(self):
        ctx2 = DesktopContextManager()
        ctx2.current_directory = None
        result = file_explorer.navigate_nested_folder("Downloads", ctx2)
        self.assertFalse(result["success"])

    def test_navigate_existing_subfolder(self):
        """Navigate into 'Downloads' from the user home directory."""
        result = file_explorer.navigate_nested_folder("Downloads", self.ctx)
        self.assertTrue(result["success"], msg=result.get("message"))

    def test_navigate_nonexistent_subfolder(self):
        result = file_explorer.navigate_nested_folder("NOSUCHTHING_XYZ_9999", self.ctx)
        self.assertFalse(result["success"])


class TestContextManagerExplorerTracking(unittest.TestCase):
    def test_refresh_explorer_windows_returns_list(self):
        ctx = DesktopContextManager()
        result = ctx.refresh_explorer_windows()
        self.assertIsInstance(result, list)

    def test_get_active_explorer_window_none_or_dict(self):
        ctx = DesktopContextManager()
        result = ctx.get_active_explorer_window()
        self.assertTrue(result is None or isinstance(result, dict))


if __name__ == "__main__":
    unittest.main(verbosity=2)
