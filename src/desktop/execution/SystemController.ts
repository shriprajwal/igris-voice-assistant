/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeBridge } from "./NativeBridge";
import { AppManager } from "./AppManager";

export class SystemController {
  private static instance: SystemController | null = null;
  private bridge: NativeBridge;
  private appManager: AppManager;

  private constructor() {
    this.bridge = NativeBridge.getInstance();
    this.appManager = AppManager.getInstance();
  }

  public static getInstance(): SystemController {
    if (!SystemController.instance) {
      SystemController.instance = new SystemController();
    }
    return SystemController.instance;
  }

  /**
   * Increase system volume
   */
  public async volumeUp(steps: number = 2) {
    return await this.bridge.runCommand("volume_adjust", { action: "up", steps });
  }

  /**
   * Decrease system volume
   */
  public async volumeDown(steps: number = 2) {
    return await this.bridge.runCommand("volume_adjust", { action: "down", steps });
  }

  /**
   * Toggle system audio mute
   */
  public async toggleMute() {
    return await this.bridge.runCommand("volume_adjust", { action: "mute" });
  }

  /**
   * Get system hardware and storage metrics
   */
  public async getSystemInfo() {
    return await this.bridge.runCommand("get_system_info");
  }

  /**
   * Open Windows Settings
   */
  public async openSettings() {
    return await this.appManager.launchApp("settings");
  }

  /**
   * Open Windows Task Manager
   */
  public async openTaskManager() {
    return await this.appManager.launchApp("task manager");
  }

  /**
   * Lock Windows Workstation
   */
  public async lockPc() {
    return await this.bridge.runCommand("lock_pc");
  }

  /**
   * Get Bluetooth radio/service state (strictly isolated from Wi-Fi)
   */
  public async getBluetoothState() {
    return await this.bridge.runCommand("get_bluetooth_state");
  }

  /**
   * Set Bluetooth state on or off (strictly isolated from Wi-Fi)
   */
  public async setBluetoothState(enable: boolean) {
    return await this.bridge.runCommand("set_bluetooth_state", { enable });
  }

  /**
   * Get Wi-Fi connection and radio state (strictly isolated from Bluetooth)
   */
  public async getWifiState() {
    return await this.bridge.runCommand("get_wifi_state");
  }

  /**
   * Set Wi-Fi state on or off (strictly isolated from Bluetooth)
   */
  public async setWifiState(enable: boolean) {
    return await this.bridge.runCommand("set_wifi_state", { enable });
  }
}
