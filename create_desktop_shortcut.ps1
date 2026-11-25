$WScriptShell = New-Object -ComObject WScript.Shell

$ProjectDir = $PSScriptRoot
if (-not $ProjectDir) {
    $ProjectDir = (Get-Location).Path
}

$ExePath = Join-Path -Path $ProjectDir -ChildPath "dist_app\IGRIS\IGRIS.exe"
$PythonW = Join-Path -Path $ProjectDir -ChildPath ".venv\Scripts\pythonw.exe"
$AppScript = Join-Path -Path $ProjectDir -ChildPath "igris_desktop\app.py"

# Find all potential desktop locations (Standard Desktop + OneDrive Desktop)
$DesktopPaths = @(
    [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop),
    (Join-Path $env:USERPROFILE "Desktop"),
    (Join-Path $env:USERPROFILE "OneDrive\Desktop")
) | Select-Object -Unique

foreach ($DPath in $DesktopPaths) {
    if (Test-Path $DPath) {
        $ShortcutPath = Join-Path -Path $DPath -ChildPath "IGRIS AI.lnk"
        $Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
        
        if (Test-Path $ExePath) {
            $Shortcut.TargetPath = $ExePath
            $Shortcut.Arguments = ""
        } else {
            if (-not (Test-Path $PythonW)) {
                $PythonW = "pythonw.exe"
            }
            $Shortcut.TargetPath = $PythonW
            $Shortcut.Arguments = "`"$AppScript`""
        }
        
        $Shortcut.WorkingDirectory = $ProjectDir
        $Shortcut.Description = "IGRIS 2.0 Voice & Vision AI Assistant"
        $Shortcut.Save()
        Write-Host "[SUCCESS] Created shortcut at: $ShortcutPath"
    }
}
