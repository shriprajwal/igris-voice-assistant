"""
IGRIS Universal Element Resolver
Resolves natural-language voice instructions into specific interactive UI elements
on the current webpage, supporting ordinals, element types, and semantic descriptions.
"""

import re
from typing import Dict, List, Optional, Any, Tuple
from igris_desktop.browser_engine.browser_context import BrowserContextManager
from igris_desktop.browser_engine.page_inspector import PageInspector

class ElementResolver:
    _instance = None

    def __init__(self):
        self.context = BrowserContextManager.get_instance()
        self.inspector = PageInspector.get_instance()

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def resolve(self, description: str, preferred_type: str = "any") -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]], bool]:
        """
        Resolves a user target description (e.g. "first link", "login button", "second result")
        into an element on the current page.
        Returns: (matched_element, candidates, is_ambiguous)
        """
        # 1. Fetch current visible elements on page
        page_data = self.inspector.inspect_active_page(max_elements=40)
        
        links = page_data.get("links", [])
        buttons = page_data.get("buttons", [])
        inputs = page_data.get("inputs", [])
        videos = page_data.get("videos", [])
        search_fields = page_data.get("search_fields", [])

        desc = description.lower().strip()

        # 2. Extract ordinal (first, 1st, second, 2nd, third, last, etc.)
        ordinal_idx = None
        ordinals = {
            "first": 0, "1st": 0, "one": 0, "top": 0,
            "second": 1, "2nd": 1, "two": 1,
            "third": 2, "3rd": 2, "three": 2,
            "fourth": 3, "4th": 3, "four": 3,
            "fifth": 4, "5th": 4, "five": 4,
            "last": -1, "bottom": -1
        }
        for word, idx in ordinals.items():
            if re.search(r"\b" + re.escape(word) + r"\b", desc):
                ordinal_idx = idx
                break

        # 3. Determine target element pool based on phrasing
        target_pool = []
        if any(w in desc for w in ["search box", "search bar", "search input", "search field"]):
            target_pool = search_fields or inputs
        elif any(w in desc for w in ["video", "clip", "watch", "thumbnail"]):
            target_pool = videos or [l for l in links if any(v in l.get("name", "").lower() for v in ["video", "watch", "tutorial"])] or links
        elif any(w in desc for w in ["result", "search result", "link"]):
            # Filter out navigational metadata like 'terms', 'privacy', 'about'
            relevant_links = [l for l in links if len(l.get("name", "")) > 6 and not any(skip in l.get("name", "").lower() for skip in ["sign in", "privacy", "terms", "settings", "feedback", "help"])]
            target_pool = relevant_links if relevant_links else links
        elif any(w in desc for w in ["button", "icon", "submit"]):
            target_pool = buttons
        elif any(w in desc for w in ["download", "option", "card", "item", "login", "sign in"]):
            target_pool = buttons + links
        elif any(w in desc for w in ["input", "text box", "field", "textarea"]):
            target_pool = inputs
        else:
            # Fallback based on preferred_type
            if preferred_type == "button":
                target_pool = buttons
            elif preferred_type == "link":
                target_pool = links
            elif preferred_type == "input":
                target_pool = inputs
            else:
                target_pool = buttons + links + inputs

        if not target_pool:
            return None, [], False

        # 4. Handle Ordinal requests on target pool (e.g. "first link", "second result", "third video")
        if ordinal_idx is not None:
            # Sort elements by Y coordinate (top-to-bottom on the page)
            sorted_pool = sorted(target_pool, key=lambda e: (e.get("centerY", 0), e.get("centerX", 0)))
            if ordinal_idx == -1 and sorted_pool:
                return sorted_pool[-1], sorted_pool, False
            elif 0 <= ordinal_idx < len(sorted_pool):
                return sorted_pool[ordinal_idx], sorted_pool, False
            else:
                return None, sorted_pool, False

        # 5. Clean query keywords
        cleaned_query = re.sub(r"\b(click|press|open|the|button|link|icon|option|card|item)\b", "", desc).strip()
        if not cleaned_query:
            cleaned_query = desc

        # Common web UI synonyms
        synonyms = {
            "login": ["login", "log in", "sign in", "signin"],
            "sign in": ["login", "log in", "sign in", "signin"],
            "signup": ["sign up", "signup", "register", "create account"],
            "register": ["sign up", "signup", "register", "create account"],
            "search": ["search", "find", "query", "lookup"],
            "submit": ["submit", "send", "post", "confirm", "done"],
            "download": ["download", "get", "installer", "install"],
            "close": ["close", "dismiss", "cancel", "x"]
        }

        search_tokens = [cleaned_query]
        for key, syn_list in synonyms.items():
            if key in cleaned_query:
                search_tokens.extend(syn_list)

        # 6. Exact or substring matching
        for token in search_tokens:
            exact_matches = [e for e in target_pool if token == e.get("name", "").lower().strip()]
            if exact_matches:
                return exact_matches[0], exact_matches, False

        for token in search_tokens:
            fuzzy_matches = [e for e in target_pool if token in e.get("name", "").lower()]
            if len(fuzzy_matches) == 1:
                return fuzzy_matches[0], fuzzy_matches, False
            elif len(fuzzy_matches) > 1:
                return fuzzy_matches[0], fuzzy_matches, True

        # Keyword token overlap matching
        query_words = set(cleaned_query.split())
        scored = []
        for elem in target_pool:
            elem_words = set(elem.get("name", "").lower().split())
            overlap = len(query_words.intersection(elem_words))
            if overlap > 0:
                scored.append((overlap, elem))

        if scored:
            scored.sort(key=lambda x: x[0], reverse=True)
            best_match = scored[0][1]
            return best_match, [s[1] for s in scored[:3]], len(scored) > 1 and scored[0][0] == scored[1][0]

        return None, target_pool[:5], False
