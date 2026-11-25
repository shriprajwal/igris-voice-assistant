/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeBridge } from "./NativeBridge";
import { ActiveWindowInfo } from "../types";

export class AppManager {
  private static instance: AppManager | null = null;
  private bridge: NativeBridge;

  private constructor() {
    this.bridge = NativeBridge.getInstance();
  }

  public static getInstance(): AppManager {
    if (!AppManager.instance) {
      AppManager.instance = new AppManager();
    }
    return AppManager.instance;
  }

  /**
   * Launch an application safely
   */
  public async launchApp(appName: string, args?: string) {
    const res = await this.bridge.runCommand("launch_app", { appName, args });
    return res;
  }

  /**
   * Focus a running application window
   */
  public async focusApp(appName: string) {
    const res = await this.bridge.runCommand("focus_app", { appName });
    return res;
  }

  /**
   * Minimize the active or specified application window
   */
  public async minimizeWindow(appName?: string) {
    return await this.bridge.runCommand("minimize_window", { appName: appName || "" });
  }

  /**
   * Maximize the active or specified application window
   */
  public async maximizeWindow(appName?: string) {
    return await this.bridge.runCommand("maximize_window", { appName: appName || "" });
  }

  /**
   * Close the active or specified application window
   */
  public async closeWindow(appName?: string) {
    return await this.bridge.runCommand("close_window", { appName: appName || "" });
  }

  /**
   * List all running applications with window titles
   */
  public async listRunningApps() {
    return await this.bridge.runCommand("list_running_apps");
  }

  /**
   * Get active foreground window information
   */
  public async getActiveWindow(): Promise<ActiveWindowInfo | null> {
    const res = await this.bridge.runCommand("get_active_window");
    if (res.success && res.data) {
      return res.data as ActiveWindowInfo;
    }
    return null;
  }

  /**
   * Verify whether a given application or window is running and active
   */
  public async verifyAppRunning(appName: string): Promise<boolean> {
    const lower = appName.toLowerCase();
    const res = await this.listRunningApps();
    if (res.success && Array.isArray(res.data)) {
      return res.data.some((app: any) => 
        (app.processName && app.processName.toLowerCase().includes(lower)) ||
        (app.title && app.title.toLowerCase().includes(lower))
      );
    }
    return false;
  }
}
