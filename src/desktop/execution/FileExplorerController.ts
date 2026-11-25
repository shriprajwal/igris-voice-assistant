/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NativeBridge } from "./NativeBridge";
import path from "path";

export class FileExplorerController {
  private static instance: FileExplorerController | null = null;
  private bridge: NativeBridge;

  private constructor() {
    this.bridge = NativeBridge.getInstance();
  }

  public static getInstance(): FileExplorerController {
    if (!FileExplorerController.instance) {
      FileExplorerController.instance = new FileExplorerController();
    }
    return FileExplorerController.instance;
  }

  /**
   * Open File Explorer at a specific directory or standard folder
   */
  public async openFolder(folder: string) {
    return await this.bridge.runCommand("open_folder", { folder });
  }

  /**
   * Open a nested folder inside the currently open or specified directory
   */
  public async navigateNestedFolder(target: string) {
    return await this.bridge.runCommand("open_folder", { folder: target });
  }

  /**
   * Open the nth item (folder or file) in view
   */
  public async openOrdinalItem(ordinal: number | string, itemType: string = "folder") {
    return await this.bridge.runCommand("open_folder", { folder: String(ordinal) });
  }

  /**
   * Search for files by name/pattern
   */
  public async searchFiles(query: string, folder?: string) {
    return await this.bridge.runCommand("search_files", { query, folder: folder || "" });
  }

  /**
   * Open a file with its default system association
   */
  public async openFile(filePath: string) {
    return await this.bridge.runCommand("open_file", { filePath });
  }

  /**
   * Create a new folder safely
   */
  public async createFolder(parentFolder: string, folderName: string) {
    // Basic sanitization
    const sanitizedName = folderName.replace(/[<>:"/\\|?*]/g, "").trim();
    if (!sanitizedName) {
      return {
        success: false,
        message: "Invalid folder name provided.",
        error: "Invalid name"
      };
    }
    return await this.bridge.runCommand("create_folder", {
      parentFolder,
      folderName: sanitizedName
    });
  }
}
