/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from "react";
import { Theme, THEMES } from "./themes";
import { ThemeManager } from "./ThemeManager";
import { StateManager } from "../state/StateManager";

interface ThemeContextType {
  activeTheme: Theme;
  setTheme: (themeId: string) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeId, setThemeId] = useState<string>(() => {
    const saved = localStorage.getItem("igris-theme");
    return saved && THEMES[saved] ? saved : "shadow";
  });

  const activeTheme = THEMES[themeId] || THEMES.shadow;

  const setTheme = (id: string) => {
    const manager = ThemeManager.getInstance();
    let resolvedId = manager.resolveThemeId(id);

    if (resolvedId === "random") {
      const allThemes = manager.getAllThemes();
      const randomTheme = allThemes[Math.floor(Math.random() * allThemes.length)];
      resolvedId = randomTheme.id;
    }

    const targetTheme = resolvedId ? manager.getTheme(resolvedId) : null;

    if (targetTheme) {
      setThemeId(targetTheme.id);
      localStorage.setItem("igris-theme", targetTheme.id);
      
      // Update StateManager so state updates propagate nicely
      StateManager.getInstance().update({ theme: targetTheme.id as any });
      
      // Play theme change audio chime
      manager.playThemeChime(targetTheme.id);
      
      const themeName = targetTheme.name;
      const confirmMsg = targetTheme.voiceConfirmations[Math.floor(Math.random() * targetTheme.voiceConfirmations.length)];
      StateManager.getInstance().addLog(`Visual configuration updated: [${themeName}]. ${confirmMsg}`, "system");
    } else {
      console.warn(`[ThemeContext] Theme id '${id}' could not be resolved`);
    }
  };

  useEffect(() => {
    // Apply background and body transition classes
    const body = document.body;
    if (body) {
      // Remove any previous theme-related backgrounds or colors
      body.className = "min-h-screen transition-colors duration-1000 ease-in-out " + activeTheme.background;
    }
  }, [activeTheme]);

  const availableThemes = Object.values(THEMES);

  return (
    <ThemeContext.Provider value={{ activeTheme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
