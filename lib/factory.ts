import {
  DEFAULT_NOTE_COLOR,
  NOTE_COLORS,
  type Backup,
  type FocusLog,
  type Note,
  type NoteDraft,
  type Todo,
  type TodoDraft,
  isIsoDate,
  isPriority,
  isStatus,
  normalizeCategory,
} from "./types";

export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function cleanTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

export function createTodo(draft: TodoDraft): Todo {
  const now = new Date().toISOString();
  const status = isStatus(draft.status) ? draft.status : "todo";
  return {
    id: draft.id ?? createId(),
    title: cleanTitle(draft.title) || "Untitled task",
    details: typeof draft.details === "string" ? draft.details.slice(0, 2000) : undefined,
    priority: isPriority(draft.priority) ? draft.priority : "medium",
    status,
    category: normalizeCategory(draft.category ?? "General"),
    dueDate: isIsoDate(draft.dueDate) ? draft.dueDate : undefined,
    focusSessions: typeof draft.focusSessions === "number" ? Math.max(0, Math.trunc(draft.focusSessions)) : 0,
    createdAt: draft.createdAt ?? now,
    completedAt: status === "done" ? (draft.completedAt ?? now) : draft.completedAt,
  };
}

export function createNote(draft: NoteDraft): Note {
  const now = new Date().toISOString();
  return {
    id: draft.id ?? createId(),
    title: cleanTitle(draft.title) || "Untitled note",
    body: typeof draft.body === "string" ? draft.body.slice(0, 20000) : "",
    category: normalizeCategory(draft.category ?? "General"),
    pinned: draft.pinned ?? false,
    color: typeof draft.color === "string" && (NOTE_COLORS as readonly string[]).includes(draft.color)
      ? draft.color
      : DEFAULT_NOTE_COLOR,
    createdAt: draft.createdAt ?? now,
    updatedAt: now,
  };
}

export function createFocusLog(input: { taskId?: string; taskTitle?: string; minutes: number }): FocusLog {
  return {
    id: createId(),
    taskId: input.taskId,
    taskTitle: input.taskTitle,
    minutes: Math.max(0, Math.round(input.minutes)),
    completedAt: new Date().toISOString(),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.map(asRecord).filter((entry): entry is Record<string, unknown> => entry !== null);
}

export function buildBackup(todos: Todo[], notes: Note[], focusLogs: FocusLog[]): Backup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    todos,
    notes,
    focusLogs,
  };
}

export function parseBackup(raw: string): Backup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("That file is not valid JSON.");
  }

  const record = asRecord(parsed);
  if (!record) throw new Error("That file is not a Todo AI backup.");

  const todos = asArray(record.todos).map((entry) => createTodo(entry as unknown as TodoDraft));
  const notes = asArray(record.notes).map((entry) => createNote(entry as unknown as NoteDraft));
  const focusLogs = asArray(record.focusLogs).map((entry) =>
    createFocusLog({
      taskId: typeof entry.taskId === "string" ? entry.taskId : undefined,
      taskTitle: typeof entry.taskTitle === "string" ? entry.taskTitle : undefined,
      minutes: typeof entry.minutes === "number" ? entry.minutes : 0,
    }),
  );

  return {
    version: 1,
    exportedAt: typeof record.exportedAt === "string" ? record.exportedAt : new Date().toISOString(),
    todos,
    notes,
    focusLogs,
  };
}
