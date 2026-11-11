/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MemoryManager } from "../memory/MemoryManager";
import { BrowserManager } from "./BrowserManager";

export type ToolActionCallback = (name: string, args: any) => Promise<any> | any;

export class ToolManager {
  private handlers: Record<string, ToolActionCallback> = {};

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Register a custom tool handler
   */
  register(name: string, callback: ToolActionCallback) {
    this.handlers[name] = callback;
  }

  /**
   * Execute a tool called by Gemini
   */
  async execute(name: string, args: any): Promise<any> {
    console.log(`[ToolManager] Executing tool '${name}' with arguments:`, args);
    const handler = this.handlers[name];
    if (handler) {
      try {
        return await handler(name, args);
      } catch (error: any) {
        console.error(`[ToolManager] Error running tool '${name}':`, error);
        return { success: false, error: error.message || "Execution error" };
      }
    } else {
      console.warn(`[ToolManager] No handler registered for tool '${name}'`);
      return { success: false, error: `Tool handler for '${name}' not implemented` };
    }
  }

  /**
   * Register default built-in tool actions
   */
  private registerDefaultTools() {
    // 1. openWebsite
    this.register("openWebsite", async (_, args) => {
      const { url, label } = args;
      if (!url) {
        return { success: false, error: "Missing required argument 'url'" };
      }

      console.log(`[ToolManager] Attempting to open or focus website: ${url}`);
      
      try {
        const res = await BrowserManager.getInstance().openOrFocusWebsite(url, label);
        return res;
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to trigger tab open/focus" };
      }
    });

    // 1b. openNewTab
    this.register("openNewTab", async (_, args) => {
      const { url, label } = args;
      try {
        const res = await BrowserManager.getInstance().openNewTab(url, label);
        return res;
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to open new tab" };
      }
    });

    // 1c. focusExistingTab
    this.register("focusExistingTab", async (_, args) => {
      const { url } = args;
      if (!url) {
        return { success: false, error: "Missing required argument 'url'" };
      }
      try {
        const success = await BrowserManager.getInstance().switchToTab(url);
        return {
          success,
          message: success 
            ? `Switching to ${url}, Monarch.` 
            : `Failed to find or focus the ${url} tab.`
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to focus existing tab" };
      }
    });

    // 2. saveMemory
    this.register("saveMemory", async (_, args) => {
      const { category, key, value } = args;
      if (!category || !key || !value) {
        return { success: false, error: "Missing required arguments for saveMemory: category, key, value" };
      }
      try {
        const item = await MemoryManager.getInstance().saveMemory(category, key, value);
        return {
          success: true,
          message: `Memory saved successfully: registered '${key}' under ${category} category.`,
          item
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to save memory to core storage" };
      }
    });

    // 3. getMemories
    this.register("getMemories", async (_, args) => {
      const { category, query } = args;
      try {
        const memories = await MemoryManager.getInstance().getMemories(category, query);
        return {
          success: true,
          memories,
          count: memories.length,
          message: `Retrieved ${memories.length} relevant memories from IGRIS storage.`
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to retrieve memories from core storage" };
      }
    });

    // 4. deleteMemory
    this.register("deleteMemory", async (_, args) => {
      const { keyOrId } = args;
      if (!keyOrId) {
        return { success: false, error: "Missing required argument 'keyOrId'" };
      }
      try {
        const success = await MemoryManager.getInstance().deleteMemory(keyOrId);
        return {
          success,
          message: success 
            ? `Successfully erased memory reference for '${keyOrId}'.` 
            : `No matching memory found for key or ID: '${keyOrId}'.`
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to delete memory reference" };
      }
    });

    // 5. clearAllMemories
    this.register("clearAllMemories", async (_, args) => {
      const { confirm } = args;
      if (!confirm) {
        return { success: false, error: "Operation aborted: Wipe command was not confirmed." };
      }
      try {
        await MemoryManager.getInstance().clearAllMemories();
        return {
          success: true,
          message: "All persistent records successfully cleared from the IGRIS memory matrix."
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to clear memory matrix" };
      }
    });

    // 6. switchToTab
    this.register("switchToTab", async (_, args) => {
      const { tabId } = args;
      if (!tabId) {
        return { success: false, error: "Missing required argument 'tabId'" };
      }
      try {
        const success = await BrowserManager.getInstance().switchToTab(tabId);
        return {
          success,
          message: success 
            ? `Switching to ${tabId} tab, Monarch.` 
            : `Failed to find or focus the ${tabId} tab.`
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to switch tab" };
      }
    });

    // 7. closeTab
    this.register("closeTab", async (_, args) => {
      const { tabId } = args;
      try {
        const success = await BrowserManager.getInstance().closeTab(tabId);
        return {
          success,
          message: success 
            ? `Successfully closed the ${tabId || "active"} tab, Monarch.` 
            : `Could not find the ${tabId || "active"} tab to close.`
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to close tab" };
      }
    });

    // 8. refreshActiveTab
    this.register("refreshActiveTab", async () => {
      try {
        const success = await BrowserManager.getInstance().refreshActiveTab();
        return {
          success,
          message: success 
            ? "Successfully refreshed active portal page, Monarch." 
            : "Failed to reload active page."
        };
      } catch (err: any) {
        return { success: false, error: err.message || "Failed to refresh active page" };
      }
    });
  }
}
