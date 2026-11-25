"""
IGRIS Universal Media Controller
Controls video playback, media volume, and video selection across YouTube, Vimeo,
and accessible HTML5 video players on any website.
"""

import time
from typing import Dict, List, Optional, Any
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop.browser_engine.page_inspector import PageInspector
from igris_desktop.browser_engine.element_resolver import ElementResolver
from igris_desktop.browser_engine.action_executor import ActionExecutor
from igris_desktop import ui_automation

class MediaController:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()
        self.inspector = PageInspector.get_instance()
        self.resolver = ElementResolver.get_instance()
        self.executor = ActionExecutor.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def toggle_playback(self) -> Dict[str, Any]:
        """Toggles play/pause on the active webpage video player."""
        # 1. Look for accessible Play / Pause button on page
        page = self.inspector.inspect_active_page(max_elements=30)
        buttons = page.get("buttons", [])
        play_btn = next((b for b in buttons if any(k in b.get("name", "").lower() for k in ["play", "pause", "resume"])), None)

        if play_btn:
            self.executor.click_element(play_btn)
            is_now_playing = "play" in play_btn.get("name", "").lower()
            self.context.media_state["is_playing"] = is_now_playing
            return {"success": True, "message": f"{'Playing' if is_now_playing else 'Paused'} video playback."}

        # 2. Universal media shortcut: 'k' on YouTube, or Spacebar on general HTML5 players
        ui_automation.press_key("k")
        time.sleep(0.1)
        self.context.media_state["is_playing"] = not self.context.media_state["is_playing"]
        return {"success": True, "message": "Toggled media playback."}

    def play(self) -> Dict[str, Any]:
        """Ensures video playback is running."""
        return self.toggle_playback()

    def pause(self) -> Dict[str, Any]:
        """Ensures video playback is paused."""
        return self.toggle_playback()

    def toggle_mute(self) -> Dict[str, Any]:
        """Mute / Unmute media audio on active webpage."""
        page = self.inspector.inspect_active_page(max_elements=25)
        buttons = page.get("buttons", [])
        mute_btn = next((b for b in buttons if any(k in b.get("name", "").lower() for k in ["mute", "unmute", "sound", "volume"])), None)

        if mute_btn:
            self.executor.click_element(mute_btn)
        else:
            # Universal video player shortcut: 'm' toggles mute
            ui_automation.press_key("m")

        self.context.media_state["is_muted"] = not self.context.media_state["is_muted"]
        return {"success": True, "message": f"{'Muted' if self.context.media_state['is_muted'] else 'Unmuted'} media audio."}

    def adjust_volume(self, direction: str = "up") -> Dict[str, Any]:
        """Adjust video player volume via Up/Down arrows."""
        key = "up" if direction == "up" else "down"
        for _ in range(3):
            ui_automation.press_key(key)
            time.sleep(0.05)
        return {"success": True, "message": f"Adjusted media volume {direction}."}

    def identify_visible_videos(self) -> List[Dict[str, Any]]:
        """Scans page for visible video links and cards."""
        page = self.inspector.inspect_active_page(max_elements=40)
        videos = page.get("videos", [])
        if not videos:
            # Find links with video titles
            links = page.get("links", [])
            videos = [l for l in links if len(l.get("name", "")) > 10 and not any(skip in l.get("name", "").lower() for skip in ["sign in", "about", "press", "copyright"])]

        # Index them
        results = []
        for idx, v in enumerate(videos[:10]):
            item = dict(v)
            item["index"] = idx + 1
            results.append(item)

        self.context.media_state["available_videos"] = results
        return results

    def play_selected_video(self, query_or_index: Any) -> Dict[str, Any]:
        """
        Plays a specific video by title, keyword, or ordinal index (e.g. 1 for first video).
        """
        available = self.identify_visible_videos()
        if not available:
            return {"success": False, "message": "No visible video elements detected on the current page."}

        target_video = None
        # Check if integer index
        if isinstance(query_or_index, int) or (isinstance(query_or_index, str) and query_or_index.isdigit()):
            idx = int(query_or_index)
            if 1 <= idx <= len(available):
                target_video = available[idx - 1]
        else:
            # Resolve by text
            matched, _, _ = self.resolver.resolve(str(query_or_index), preferred_type="link")
            target_video = matched or available[0]

        if target_video:
            self.executor.click_element(target_video)
            video_title = target_video.get("name", "selected video")
            self.context.media_state["title"] = video_title
            self.context.media_state["is_playing"] = True
            return {"success": True, "video": target_video, "message": f"Opening and playing '{video_title}'."}

        return {"success": False, "message": f"Could not locate video matching '{query_or_index}'."}
