# IGRIS 2.0 — Intelligent General Response & Integrated Support
### Full Voice-Controlled Windows Desktop AI Agent & Automation Companion

IGRIS is an advanced, voice-controlled Windows desktop AI assistant. Powered by Gemini Live (`gemini-3.1-flash-live-preview`), React, PySide6 QtWebEngine, and a dedicated Python Desktop Automation Engine, IGRIS understands natural-language spoken directives and executes operations directly on your Windows PC.

---

## 🌟 Key Capabilities & Upgrades in IGRIS 2.0

### 1. Contextual Desktop Navigation
- **Conversational Memory**: IGRIS retains awareness of active windows, current folders, and visible items across consecutive voice directives.
- **Nested Folder Traversal**: Saying *"Open Downloads"*, followed by *"Open the NEON ESCAPE folder"* or *"Open the second folder"*, resolves contextually against the active directory view rather than starting an unrelated search.
- **Ordinal & Relative Resolution**: Distinguishes between files and folders, resolving directives like *"open the first folder"*, *"open the latest PDF"*, or *"go back"*.

### 2. Isolated Windows System Controls
- **Zero Cross-Contamination**: Dedicated `bluetooth.py` and `wifi.py` modules guarantee that Bluetooth requests never interact with Wi-Fi adapters and vice versa.
- **State Verification**: Every hardware toggle observes the initial state, executes via Windows Runtime Radios API / netsh / service interfaces, and verifies the final state before reporting back.

### 3. Universal Web Interaction & Browser Intelligence Engine
- **Cross-Website Element Resolution**: Understands and interacts with almost any website dynamically using browser DOM inspection and Windows UI Automation accessibility trees.
- **Zero Duplicate Tabs on Switching**: Directly locates and activates existing `TabItem` controls by title or keyword. Never creates duplicate tabs when asked to switch!
- **Dynamic Element Discovery**: Identifies headings, search boxes, textareas, buttons, links, video cards, and pagination without relying on site-specific hardcoded selectors.
- **Natural Language & Ordinal Selection**: Understands *"click the first link"*, *"open the second result"*, *"click the login button"*, *"open that card"*, and *"choose the third video"*.
- **Universal Search & Media Control**: Detects search fields dynamically across web search, site search, and YouTube; controls video playback (play, pause, mute, adjust volume, and play selected videos).
- **Universal Scrolling**: Supports scrolling up/down, slowly or quickly, to the top, to the bottom, or by full page.

### 4. Native Windows Desktop Application Shell
- **PySide6 + QtWebEngine**: Runs as a proper Windows desktop application with window controls, custom system tray integration, and auto-granted microphone permissions for Gemini Live.
- **Dual Engine Architecture**: Combines an asynchronous Python IPC Engine (port `4848`) with a high-throughput Node.js / Express voice bridge (`localhost:3000`).
- **PyInstaller Executable**: Packaged into a standalone Windows executable (`dist_app/IGRIS/IGRIS.exe`).

### 4. Interactive PC Control Panel
- **Real-Time Visualizer**: Live circular visualization with particle animations and sound wave telemetry.
- **Execution Log**: Step-by-step progress tracking displaying `OBSERVE` -> `VALIDATE` -> `EXECUTE` -> `VERIFY` states.
- **Human-in-the-Loop Safeguards**: High-risk operations (e.g., folder creation, file deletions) prompt for Monarch authorization before proceeding.
- **Instant Halt Directive**: Saying *"IGRIS, stop"* or clicking the Emergency Stop immediately halts active automation pipelines.

---

## 🏗️ System Architecture

```
                          ┌───────────────────────────┐
                          │   Monarch (Voice Input)   │
                          └─────────────┬─────────────┘
                                        │ PCM16 16kHz Audio
                                        ▼
                          ┌───────────────────────────┐
                          │   PySide6 Desktop Shell   │
                          │   (QtWebEngine Webview)   │
                          └─────────────┬─────────────┘
                                        │ WebSocket (Live Session)
                                        ▼
┌───────────────────────────────┐               ┌────────────────────────────────┐
│   Node.js / Express Bridge    │◄─── IPC ─────►│   Python Desktop Engine        │
│   (Port 3000)                 │    (Port 4848)│   - DesktopContextManager      │
│   - Gemini Live Integration   │               │   - ActionValidator Allowlist  │
│   - Audio streaming (Fenrir)  │               │   - Bluetooth / Wi-Fi Modules  │
│   - DesktopControlPanel State │               │   - UIAutomation & Win32 APIs  │
└───────────────┬───────────────┘               └────────────────┬───────────────┘
                │                                                │
                └───────────────────────┬────────────────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │    Windows 10/11 Subsystem    │
                        │    (Win32, WinRT, Shell32)    │
                        └───────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 or Windows 11
- Node.js (v18+) and npm
- Python (v3.10+)
- Gemini API Key from Google AI Studio

### 1. Installation

```powershell
# Clone or navigate to the repository
cd d:\Igris\igris-voice-assistant

# Install Node.js dependencies
npm install

# Install required Python packages
python -m pip install PySide6 psutil pyinstaller
```

### 2. Configuration

Create or update `.env` in the root directory:

```env
GEMINI_API_KEY="your-gemini-api-key-here"
PORT=3000
```

### 3. Launching IGRIS

#### Option A: Native Desktop App (Recommended)
Launches the PySide6 desktop window embedding the React assistant and starting the Python automation engine:

```powershell
python igris_desktop/app.py
```

#### Option B: Web / Development Server
Runs the web development server with hot-reloading:

```powershell
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 📦 Building Standalone Executable

To compile the entire application into a standalone Windows executable:

```powershell
# 1. Build production React assets and server bundle
npm run build

# 2. Package standalone Windows application using PyInstaller
python igris_desktop/package_app.py
```

The resulting executable will be available at:
```
dist_app/IGRIS/IGRIS.exe
```

---

## 🧪 Testing

Both TypeScript and Python test suites are provided to ensure complete system stability:

### Python Desktop Engine Test Suite
Tests contextual folder navigation, strict Bluetooth/Wi-Fi isolation, action validation, and system controls:
```powershell
python -m unittest tests/test_python_engine.py
```

### TypeScript Desktop Engine Test Suite
Tests the native bridge, multi-step plan execution, authorization prompt lifecycle, and halt protocols:
```powershell
npx tsx tests/test_desktop_engine.ts
```

---

## 🗣️ Voice Commands Reference

| Category | Example Directive | Action Taken |
|---|---|---|
| **App Control** | *"IGRIS, open Chrome"* | Launches or switches to Google Chrome |
| | *"Bring Visual Studio Code to front"* | Restores and brings VS Code into focus |
| | *"Minimize this window"* | Minimizes active foreground window |
| **Contextual Folders** | *"Open Downloads"* | Opens Downloads folder in File Explorer |
| | *"Open the NEON ESCAPE folder"* | Opens subfolder inside Downloads context |
| | *"Open the second folder"* | Resolves ordinal and opens the 2nd folder |
| **System Settings** | *"Turn on Bluetooth"* | Enables Bluetooth radio (Wi-Fi unaffected) |
| | *"Is Wi-Fi connected?"* | Reports active Wi-Fi SSID and signal state |
| | *"Volume up"* / *"Mute audio"* | Adjusts system audio levels |
| | *"Lock my PC"* | Safely locks Windows workstation |
| **Browsing** | *"Search for Blender tutorials"* | Searches Google and provides summary |
| | *"Open the first result"* | Clicks the top organic search result |
| | *"Scroll down"* | Smooth scrolls the active window |
| **Safety & Halt** | *"IGRIS, stop"* | Halts any active automation immediately |

---

## 🛡️ Security & Privacy Guardrails
- **Zero Arbitrary Execution**: Direct shell string execution is prohibited. All operations pass through strict parameter validation.
- **Sensitive Action Authorization**: Operations altering filesystem data (creating folders, deleting files) trigger an interactive prompt for user approval.
- **Local IPC Isolation**: The Python IPC server only binds to `127.0.0.1` and does not accept external network connections.
