/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppManager } from "./AppManager";
import { KeyboardController } from "./KeyboardController";
import { MouseController } from "./MouseController";
import { SearchResultItem } from "../types";

export class BrowserController {
  private static instance: BrowserController | null = null;
  private appManager: AppManager;
  private keyboard: KeyboardController;
  private mouse: MouseController;
  private lastSearchResults: SearchResultItem[] = [];

  private constructor() {
    this.appManager = AppManager.getInstance();
    this.keyboard = KeyboardController.getInstance();
    this.mouse = MouseController.getInstance();
  }

  public static getInstance(): BrowserController {
    if (!BrowserController.instance) {
      BrowserController.instance = new BrowserController();
    }
    return BrowserController.instance;
  }

  /**
   * Launch Chrome or bring it to the foreground
   */
  public async openBrowser(url?: string) {
    const isRunning = await this.appManager.verifyAppRunning("chrome");
    if (isRunning && !url) {
      return await this.appManager.focusApp("chrome");
    }
    return await this.appManager.launchApp("chrome", url ? `"${url}"` : undefined);
  }

  /**
   * Open a specific URL in browser
   */
  public async openUrl(url: string) {
    let fullUrl = url.trim();
    if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
      fullUrl = "https://" + fullUrl;
    }
    return await this.openBrowser(fullUrl);
  }

  /**
   * Perform a web search and fetch structured search results
   */
  public async webSearch(query: string, openInBrowser: boolean = true): Promise<{ success: boolean; message: string; results: SearchResultItem[] }> {
    const encoded = encodeURIComponent(query);
    const searchUrl = `https://www.google.com/search?q=${encoded}`;

    // 1. Fetch search results summary via DuckDuckGo HTML / Instant Answers API for semantic result parsing
    try {
      const fetchUrl = `https://api.duckduckgo.com/?q=${encoded}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const json: any = await res.json();
        const items: SearchResultItem[] = [];

        // Check abstract result
        if (json.AbstractText && json.AbstractURL) {
          items.push({
            index: 1,
            title: json.Heading || query,
            url: json.AbstractURL,
            snippet: json.AbstractText
          });
        }

        // Check related topics
        if (Array.isArray(json.RelatedTopics)) {
          for (const topic of json.RelatedTopics) {
            if (topic.Text && topic.FirstURL) {
              items.push({
                index: items.length + 1,
                title: topic.Text.split(" - ")[0] || topic.Text,
                url: topic.FirstURL,
                snippet: topic.Text
              });
            }
            if (items.length >= 5) break;
          }
        }

        if (items.length > 0) {
          this.lastSearchResults = items;
        }
      }
    } catch {
      // Fallback: search results will be viewed directly in browser
    }

    // 2. Open search page in the active or new browser
    if (openInBrowser) {
      await this.openUrl(searchUrl);
    }

    return {
      success: true,
      message: `Search initiated for '${query}'.`,
      results: this.lastSearchResults
    };
  }

  /**
   * Open the first or specific search result
   */
  public async openSearchResult(index: number = 1): Promise<{ success: boolean; message: string; url?: string }> {
    // If we have parsed results in memory
    const target = this.lastSearchResults.find(r => r.index === index) || this.lastSearchResults[0];
    if (target && target.url) {
      await this.openUrl(target.url);
      return {
        success: true,
        message: `Opened result #${index}: '${target.title}'.`,
        url: target.url
      };
    }

    // Fallback: If on Google search page in active browser, navigate to the first organic result via Tab / Enter
    await this.appManager.focusApp("chrome");
    await this.keyboard.pressKey("tab");
    await this.keyboard.pressKey("enter");

    return {
      success: true,
      message: `Selected and opened the first search result in the active browser window.`
    };
  }

  /**
   * Scroll active webpage
   */
  public async scroll(direction: "up" | "down" = "down", amount: number = 400) {
    await this.appManager.focusApp("chrome");
    return await this.mouse.scroll(direction, amount);
  }

  /**
   * Open a new browser tab
   */
  public async newTab(url?: string) {
    await this.appManager.focusApp("chrome");
    await this.keyboard.sendCombo("ctrl+t");
    if (url) {
      await new Promise(r => setTimeout(r, 200));
      await this.keyboard.typeText(url, true);
    }
    return { success: true, message: "Opened new browser tab." };
  }

  /**
   * Close current browser tab
   */
  public async closeTab() {
    await this.appManager.focusApp("chrome");
    await this.keyboard.sendCombo("ctrl+w");
    return { success: true, message: "Closed active browser tab." };
  }

  /**
   * Navigate back in browser history
   */
  public async navigateBack() {
    await this.appManager.focusApp("chrome");
    await this.keyboard.sendCombo("alt+left");
    return { success: true, message: "Navigated back." };
  }

  /**
   * Navigate forward in browser history
   */
  public async navigateForward() {
    await this.appManager.focusApp("chrome");
    await this.keyboard.sendCombo("alt+right");
    return { success: true, message: "Navigated forward." };
  }
}
