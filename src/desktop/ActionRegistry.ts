/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesktopAction, DesktopActionType, ExecutionResult } from "./types";
import { AppManager } from "./execution/AppManager";
import { MouseController } from "./execution/MouseController";
import { KeyboardController } from "./execution/KeyboardController";
import { BrowserController } from "./execution/BrowserController";
import { FileExplorerController } from "./execution/FileExplorerController";
import { SystemController } from "./execution/SystemController";
import { ScreenObserver } from "./execution/ScreenObserver";

export type ActionHandler = (params: Record<string, any>) => Promise<ExecutionResult>;

export class ActionRegistry {
  private static instance: ActionRegistry | null = null;
  private handlers: Map<DesktopActionType, ActionHandler> = new Map();

  private constructor() {
    this.registerHandlers();
  }

  public static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  /**
   * Execute registered action handler
   */
  public async execute(action: DesktopAction): Promise<ExecutionResult> {
    const handler = this.handlers.get(action.type);
    if (!handler) {
      return {
        success: false,
        action: action.type,
        message: `No handler registered for action type '${action.type}'.`,
        error: "Unregistered handler"
      };
    }

    try {
      return await handler(action.params || {});
    } catch (err: any) {
      return {
        success: false,
        action: action.type,
        message: `Execution failed for '${action.type}': ${err.message}`,
        error: err.message
      };
    }
  }

  private registerHandlers() {
    const app = AppManager.getInstance();
    const mouse = MouseController.getInstance();
    const keyboard = KeyboardController.getInstance();
    const browser = BrowserController.getInstance();
    const files = FileExplorerController.getInstance();
    const system = SystemController.getInstance();
    const screen = ScreenObserver.getInstance();

    // 1. Applications
    this.handlers.set("OPEN_APPLICATION", async (p) => {
      const res = await app.launchApp(p.appName, p.args);
      return { success: res.success, action: "OPEN_APPLICATION", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("FOCUS_APPLICATION", async (p) => {
      const res = await app.focusApp(p.appName);
      return { success: res.success, action: "FOCUS_APPLICATION", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("CLOSE_APPLICATION", async (p) => {
      const res = await app.closeWindow(p.appName);
      return { success: res.success, action: "CLOSE_APPLICATION", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("MINIMIZE_WINDOW", async (p) => {
      const res = await app.minimizeWindow(p.appName);
      return { success: res.success, action: "MINIMIZE_WINDOW", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("MAXIMIZE_WINDOW", async (p) => {
      const res = await app.maximizeWindow(p.appName);
      return { success: res.success, action: "MAXIMIZE_WINDOW", message: res.message, data: res.data, error: res.error };
    });

    // 2. Browser & Navigation
    this.handlers.set("OPEN_URL", async (p) => {
      const res = await browser.openUrl(p.url);
      return { success: res.success, action: "OPEN_URL", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("WEB_SEARCH", async (p) => {
      const res = await browser.webSearch(p.query, p.openInBrowser !== false);
      return { success: res.success, action: "WEB_SEARCH", message: res.message, data: res.results };
    });

    this.handlers.set("NAVIGATE_BACK", async () => {
      const res = await browser.navigateBack();
      return { success: res.success, action: "NAVIGATE_BACK", message: res.message };
    });

    this.handlers.set("NAVIGATE_FORWARD", async () => {
      const res = await browser.navigateForward();
      return { success: res.success, action: "NAVIGATE_FORWARD", message: res.message };
    });

    // 3. Mouse & Element Interaction
    this.handlers.set("MOUSE_MOVE", async (p) => {
      const res = await mouse.move(p.x, p.y);
      return { success: res.success, action: "MOUSE_MOVE", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("MOUSE_CLICK", async (p) => {
      const res = await mouse.click(p.button, p.x, p.y);
      return { success: res.success, action: "MOUSE_CLICK", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("CLICK_ELEMENT", async (p) => {
      const res = await mouse.clickElement(p.description, p.role);
      return { success: res.success, action: "CLICK_ELEMENT", message: res.message, data: res.element };
    });

    this.handlers.set("SCROLL", async (p) => {
      const res = await mouse.scroll(p.direction, p.amount);
      return { success: res.success, action: "SCROLL", message: res.message, data: res.data, error: res.error };
    });

    // 4. Keyboard
    this.handlers.set("TYPE_TEXT", async (p) => {
      const res = await keyboard.typeText(p.text, p.pressEnter);
      return { success: res.success, action: "TYPE_TEXT", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("PRESS_KEY", async (p) => {
      const res = await keyboard.pressKey(p.key);
      return { success: res.success, action: "PRESS_KEY", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("KEY_COMBO", async (p) => {
      const res = await keyboard.sendCombo(p.combo);
      return { success: res.success, action: "KEY_COMBO", message: res.message, data: res.data, error: res.error };
    });

    // 5. Filesystem
    this.handlers.set("NAVIGATE_FOLDER", async (p) => {
      const res = await files.openFolder(p.folder);
      return { success: res.success, action: "NAVIGATE_FOLDER", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("NAVIGATE_NESTED_FOLDER", async (p) => {
      const res = await files.navigateNestedFolder(p.target || p.folder);
      return { success: res.success, action: "NAVIGATE_NESTED_FOLDER", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("OPEN_ORDINAL_ITEM", async (p) => {
      const res = await files.openOrdinalItem(p.ordinal, p.itemType);
      return { success: res.success, action: "OPEN_ORDINAL_ITEM", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("FILE_SEARCH", async (p) => {
      const res = await files.searchFiles(p.query, p.folder);
      return { success: res.success, action: "FILE_SEARCH", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("OPEN_FILE", async (p) => {
      const res = await files.openFile(p.filePath);
      return { success: res.success, action: "OPEN_FILE", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("CREATE_FOLDER", async (p) => {
      const res = await files.createFolder(p.parentFolder, p.folderName);
      return { success: res.success, action: "CREATE_FOLDER", message: res.message, data: res.data, error: res.error };
    });

    // 6. System
    this.handlers.set("SET_VOLUME", async (p) => {
      const action = p.direction === "down" ? "down" : "up";
      const res = action === "down" ? await system.volumeDown(p.steps || 2) : await system.volumeUp(p.steps || 2);
      return { success: res.success, action: "SET_VOLUME", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("MUTE_VOLUME", async () => {
      const res = await system.toggleMute();
      return { success: res.success, action: "MUTE_VOLUME", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("SYSTEM_INFO", async () => {
      const res = await system.getSystemInfo();
      return { success: res.success, action: "SYSTEM_INFO", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("GET_BLUETOOTH_STATE", async () => {
      const res = await system.getBluetoothState();
      return { success: res.success, action: "GET_BLUETOOTH_STATE", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("SET_BLUETOOTH_STATE", async (p) => {
      const enable = p.enable !== false && p.state !== "off";
      const res = await system.setBluetoothState(enable);
      return { success: res.success, action: "SET_BLUETOOTH_STATE", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("GET_WIFI_STATE", async () => {
      const res = await system.getWifiState();
      return { success: res.success, action: "GET_WIFI_STATE", message: res.message, data: res.data, error: res.error };
    });

    this.handlers.set("SET_WIFI_STATE", async (p) => {
      const enable = p.enable !== false && p.state !== "off";
      const res = await system.setWifiState(enable);
      return { success: res.success, action: "SET_WIFI_STATE", message: res.message, data: res.data, error: res.error };
    });

    // 7. Screen Awareness
    this.handlers.set("SCREEN_ANALYSIS", async (p) => {
      const res = await screen.captureScreen(p.outputPath);
      const active = await screen.getActiveWindow();
      return {
        success: res.success,
        action: "SCREEN_ANALYSIS",
        message: `Captured screen. Active window: '${active?.title || active?.processName || "Desktop"}'.`,
        data: { capture: res.data, activeWindow: active }
      };
    });

    this.handlers.set("GET_ACTIVE_WINDOW", async () => {
      const active = await screen.getActiveWindow();
      return {
        success: !!active,
        action: "GET_ACTIVE_WINDOW",
        message: active ? `Active window: ${active.processName} ("${active.title}")` : "No active window",
        data: active
      };
    });

    this.handlers.set("STOP_TASK", async () => {
      return { success: true, action: "STOP_TASK", message: "Task stopped by Monarch." };
    });
  }
}
