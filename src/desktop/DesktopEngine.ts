/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ObserveActVerify, StatusListener } from "./ObserveActVerify";
import { 
  DesktopAction, 
  DesktopActionType, 
  DesktopStatus, 
  ExecutionResult, 
  MultiStepPlan 
} from "./types";

export class DesktopEngine {
  private static instance: DesktopEngine | null = null;
  private oav: ObserveActVerify;

  private constructor() {
    this.oav = ObserveActVerify.getInstance();
  }

  public static getInstance(): DesktopEngine {
    if (!DesktopEngine.instance) {
      DesktopEngine.instance = new DesktopEngine();
    }
    return DesktopEngine.instance;
  }

  /**
   * Execute a single validated desktop action
   */
  public async executeAction(action: DesktopAction): Promise<ExecutionResult> {
    return await this.oav.executeSingleAction(action);
  }

  /**
   * Execute a multi-step task plan
   */
  public async executePlan(plan: MultiStepPlan): Promise<ExecutionResult> {
    return await this.oav.executePlan(plan);
  }

  /**
   * Stop current ongoing task immediately
   */
  public stopTask(): void {
    this.oav.stopTask();
  }

  /**
   * Respond to a permission prompt
   */
  public handlePermissionResponse(requestId: string, approved: boolean): void {
    this.oav.handlePermissionResponse(requestId, approved);
  }

  /**
   * Get current live desktop telemetry status
   */
  public getStatus(): DesktopStatus {
    return this.oav.getStatus();
  }

  /**
   * Subscribe to live desktop status changes
   */
  public subscribe(listener: StatusListener): () => void {
    return this.oav.subscribe(listener);
  }
}
