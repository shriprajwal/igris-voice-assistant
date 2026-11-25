/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ActionRegistry } from "./ActionRegistry";
import { ActionValidator } from "./ActionValidator";
import { ScreenObserver } from "./execution/ScreenObserver";
import { 
  DesktopAction, 
  DesktopStatus, 
  ExecutionResult, 
  MultiStepPlan, 
  ActionLogEntry, 
  PermissionRequest 
} from "./types";

export type StatusListener = (status: DesktopStatus) => void;

export class ObserveActVerify {
  private static instance: ObserveActVerify | null = null;
  private registry: ActionRegistry;
  private validator: ActionValidator;
  private screenObserver: ScreenObserver;
  private isCancelled: boolean = false;
  private listeners: Set<StatusListener> = new Set();
  private pendingPermissionResolver: ((approved: boolean) => void) | null = null;

  private currentStatus: DesktopStatus = {
    state: "idle",
    activeApp: "Unknown",
    currentTask: null,
    currentStepIndex: 0,
    totalSteps: 0,
    lastAction: null,
    logEntries: [],
    pendingPermission: null
  };

  private constructor() {
    this.registry = ActionRegistry.getInstance();
    this.validator = ActionValidator.getInstance();
    this.screenObserver = ScreenObserver.getInstance();
  }

  public static getInstance(): ObserveActVerify {
    if (!ObserveActVerify.instance) {
      ObserveActVerify.instance = new ObserveActVerify();
    }
    return ObserveActVerify.instance;
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus);
    return () => this.listeners.delete(listener);
  }

  public getStatus(): DesktopStatus {
    return this.currentStatus;
  }

  private updateStatus(partial: Partial<DesktopStatus>) {
    this.currentStatus = { ...this.currentStatus, ...partial };
    this.listeners.forEach((fn) => fn(this.currentStatus));
  }

  private addLog(action: string, status: ActionLogEntry["status"], details: string) {
    const entry: ActionLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now(),
      action,
      status,
      details
    };
    const updatedLogs = [entry, ...this.currentStatus.logEntries].slice(0, 50);
    this.updateStatus({ logEntries: updatedLogs, lastAction: `${action}: ${details}` });
  }

  /**
   * Immediately abort ongoing execution
   */
  public stopTask() {
    this.isCancelled = true;
    if (this.pendingPermissionResolver) {
      this.pendingPermissionResolver(false);
      this.pendingPermissionResolver = null;
    }
    this.addLog("STOP_TASK", "success", "Halt protocol executed by Monarch.");
    this.updateStatus({
      state: "stopped",
      currentTask: null,
      currentStepIndex: 0,
      totalSteps: 0,
      pendingPermission: null
    });
  }

  /**
   * Handle user response to a permission request
   */
  public handlePermissionResponse(requestId: string, approved: boolean) {
    if (this.currentStatus.pendingPermission?.id === requestId && this.pendingPermissionResolver) {
      this.pendingPermissionResolver(approved);
      this.pendingPermissionResolver = null;
      this.updateStatus({ pendingPermission: null });
    }
  }

  /**
   * Execute a single action through the Observe -> Act -> Verify loop
   */
  public async executeSingleAction(action: DesktopAction): Promise<ExecutionResult> {
    this.isCancelled = false;

    // 1. OBSERVE: check initial active window
    this.updateStatus({ state: "observing" });
    const initialWindow = await this.screenObserver.getActiveWindow();
    const activeAppName = initialWindow?.processName || initialWindow?.title || "Desktop";
    this.updateStatus({ activeApp: activeAppName });

    // 2. VALIDATE: check against security validator
    const valResult = this.validator.validate(action);
    if (!valResult.valid) {
      const errMsg = valResult.error || "Action validation failed.";
      this.addLog(action.type, "failed", errMsg);
      this.updateStatus({ state: "error" });
      return { success: false, action: action.type, message: errMsg, error: errMsg };
    }

    // 2.5 PERMISSION CHECK: if action requires confirmation
    if (valResult.requiresPermission && valResult.permissionRequest) {
      const approved = await new Promise<boolean>((resolve) => {
        this.pendingPermissionResolver = resolve;
        this.updateStatus({
          state: "awaiting_permission",
          pendingPermission: valResult.permissionRequest
        });
        this.addLog(action.type, "pending", `Awaiting authorization: ${valResult.permissionRequest!.description}`);
      });

      if (!approved) {
        this.addLog(action.type, "failed", "Authorization denied by Monarch.");
        this.updateStatus({ state: "idle" });
        return {
          success: false,
          action: action.type,
          message: "Operation cancelled: permission denied by Monarch.",
          error: "PermissionDenied"
        };
      }
    }

    // 3. EXECUTE: run action
    this.updateStatus({ state: "executing" });
    this.addLog(action.type, "running", action.description || `Executing ${action.type}...`);
    const execResult = await this.registry.execute(valResult.sanitizedAction || action);

    if (this.isCancelled) {
      return { success: false, action: action.type, message: "Task stopped.", error: "Cancelled" };
    }

    // 4. OBSERVE & VERIFY: check outcome
    this.updateStatus({ state: "verifying" });
    const verifyOutcome = await this.screenObserver.verifyActionResult(
      action.type,
      action.params?.appName || action.params?.query
    );

    const isSuccess = execResult.success && verifyOutcome.verified;
    this.addLog(
      action.type,
      isSuccess ? "success" : "failed",
      isSuccess ? execResult.message : (execResult.error || verifyOutcome.message)
    );

    // Refresh active window
    const finalWindow = await this.screenObserver.getActiveWindow();
    this.updateStatus({
      state: isSuccess ? "completed" : "error",
      activeApp: finalWindow?.processName || activeAppName
    });

    return {
      ...execResult,
      verified: verifyOutcome.verified,
      message: execResult.message || verifyOutcome.message
    };
  }

  /**
   * Execute a multi-step plan sequentially with verification
   */
  public async executePlan(plan: MultiStepPlan): Promise<ExecutionResult> {
    this.isCancelled = false;
    this.updateStatus({
      state: "planning",
      currentTask: plan.goal,
      currentStepIndex: 0,
      totalSteps: plan.steps.length
    });

    this.addLog("PLAN_START", "running", `Initiating protocol: "${plan.goal}" (${plan.steps.length} steps)`);

    for (let i = 0; i < plan.steps.length; i++) {
      if (this.isCancelled) {
        return { success: false, action: "STOP_TASK", message: "Plan aborted by Monarch." };
      }

      const step = plan.steps[i];
      this.updateStatus({ currentStepIndex: i + 1 });

      const actionObj: DesktopAction = {
        id: `step_${i}_${Date.now()}`,
        type: step.action,
        params: step.params,
        description: step.description
      };

      const stepResult = await this.executeSingleAction(actionObj);

      if (!stepResult.success && !this.isCancelled) {
        this.addLog("PLAN_ERROR", "failed", `Step ${i + 1} (${step.action}) failed: ${stepResult.message}`);
        this.updateStatus({ state: "error" });
        return {
          success: false,
          action: step.action,
          message: `Plan stopped at step ${i + 1}: ${stepResult.message}`,
          error: stepResult.error
        };
      }

      // Small pacing buffer between steps for realistic human-like execution and UI settling
      await new Promise(r => setTimeout(r, 300));
    }

    this.addLog("PLAN_COMPLETE", "success", `Task "${plan.goal}" successfully completed.`);
    this.updateStatus({
      state: "completed",
      currentTask: null,
      currentStepIndex: 0,
      totalSteps: 0
    });

    return {
      success: true,
      action: "STOP_TASK",
      message: `Completed all steps for: "${plan.goal}".`
    };
  }
}
