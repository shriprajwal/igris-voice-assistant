/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeBridge } from "./NativeBridge";

export class KeyboardController {
  private static instance: KeyboardController | null = null;
  private bridge: NativeBridge;

  private constructor() {
    this.bridge = NativeBridge.getInstance();
  }

  public static getInstance(): KeyboardController {
    if (!KeyboardController.instance) {
      KeyboardController.instance = new KeyboardController();
    }
    return KeyboardController.instance;
  }

  /**
   * Type text into the active focused window
   */
  public async typeText(text: string, pressEnter: boolean = false) {
    return await this.bridge.runCommand("type_text", { text, pressEnter });
  }

  /**
   * Press a single key (Enter, Escape, Tab, Backspace, Arrows, Space, etc.)
   */
  public async pressKey(key: string) {
    return await this.bridge.runCommand("press_key", { key });
  }

  /**
   * Send a keyboard combination (e.g., ctrl+t, ctrl+w, ctrl+l, ctrl+c, ctrl+v, alt+tab)
   */
  public async sendCombo(combo: string) {
    return await this.bridge.runCommand("key_combo", { combo });
  }
}
