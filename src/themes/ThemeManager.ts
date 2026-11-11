/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Theme, THEMES } from "./themes";
import { CoreSoundEffects } from "../audio/CoreSoundEffects";

export class ThemeManager {
  private static instance: ThemeManager | null = null;
  private customThemes: Record<string, Theme> = {};

  private constructor() {}

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * Play the unique audio chime associated with a given theme
   */
  public playThemeChime(id: string) {
    CoreSoundEffects.getInstance().playThemeChime(id);
  }

  /**
   * Retrieve a theme by its ID (checks built-ins and custom themes)
   */
  public getTheme(id: string): Theme | null {
    const key = id.toLowerCase().trim();
    if (THEMES[key]) return THEMES[key];
    if (this.customThemes[key]) return this.customThemes[key];
    return null;
  }

  /**
   * Register a new theme dynamically for future expansion
   */
  public registerTheme(theme: Theme) {
    const key = theme.id.toLowerCase().trim();
    this.customThemes[key] = theme;
    console.log(`[ThemeManager] New theme registered: ${theme.name} (${theme.id})`);
  }

  /**
   * Get all registered or built-in themes
   */
  public getAllThemes(): Theme[] {
    return [...Object.values(THEMES), ...Object.values(this.customThemes)];
  }

  /**
   * Resolve vocal inputs or fuzzy phrases to a specific theme ID
   */
  public resolveThemeId(phrase: string): string | null {
    const clean = phrase.toLowerCase().trim();

    // Direct match check
    if (this.getTheme(clean)) {
      return clean;
    }

    // Fuzzy matching rules for natural voice commands
    if (clean.includes("shadow") || clean.includes("stealth") || clean.includes("dark")) {
      return "shadow";
    }
    if (clean.includes("cyber") || clean.includes("navy") || clean.includes("blue")) {
      return "cyber";
    }
    if (clean.includes("crimson") || clean.includes("red") || clean.includes("rose") || clean.includes("core")) {
      return "crimson";
    }
    if (clean.includes("emerald") || clean.includes("green") || clean.includes("matrix") || clean.includes("graphite")) {
      return "emerald";
    }
    if (clean.includes("purple") || clean.includes("royal") || clean.includes("violet") || clean.includes("fuchsia")) {
      return "purple";
    }
    if (clean.includes("white") || clean.includes("arctic") || clean.includes("frosted") || clean.includes("light")) {
      return "white";
    }
    if (clean.includes("gold") || clean.includes("elite") || clean.includes("yellow") || clean.includes("amber")) {
      return "gold";
    }
    if (clean.includes("neon") || clean.includes("rgb") || clean.includes("rainbow") || clean.includes("reactive")) {
      return "neon";
    }
    if (clean.includes("random") || clean.includes("surprise") || clean.includes("any")) {
      return "random";
    }

    return null;
  }
}
