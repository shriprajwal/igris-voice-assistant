"""
IGRIS Browser Context Manager
Maintains conversational and environmental browser context across consecutive voice commands.
Tracks open tabs, active tab, page title, URL, current search results, visible interactive elements,
and media playback state.
"""

import time
import re
from typing import Dict, List, Optional, Any, Tuple

class BrowserContextManager:
    _instance = None

    def __init__(self):
        self.active_browser: str = "chrome"
        self.active_browser_hwnd: int = 0
        self.tabs: List[Dict[str, Any]] = []
        self.active_tab: Optional[Dict[str, Any]] = None
        self.page_title: str = ""
        self.page_url: str = ""
        self.page_type: str = "generic"  # search_results | video_player | repository | form | article | generic
        
        # Search & Results state
        self.search_state: Dict[str, Any] = {
            "query": "",
            "engine": "google",
            "results": [],  # List of { index, title, url, snippet }
            "selected_index": None
        }

        # Media state
        self.media_state: Dict[str, Any] = {
            "is_playing": False,
            "title": "",
            "volume": 100,
            "is_muted": False,
            "available_videos": []  # List of { index, title, bounds }
        }

        # Visible UI elements
        self.visible_elements: Dict[str, List[Dict[str, Any]]] = {
            "search_fields": [],
            "inputs": [],
            "buttons": [],
            "links": [],
            "cards": [],
            "headings": []
        }

        # History and activity
        self.navigation_history: List[Dict[str, Any]] = []
        self.last_action: Optional[str] = None
        self.last_action_timestamp: float = 0.0

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def update_browser_info(self, browser_name: str, hwnd: int = 0):
        self.active_browser = browser_name or "chrome"
        if hwnd:
            self.active_browser_hwnd = hwnd

    def update_tabs(self, tabs: List[Dict[str, Any]], active_index: Optional[int] = None):
        """Update tab roster and currently active tab."""
        self.tabs = tabs or []
        if active_index is not None and 0 <= active_index < len(self.tabs):
            self.active_tab = self.tabs[active_index]
            self.page_title = self.active_tab.get("title", "")
        elif self.tabs:
            # Look for active tab flag
            active = next((t for t in self.tabs if t.get("is_active")), None)
            if active:
                self.active_tab = active
                self.page_title = active.get("title", "")
            else:
                self.active_tab = self.tabs[0]
                self.page_title = self.tabs[0].get("title", "")

    def update_page_state(self, title: str, url: str = ""):
        """Update current page details and classify page type."""
        self.page_title = title or self.page_title
        if url:
            self.page_url = url

        # Infer page type
        t_lower = self.page_title.lower()
        u_lower = self.page_url.lower()

        if any(k in t_lower or k in u_lower for k in ["search", "results", "google.com/search", "bing.com/search"]):
            self.page_type = "search_results"
        elif any(k in t_lower or k in u_lower for k in ["youtube.com/watch", "vimeo.com", "video", "twitch.tv"]):
            self.page_type = "video_player"
        elif any(k in t_lower or k in u_lower for k in ["github.com", "gitlab.com", "repository"]):
            self.page_type = "repository"
        elif any(k in t_lower or k in u_lower for k in ["docs.", "documentation", "wiki", "article"]):
            self.page_type = "documentation"
        else:
            self.page_type = "generic"

        # Record in navigation history
        if self.page_title and (not self.navigation_history or self.navigation_history[-1].get("title") != self.page_title):
            self.navigation_history.append({
                "title": self.page_title,
                "url": self.page_url,
                "timestamp": time.time()
            })
            if len(self.navigation_history) > 25:
                self.navigation_history.pop(0)

    def set_search_results(self, query: str, results: List[Dict[str, Any]], engine: str = "google"):
        """Save parsed search results from Google, YouTube, GitHub, or documentation."""
        self.search_state = {
            "query": query,
            "engine": engine,
            "results": results or [],
            "selected_index": None
        }

    def get_search_result(self, index: int) -> Optional[Dict[str, Any]]:
        """Get search result by 1-based index."""
        results = self.search_state.get("results", [])
        for r in results:
            if r.get("index") == index:
                return r
        if 1 <= index <= len(results):
            return results[index - 1]
        return None

    def resolve_tab(self, query: str) -> Tuple[Optional[Dict[str, Any]], int, List[str]]:
        """
        Resolves an open browser tab by name, domain, keyword, or relative position.
        Supports:
        - "YouTube", "GitHub", "ChatGPT", "Unity"
        - "first tab", "second tab", "last tab"
        - "next tab", "previous tab"
        Returns: (matched_tab, tab_index, candidate_titles)
        """
        if not self.tabs:
            return None, -1, []

        titles = [t.get("title", "") for t in self.tabs]
        q = query.lower().strip()

        # 1. Relative keywords
        current_idx = 0
        if self.active_tab in self.tabs:
            current_idx = self.tabs.index(self.active_tab)

        if q in ["next tab", "next"]:
            next_idx = (current_idx + 1) % len(self.tabs)
            return self.tabs[next_idx], next_idx, titles

        if q in ["previous tab", "prev tab", "previous", "prev"]:
            prev_idx = (current_idx - 1 + len(self.tabs)) % len(self.tabs)
            return self.tabs[prev_idx], prev_idx, titles

        # 2. Ordinals
        ordinals = {
            "first": 0, "1st": 0, "one": 0,
            "second": 1, "2nd": 1, "two": 1,
            "third": 2, "3rd": 2, "three": 2,
            "fourth": 3, "4th": 3, "four": 3,
            "fifth": 4, "5th": 4, "five": 4,
            "last": len(self.tabs) - 1
        }
        for word, idx in ordinals.items():
            if word in q.split() or q == f"{word} tab":
                if 0 <= idx < len(self.tabs):
                    return self.tabs[idx], idx, titles

        # 3. Clean keywords (remove words like 'tab', 'my', 'the', 'switch to')
        clean_q = re.sub(r"\b(switch to|go to|select|open|the|my|tab)\b", "", q).strip()
        if not clean_q:
            clean_q = q

        # 4. Exact / Substring matches
        for idx, tab in enumerate(self.tabs):
            t_name = tab.get("title", "").lower()
            if clean_q in t_name or t_name in clean_q:
                return tab, idx, titles

        # 5. Domain / URL keyword matching
        domain_keywords = ["youtube", "google", "github", "chatgpt", "amazon", "wikipedia", "reddit", "stackoverflow"]
        for kw in domain_keywords:
            if kw in clean_q:
                for idx, tab in enumerate(self.tabs):
                    if kw in tab.get("title", "").lower():
                        return tab, idx, titles

        return None, -1, titles

    def record_action(self, action_name: str, details: str = ""):
        self.last_action = action_name
        self.last_action_timestamp = time.time()

    def get_summary(self) -> Dict[str, Any]:
        """Return context summary for AI and UI telemetry."""
        return {
            "browser": self.active_browser,
            "page_title": self.page_title,
            "page_url": self.page_url,
            "page_type": self.page_type,
            "active_tab_title": self.active_tab.get("title") if self.active_tab else "",
            "total_open_tabs": len(self.tabs),
            "recent_search_query": self.search_state.get("query"),
            "search_results_count": len(self.search_state.get("results", [])),
            "media_playing": self.media_state.get("is_playing", False),
            "last_action": self.last_action
        }
