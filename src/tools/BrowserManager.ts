/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BrowserTab {
  id: string; // e.g. "youtube", "whatsapp" or tabId
  url: string;
  title: string;
  windowRef?: Window | null;
}

export class BrowserManager {
  private static instance: BrowserManager | null = null;
  private tabs: BrowserTab[] = [];
  private activeTabId: string | null = null;

  private static readonly SERVICE_URLS: Record<string, string> = {
    "whatsapp": "https://web.whatsapp.com",
    "whatsapp web": "https://web.whatsapp.com",
    "whatsappweb": "https://web.whatsapp.com",
    "youtube": "https://youtube.com",
    "gmail": "https://mail.google.com",
    "spotify": "https://open.spotify.com",
    "spotify web": "https://open.spotify.com",
    "spotifyweb": "https://open.spotify.com"
  };

  private constructor() {
    this.loadTabs();
  }

  public static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  private loadTabs() {
    try {
      const stored = sessionStorage.getItem("igris_browser_tabs");
      if (stored) {
        const parsed = JSON.parse(stored);
        this.tabs = parsed.map((t: any) => ({
          ...t,
          windowRef: null // Window references cannot be serialized
        }));
      }
    } catch (e) {
      console.warn("[BrowserManager] Failed to load tabs from sessionStorage", e);
    }
  }

  private saveTabs() {
    try {
      const serialized = this.tabs.map(t => ({
        id: t.id,
        url: t.url,
        title: t.title
      }));
      sessionStorage.setItem("igris_browser_tabs", JSON.stringify(serialized));
    } catch (e) {
      // ignore
    }
  }

  public normalizeUrl(urlOrKeyword: string): string {
    const clean = urlOrKeyword.trim().toLowerCase();
    
    // Check direct match
    if (BrowserManager.SERVICE_URLS[clean]) {
      return BrowserManager.SERVICE_URLS[clean];
    }
    
    // Check substring match
    for (const [key, val] of Object.entries(BrowserManager.SERVICE_URLS)) {
      if (clean.includes(key)) {
        return val;
      }
    }

    if (clean.startsWith("http://") || clean.startsWith("https://")) {
      return urlOrKeyword;
    }
    
    // Default fallback
    return `https://${urlOrKeyword}`;
  }

  private getDomain(u: string): string {
    try {
      const normalized = this.normalizeUrl(u);
      const parsed = new URL(normalized);
      return parsed.hostname.replace("www.", "").toLowerCase();
    } catch (e) {
      return u.toLowerCase();
    }
  }

  private generateTabId(url: string): string {
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const host = parsed.hostname.replace("www.", "");
      const cleanName = host.split(".")[0];
      return cleanName || "web_portal";
    } catch (e) {
      return "web_portal";
    }
  }

  private getDomainLabel(url: string): string {
    const clean = url.toLowerCase();
    if (clean.includes("whatsapp")) return "WhatsApp Web";
    if (clean.includes("youtube")) return "YouTube";
    if (clean.includes("gmail") || clean.includes("mail.google.com")) return "Gmail";
    if (clean.includes("spotify")) return "Spotify Web";

    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const host = parsed.hostname.replace("www.", "");
      const cleanName = host.split(".")[0];
      return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    } catch (e) {
      return "Web Portal";
    }
  }

  /**
   * Helper to perform smart URL/domain matching for tab reuse.
   */
  private isUrlMatch(tabUrl: string, targetUrl: string): boolean {
    const tabClean = tabUrl.toLowerCase().trim();
    const targetClean = targetUrl.toLowerCase().trim();

    // Direct match
    if (tabClean === targetClean) return true;

    // Check specific known service keywords
    const keywords = ["whatsapp", "youtube", "gmail", "spotify"];
    for (const kw of keywords) {
      if (tabClean.includes(kw) && targetClean.includes(kw)) {
        return true;
      }
    }

    try {
      const tabParsed = new URL(tabClean.startsWith("http") ? tabClean : `https://${tabClean}`);
      const targetParsed = new URL(targetClean.startsWith("http") ? targetClean : `https://${targetClean}`);

      // Clean up hostnames (remove www.)
      const tabHost = tabParsed.hostname.replace("www.", "");
      const targetHost = targetParsed.hostname.replace("www.", "");

      // If hosts are exact match
      if (tabHost === targetHost) {
        return true;
      }

      // If one host is subdomain or substring of the other (e.g. web.whatsapp.com and whatsapp.com)
      if (tabHost.includes(targetHost) || targetHost.includes(tabHost)) {
        return true;
      }
    } catch (e) {
      // Fallback to substring matching if URL parsing fails
    }

    // Keyword/domain level matching
    const targetDomain = this.getDomain(targetUrl);
    const tabDomain = this.getDomain(tabUrl);
    if (tabDomain && targetDomain && tabDomain === targetDomain) {
      return true;
    }

    if (targetDomain && tabClean.includes(targetDomain)) {
      return true;
    }
    if (tabDomain && targetClean.includes(tabDomain)) {
      return true;
    }

    return false;
  }

  /**
   * Check if the tab title matches the target URL keywords (useful if URLs are inaccessible/blocked due to permissions)
   */
  private isTitleMatch(tabTitle: string, targetUrl: string): boolean {
    const titleClean = tabTitle.toLowerCase();
    const targetClean = targetUrl.toLowerCase();

    // Check known service keywords
    const keywords = ["whatsapp", "youtube", "gmail", "spotify"];
    for (const kw of keywords) {
      if (targetClean.includes(kw) && titleClean.includes(kw)) {
        return true;
      }
    }

    // Generic match on domain name
    try {
      const targetDomain = this.getDomain(targetUrl);
      const domainName = targetDomain.split(".")[0];
      if (domainName && domainName.length > 2 && titleClean.includes(domainName)) {
        return true;
      }
    } catch (e) {}

    return false;
  }

  /**
   * Search for an existing browser tab matching the URL/domain
   */
  public async findExistingTab(url: string): Promise<{ id: string; url: string; title: string; isChromeTab?: boolean; windowId?: number } | null> {
    const targetUrl = this.normalizeUrl(url);

    // 1. Check real Chrome Extension Tabs if available
    const chromeObj = (window as any).chrome;
    if (chromeObj && chromeObj.tabs && chromeObj.tabs.query) {
      return new Promise((resolve) => {
        chromeObj.tabs.query({}, (realTabs: any[]) => {
          if (realTabs) {
            for (const tab of realTabs) {
              const tabUrl = tab.url || tab.pendingUrl || "";
              const tabTitle = tab.title || "";
              if (tabUrl && this.isUrlMatch(tabUrl, targetUrl)) {
                resolve({
                  id: String(tab.id),
                  url: tabUrl,
                  title: tabTitle,
                  isChromeTab: true,
                  windowId: tab.windowId
                });
                return;
              }
              if (tabTitle && this.isTitleMatch(tabTitle, targetUrl)) {
                resolve({
                  id: String(tab.id),
                  url: tabUrl || targetUrl,
                  title: tabTitle,
                  isChromeTab: true,
                  windowId: tab.windowId
                });
                return;
              }
            }
          }
          resolve(null);
        });
      });
    }

    // 2. Simulated: Clean up closed windows and search local tab records
    this.tabs = this.tabs.filter(t => {
      if (t.windowRef && t.windowRef.closed) {
        return false;
      }
      return true;
    });

    for (const t of this.tabs) {
      if (this.isUrlMatch(t.url, targetUrl)) {
        return {
          id: t.id,
          url: t.url,
          title: t.title,
          isChromeTab: false
        };
      }
    }

    return null;
  }

  /**
   * Opens or focuses the website URL based on existing tabs
   */
  public async openOrFocusWebsite(url: string, label?: string): Promise<{ success: boolean; message: string; openedUrl: string; action: "created" | "focused" }> {
    const fullUrl = this.normalizeUrl(url);
    const serviceName = label || this.getDomainLabel(fullUrl);

    const existing = await this.findExistingTab(fullUrl);

    if (existing) {
      // 1. Focus existing Chrome extension tab
      if (existing.isChromeTab) {
        const chromeObj = (window as any).chrome;
        if (chromeObj && chromeObj.tabs && chromeObj.tabs.update) {
          const tabId = parseInt(existing.id, 10);
          await new Promise<void>((resolve) => {
            chromeObj.tabs.update(tabId, { active: true }, () => {
              if (existing.windowId && chromeObj.windows && chromeObj.windows.update) {
                chromeObj.windows.update(existing.windowId, { focused: true }, () => {
                  resolve();
                });
              } else {
                resolve();
              }
            });
          });
          return {
            success: true,
            openedUrl: existing.url,
            action: "focused",
            message: `Switching to ${serviceName}, Monarch.`
          };
        }
      }

      // 2. Focus existing simulated window target
      const tabInList = this.tabs.find(t => t.id === existing.id);
      const winName = existing.id;
      try {
        const win = window.open(fullUrl, winName);
        if (win) {
          win.focus();
          if (tabInList) {
            tabInList.windowRef = win;
          }
        }
      } catch (e) {
        console.warn("[BrowserManager] Failed to focus or target existing named window:", e);
      }
      this.activeTabId = existing.id;
      return {
        success: true,
        openedUrl: fullUrl,
        action: "focused",
        message: `Switching to ${serviceName}, Monarch.`
      };
    }

    // 3. Open as a brand new tab
    const tabId = this.generateTabId(fullUrl);

    // Create real Chrome extension tab
    const chromeObj = (window as any).chrome;
    if (chromeObj && chromeObj.tabs && chromeObj.tabs.create) {
      await new Promise<void>((resolve) => {
        chromeObj.tabs.create({ url: fullUrl }, () => resolve());
      });
      return {
        success: true,
        openedUrl: fullUrl,
        action: "created",
        message: `Opening ${serviceName}, Monarch.`
      };
    }

    // Fallback: Open named tab window reference
    try {
      const win = window.open(fullUrl, tabId);
      if (win) {
        const newTab: BrowserTab = {
          id: tabId,
          url: fullUrl,
          title: serviceName,
          windowRef: win
        };
        this.tabs.push(newTab);
        this.activeTabId = tabId;
        this.saveTabs();
        return {
          success: true,
          openedUrl: fullUrl,
          action: "created",
          message: `Opening ${serviceName}, Monarch.`
        };
      }
    } catch (e) {
      console.warn("[BrowserManager] Failed to open new tab window:", e);
    }

    // If window.open was blocked, we STILL register the tab in our simulated list
    // so subsequent commands (like switch/close) can refer to it!
    const newTab: BrowserTab = {
      id: tabId,
      url: fullUrl,
      title: serviceName,
      windowRef: null
    };
    this.tabs.push(newTab);
    this.activeTabId = tabId;
    this.saveTabs();

    return {
      success: true,
      openedUrl: fullUrl,
      action: "created",
      message: `Opening ${serviceName}, Monarch.`
    };
  }

  /**
   * Always opens a brand new tab, bypassing the existing tab check
   */
  public async openNewTab(url?: string, label?: string): Promise<{ success: boolean; message: string; openedUrl: string; action: "created" }> {
    const targetUrl = url ? this.normalizeUrl(url) : "about:blank";
    const serviceName = label || (url ? this.getDomainLabel(targetUrl) : "tab");

    const tabId = (url ? this.generateTabId(targetUrl) : "new_tab") + "_" + Date.now();

    // Create real Chrome extension tab
    const chromeObj = (window as any).chrome;
    if (chromeObj && chromeObj.tabs && chromeObj.tabs.create) {
      await new Promise<void>((resolve) => {
        chromeObj.tabs.create({ url: targetUrl }, () => resolve());
      });
      return {
        success: true,
        openedUrl: targetUrl,
        action: "created",
        message: url ? `Opening a new ${serviceName} tab, Monarch.` : "Opening a new tab, Monarch."
      };
    }

    // Fallback: Open named tab window reference
    try {
      const win = window.open(targetUrl, tabId);
      if (win) {
        const newTab: BrowserTab = {
          id: tabId,
          url: targetUrl,
          title: serviceName,
          windowRef: win
        };
        this.tabs.push(newTab);
        this.activeTabId = tabId;
        this.saveTabs();
        return {
          success: true,
          openedUrl: targetUrl,
          action: "created",
          message: url ? `Opening a new ${serviceName} tab, Monarch.` : "Opening a new tab, Monarch."
        };
      }
    } catch (e) {
      console.warn("[BrowserManager] Failed to open new tab window:", e);
    }

    // Fallback if blocked
    const newTab: BrowserTab = {
      id: tabId,
      url: targetUrl,
      title: serviceName,
      windowRef: null
    };
    this.tabs.push(newTab);
    this.activeTabId = tabId;
    this.saveTabs();

    return {
      success: true,
      openedUrl: targetUrl,
      action: "created",
      message: url ? `Opening a new ${serviceName} tab, Monarch.` : "Opening a new tab, Monarch."
    };
  }

  /**
   * Switch to a tab by its ID or domain keyword
   */
  public async switchToTab(tabId: string): Promise<boolean> {
    const normalizedUrl = this.normalizeUrl(tabId);

    // 1. Try Chrome tabs first
    const chromeObj = (window as any).chrome;
    if (chromeObj && chromeObj.tabs && chromeObj.tabs.update) {
      const existing = await this.findExistingTab(normalizedUrl);
      if (existing && existing.isChromeTab) {
        const tId = parseInt(existing.id, 10);
        return new Promise((resolve) => {
          chromeObj.tabs.update(tId, { active: true }, (tab: any) => {
            if (chromeObj.runtime && chromeObj.runtime.lastError) {
              console.warn("[BrowserManager] Failed to focus Chrome tab:", chromeObj.runtime.lastError.message);
              resolve(false);
              return;
            }
            if (existing.windowId && chromeObj.windows && chromeObj.windows.update) {
              chromeObj.windows.update(existing.windowId, { focused: true }, () => {
                resolve(true);
              });
            } else {
              resolve(true);
            }
          });
        });
      }
    }

    // 2. Try simulated tab list
    const existing = await this.findExistingTab(normalizedUrl);
    if (existing) {
      const tabInList = this.tabs.find(t => t.id === existing.id);
      try {
        const win = window.open(existing.url, existing.id);
        if (win) {
          win.focus();
          if (tabInList) tabInList.windowRef = win;
        }
      } catch (e) {
        console.warn("[BrowserManager] Failed to target existing window on switch:", e);
      }
      this.activeTabId = existing.id;
      return true;
    }

    // 3. Fallback: If not found, open/create it!
    console.log(`[BrowserManager] Tab for '${tabId}' not found. Spawning tab...`);
    const res = await this.openOrFocusWebsite(normalizedUrl);
    return res.success;
  }

  /**
   * Alias of switchToTab matching exact naming in specs
   */
  public async switchTab(tabId: string): Promise<boolean> {
    return this.switchToTab(tabId);
  }

  /**
   * Close a specific tab or the active tab
   */
  public async closeTab(tabId?: string): Promise<boolean> {
    const targetId = tabId ? this.getDomain(tabId) : this.activeTabId;
    if (!targetId) {
      return false;
    }

    const chromeObj = (window as any).chrome;
    if (chromeObj && chromeObj.tabs && chromeObj.tabs.remove) {
      const numericId = parseInt(targetId, 10);
      if (!isNaN(numericId)) {
        return new Promise((resolve) => {
          chromeObj.tabs.remove(numericId, () => {
            resolve(true);
          });
        });
      } else {
        const existing = await this.findExistingTab(targetId);
        if (existing && existing.isChromeTab) {
          const tId = parseInt(existing.id, 10);
          return new Promise((resolve) => {
            chromeObj.tabs.remove(tId, () => {
              resolve(true);
            });
          });
        }
      }
    }

    const existing = await this.findExistingTab(targetId);
    if (existing) {
      const tabIndex = this.tabs.findIndex(t => t.id === existing.id);
      if (tabIndex !== -1) {
        const tab = this.tabs[tabIndex];
        if (tab.windowRef && !tab.windowRef.closed) {
          try {
            tab.windowRef.close();
          } catch (e) {
            console.warn("[BrowserManager] Failed to close window:", e);
          }
        }
        this.tabs.splice(tabIndex, 1);
        if (this.activeTabId === existing.id) {
          this.activeTabId = this.tabs.length > 0 ? this.tabs[this.tabs.length - 1].id : null;
        }
        this.saveTabs();
        return true;
      }
    }

    return false;
  }

  /**
   * Close the currently active tab
   */
  public async closeCurrentTab(): Promise<boolean> {
    return this.closeTab();
  }

  /**
   * Refresh the active tab
   */
  public async refreshActiveTab(): Promise<boolean> {
    const chromeObj = (window as any).chrome;
    if (chromeObj && chromeObj.tabs && chromeObj.tabs.reload) {
      return new Promise((resolve) => {
        chromeObj.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chromeObj.tabs.reload(tabs[0].id, {}, () => {
              resolve(true);
            });
          } else {
            resolve(false);
          }
        });
      });
    }

    if (this.activeTabId) {
      const tab = this.tabs.find(t => t.id === this.activeTabId);
      if (tab && tab.windowRef && !tab.windowRef.closed) {
        try {
          tab.windowRef.location.reload();
          return true;
        } catch (e) {
          console.warn("[BrowserManager] Failed to reload window reference:", e);
        }
      }
    }
    
    // Default to reloading current dashboard in simulated environment
    window.location.reload();
    return true;
  }
}
