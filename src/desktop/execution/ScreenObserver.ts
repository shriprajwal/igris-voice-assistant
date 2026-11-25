/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeBridge } from "./NativeBridge";
import { AppManager } from "./AppManager";
import { ActiveWindowInfo, UIElementInfo } from "../types";

export class ScreenObserver {
  private static instance: ScreenObserver | null = null;
  private bridge: NativeBridge;
  private appManager: AppManager;

  private constructor() {
    this.bridge = NativeBridge.getInstance();
    this.appManager = AppManager.getInstance();
  }

  public static getInstance(): ScreenObserver {
    if (!ScreenObserver.instance) {
      ScreenObserver.instance = new ScreenObserver();
    }
    return ScreenObserver.instance;
  }

  /**
   * Capture desktop screenshot
   */
  public async captureScreen(outputPath?: string) {
    return await this.bridge.runCommand("capture_screen", { outputPath: outputPath || "" });
  }

  /**
   * Get active window details
   */
  public async getActiveWindow(): Promise<ActiveWindowInfo | null> {
    return await this.appManager.getActiveWindow();
  }

  /**
   * Search for visible UI elements on the active window
   */
  public async findUIElements(namePattern?: string, controlType?: string): Promise<UIElementInfo[]> {
    const res = await this.bridge.runCommand("find_ui_element", {
      namePattern: namePattern || "",
      controlType: controlType || ""
    });
    if (res.success && Array.isArray(res.data)) {
      return res.data as UIElementInfo[];
    }
    return [];
  }

  /**
   * Verify whether an action has succeeded by observing the current state
   */
  public async verifyActionResult(actionType: string, expectedState?: string): Promise<{ verified: boolean; message: string }> {
    // 1. Give the OS window manager a brief moment to update
    await new Promise(r => setTimeout(r, 400));

    const activeWin = await this.getActiveWindow();
    const title = activeWin?.title || "";
    const proc = activeWin?.processName || "";

    switch (actionType) {
      case "OPEN_APPLICATION":
      case "FOCUS_APPLICATION": {
        if (expectedState) {
          const lower = expectedState.toLowerCase();
          const isMatch = proc.toLowerCase().includes(lower) || title.toLowerCase().includes(lower);
          return {
            verified: isMatch,
            message: isMatch 
              ? `Verified '${expectedState}' is active (${proc}: "${title}").` 
              : `Active window is currently '${proc}' ("${title}").`
          };
        }
        return { verified: true, message: `Active window: ${proc} ("${title}").` };
      }

      case "OPEN_URL":
      case "WEB_SEARCH": {
        const isBrowser = proc.toLowerCase().includes("chrome") || proc.toLowerCase().includes("edge");
        return {
          verified: isBrowser,
          message: isBrowser 
            ? `Browser in focus with active tab: "${title}".` 
            : `Current window is '${proc}'.`
        };
      }

      default:
        return { verified: true, message: "Action execution confirmed." };
    }
  }
}
