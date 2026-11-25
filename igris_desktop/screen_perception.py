"""
IGRIS Intelligent Screen Perception Engine
Combines Windows UI Automation (structured controls), Windows native WinRT OCR
(visible text), and perceptual frame diffing (state change tracking).
"""

import os
import tempfile
import subprocess
import time
from typing import Dict, Any, List, Optional

from igris_desktop import ui_automation
from igris_desktop.screen_capture import NativeScreenCaptureManager


class ScreenPerception:
    _instance: Optional["ScreenPerception"] = None

    def __init__(self):
        self._last_signature: Optional[bytes] = None
        self._last_window_handle: int = 0
        self._last_window_title: str = ""
        self._last_ocr_text: str = ""
        self._last_ocr_sig: Optional[bytes] = None

    @classmethod
    def get_instance(cls) -> "ScreenPerception":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def run_winrt_ocr(self, jpeg_bytes: Optional[bytes] = None, timeout: float = 4.0) -> str:
        """
        Extract visible text from the latest screen frame using Windows 10/11 built-in
        Windows.Media.Ocr.OcrEngine (WinRT) without external binaries.
        """
        if jpeg_bytes is None:
            mgr = NativeScreenCaptureManager.get_instance()
            if not mgr._is_authorized:
                mgr.authorize(0)
            jpeg_bytes = mgr.get_latest_jpeg_bytes()

        if not jpeg_bytes:
            return ""

        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tf:
                tf.write(jpeg_bytes)
                tmp_path = tf.name

            ps_script = f"""
            try {{
                Add-Type -AssemblyName System.Runtime.WindowsRuntime
                $asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {{ $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' }})[0]
                Function Await($WinRtTask, $ResultType) {{
                    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
                    $netTask = $asTask.Invoke($null, @($WinRtTask))
                    $netTask.Wait(-1) | Out-Null
                    $netTask.Result
                }}
                [Windows.Storage.StorageFile, Windows.Storage, ContentType=WindowsRuntime] | Out-Null
                [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType=WindowsRuntime] | Out-Null
                [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime] | Out-Null
                $file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('{tmp_path}')) ([Windows.Storage.StorageFile])
                $stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
                $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
                $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
                $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
                if ($engine) {{
                    $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
                    Write-Output $result.Text
                }}
                $stream.Dispose()
            }} catch {{
                Write-Output ""
            }}
            """
            res = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps_script],
                capture_output=True,
                text=True,
                timeout=timeout
            )
            return (res.stdout or "").strip()
        except Exception:
            return ""
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    def perceive(self, include_ocr: bool = False, max_elements: int = 35) -> Dict[str, Any]:
        """
        Capture a unified perception snapshot of the desktop:
        - Active window (title, process, handle)
        - Structured UIA interactive elements & text values
        - Screen change detection since previous perception
        - Optional WinRT OCR text (cached if screen hasn't changed)
        """
        active_win = ui_automation.get_active_window()
        hwnd = active_win.get("handle", 0)
        title = active_win.get("title", "")

        uia_tree = ui_automation.inspect_ui_tree(hwnd=hwnd, max_elements=max_elements)
        elements = uia_tree.get("elements", [])
        text_values = uia_tree.get("text_values", [])

        mgr = NativeScreenCaptureManager.get_instance()
        curr_sig = mgr.get_frame_signature() if mgr._is_authorized else None
        diff_score = NativeScreenCaptureManager.signature_diff(self._last_signature, curr_sig) if (self._last_signature and curr_sig) else 255.0
        window_changed = (hwnd != self._last_window_handle) or (title != self._last_window_title)
        screen_changed = window_changed or (diff_score > 1.8)

        ocr_text = ""
        if include_ocr:
            if self._last_ocr_sig and curr_sig and NativeScreenCaptureManager.signature_diff(self._last_ocr_sig, curr_sig) < 1.2 and self._last_ocr_text:
                ocr_text = self._last_ocr_text
            else:
                ocr_text = self.run_winrt_ocr()
                self._last_ocr_text = ocr_text
                self._last_ocr_sig = curr_sig

        self._last_signature = curr_sig
        self._last_window_handle = hwnd
        self._last_window_title = title

        return {
            "success": True,
            "activeWindow": active_win,
            "screenChanged": screen_changed,
            "visualDiff": round(diff_score, 2),
            "uiaElements": elements,
            "uiaElementCount": len(elements),
            "uiaTextValues": text_values,
            "ocrText": ocr_text[:1500] if ocr_text else "",
            "timestamp": time.time(),
        }
