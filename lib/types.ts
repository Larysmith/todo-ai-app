export type Priority = "high" | "medium" | "low";

export type Status = "todo" | "doing" | "done";

export type Engine = "claude" | "local";

export interface Todo {
  id: string;
  title: string;
  details?: string;
  priority: Priority;
  status: Status;
  category: string;
  dueDate?: string;
  focusSessions: number;
  createdAt: string;
  completedAt?: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface FocusLog {
  id: string;
  taskId?: string;
  taskTitle?: string;
  minutes: number;
  completedAt: string;
}

export interface Backup {
  version: 1;
  exportedAt: string;
  todos: Todo[];
  notes: Note[];
  focusLogs: FocusLog[];
}

export type TodoDraft = Partial<Todo> & { title: string };

export type NoteDraft = Partial<Note> & { title: string };

export const PRIORITIES: Priority[] = ["high", "medium", "low"];

export const STATUSES: Status[] = ["todo", "doing", "done"];

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const UNCATEGORIZED = "Uncategorized";

export const NOTE_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#8b5cf6",
] as const;

export const DEFAULT_NOTE_COLOR = NOTE_COLORS[0];

export function isPriority(value: unknown): value is Priority {
  return typeof value === "string" && (PRIORITIES as string[]).includes(value);
}

export function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as string[]).includes(value);
}

export function normalizeCategory(value: unknown): string {
  if (typeof value !== "string") return UNCATEGORIZED;
  const trimmed = value.trim().slice(0, 40);
  return trimmed.length > 0 ? trimmed : UNCATEGORIZED;
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime());
}

export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysIso(iso: string, days: number): string {
  const base = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(base.getTime())) return iso;
  base.setDate(base.getDate() + days);
  return todayIso(base);
}
