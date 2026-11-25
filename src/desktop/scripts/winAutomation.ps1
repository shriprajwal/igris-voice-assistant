# IGRIS Desktop Automation PowerShell Engine
# Direct native Windows integration for mouse, keyboard, windows, file explorer, and UI automation.

param (
    [Parameter(Mandatory=$false)]
    [string]$Command,

    [Parameter(Mandatory=$false)]
    [string]$ArgsJson
)

# Parse parameters if passed as JSON string
$params = @{}
if ($ArgsJson) {
    try {
        $params = $ArgsJson | ConvertFrom-Json
    } catch {
        # ignore parse error if empty
    }
}

# Compile Win32 P/Invoke types if not already loaded
if (-not ([System.Management.Automation.PSTypeName]'Win32DesktopAPI').Type) {
    $csharpCode = @'
using System;
using System.Runtime.InteropServices;
using System.Text;

public class Win32DesktopAPI {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetCursorPos(int X, int Y);

    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern void LockWorkStation();

    // Mouse constants
    public const uint MOUSEEVENTF_MOVE = 0x0001;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;
    public const uint MOUSEEVENTF_MIDDLEDOWN = 0x0020;
    public const uint MOUSEEVENTF_MIDDLEUP = 0x0040;
    public const uint MOUSEEVENTF_WHEEL = 0x0800;

    // Window constants
    public const int SW_HIDE = 0;
    public const int SW_SHOWNORMAL = 1;
    public const int SW_SHOWMINIMIZED = 2;
    public const int SW_MAXIMIZE = 3;
    public const int SW_RESTORE = 9;
    public const uint WM_CLOSE = 0x0010;

    // Audio virtual key constants
    public const byte VK_VOLUME_MUTE = 0xAD;
    public const byte VK_VOLUME_DOWN = 0xAE;
    public const byte VK_VOLUME_UP = 0xAF;

    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
}
'@
    try {
        Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies "System.Windows.Forms", "System.Drawing" -ErrorAction SilentlyContinue
    } catch {}
}

# Ensure Windows.Forms and UIAutomation assemblies are available
try { Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue } catch {}
try { Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue } catch {}
try { Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue } catch {}
try { Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue } catch {}

function Output-Result {
    param (
        [bool]$Success,
        [string]$Message,
        $Data = $null,
        [string]$Error = ""
    )
    $obj = [ordered]@{
        success = $Success
        message = $Message
        data    = $Data
        error   = $Error
    }
    $obj | ConvertTo-Json -Depth 6 -Compress
    exit 0
}

# Core Command Handlers
switch ($Command) {

    "ping" {
        Output-Result -Success $true -Message "IGRIS Desktop Automation Engine online." -Data @{ os = [System.Environment]::OSVersion.VersionString; platform = "Windows" }
    }

    "get_active_window" {
        try {
            $handle = [Win32DesktopAPI]::GetForegroundWindow()
            if ($handle -eq [IntPtr]::Zero) {
                Output-Result -Success $true -Message "No active window detected" -Data @{ handle = 0; title = ""; processName = ""; pid = 0 }
            }
            $sb = New-Object System.Text.StringBuilder 512
            [Win32DesktopAPI]::GetWindowText($handle, $sb, 512) | Out-Null
            $pidVal = 0
            [Win32DesktopAPI]::GetWindowThreadProcessId($handle, [ref]$pidVal) | Out-Null
            $proc = try { Get-Process -Id $pidVal -ErrorAction SilentlyContinue } catch { $null }
            $procName = if ($proc) { $proc.ProcessName } else { "Unknown" }

            Output-Result -Success $true -Message "Active window retrieved" -Data @{
                handle = $handle.ToInt64()
                title = $sb.ToString()
                processName = $procName
                pid = $pidVal
            }
        } catch {
            Output-Result -Success $false -Message "Failed to get active window" -Error $_.Exception.Message
        }
    }

    "list_running_apps" {
        try {
            $procs = Get-Process | Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle.Trim().Length -gt 0 } | Select-Object -Property Id, ProcessName, MainWindowTitle, MainWindowHandle
            $list = @()
            foreach ($p in $procs) {
                $list += @{
                    id = $p.Id
                    processName = $p.ProcessName
                    title = $p.MainWindowTitle
                    handle = $p.MainWindowHandle.ToInt64()
                }
            }
            Output-Result -Success $true -Message "Running apps listed" -Data $list
        } catch {
            Output-Result -Success $false -Message "Failed to list running apps" -Error $_.Exception.Message
        }
    }

    "launch_app" {
        $appName = ($params.appName | Out-String).Trim()
        $args = if ($params.args) { $params.args } else { "" }
        if (-not $appName) {
            Output-Result -Success $false -Message "App name required" -Error "Missing appName parameter"
        }

        # Known app alias dictionary
        $knownApps = @{
            "chrome" = "chrome.exe"
            "google chrome" = "chrome.exe"
            "edge" = "msedge.exe"
            "microsoft edge" = "msedge.exe"
            "vscode" = "code"
            "vs code" = "code"
            "visual studio code" = "code"
            "notepad" = "notepad.exe"
            "calculator" = "calc.exe"
            "calc" = "calc.exe"
            "file explorer" = "explorer.exe"
            "explorer" = "explorer.exe"
            "terminal" = "wt.exe"
            "powershell" = "powershell.exe"
            "cmd" = "cmd.exe"
            "task manager" = "taskmgr.exe"
            "settings" = "ms-settings:"
        }

        $appKey = $appName.ToLower().Trim()
        $target = if ($knownApps.ContainsKey($appKey)) { $knownApps[$appKey] } else { $appName }

        try {
            if ($target.StartsWith("ms-settings:")) {
                Start-Process $target
            } elseif ($args) {
                Start-Process $target -ArgumentList $args
            } else {
                Start-Process $target
            }
            Start-Sleep -Milliseconds 400
            Output-Result -Success $true -Message "Launched application '$appName'." -Data @{ target = $target; appName = $appName }
        } catch {
            # Try searching start menu shortcuts
            try {
                $lnk = Get-ChildItem -Path "$env:ProgramData\Microsoft\Windows\Start Menu\Programs", "$env:AppData\Microsoft\Windows\Start Menu\Programs" -Recurse -Filter "*$appName*.lnk" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($lnk) {
                    Start-Process $lnk.FullName
                    Start-Sleep -Milliseconds 400
                    Output-Result -Success $true -Message "Launched application from shortcut: $($lnk.Name)" -Data @{ target = $lnk.FullName; appName = $appName }
                } else {
                    Output-Result -Success $false -Message "Could not find application '$appName'" -Error "Application executable not found"
                }
            } catch {
                Output-Result -Success $false -Message "Failed to launch '$appName'" -Error $_.Exception.Message
            }
        }
    }

    "focus_app" {
        $query = ($params.appName | Out-String).Trim()
        if (-not $query) {
            Output-Result -Success $false -Message "App name or title required" -Error "Missing query parameter"
        }

        try {
            $matched = Get-Process | Where-Object { 
                $_.MainWindowHandle -ne [IntPtr]::Zero -and (
                    $_.ProcessName -like "*$query*" -or 
                    $_.MainWindowTitle -like "*$query*"
                )
            } | Select-Object -First 1

            if ($matched) {
                $handle = $matched.MainWindowHandle
                [Win32DesktopAPI]::ShowWindowAsync($handle, [Win32DesktopAPI]::SW_RESTORE) | Out-Null
                [Win32DesktopAPI]::SetForegroundWindow($handle) | Out-Null
                Output-Result -Success $true -Message "Focused window for '$query'." -Data @{ processName = $matched.ProcessName; title = $matched.MainWindowTitle }
            } else {
                Output-Result -Success $false -Message "No running window found matching '$query'." -Error "Window not found"
            }
        } catch {
            Output-Result -Success $false -Message "Failed to focus app '$query'" -Error $_.Exception.Message
        }
    }

    "minimize_window" {
        $query = ($params.appName | Out-String).Trim()
        try {
            $handle = [IntPtr]::Zero
            if ($query) {
                $p = Get-Process | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and ($_.ProcessName -like "*$query*" -or $_.MainWindowTitle -like "*$query*") } | Select-Object -First 1
                if ($p) { $handle = $p.MainWindowHandle }
            } else {
                $handle = [Win32DesktopAPI]::GetForegroundWindow()
            }

            if ($handle -ne [IntPtr]::Zero) {
                [Win32DesktopAPI]::ShowWindow($handle, [Win32DesktopAPI]::SW_SHOWMINIMIZED) | Out-Null
                Output-Result -Success $true -Message "Minimized window." -Data @{ handle = $handle.ToInt64() }
            } else {
                Output-Result -Success $false -Message "No active window found to minimize."
            }
        } catch {
            Output-Result -Success $false -Message "Failed to minimize window" -Error $_.Exception.Message
        }
    }

    "maximize_window" {
        $query = ($params.appName | Out-String).Trim()
        try {
            $handle = [IntPtr]::Zero
            if ($query) {
                $p = Get-Process | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and ($_.ProcessName -like "*$query*" -or $_.MainWindowTitle -like "*$query*") } | Select-Object -First 1
                if ($p) { $handle = $p.MainWindowHandle }
            } else {
                $handle = [Win32DesktopAPI]::GetForegroundWindow()
            }

            if ($handle -ne [IntPtr]::Zero) {
                [Win32DesktopAPI]::ShowWindow($handle, [Win32DesktopAPI]::SW_MAXIMIZE) | Out-Null
                Output-Result -Success $true -Message "Maximized window." -Data @{ handle = $handle.ToInt64() }
            } else {
                Output-Result -Success $false -Message "No active window found to maximize."
            }
        } catch {
            Output-Result -Success $false -Message "Failed to maximize window" -Error $_.Exception.Message
        }
    }

    "close_window" {
        $query = ($params.appName | Out-String).Trim()
        try {
            $handle = [IntPtr]::Zero
            if ($query) {
                $p = Get-Process | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero -and ($_.ProcessName -like "*$query*" -or $_.MainWindowTitle -like "*$query*") } | Select-Object -First 1
                if ($p) { $handle = $p.MainWindowHandle }
            } else {
                $handle = [Win32DesktopAPI]::GetForegroundWindow()
            }

            if ($handle -ne [IntPtr]::Zero) {
                [Win32DesktopAPI]::SendMessage($handle, [Win32DesktopAPI]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
                Output-Result -Success $true -Message "Closed window normally." -Data @{ handle = $handle.ToInt64() }
            } else {
                Output-Result -Success $false -Message "No window found to close."
            }
        } catch {
            Output-Result -Success $false -Message "Failed to close window" -Error $_.Exception.Message
        }
    }

    "mouse_move" {
        $x = [int]$params.x
        $y = [int]$params.y
        try {
            # Use SendInput with ABSOLUTE coordinates for DPI-aware movement
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class SendInputHelper {
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int m);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT {
        public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Explicit)] public struct INPUT {
        [FieldOffset(0)] public uint type;
        [FieldOffset(4)] public MOUSEINPUT mi;
    }
    public const uint MOUSEEVENTF_MOVE = 0x0001;
    public const uint MOUSEEVENTF_ABSOLUTE = 0x8000;
    public static void MoveTo(int x, int y) {
        int sw = GetSystemMetrics(0); int sh = GetSystemMetrics(1);
        int ax = (int)((x * 65535L) / sw); int ay = (int)((y * 65535L) / sh);
        INPUT[] inp = new INPUT[1];
        inp[0].type = 0;
        inp[0].mi.dx = ax; inp[0].mi.dy = ay;
        inp[0].mi.dwFlags = MOUSEEVENTF_MOVE | MOUSEEVENTF_ABSOLUTE;
        SendInput(1, inp, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
    }
    public static POINT GetPos() { POINT p; GetCursorPos(out p); return p; }
}
'@ -ErrorAction SilentlyContinue
            [SendInputHelper]::MoveTo($x, $y)
            Start-Sleep -Milliseconds 30
            $pos = [SendInputHelper]::GetPos()
            Output-Result -Success $true -Message "Moved mouse to ($x, $y). Cursor at ($($pos.X), $($pos.Y))." -Data @{ x = $x; y = $y; cursorX = $pos.X; cursorY = $pos.Y }
        } catch {
            # Fallback to SetCursorPos
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
            Output-Result -Success $true -Message "Moved mouse to ($x, $y) via fallback." -Data @{ x = $x; y = $y }
        }
    }

    "mouse_click" {
        $button = if ($params.button) { $params.button.ToLower() } else { "left" }
        $x = if ($params.x -ne $null) { [int]$params.x } else { [System.Windows.Forms.Cursor]::Position.X }
        $y = if ($params.y -ne $null) { [int]$params.y } else { [System.Windows.Forms.Cursor]::Position.Y }

        try {
            Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class ClickHelper {
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int m);
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT {
        public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo;
    }
    [StructLayout(LayoutKind.Explicit)] public struct INPUT {
        [FieldOffset(0)] public uint type;
        [FieldOffset(4)] public MOUSEINPUT mi;
    }
    public const uint MOVE_ABS = 0x8001;
    public const uint LEFTDOWN  = 0x0002; public const uint LEFTUP  = 0x0004;
    public const uint RIGHTDOWN = 0x0008; public const uint RIGHTUP = 0x0010;
    public const uint MIDDLEDOWN= 0x0020; public const uint MIDDLEUP= 0x0040;
    public static void Send(int x, int y, uint flags) {
        int sw = GetSystemMetrics(0); int sh = GetSystemMetrics(1);
        int ax = (int)((x * 65535L) / sw); int ay = (int)((y * 65535L) / sh);
        INPUT[] inp = new INPUT[1];
        inp[0].type = 0;
        inp[0].mi.dx = ax; inp[0].mi.dy = ay;
        inp[0].mi.dwFlags = flags;
        SendInput(1, inp, System.Runtime.InteropServices.Marshal.SizeOf(typeof(INPUT)));
    }
    public static void SendClick(int x, int y, string btn) {
        Send(x, y, MOVE_ABS);
        System.Threading.Thread.Sleep(40);
        if (btn == "right") { Send(x,y,RIGHTDOWN); System.Threading.Thread.Sleep(30); Send(x,y,RIGHTUP); }
        else if (btn == "middle") { Send(x,y,MIDDLEDOWN); System.Threading.Thread.Sleep(30); Send(x,y,MIDDLEUP); }
        else {
            Send(x,y,LEFTDOWN); System.Threading.Thread.Sleep(30); Send(x,y,LEFTUP);
        }
    }
}
'@ -ErrorAction SilentlyContinue

            if ($button -eq "double") {
                [ClickHelper]::SendClick($x, $y, "left")
                Start-Sleep -Milliseconds 80
                [ClickHelper]::SendClick($x, $y, "left")
            } else {
                [ClickHelper]::SendClick($x, $y, $button)
            }
            Start-Sleep -Milliseconds 50
            Output-Result -Success $true -Message "Mouse $button clicked at ($x, $y) via SendInput." -Data @{ button = $button; x = $x; y = $y }
        } catch {
            [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
            [Win32DesktopAPI]::SetCursorPos($x, $y) | Out-Null
            Start-Sleep -Milliseconds 30
            if ($button -eq "right") {
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 30
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_RIGHTUP, 0, 0, 0, 0)
            } elseif ($button -eq "double") {
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 30
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 80
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 30
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            } else {
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_LEFTDOWN, 0, 0, 0, 0)
                Start-Sleep -Milliseconds 30
                [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_LEFTUP, 0, 0, 0, 0)
            }
            Output-Result -Success $true -Message "Mouse $button clicked at ($x, $y) via fallback." -Data @{ button = $button; x = $x; y = $y }
        }
    }

    "mouse_scroll" {
        $direction = if ($params.direction) { $params.direction.ToLower() } else { "down" }
        $amount = if ($params.amount) { [int]$params.amount } else { 300 }
        
        # In Win32 MOUSEEVENTF_WHEEL, negative is down, positive is up
        $delta = if ($direction -eq "up") { [Math]::Abs($amount) } else { -[Math]::Abs($amount) }

        try {
            [Win32DesktopAPI]::mouse_event([Win32DesktopAPI]::MOUSEEVENTF_WHEEL, 0, 0, [uint32]$delta, 0)
            Output-Result -Success $true -Message "Scrolled $direction by $amount units." -Data @{ direction = $direction; amount = $amount }
        } catch {
            Output-Result -Success $false -Message "Failed to scroll" -Error $_.Exception.Message
        }
    }

    "type_text" {
        $text = [string]$params.text
        $pressEnter = [bool]$params.pressEnter
        if (-not $text) {
            Output-Result -Success $false -Message "No text provided to type." -Error "Missing text parameter"
        }

        try {
            $fgWnd = [Win32DesktopAPI]::GetForegroundWindow()
            if ($fgWnd -ne [IntPtr]::Zero) {
                [Win32DesktopAPI]::SetForegroundWindow($fgWnd) | Out-Null
                Start-Sleep -Milliseconds 40
            }
            # Copy text to clipboard and paste with Ctrl+V for flawless unicode support
            [System.Windows.Forms.Clipboard]::SetText($text)
            Start-Sleep -Milliseconds 50
            [System.Windows.Forms.SendKeys]::SendWait("^v")
            Start-Sleep -Milliseconds 50

            if ($pressEnter) {
                [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
            }

            Output-Result -Success $true -Message "Typed text: '$text'." -Data @{ text = $text; enterPressed = $pressEnter }
        } catch {
            # Fallback to SendKeys directly
            try {
                $escaped = [System.Text.RegularExpressions.Regex]::Replace($text, "([+^%~{}()])", "{$1}")
                [System.Windows.Forms.SendKeys]::SendWait($escaped)
                if ($pressEnter) { [System.Windows.Forms.SendKeys]::SendWait("{ENTER}") }
                Output-Result -Success $true -Message "Typed text via SendKeys fallback: '$text'." -Data @{ text = $text }
            } catch {
                Output-Result -Success $false -Message "Failed to type text." -Error $_.Exception.Message
            }
        }
    }

    "press_key" {
        $key = [string]$params.key
        try {
            $keyMap = @{
                "enter" = "{ENTER}"
                "escape" = "{ESC}"
                "esc" = "{ESC}"
                "tab" = "{TAB}"
                "backspace" = "{BACKSPACE}"
                "delete" = "{DELETE}"
                "up" = "{UP}"
                "down" = "{DOWN}"
                "left" = "{LEFT}"
                "right" = "{RIGHT}"
                "space" = " "
                "home" = "{HOME}"
                "end" = "{END}"
            }
            $targetKey = if ($keyMap.ContainsKey($key.ToLower())) { $keyMap[$key.ToLower()] } else { "{$key}" }
            [System.Windows.Forms.SendKeys]::SendWait($targetKey)
            Output-Result -Success $true -Message "Pressed key: $key." -Data @{ key = $key }
        } catch {
            Output-Result -Success $false -Message "Failed to press key '$key'." -Error $_.Exception.Message
        }
    }

    "key_combo" {
        $combo = ([string]$params.combo).ToLower().Trim()
        try {
            # Map common shortcut representations to SendKeys syntax
            $code = switch ($combo) {
                "ctrl+t" { "^t" }
                "ctrl+w" { "^w" }
                "ctrl+l" { "^l" }
                "ctrl+c" { "^c" }
                "ctrl+v" { "^v" }
                "ctrl+a" { "^a" }
                "ctrl+f" { "^f" }
                "ctrl+r" { "^r" }
                "ctrl+shift+t" { "^+t" }
                "alt+tab" { "%{TAB}" }
                "alt+f4" { "%{F4}" }
                default {
                    # Generic combo parser
                    $res = $combo
                    $res = $res -replace "ctrl\+", "^"
                    $res = $res -replace "shift\+", "+"
                    $res = $res -replace "alt\+", "%"
                    $res
                }
            }
            [System.Windows.Forms.SendKeys]::SendWait($code)
            Output-Result -Success $true -Message "Sent keyboard shortcut '$combo'." -Data @{ combo = $combo; code = $code }
        } catch {
            Output-Result -Success $false -Message "Failed to send shortcut '$combo'." -Error $_.Exception.Message
        }
    }

    "find_ui_element" {
        $namePattern = [string]$params.namePattern
        $controlType = [string]$params.controlType

        try {
            # Find focused window root
            $handle = [Win32DesktopAPI]::GetForegroundWindow()
            $rootElem = if ($handle -ne [IntPtr]::Zero) {
                [System.Windows.Automation.AutomationElement]::FromHandle($handle)
            } else {
                [System.Windows.Automation.AutomationElement]::RootElement
            }

            if (-not $rootElem) {
                Output-Result -Success $false -Message "Could not acquire root automation element."
            }

            # Search children in the focused window
            $condition = [System.Windows.Automation.Condition]::TrueCondition
            $elements = $rootElem.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
            $matches = @()

            foreach ($elem in $elements) {
                $curName = $elem.Current.Name
                $curType = $elem.Current.ControlType.ProgrammaticName
                $matched = $true

                if ($namePattern -and (-not ($curName -like "*$namePattern*"))) {
                    $matched = $false
                }
                if ($controlType -and (-not ($curType -like "*$controlType*"))) {
                    $matched = $false
                }

                if ($matched -and $curName) {
                    $rect = $elem.Current.BoundingRectangle
                    $matches += @{
                        name = $curName
                        controlType = $curType
                        className = $elem.Current.ClassName
                        bounds = @{
                            x = [int]$rect.X
                            y = [int]$rect.Y
                            width = [int]$rect.Width
                            height = [int]$rect.Height
                            centerX = [int]($rect.X + ($rect.Width / 2))
                            centerY = [int]($rect.Y + ($rect.Height / 2))
                        }
                    }
                    if ($matches.Count -ge 10) { break }
                }
            }

            Output-Result -Success $true -Message "Found $($matches.Count) matching UI elements." -Data $matches
        } catch {
            Output-Result -Success $false -Message "UI element search failed" -Error $_.Exception.Message
        }
    }

    "open_folder" {
        $folder = ([string]$params.folder).Trim()
        $path = switch ($folder.ToLower()) {
            "downloads" { [System.IO.Path]::Combine($env:USERPROFILE, "Downloads") }
            "documents" { [System.IO.Path]::Combine($env:USERPROFILE, "Documents") }
            "desktop" { [System.IO.Path]::Combine($env:USERPROFILE, "Desktop") }
            "pictures" { [System.IO.Path]::Combine($env:USERPROFILE, "Pictures") }
            "music" { [System.IO.Path]::Combine($env:USERPROFILE, "Music") }
            "videos" { [System.IO.Path]::Combine($env:USERPROFILE, "Videos") }
            "project" { (Get-Location).Path }
            "igris" { (Get-Location).Path }
            default { $folder }
        }

        try {
            if (-not (Test-Path $path)) {
                Output-Result -Success $false -Message "Folder '$path' does not exist." -Error "Path not found"
            }
            Start-Process "explorer.exe" -ArgumentList "`"$path`""
            Output-Result -Success $true -Message "Opened folder '$path' in File Explorer." -Data @{ path = $path }
        } catch {
            Output-Result -Success $false -Message "Failed to open folder '$path'" -Error $_.Exception.Message
        }
    }

    "search_files" {
        $query = [string]$params.query
        $folder = if ($params.folder) { [string]$params.folder } else { $env:USERPROFILE }
        if (-not $query) {
            Output-Result -Success $false -Message "Search query required" -Error "Missing query"
        }

        try {
            $basePath = switch ($folder.ToLower()) {
                "downloads" { [System.IO.Path]::Combine($env:USERPROFILE, "Downloads") }
                "documents" { [System.IO.Path]::Combine($env:USERPROFILE, "Documents") }
                "desktop" { [System.IO.Path]::Combine($env:USERPROFILE, "Desktop") }
                default { $folder }
            }

            if (-not (Test-Path $basePath)) { $basePath = $env:USERPROFILE }

            $results = Get-ChildItem -Path $basePath -Filter "*$query*" -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 15 -Property Name, FullName, Length, LastWriteTime
            $list = @()
            foreach ($f in $results) {
                $list += @{
                    name = $f.Name
                    path = $f.FullName
                    size = $f.Length
                    lastModified = $f.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                }
            }
            Output-Result -Success $true -Message "Found $($list.Count) files matching '$query'." -Data $list
        } catch {
            Output-Result -Success $false -Message "File search failed" -Error $_.Exception.Message
        }
    }

    "open_file" {
        $filePath = [string]$params.filePath
        if (-not $filePath -or -not (Test-Path $filePath)) {
            Output-Result -Success $false -Message "File does not exist: '$filePath'" -Error "Invalid file path"
        }

        try {
            Start-Process $filePath
            Output-Result -Success $true -Message "Opened file '$filePath' with default application." -Data @{ path = $filePath }
        } catch {
            Output-Result -Success $false -Message "Failed to open file '$filePath'" -Error $_.Exception.Message
        }
    }

    "create_folder" {
        $parent = if ($params.parentFolder) { [string]$params.parentFolder } else { [System.IO.Path]::Combine($env:USERPROFILE, "Documents") }
        $name = [string]$params.folderName
        if (-not $name) {
            Output-Result -Success $false -Message "Folder name required" -Error "Missing folderName"
        }

        try {
            $targetPath = [System.IO.Path]::Combine($parent, $name)
            if (Test-Path $targetPath) {
                Output-Result -Success $true -Message "Folder '$name' already exists at '$targetPath'." -Data @{ path = $targetPath }
            }
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
            Output-Result -Success $true -Message "Created folder '$name' at '$targetPath'." -Data @{ path = $targetPath }
        } catch {
            Output-Result -Success $false -Message "Failed to create folder" -Error $_.Exception.Message
        }
    }

    "volume_adjust" {
        $action = if ($params.action) { $params.action.ToLower() } else { "up" }
        $steps = if ($params.steps) { [int]$params.steps } else { 2 }
        try {
            if ($action -eq "up") {
                for ($i = 0; $i -lt $steps; $i++) {
                    [Win32DesktopAPI]::keybd_event([Win32DesktopAPI]::VK_VOLUME_UP, 0, 0, [UIntPtr]::Zero)
                    [Win32DesktopAPI]::keybd_event([Win32DesktopAPI]::VK_VOLUME_UP, 0, [Win32DesktopAPI]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                }
                Output-Result -Success $true -Message "Increased master volume." -Data @{ action = "up"; steps = $steps }
            } elseif ($action -eq "down") {
                for ($i = 0; $i -lt $steps; $i++) {
                    [Win32DesktopAPI]::keybd_event([Win32DesktopAPI]::VK_VOLUME_DOWN, 0, 0, [UIntPtr]::Zero)
                    [Win32DesktopAPI]::keybd_event([Win32DesktopAPI]::VK_VOLUME_DOWN, 0, [Win32DesktopAPI]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                }
                Output-Result -Success $true -Message "Decreased master volume." -Data @{ action = "down"; steps = $steps }
            } elseif ($action -eq "mute") {
                [Win32DesktopAPI]::keybd_event([Win32DesktopAPI]::VK_VOLUME_MUTE, 0, 0, [UIntPtr]::Zero)
                [Win32DesktopAPI]::keybd_event([Win32DesktopAPI]::VK_VOLUME_MUTE, 0, [Win32DesktopAPI]::KEYEVENTF_KEYUP, [UIntPtr]::Zero)
                Output-Result -Success $true -Message "Toggled master volume mute." -Data @{ action = "mute" }
            } else {
                Output-Result -Success $false -Message "Unknown volume action: $action"
            }
        } catch {
            Output-Result -Success $false -Message "Failed to adjust volume" -Error $_.Exception.Message
        }
    }

    "get_system_info" {
        try {
            $os = [System.Environment]::OSVersion.VersionString
            $drives = [System.IO.DriveInfo]::GetDrives() | Where-Object { $_.IsReady } | Select-Object -Property Name, @{Name="FreeGB";Expression={[Math]::Round($_.AvailableFreeSpace / 1GB, 1)}}, @{Name="TotalGB";Expression={[Math]::Round($_.TotalSize / 1GB, 1)}}
            $machine = [System.Environment]::MachineName
            $user = [System.Environment]::UserName

            Output-Result -Success $true -Message "System metrics retrieved." -Data @{
                os = $os
                machineName = $machine
                userName = $user
                drives = $drives
            }
        } catch {
            Output-Result -Success $false -Message "Failed to get system info" -Error $_.Exception.Message
        }
    }

    "lock_pc" {
        try {
            [Win32DesktopAPI]::LockWorkStation()
            Output-Result -Success $true -Message "Workstation locked successfully."
        } catch {
            Output-Result -Success $false -Message "Failed to lock workstation" -Error $_.Exception.Message
        }
    }

    "get_bluetooth_state" {
        try {
            Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
            [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
            $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
            $bt = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::Bluetooth } | Select-Object -First 1
            if ($bt) {
                $st = $bt.State.ToString().ToLower()
                $outState = if ($st -eq 'on') { 'on' } else { 'off' }
                Output-Result -Success $true -Message "Bluetooth is currently $outState." -Data @{ state = $outState; name = $bt.Name }
                break
            }
        } catch {}

        # Fallback to service check
        $svc = Get-Service -Name "bthserv" -ErrorAction SilentlyContinue
        if ($svc) {
            $st = if ($svc.Status -eq 'Running') { 'on' } else { 'off' }
            Output-Result -Success $true -Message "Bluetooth service is $($svc.Status)." -Data @{ state = $st; name = "Bluetooth Support Service" }
        } else {
            Output-Result -Success $false -Message "Bluetooth adapter or service not detected on this system." -Data @{ state = "unavailable" }
        }
    }

    "set_bluetooth_state" {
        $enable = if ($params.enable -eq $true -or $params.enable -eq "true" -or $params.state -eq "on") { $true } else { $false }
        $desiredStr = if ($enable) { "On" } else { "Off" }
        try {
            Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
            [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
            $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
            $bt = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::Bluetooth } | Select-Object -First 1
            if ($bt) {
                $targetState = [Windows.Devices.Radios.RadioState]::$desiredStr
                $status = $bt.SetStateAsync($targetState).GetAwaiter().GetResult()
                Start-Sleep -Milliseconds 500
                $newState = $bt.State.ToString().ToLower()
                Output-Result -Success ($newState -eq $desiredStr.ToLower()) -Message "Bluetooth successfully set to $newState." -Data @{ state = $newState }
                break
            }
        } catch {}

        # Fallback to bthserv service
        try {
            if ($enable) {
                Start-Service -Name "bthserv" -ErrorAction SilentlyContinue
            } else {
                Stop-Service -Name "bthserv" -Force -ErrorAction SilentlyContinue
            }
            Start-Sleep -Milliseconds 400
            $svc = Get-Service -Name "bthserv" -ErrorAction SilentlyContinue
            $st = if ($svc.Status -eq 'Running') { 'on' } else { 'off' }
            Output-Result -Success $true -Message "Bluetooth service is now $st." -Data @{ state = $st }
        } catch {
            Output-Result -Success $false -Message "Failed to set Bluetooth state" -Error $_.Exception.Message
        }
    }

    "get_wifi_state" {
        # Check WinRT Radios
        try {
            Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
            [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
            $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
            $wifiRadio = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::WiFi } | Select-Object -First 1
            if ($wifiRadio -and $wifiRadio.State.ToString() -eq 'Off') {
                Output-Result -Success $true -Message "Wi-Fi is currently disabled (Radio Off)." -Data @{ state = "disabled"; ssid = "" }
                break
            }
        } catch {}

        # Check netsh wlan interfaces
        try {
            $netsh = netsh wlan show interfaces 2>&1 | Out-String
            if ($netsh -match "State\s*:\s*(connected|disconnected)") {
                $connState = $matches[1].ToLower()
                $ssid = ""
                if ($netsh -match "SSID\s*:\s*([^\r\n]+)") {
                    $ssid = $matches[1].Trim()
                }
                $msg = if ($connState -eq 'connected') { "Wi-Fi is connected to '$ssid'." } else { "Wi-Fi is enabled but not connected." }
                Output-Result -Success $true -Message $msg -Data @{ state = $connState; ssid = $ssid }
                break
            }
        } catch {}

        # Check Network Adapter
        $adapter = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.PhysicalMediaType -like "*Native 802.11*" -or $_.Name -like "*Wi-Fi*" -or $_.InterfaceDescription -like "*Wireless*" } | Select-Object -First 1
        if ($adapter) {
            $st = if ($adapter.Status -eq 'Up') { 'connected' } elseif ($adapter.Status -eq 'Disabled') { 'disabled' } else { 'disconnected' }
            Output-Result -Success $true -Message "Wi-Fi adapter '$($adapter.Name)' status: $($adapter.Status)." -Data @{ state = $st; ssid = "" }
        } else {
            Output-Result -Success $false -Message "No Wi-Fi wireless network adapter found." -Data @{ state = "unavailable" }
        }
    }

    "set_wifi_state" {
        $enable = if ($params.enable -eq $true -or $params.enable -eq "true" -or $params.state -eq "on") { $true } else { $false }
        $desiredStr = if ($enable) { "On" } else { "Off" }
        try {
            Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
            [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
            $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
            $wifiRadio = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::WiFi } | Select-Object -First 1
            if ($wifiRadio) {
                $target = [Windows.Devices.Radios.RadioState]::$desiredStr
                $wifiRadio.SetStateAsync($target).GetAwaiter().GetResult() | Out-Null
                Start-Sleep -Milliseconds 600
                $newState = $wifiRadio.State.ToString().ToLower()
                $final = if ($newState -eq 'on') { 'enabled' } else { 'disabled' }
                Output-Result -Success $true -Message "Wi-Fi radio successfully set to $desiredStr." -Data @{ state = $final }
                break
            }
        } catch {}

        try {
            $adapter = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.PhysicalMediaType -like "*Native 802.11*" -or $_.Name -like "*Wi-Fi*" -or $_.InterfaceDescription -like "*Wireless*" } | Select-Object -First 1
            if ($adapter) {
                $adminState = if ($enable) { "ENABLED" } else { "DISABLED" }
                netsh interface set interface name="$($adapter.Name)" admin=$adminState | Out-Null
                Start-Sleep -Milliseconds 600
                Output-Result -Success $true -Message "Wi-Fi adapter '$($adapter.Name)' admin state set to $adminState." -Data @{ state = if ($enable) { 'enabled' } else { 'disabled' } }
                break
            }
        } catch {}

        Output-Result -Success $false -Message "Unable to toggle Wi-Fi adapter." -Error "Adapter not accessible"
    }

    "capture_screen" {
        $outputPath = [string]$params.outputPath
        if (-not $outputPath) {
            $outputPath = [System.IO.Path]::Combine($env:TEMP, "igris_screen_$(Get-Date -Format 'yyyyMMdd_HHmmss').jpg")
        }
        try {
            $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
            $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
            $graphics = [System.Drawing.Graphics]::FromImage($bmp)
            $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
            $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
            $graphics.Dispose()
            $bmp.Dispose()
            Output-Result -Success $true -Message "Desktop screenshot captured." -Data @{ path = $outputPath; width = $bounds.Width; height = $bounds.Height }
        } catch {
            Output-Result -Success $false -Message "Screen capture failed" -Error $_.Exception.Message
        }
    }

    default {
        Output-Result -Success $false -Message "Unknown automation command: $Command" -Error "Invalid command"
    }
}
