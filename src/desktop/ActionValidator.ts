/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DesktopAction, DesktopActionType, PermissionRequest } from "./types";

export interface ValidationResult {
  valid: boolean;
  sanitizedAction?: DesktopAction;
  error?: string;
  requiresPermission?: boolean;
  permissionRequest?: PermissionRequest;
}

export class ActionValidator {
  private static instance: ActionValidator | null = null;

  public static getInstance(): ActionValidator {
    if (!ActionValidator.instance) {
      ActionValidator.instance = new ActionValidator();
    }
    return ActionValidator.instance;
  }

  /**
   * Validate an incoming DesktopAction against the registry and safety rules
   */
  public validate(action: DesktopAction): ValidationResult {
    if (!action || !action.type) {
      return { valid: false, error: "Action object must have a valid type." };
    }

    const { type, params = {} } = action;

    // Detect dangerous shell metacharacters
    const metacharRegex = /[;&|`$<>]/;
    for (const [key, val] of Object.entries(params)) {
      if (typeof val === "string" && metacharRegex.test(val)) {
        return {
          valid: false,
          error: `Parameter '${key}' contains disallowed metacharacters.`
        };
      }
    }

    // Safety checks by Action Type
    switch (type) {
      case "OPEN_APPLICATION":
      case "FOCUS_APPLICATION":
      case "CLOSE_APPLICATION":
      case "MINIMIZE_WINDOW":
      case "MAXIMIZE_WINDOW": {
        if (type === "OPEN_APPLICATION" && (!params.appName || typeof params.appName !== "string")) {
          return { valid: false, error: "Missing or invalid 'appName' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "OPEN_URL": {
        if (!params.url || typeof params.url !== "string") {
          return { valid: false, error: "Missing or invalid 'url' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "WEB_SEARCH": {
        if (!params.query || typeof params.query !== "string") {
          return { valid: false, error: "Missing or invalid 'query' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "CLICK_ELEMENT": {
        if (!params.description || typeof params.description !== "string") {
          return { valid: false, error: "Missing or invalid 'description' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "MOUSE_CLICK": {
        return { valid: true, sanitizedAction: action };
      }

      case "MOUSE_MOVE": {
        if (typeof params.x !== "number" || typeof params.y !== "number") {
          return { valid: false, error: "Coordinates 'x' and 'y' must be numbers." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "SCROLL": {
        const direction = params.direction || "down";
        if (direction !== "up" && direction !== "down") {
          return { valid: false, error: "Scroll direction must be 'up' or 'down'." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "TYPE_TEXT": {
        if (typeof params.text !== "string") {
          return { valid: false, error: "Missing or invalid 'text' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "PRESS_KEY": {
        if (!params.key || typeof params.key !== "string") {
          return { valid: false, error: "Missing or invalid 'key' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "KEY_COMBO": {
        if (!params.combo || typeof params.combo !== "string") {
          return { valid: false, error: "Missing or invalid 'combo' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "FILE_SEARCH": {
        if (!params.query || typeof params.query !== "string") {
          return { valid: false, error: "Missing or invalid 'query' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "OPEN_FILE": {
        if (!params.filePath || typeof params.filePath !== "string") {
          return { valid: false, error: "Missing or invalid 'filePath' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "NAVIGATE_FOLDER": {
        if (!params.folder || typeof params.folder !== "string") {
          return { valid: false, error: "Missing or invalid 'folder' parameter." };
        }
        return { valid: true, sanitizedAction: action };
      }

      case "CREATE_FOLDER": {
        if (!params.folderName || typeof params.folderName !== "string") {
          return { valid: false, error: "Missing or invalid 'folderName' parameter." };
        }
        // Permission check for creating folders
        return {
          valid: true,
          sanitizedAction: action,
          requiresPermission: true,
          permissionRequest: {
            id: `perm_${Date.now()}`,
            action: type,
            description: `Create new folder '${params.folderName}' in '${params.parentFolder || "Documents"}'`,
            riskLevel: "medium",
            params
          }
        };
      }

      case "SET_VOLUME":
      case "MUTE_VOLUME":
      case "SYSTEM_INFO":
      case "GET_BLUETOOTH_STATE":
      case "SET_BLUETOOTH_STATE":
      case "GET_WIFI_STATE":
      case "SET_WIFI_STATE":
      case "NAVIGATE_NESTED_FOLDER":
      case "OPEN_ORDINAL_ITEM":
      case "SWITCH_WINDOW":
      case "NAVIGATE_BACK":
      case "NAVIGATE_FORWARD":
      case "SCREEN_ANALYSIS":
      case "GET_ACTIVE_WINDOW":
      case "STOP_TASK": {
        return { valid: true, sanitizedAction: action };
      }

      default: {
        return { valid: false, error: `Unregistered desktop action type: '${type}'.` };
      }
    }
  }
}
