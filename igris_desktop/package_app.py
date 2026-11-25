"""
IGRIS 2.0 PyInstaller Standalone Packaging Script
Packages the PySide6 desktop shell and Python automation engine into a standalone Windows executable.
"""

import os
import sys
import subprocess
import shutil

def package():
    print("=== PACKAGING IGRIS 2.0 STANDALONE WINDOWS APPLICATION ===")

    # Ensure frontend is built first
    if not os.path.exists("dist/server.cjs"):
        print("[Packager] Building production frontend and server first...")
        subprocess.run(["npm", "run", "build"], shell=True, check=True)

    entry_script = os.path.abspath("igris_desktop/app.py")
    output_dir = os.path.abspath("dist_app")

    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--name=IGRIS",
        "--onedir",
        "--windowed",
        "--noconfirm",
        "--clean",
        f"--distpath={output_dir}",
        "--add-data=igris_desktop;igris_desktop",
        "--add-data=dist;dist",
        "--hidden-import=PySide6.QtWebEngineWidgets",
        "--hidden-import=PySide6.QtWebEngineCore",
        "--hidden-import=psutil",
        entry_script
    ]

    print(f"[Packager] Running PyInstaller: {' '.join(pyinstaller_cmd)}")
    subprocess.run(pyinstaller_cmd, check=True)
    print(f"\n[Packager] Build complete! Executable located at: {output_dir}/IGRIS/IGRIS.exe")

if __name__ == "__main__":
    package()
