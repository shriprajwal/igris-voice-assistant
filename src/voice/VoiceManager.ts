/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StateManager, AIMode } from "../state/StateManager";
import { VOICE_PROFILES, VoiceProfile } from "./VoiceProfiles";
import { MemoryManager } from "../memory/MemoryManager";

export class VoiceManager {
  private static instance: VoiceManager | null = null;
  private currentProfile: VoiceProfile = VOICE_PROFILES.friendly;
  private rememberPreference: boolean = false;

  private constructor() {
    // Every session starts in Friendly Mode by default
    this.currentProfile = VOICE_PROFILES.friendly;
    this.rememberPreference = false;
  }

  public static getInstance(): VoiceManager {
    if (!VoiceManager.instance) {
      VoiceManager.instance = new VoiceManager();
    }
    return VoiceManager.instance;
  }

  /**
   * Load the saved shadow mode preference from storage
   */
  private async loadPreference() {
    try {
      const memories = await MemoryManager.getInstance().getMemories("preference", "shadow_mode");
      if (memories && memories.length > 0) {
        const item = memories[0];
        if (item.value === "enabled") {
          this.currentProfile = VOICE_PROFILES.shadow;
          this.rememberPreference = true;
          // Notify StateManager
          StateManager.getInstance().update({ voiceMode: "shadow" });
        }
      }
    } catch (err) {
      console.error("[VoiceManager] Error loading voice preference:", err);
    }
  }

  /**
   * Get the active VoiceProfile
   */
  public getProfile(): VoiceProfile {
    return this.currentProfile;
  }

  /**
   * Set the voice profile
   */
  public async setProfile(mode: AIMode) {
    this.currentProfile = VOICE_PROFILES[mode];
    StateManager.getInstance().update({ voiceMode: mode });
    
    // Auto-save if they have remember enabled
    if (this.rememberPreference) {
      try {
        await MemoryManager.getInstance().saveMemory(
          "preference", 
          "shadow_mode", 
          mode === "shadow" ? "enabled" : "disabled"
        );
      } catch (err) {
        console.error("[VoiceManager] Error updating voice preference store:", err);
      }
    }
  }

  /**
   * Save preference permanently
   */
  public async enableRememberPreference() {
    this.rememberPreference = true;
    try {
      await MemoryManager.getInstance().saveMemory("preference", "shadow_mode", "enabled");
      StateManager.getInstance().addLog("Cognitive core updated: Shadow Mode will persist across sessions.", "success");
    } catch (err) {
      console.error("[VoiceManager] Error saving preference:", err);
    }
  }

  /**
   * Clear persistent preference
   */
  public async disableRememberPreference() {
    this.rememberPreference = false;
    try {
      await MemoryManager.getInstance().deleteMemory("shadow_mode");
      StateManager.getInstance().addLog("Persistence disabled. Resetting default operating mode after session.", "system");
    } catch (err) {
      console.error("[VoiceManager] Error deleting preference:", err);
    }
  }

  /**
   * Checks if persistent memory is active
   */
  public isRememberEnabled(): boolean {
    return this.rememberPreference;
  }
}
