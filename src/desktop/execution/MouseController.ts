/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeBridge } from "./NativeBridge";
import { UIElementInfo } from "../types";

export class MouseController {
  private static instance: MouseController | null = null;
  private bridge: NativeBridge;

  private constructor() {
    this.bridge = NativeBridge.getInstance();
  }

  public static getInstance(): MouseController {
    if (!MouseController.instance) {
      MouseController.instance = new MouseController();
    }
    return MouseController.instance;
  }

  /**
   * Move mouse cursor to screen coordinates (X, Y)
   */
  public async move(x: number, y: number) {
    return await this.bridge.runCommand("mouse_move", { x, y });
  }

  /**
   * Click mouse button (left, right, double, middle) at optional coordinates
   */
  public async click(button: "left" | "right" | "double" | "middle" = "left", x?: number, y?: number) {
    return await this.bridge.runCommand("mouse_click", { button, x, y });
  }

  /**
   * Scroll mouse wheel up or down
   */
  public async scroll(direction: "up" | "down" = "down", amount: number = 300) {
    return await this.bridge.runCommand("mouse_scroll", { direction, amount });
  }

  /**
   * Find a visible UI element on the active screen and click it
   */
  public async clickElement(description: string, role?: string): Promise<{ success: boolean; message: string; element?: UIElementInfo }> {
    // 1. Search for matching UI element via UI Automation
    const searchRes = await this.bridge.runCommand("find_ui_element", {
      namePattern: description,
      controlType: role || ""
    });

    if (searchRes.success && Array.isArray(searchRes.data) && searchRes.data.length > 0) {
      const target: UIElementInfo = searchRes.data[0];
      if (target.bounds && target.bounds.centerX && target.bounds.centerY) {
        // Click the element center
        await this.click("left", target.bounds.centerX, target.bounds.centerY);
        return {
          success: true,
          message: `Clicked element '${target.name}' at (${target.bounds.centerX}, ${target.bounds.centerY}).`,
          element: target
        };
      }
    }

    // Fallback: If not found via direct UI Automation, check common positions
    return {
      success: false,
      message: `Could not identify UI element '${description}' on screen.`
    };
  }
}
