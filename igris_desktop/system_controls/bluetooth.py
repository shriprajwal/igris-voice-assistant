"""
IGRIS Bluetooth System Control Module
Dedicated, isolated Bluetooth management using Windows WinRT Radios API and Bluetooth services.
Strictly separated from Wi-Fi and network adapters.
"""

import subprocess
import json
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

def get_bluetooth_state() -> Dict[str, Any]:
    """
    Read the current Bluetooth radio and service state.
    Returns: {"success": bool, "state": "on"|"off"|"unavailable", "message": str, "name": str}
    """
    ps_script = """
    try {
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
        [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
        $bt = $radios | Where-Object { $_.Kind -eq [Windows.Devices.Radios.RadioKind]::Bluetooth } | Select-Object -First 1
        if ($bt) {
            $st = $bt.State.ToString().ToLower()
            $outState = if ($st -eq 'on') { 'on' } else { 'off' }
            @{ success = $true; state = $outState; name = $bt.Name; message = "Bluetooth is currently $outState." } | ConvertTo-Json -Compress
            exit 0
        }
    } catch {}

    # Service fallback check
    $svc = Get-Service -Name "bthserv" -ErrorAction SilentlyContinue
    if ($svc) {
        $st = if ($svc.Status -eq 'Running') { 'on' } else { 'off' }
        @{ success = $true; state = $st; name = "Bluetooth Support Service"; message = "Bluetooth service is $($svc.Status)." } | ConvertTo-Json -Compress
        exit 0
    }

    @{ success = $false; state = "unavailable"; name = ""; message = "Bluetooth adapter or service not detected on this system." } | ConvertTo-Json -Compress
    """
    try:
        output = _run_powershell(ps_script)
        if output:
            data = json.loads(output)
            return data
    except Exception as e:
        return {"success": False, "state": "unavailable", "message": f"Error querying Bluetooth: {e}"}

    return {"success": False, "state": "unavailable", "message": "Bluetooth adapter not found."}

def set_bluetooth_state(enable: bool) -> Dict[str, Any]:
    """
    Turn Bluetooth ON or OFF.
    Verifies state change after operation.
    """
    desired_str = "On" if enable else "Off"
    ps_script = f"""
    try {{
        Add-Type -AssemblyName System.Runtime.WindowsRuntime -ErrorAction SilentlyContinue
        [Windows.Devices.Radios.Radio, Windows.System.Devices, ContentType = WindowsRuntime] | Out-Null
        $radios = [Windows.Devices.Radios.Radio]::GetRadiosAsync().GetAwaiter().GetResult()
        $bt = $radios | Where-Object {{ $_.Kind -eq [Windows.Devices.Radios.RadioKind]::Bluetooth }} | Select-Object -First 1
        if ($bt) {{
            $targetState = [Windows.Devices.Radios.RadioState]::{desired_str}
            $status = $bt.SetStateAsync($targetState).GetAwaiter().GetResult()
            Start-Sleep -Milliseconds 500
            $newState = $bt.State.ToString().ToLower()
            @{{ success = ($newState -eq '{desired_str.lower()}'); state = $newState; message = "Bluetooth successfully set to $newState." }} | ConvertTo-Json -Compress
            exit 0
        }}
    }} catch {{}}

    # Fallback to service management
    try {{
        if ('{desired_str}' -eq 'On') {{
            Start-Service -Name "bthserv" -ErrorAction SilentlyContinue
        }} else {{
            Stop-Service -Name "bthserv" -Force -ErrorAction SilentlyContinue
        }}
        Start-Sleep -Milliseconds 400
        $svc = Get-Service -Name "bthserv" -ErrorAction SilentlyContinue
        $st = if ($svc.Status -eq 'Running') {{ 'on' }} else {{ 'off' }}
        @{{ success = $true; state = $st; message = "Bluetooth service is now $st." }} | ConvertTo-Json -Compress
        exit 0
    }} catch {{
        @{{ success = $false; state = "error"; message = $_.Exception.Message }} | ConvertTo-Json -Compress
    }}
    """
    try:
        output = _run_powershell(ps_script)
        if output:
            data = json.loads(output)
            return data
    except Exception as e:
        return {"success": False, "state": "error", "message": f"Failed to set Bluetooth state: {e}"}

    return {"success": False, "state": "error", "message": "Could not toggle Bluetooth radio."}
