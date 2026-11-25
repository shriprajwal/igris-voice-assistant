/**
 * IGRIS Desktop Automation Engine Test Suite
 */

import { ActionValidator } from "../src/desktop/ActionValidator";
import { ActionRegistry } from "../src/desktop/ActionRegistry";
import { DesktopEngine } from "../src/desktop/DesktopEngine";
import { BrowserController } from "../src/desktop/execution/BrowserController";
import { SystemController } from "../src/desktop/execution/SystemController";
import { NativeBridge } from "../src/desktop/execution/NativeBridge";

async function runTests() {
  console.log("=== IGRIS DESKTOP CONTROL ENGINE TEST SUITE ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Native Bridge Ping & System Info
  console.log("\n--- Testing Native Bridge ---");
  const bridge = NativeBridge.getInstance();
  const pingRes = await bridge.runCommand("ping");
  assert(pingRes.success === true, "NativeBridge ping succeeds");

  const sysRes = await bridge.runCommand("get_system_info");
  assert(sysRes.success === true && !!sysRes.data?.os, "NativeBridge retrieves OS and machine info");

  // 2. Action Validator Security Checks
  console.log("\n--- Testing Action Validator & Security ---");
  const validator = ActionValidator.getInstance();

  const validAction = validator.validate({
    id: "1",
    type: "OPEN_APPLICATION",
    params: { appName: "chrome" }
  });
  assert(validAction.valid === true, "Valid OPEN_APPLICATION action passes validation");

  const injectionAction = validator.validate({
    id: "2",
    type: "OPEN_APPLICATION",
    params: { appName: "chrome; rm -rf /" }
  });
  assert(injectionAction.valid === false, "Command injection with semicolon ';' is strictly rejected");

  const pipeAction = validator.validate({
    id: "3",
    type: "TYPE_TEXT",
    params: { text: "hello | dangerous" }
  });
  assert(pipeAction.valid === false, "Command injection with pipe '|' is strictly rejected");

  const sensitiveAction = validator.validate({
    id: "4",
    type: "CREATE_FOLDER",
    params: { parentFolder: "Documents", folderName: "TestFolder" }
  });
  assert(sensitiveAction.valid === true && sensitiveAction.requiresPermission === true, "CREATE_FOLDER correctly flags requiresPermission=true");

  const unregisteredAction = validator.validate({
    id: "5",
    type: "ARBITRARY_CODE" as any,
    params: {}
  });
  assert(unregisteredAction.valid === false, "Unregistered action type is rejected");

  // 3. Desktop Engine Execution
  console.log("\n--- Testing Desktop Engine Execution & Observer Loop ---");
  const engine = DesktopEngine.getInstance();

  const sysInfoResult = await engine.executeAction({
    id: "act_sys",
    type: "SYSTEM_INFO",
    params: {}
  });
  assert(sysInfoResult.success === true, "Engine executes SYSTEM_INFO action");

  const getActiveWin = await engine.executeAction({
    id: "act_win",
    type: "GET_ACTIVE_WINDOW",
    params: {}
  });
  assert(getActiveWin.success === true, "Engine executes GET_ACTIVE_WINDOW action");

  // 4. STOP Task & Cancellation
  console.log("\n--- Testing Stop Task Directive ---");
  let statusObserved: any = false;
  const unsub = engine.subscribe((status) => {
    if (status.state === "stopped") {
      statusObserved = true;
    }
  });

  engine.stopTask();
  assert(statusObserved === true, "stopTask() transitions engine to 'stopped' state");
  unsub();

  // 5. Multi-Step Task Execution
  console.log("\n--- Testing Multi-Step Task Execution ---");
  const planResult = await engine.executePlan({
    goal: "Verify system and check active window",
    steps: [
      {
        action: "SYSTEM_INFO",
        params: {},
        description: "Check system hardware and storage"
      },
      {
        action: "GET_ACTIVE_WINDOW",
        params: {},
        description: "Identify current active window"
      }
    ]
  });
  assert(planResult.success === true, "Engine executes multi-step plan with sequential verification");

  // 6. Permission Prompt Lifecycle
  console.log("\n--- Testing Permission Prompt Lifecycle ---");
  const permSub = engine.subscribe((status) => {
    if (status.pendingPermission) {
      console.log(`Simulating Monarch approval for permission request: ${status.pendingPermission.id}`);
      engine.handlePermissionResponse(status.pendingPermission.id, true);
    }
  });

  const permResult = await engine.executeAction({
    id: "act_perm",
    type: "CREATE_FOLDER",
    params: { parentFolder: "Documents", folderName: "IgrisTestTempFolder" }
  });
  permSub();
  assert(permResult.success === true, "Engine handles interactive authorization approval correctly");

  // Clean up test folder if created
  try {
    const fs = await import("fs");
    const path = await import("path");
    const testPath = path.resolve(process.env.USERPROFILE || "", "Documents", "IgrisTestTempFolder");
    if (fs.existsSync(testPath)) {
      fs.rmdirSync(testPath);
    }
  } catch {}

  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed with error:", e);
  process.exit(1);
});
