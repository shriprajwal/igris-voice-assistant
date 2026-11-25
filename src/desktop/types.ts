/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type DesktopActionType =
  | "OPEN_APPLICATION"
  | "FOCUS_APPLICATION"
  | "CLOSE_APPLICATION"
  | "MINIMIZE_WINDOW"
  | "MAXIMIZE_WINDOW"
  | "OPEN_URL"
  | "WEB_SEARCH"
  | "CLICK_ELEMENT"
  | "MOUSE_CLICK"
  | "MOUSE_MOVE"
  | "SCROLL"
  | "TYPE_TEXT"
  | "PRESS_KEY"
  | "KEY_COMBO"
  | "SWITCH_WINDOW"
  | "NAVIGATE_BACK"
  | "NAVIGATE_FORWARD"
  | "SCREEN_ANALYSIS"
  | "GET_ACTIVE_WINDOW"
  | "FILE_SEARCH"
  | "OPEN_FILE"
  | "NAVIGATE_FOLDER"
  | "NAVIGATE_NESTED_FOLDER"
  | "OPEN_ORDINAL_ITEM"
  | "CREATE_FOLDER"
  | "SET_VOLUME"
  | "MUTE_VOLUME"
  | "SYSTEM_INFO"
  | "GET_BLUETOOTH_STATE"
  | "SET_BLUETOOTH_STATE"
  | "GET_WIFI_STATE"
  | "SET_WIFI_STATE"
  | "STOP_TASK";

export type DesktopExecutionState =
  | "idle"
  | "planning"
  | "observing"
  | "executing"
  | "verifying"
  | "awaiting_permission"
  | "completed"
  | "error"
  | "stopped";

export interface DesktopAction {
  id: string;
  type: DesktopActionType;
  params: Record<string, any>;
  description?: string;
  requiresConfirmation?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  action: DesktopActionType;
  message: string;
  data?: any;
  error?: string;
  verified?: boolean;
}

export interface ActionLogEntry {
  id: string;
  timestamp: number;
  action: string;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  details: string;
}

export interface DesktopStatus {
  state: DesktopExecutionState;
  activeApp: string;
  currentTask: string | null;
  currentStepIndex: number;
  totalSteps: number;
  lastAction: string | null;
  logEntries: ActionLogEntry[];
  pendingPermission: PermissionRequest | null;
}

export interface PermissionRequest {
  id: string;
  action: DesktopActionType;
  description: string;
  riskLevel: "low" | "medium" | "high";
  params: Record<string, any>;
}

export interface MultiStepPlan {
  goal: string;
  spokenUpdate?: string;
  steps: {
    action: DesktopActionType;
    params: Record<string, any>;
    description: string;
    expectedOutcome?: string;
  }[];
}

export interface ActiveWindowInfo {
  handle: number;
  title: string;
  processName: string;
  pid: number;
}

export interface UIElementInfo {
  name: string;
  controlType: string;
  className: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
}

export interface SearchResultItem {
  index: number;
  title: string;
  url: string;
  snippet?: string;
}
