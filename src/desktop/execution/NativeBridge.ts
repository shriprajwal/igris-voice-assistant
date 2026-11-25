/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export interface BridgeResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class NativeBridge {
  private static instance: NativeBridge | null = null;
  private scriptPath: string;

  private constructor() {
    // Resolve absolute path to winAutomation.ps1
    this.scriptPath = path.resolve(process.cwd(), "src", "desktop", "scripts", "winAutomation.ps1");
    if (!fs.existsSync(this.scriptPath)) {
      // In production / bundled dist fallback
      const distFallback = path.resolve(process.cwd(), "dist", "desktop", "scripts", "winAutomation.ps1");
      if (fs.existsSync(distFallback)) {
        this.scriptPath = distFallback;
      }
    }
  }

  public static getInstance(): NativeBridge {
    if (!NativeBridge.instance) {
      NativeBridge.instance = new NativeBridge();
    }
    return NativeBridge.instance;
  }

  /**
   * Run a native PowerShell automation command
   */
  public async runCommand(command: string, args: Record<string, any> = {}, timeoutMs: number = 10000): Promise<BridgeResult> {
    return new Promise((resolve) => {
      const argsJson = JSON.stringify(args);
      const child = spawn("powershell.exe", [
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", this.scriptPath,
        "-Command", command,
        "-ArgsJson", argsJson
      ], {
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stdoutData = "";
      let stderrData = "";
      let isTimedOut = false;

      const timer = setTimeout(() => {
        isTimedOut = true;
        child.kill();
        resolve({
          success: false,
          message: `Command '${command}' timed out after ${timeoutMs}ms.`,
          error: "Timeout"
        });
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdoutData += chunk.toString("utf-8");
      });

      child.stderr.on("data", (chunk) => {
        stderrData += chunk.toString("utf-8");
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (isTimedOut) return;

        if (code !== 0 && !stdoutData.trim()) {
          resolve({
            success: false,
            message: `Command '${command}' exited with code ${code}.`,
            error: stderrData.trim() || `Exit code ${code}`
          });
          return;
        }

        try {
          const parsed: BridgeResult = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch {
          resolve({
            success: code === 0,
            message: stdoutData.trim() || `Executed '${command}'`,
            data: stdoutData.trim(),
            error: stderrData.trim()
          });
        }
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          success: false,
          message: `Failed to spawn process for '${command}'.`,
          error: err.message
        });
      });
    });
  }
}
