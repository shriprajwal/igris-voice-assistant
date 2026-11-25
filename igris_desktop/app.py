"""
IGRIS 2.0 Native Windows Desktop Application Shell
PySide6 + QtWebEngine desktop host for the IGRIS React voice assistant frontend.
Embeds the local Python Desktop Automation Engine and manages backend server lifecycle.
"""

import sys
import os

# Ensure project root is in sys.path and set as working directory
if getattr(sys, 'frozen', False):
    app_dir = os.path.dirname(sys.executable)
    potential_root = os.path.abspath(os.path.join(app_dir, "..", ".."))
    if os.path.exists(os.path.join(potential_root, "package.json")):
        PROJECT_ROOT = potential_root
    else:
        PROJECT_ROOT = app_dir
else:
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
try:
    os.chdir(PROJECT_ROOT)
except Exception:
    pass

# Fast GPU compositing via ANGLE D3D11 while preventing Windows DComp/MPO cursor flicker.
# Do NOT set --disable-gpu-compositing (causes CPU lag on backdrop-blur) or --enable-zero-copy (causes Windows tile flicker).
os.environ.setdefault(
    "QTWEBENGINE_CHROMIUM_FLAGS",
    " ".join([
        "--disable-direct-composition",
        "--use-gl=angle",
        "--use-angle=d3d11",
        "--ignore-gpu-blocklist",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
    ])
)

import subprocess
import time
import signal
from PySide6.QtCore import QUrl, Qt, QTimer
from PySide6.QtWidgets import QApplication, QMainWindow, QSystemTrayIcon, QMenu
from PySide6.QtGui import QIcon, QAction, QColor
from PySide6.QtWebEngineWidgets import QWebEngineView
from PySide6.QtWebEngineCore import QWebEnginePage, QWebEngineProfile, QWebEngineSettings, QWebEnginePermission, QWebEngineScript

from igris_desktop.engine import DesktopEngine

class IgrisWebPage(QWebEnginePage):
    """Custom WebEnginePage that automatically grants microphone, camera, screen capture, and notification permissions for Gemini Live and screen sharing."""
    def __init__(self, profile, parent=None):
        super().__init__(profile, parent)
        # Modern Qt 6.8+ permission handler
        try:
            self.permissionRequested.connect(self.handle_permission_modern)
        except Exception as e:
            print(f"[IGRIS App] Note: modern permissionRequested not available: {e}")
        # Classic Qt feature permission handler
        try:
            self.featurePermissionRequested.connect(self.handle_feature_permission)
        except Exception as e:
            print(f"[IGRIS App] Note: featurePermissionRequested not available: {e}")

    def handle_permission_modern(self, permission):
        try:
            print(f"[IGRIS App] Auto-granting permission {permission.permissionType()} for {permission.origin().toString()}")
            permission.grant()
        except Exception as e:
            print(f"[IGRIS App] Error granting modern permission: {e}")

    def handle_feature_permission(self, security_origin, feature):
        try:
            print(f"[IGRIS App] Auto-granting feature permission {feature} for {security_origin.toString()}")
            self.setFeaturePermission(
                security_origin,
                feature,
                QWebEnginePage.PermissionPolicy.PermissionGrantedByUser
            )
        except Exception as e:
            print(f"[IGRIS App] Error granting feature permission: {e}")

    def javaScriptConsoleMessage(self, level, message, lineNumber, sourceID):
        # Forward frontend console messages to terminal for seamless debugging
        level_name = getattr(level, 'name', str(level))
        print(f"[Frontend JS {level_name}] {message} ({sourceID}:{lineNumber})")

class IgrisMainWindow(QMainWindow):
    def __init__(self, target_url="http://localhost:3000", node_proc=None):
        super().__init__()
        self.target_url = target_url
        self.node_proc = node_proc
        self.retry_count = 0
        self.has_loaded = False
        self.setWindowTitle("IGRIS — Intelligent General Response & Integrated Support")
        self.resize(1300, 850)
        self.setMinimumSize(1080, 700)

        # Apply dark background
        self.setStyleSheet("background-color: #030712;")

        # Enable modern WebEngine profile settings
        profile = QWebEngineProfile.defaultProfile()

        # Prevent Chromium Mojo SpeechRecognizer IPC termination in QtWebEngine
        disable_mojo_speech = QWebEngineScript()
        disable_mojo_speech.setName("DisableMojoSpeech")
        disable_mojo_speech.setSourceCode("""
            try {
                delete window.SpeechRecognition;
                delete window.webkitSpeechRecognition;
                window.SpeechRecognition = undefined;
                window.webkitSpeechRecognition = undefined;
            } catch(e) {}
        """)
        disable_mojo_speech.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentCreation)
        disable_mojo_speech.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
        disable_mojo_speech.setRunsOnSubFrames(True)
        profile.scripts().insert(disable_mojo_speech)

        settings = profile.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.ScrollAnimatorEnabled, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)
        settings.setAttribute(QWebEngineSettings.WebAttribute.AllowRunningInsecureContent, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)

        # Setup custom page and web view
        self.browser = QWebEngineView(self)
        self.browser.setAttribute(Qt.WidgetAttribute.WA_OpaquePaintEvent, True)
        self.custom_page = IgrisWebPage(profile, self.browser)
        self.custom_page.setBackgroundColor(QColor("#030712"))
        self.browser.setPage(self.custom_page)
        self.browser.loadFinished.connect(self.on_load_finished)

        self.setCentralWidget(self.browser)

        # Setup System Tray
        self.setup_system_tray()

        # Load frontend
        self.load_frontend()

    def load_frontend(self):
        """Navigate webview to local IGRIS server."""
        print(f"[IGRIS App] Connecting to frontend at {self.target_url} (attempt {self.retry_count + 1})...")
        self.browser.load(QUrl(self.target_url))

    def on_load_finished(self, ok):
        if ok:
            print(f"[IGRIS App] Successfully connected to {self.target_url}")
            self.retry_count = 0
            self.has_loaded = True
        elif not getattr(self, "has_loaded", False):
            self.retry_count += 1
            if self.retry_count <= 5:
                print(f"[IGRIS App] Server initializing. Retrying initial connection in 1.5s ({self.retry_count}/5)...")
                QTimer.singleShot(1500, self.load_frontend)
            else:
                print(f"[IGRIS App] Initial load attempt completed for {self.target_url}.")
        else:
            # Already connected and active. Never reload on subresource or transient errors!
            pass

    def setup_system_tray(self):
        """Configure system tray icon and menu."""
        self.tray = QSystemTrayIcon(self)
        tray_menu = QMenu()

        show_action = QAction("Open IGRIS", self)
        show_action.triggered.connect(self.showNormal)
        tray_menu.addAction(show_action)

        stop_action = QAction("Emergency Stop Directive", self)
        stop_action.triggered.connect(lambda: DesktopEngine.get_instance().execute_directive("STOP_TASK", {}))
        tray_menu.addAction(stop_action)

        tray_menu.addSeparator()

        quit_action = QAction("Exit IGRIS", self)
        quit_action.triggered.connect(self.close)
        tray_menu.addAction(quit_action)

        self.tray.setContextMenu(tray_menu)
        self.tray.show()

    def closeEvent(self, event):
        """Clean shutdown of background servers when window is closed."""
        print("[IGRIS App] Closing application...")
        try:
            DesktopEngine.get_instance().stop()
        except Exception as e:
            print(f"[IGRIS App] Error stopping desktop engine: {e}")

        if self.node_proc:
            try:
                print("[IGRIS App] Terminating backend server...")
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(self.node_proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception as e:
                print(f"[IGRIS App] Error terminating node server: {e}")

        event.accept()

def is_server_ready(url="http://localhost:3000"):
    import urllib.request
    try:
        with urllib.request.urlopen(url, timeout=1) as resp:
            return resp.status in (200, 304)
    except Exception:
        return False

def wait_for_server(url="http://localhost:3000", max_attempts=30, delay=0.5):
    for _ in range(max_attempts):
        if is_server_ready(url):
            return True
        time.sleep(delay)
    return False

def main():
    # Ensure current working directory is the project root
    os.chdir(PROJECT_ROOT)
    print(f"[IGRIS App] Working directory set to: {PROJECT_ROOT}")

    # 1. Initialize PySide6 GUI Application first so display metrics, QScreen, and event hooks are active
    app = QApplication.instance() or QApplication(sys.argv)
    app.setApplicationName("IGRIS")
    app.setOrganizationName("Prajwal")

    # 2. Initialize and start the Python Desktop Automation Engine IPC server
    engine = DesktopEngine.get_instance()
    try:
        engine.start_ipc_server(port=4848)
    except Exception as e:
        print(f"[IGRIS App] DesktopEngine IPC server note: {e}")

    # 3. Check if Node server is already running on port 3000, start if needed
    node_proc = None
    if is_server_ready():
        print("[IGRIS App] Detected active backend on http://localhost:3000.")
    else:
        print("[IGRIS App] Starting local backend server...")
        try:
            import shutil
            node_bin = shutil.which("node")
            if not node_bin:
                candidates = [
                    r"C:\Program Files\nodejs\node.exe",
                    r"C:\Program Files (x86)\nodejs\node.exe",
                    os.path.expandvars(r"%APPDATA%\npm\node.exe"),
                    os.path.expandvars(r"%LOCALAPPDATA%\Programs\node\node.exe")
                ]
                for c in candidates:
                    if os.path.exists(c):
                        node_bin = c
                        break
            if not node_bin:
                node_bin = "node"

            dist_server = os.path.join(PROJECT_ROOT, "dist", "server.cjs")
            log_path = os.path.join(PROJECT_ROOT, "node_server.log")
            log_file = open(log_path, "w", encoding="utf-8")

            creation_flags = 0
            if sys.platform == "win32":
                creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0x08000000)

            if os.path.exists(dist_server):
                print(f"[IGRIS App] Spawning {node_bin} {dist_server} in {PROJECT_ROOT}...")
                node_proc = subprocess.Popen(
                    [node_bin, dist_server],
                    cwd=PROJECT_ROOT,
                    stdout=log_file,
                    stderr=log_file,
                    creationflags=creation_flags
                )
            else:
                print(f"[IGRIS App] dist/server.cjs not found, spawning npm run dev in {PROJECT_ROOT}...")
                npm_bin = shutil.which("npm") or "npm"
                node_proc = subprocess.Popen(
                    [npm_bin, "run", "dev"],
                    cwd=PROJECT_ROOT,
                    shell=True,
                    stdout=log_file,
                    stderr=log_file,
                    creationflags=creation_flags
                )

            print("[IGRIS App] Waiting for backend server to initialize...")
            if wait_for_server():
                print("[IGRIS App] Backend server is ready on http://localhost:3000.")
            else:
                print("[IGRIS App] Warning: Server took longer than expected to start; will retry in webview.")
        except Exception as e:
            print(f"[IGRIS App] Warning: Could not spawn node server automatically: {e}")

    # 4. Launch PySide6 Desktop Shell window
    window = IgrisMainWindow(node_proc=node_proc)
    window.show()

    exit_code = app.exec()

    # Clean up node server if spawned
    if node_proc:
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(node_proc.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
        except Exception:
            pass

    sys.exit(exit_code)

if __name__ == "__main__":
    main()
