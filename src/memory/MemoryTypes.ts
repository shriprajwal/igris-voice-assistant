export type MemoryCategory = "preference" | "personal" | "task" | "history";

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  key: string;
  value: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}
