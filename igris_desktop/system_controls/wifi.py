"""
IGRIS Wi-Fi System Control Module
Dedicated, isolated Wi-Fi network interface management.
Uses Windows WLAN API, netsh, and Network Adapter interfaces.
Strictly separated from Bluetooth.
"""

import subprocess
import json
import re
from typing import Dict, Any

def _run_powershell(script: str) -> str:
    """Execute a PowerShell command and return stripped output."""
    res = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True,
        text=True,
        timeout=10
    )
    return res.stdout.strip()

def get_wifi_state() -> Dict[str, Any]:
    """
    Read the current Wi-Fi adapter and connection state.
    Returns: {"success": bool, "state": "connected"|"disconnected"|"disabled"|"unavailable", "ssid": str, "message": str}
    """
    ps_script = """
    # 1. Check WinRT Radios API for WiFi radio
    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
        [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
        $wifiRadio = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::WiFi } | Select-Object -First 1
        if ($wifiRadio -and $wifiRadio.State.ToString() -eq 'Off') {
            @{ success = $true; state = "disabled"; ssid = ""; message = "Wi-Fi is currently disabled (Radio Off)." } | ConvertTo-Json -Compress
            exit 0
        }
    } catch {}

    # 2. Check netsh wlan interfaces
    try {
        $netsh = netsh wlan show interfaces 2>&1
        $text = $netsh | Out-String
        if ($text -match "State\\s*:\\s*(connected|disconnected)") {
            $connState = $matches[1].ToLower()
            $ssid = ""
            if ($text -match "SSID\\s*:\\s*([^\\r\\n]+)") {
                $ssid = $matches[1].Trim()
            }
            $msg = if ($connState -eq 'connected') { "Wi-Fi is connected to '$ssid'." } else { "Wi-Fi is enabled but not connected to a network." }
            @{ success = $true; state = $connState; ssid = $ssid; message = $msg } | ConvertTo-Json -Compress
            exit 0
        }
    } catch {}

    # 3. Check Network Adapter
    $adapter = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object { $_.PhysicalMediaType -like "*Native 802.11*" -or $_.Name -like "*Wi-Fi*" -or $_.InterfaceDescription -like "*Wireless*" } | Select-Object -First 1
    if ($adapter) {
        $st = if ($adapter.Status -eq 'Up') { 'connected' } elseif ($adapter.Status -eq 'Disabled') { 'disabled' } else { 'disconnected' }
        @{ success = $true; state = $st; ssid = ""; message = "Wi-Fi adapter '$($adapter.Name)' status: $($adapter.Status)." } | ConvertTo-Json -Compress
        exit 0
    }

    @{ success = $false; state = "unavailable"; ssid = ""; message = "No Wi-Fi wireless network adapter found." } | ConvertTo-Json -Compress
    """
    try:
        output = _run_powershell(ps_script)
        if output:
            data = json.loads(output)
            return data
    except Exception as e:
        return {"success": False, "state": "unavailable", "ssid": "", "message": f"Error querying Wi-Fi: {e}"}

    return {"success": False, "state": "unavailable", "ssid": "", "message": "Wi-Fi adapter not detected."}

def set_wifi_state(enable: bool) -> Dict[str, Any]:
    """
    Turn Wi-Fi ON or OFF.
    Verifies state change after operation.
    """
    desired_str = "On" if enable else "Off"
    ps_script = f"""
    # 1. Try WinRT Radios API for WiFi radio
    try {{
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
        [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
        $wifiRadio = $radios | Where-Object {{ $_.Kind -eq [Windows.Devices.Radios.RadioKind]::WiFi }} | Select-Object -First 1
        if ($wifiRadio) {{
            $target = [Windows.Devices.Radios.RadioState]::{desired_str}
            $wifiRadio.SetStateAsync($target).GetAwaiter().GetResult() | Out-Null
            Start-Sleep -Milliseconds 600
            $newState = $wifiRadio.State.ToString().ToLower()
            $final = if ($newState -eq 'on') {{ 'enabled' }} else {{ 'disabled' }}
            @{{ success = $true; state = $final; message = "Wi-Fi radio successfully set to $desired_str." }} | ConvertTo-Json -Compress
            exit 0
        }}
    }} catch {{}}

    # 2. Try netsh interface enable/disable
    try {{
        $adapter = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {{ $_.PhysicalMediaType -like "*Native 802.11*" -or $_.Name -like "*Wi-Fi*" -or $_.InterfaceDescription -like "*Wireless*" }} | Select-Object -First 1
        if ($adapter) {{
            $adminState = if ('{desired_str}' -eq 'On') {{ 'ENABLED' }} else {{ 'DISABLED' }}
            netsh interface set interface name="$($adapter.Name)" admin=$adminState | Out-Null
            Start-Sleep -Milliseconds 600
            @{{ success = $true; state = ('{desired_str}'.ToLower()); message = "Wi-Fi adapter '$($adapter.Name)' admin state set to $adminState." }} | ConvertTo-Json -Compress
            exit 0
        }}
    }} catch {{}}

    @{{ success = $false; state = "error"; message = "Unable to toggle Wi-Fi adapter." }} | ConvertTo-Json -Compress
    """
    try:
        output = _run_powershell(ps_script)
        if output:
            data = json.loads(output)
            return data
    except Exception as e:
        return {"success": False, "state": "error", "message": f"Failed to set Wi-Fi state: {e}"}

    return {"success": False, "state": "error", "message": "Failed to toggle Wi-Fi."}
