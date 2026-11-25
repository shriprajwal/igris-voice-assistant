"""
IGRIS Python Desktop Automation Engine & IPC Server
Implements the OBSERVE -> UNDERSTAND -> PLAN -> VALIDATE -> EXECUTE -> VERIFY -> UPDATE CONTEXT loop.
Hosts a local IPC HTTP endpoint for the Node.js / React backend and voice assistant.
"""

import os
import sys
import json
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler, ThreadingHTTPServer
import urllib.parse
from typing import Dict, Any

from igris_desktop.context_manager import DesktopContextManager
from igris_desktop.action_validator import ActionValidator
from igris_desktop.action_registry import dispatch_action
from igris_desktop import ui_automation

class DesktopEngine:
    _instance = None

    def __init__(self):
        self.context = DesktopContextManager.get_instance()
        self.validator = ActionValidator()
        self.is_running = True
        self.server_thread = None
        self.httpd = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def execute_directive(self, action_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes a directive through the full 7-step loop:
        1. OBSERVE: refresh active window and active directory
        2. VALIDATE: enforce parameter schema and injection boundaries
        3. EXECUTE: dispatch to dedicated implementation
        4. VERIFY: observe resulting window or directory state
        5. UPDATE CONTEXT: persist environment changes
        """
        # Step 1: OBSERVE
        active_win = ui_automation.get_active_window()
        self.context.update_active_window(active_win["title"], active_win["process_name"], active_win["handle"])

        # Step 2: VALIDATE
        is_valid, err_msg, clean_params = self.validator.validate(action_type, params)
        if not is_valid:
            self.context.record_action(action_type, f"Validation failure: {err_msg}", success=False)
            return {
                "success": False,
                "action": action_type,
                "message": err_msg,
                "context": self.context.get_summary()
            }

        # Step 3: EXECUTE
        self.context.is_task_running = True
        try:
            result = dispatch_action(action_type, clean_params, self.context)
        except Exception as e:
            result = {"success": False, "message": f"Execution error: {e}"}
        finally:
            self.context.is_task_running = False

        # Step 4: VERIFY
        final_win = ui_automation.get_active_window()
        self.context.update_active_window(final_win["title"], final_win["process_name"], final_win["handle"])
        if self.context.current_directory:
            self.context.refresh_visible_items()

        # Step 5: UPDATE CONTEXT
        result["context"] = self.context.get_summary()
        result["action"] = action_type
        return result

    def start_ipc_server(self, host: str = "127.0.0.1", port: int = 4848):
        """Start the local IPC HTTP server for Node.js backend integration."""
        engine_ref = self

        class EngineRequestHandler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass  # Suppress default noisy console logs

            def do_GET(self):
                parsed_url = urllib.parse.urlparse(self.path)
                clean_path = parsed_url.path
                if clean_path == "/ping":
                    self._send_json({"status": "online", "version": "2.0.0"})
                elif clean_path == "/context":
                    self._send_json(engine_ref.context.get_summary())
                elif clean_path == "/screen/monitors":
                    from igris_desktop.screen_capture import NativeScreenCaptureManager
                    self._send_json({"success": True, "monitors": NativeScreenCaptureManager.get_instance().list_monitors()})
                elif clean_path == "/screen/status":
                    from igris_desktop.screen_capture import NativeScreenCaptureManager
                    self._send_json({"success": True, "status": NativeScreenCaptureManager.get_instance().get_status()})
                elif clean_path == "/screen/frame":
                    from igris_desktop.screen_capture import NativeScreenCaptureManager
                    mgr = NativeScreenCaptureManager.get_instance()
                    frame_data = mgr.get_latest_frame()
                    if not frame_data.get("frame") and mgr._is_authorized:
                        mgr.capture_single_frame(mgr._selected_monitor_id)
                        frame_data = mgr.get_latest_frame()
                    self._send_json({"success": True, **frame_data})
                elif clean_path == "/screen/stream":
                    from igris_desktop.screen_capture import NativeScreenCaptureManager
                    mgr = NativeScreenCaptureManager.get_instance()
                    # Parse optional monitor query parameter ?m=0
                    query_params = urllib.parse.parse_qs(parsed_url.query)
                    if "m" in query_params:
                        try:
                            req_m = int(query_params["m"][0])
                            if req_m != mgr._selected_monitor_id:
                                mgr.authorize(req_m)
                        except Exception:
                            pass
                    if not mgr._is_authorized:
                        mgr.authorize(mgr._selected_monitor_id)

                    self.send_response(200)
                    self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
                    self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                    self.send_header("Pragma", "no-cache")
                    self.send_header("Connection", "close")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()

                    try:
                        for chunk in mgr.iter_mjpeg_frames():
                            self.wfile.write(chunk)
                            self.wfile.flush()
                    except (BrokenPipeError, ConnectionResetError, OSError):
                        pass
                else:
                    self.send_error(404, "Not Found")

            def do_POST(self):
                if self.path == "/screen/authorize":
                    content_length = int(self.headers.get("Content-Length", 0))
                    body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
                    try:
                        req_data = json.loads(body) if body else {}
                        mon_id = req_data.get("monitor", 0)
                        from igris_desktop.screen_capture import NativeScreenCaptureManager
                        st = NativeScreenCaptureManager.get_instance().authorize(mon_id)
                        self._send_json({"success": True, "status": st})
                    except Exception as e:
                        self._send_json({"success": False, "message": str(e)}, status=400)

                elif self.path == "/screen/revoke":
                    from igris_desktop.screen_capture import NativeScreenCaptureManager
                    st = NativeScreenCaptureManager.get_instance().revoke()
                    self._send_json({"success": True, "status": st})

                elif self.path == "/execute":
                    content_length = int(self.headers.get("Content-Length", 0))
                    body = self.rfile.read(content_length).decode("utf-8")
                    try:
                        req_data = json.loads(body)
                        action_type = req_data.get("action", "")
                        params = req_data.get("params", {})
                        res = engine_ref.execute_directive(action_type, params)
                        self._send_json(res)
                    except Exception as e:
                        self._send_json({"success": False, "message": f"Invalid JSON payload: {e}"}, status=400)

                elif self.path == "/stop":
                    engine_ref.context.is_task_running = False
                    self._send_json({"success": True, "message": "Halt protocol executed."})
                else:
                    self.send_error(404, "Not Found")

            def _send_json(self, data: Dict[str, Any], status: int = 200):
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps(data).encode("utf-8"))

        try:
            self.httpd = ThreadingHTTPServer((host, port), EngineRequestHandler)
            print(f"[IGRIS Python Engine] Threading IPC Server listening on http://{host}:{port}")
            self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
            self.server_thread.start()
        except Exception as e:
            print(f"[IGRIS Python Engine] Warning: Could not bind IPC server on {host}:{port}: {e}")

    def stop(self):
        """Stop the engine and IPC server."""
        self.is_running = False
        try:
            from igris_desktop.screen_capture import NativeScreenCaptureManager
            NativeScreenCaptureManager.get_instance().revoke()
        except Exception:
            pass
        if self.httpd:
            self.httpd.shutdown()

if __name__ == "__main__":
    engine = DesktopEngine.get_instance()
    engine.start_ipc_server()
    print("[IGRIS Python Engine] Running. Press Ctrl+C to terminate.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("[IGRIS Python Engine] Shutting down.")
        engine.stop()
