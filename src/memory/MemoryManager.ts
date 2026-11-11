import { MemoryStore } from "./MemoryStore";
import { MemoryItem, MemoryCategory } from "./MemoryTypes";

export class MemoryManager {
  private static instance: MemoryManager | null = null;
  private store: MemoryStore;
  private memories: MemoryItem[] = [];
  private isInitialized = false;

  private constructor() {
    this.store = new MemoryStore();
  }

  public static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;
    await this.store.init();
    this.memories = await this.store.getAll();
    this.isInitialized = true;
    console.log(`IGRIS MemoryManager: Loaded ${this.memories.length} memories.`);
  }

  async getMemories(category?: MemoryCategory, query?: string): Promise<MemoryItem[]> {
    await this.init();
    // Always refresh from store to ensure we have the latest
    this.memories = await this.store.getAll();
    
    let filtered = this.memories;
    if (category) {
      filtered = filtered.filter(m => m.category === category);
    }
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(m => 
        m.key.toLowerCase().includes(q) || 
        m.value.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  async saveMemory(category: MemoryCategory, key: string, value: string): Promise<MemoryItem> {
    await this.init();
    
    // Normalize key
    const cleanKey = key.trim();
    const cleanVal = value.trim();

    // Check if a memory with the same key already exists in this category
    const existingIndex = this.memories.findIndex(
      m => m.category === category && m.key.toLowerCase() === cleanKey.toLowerCase()
    );

    const now = new Date().toISOString();
    let item: MemoryItem;

    if (existingIndex > -1) {
      const existing = this.memories[existingIndex];
      item = {
        ...existing,
        value: cleanVal,
        updatedAt: now
      };
      this.memories[existingIndex] = item;
    } else {
      item = {
        id: `mem_${Math.random().toString(36).substring(2, 11)}`,
        category,
        key: cleanKey,
        value: cleanVal,
        createdAt: now,
        updatedAt: now
      };
      this.memories.push(item);
    }

    await this.store.save(item);
    return item;
  }

  async deleteMemory(keyOrId: string): Promise<boolean> {
    await this.init();
    
    const index = this.memories.findIndex(
      m => m.id === keyOrId || m.key.toLowerCase() === keyOrId.toLowerCase()
    );

    if (index > -1) {
      const item = this.memories[index];
      this.memories.splice(index, 1);
      await this.store.delete(item.id);
      return true;
    }
    return false;
  }

  async clearAllMemories(): Promise<void> {
    await this.init();
    this.memories = [];
    await this.store.clear();
  }

  getFormattedMemoriesForSystemInstruction(): string {
    if (this.memories.length === 0) {
      return "No stored memories found.";
    }

    const categories: Record<MemoryCategory, string[]> = {
      personal: [],
      preference: [],
      task: [],
      history: []
    };

    this.memories.forEach(m => {
      categories[m.category].push(`- ${m.key}: ${m.value}`);
    });

    let formatted = "STORED MONARCH DETAILS & MEMORIES:\n";
    
    if (categories.personal.length > 0) {
      formatted += "\nPersonal Information:\n" + categories.personal.join("\n");
    }
    if (categories.preference.length > 0) {
      formatted += "\nUser Preferences:\n" + categories.preference.join("\n");
    }
    if (categories.task.length > 0) {
      formatted += "\nTasks & Reminders:\n" + categories.task.join("\n");
    }
    if (categories.history.length > 0) {
      formatted += "\nHistorical Information:\n" + categories.history.join("\n");
    }

    return formatted;
  }
}
