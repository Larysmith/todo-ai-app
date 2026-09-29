"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { buildBackup, createFocusLog, createNote, createTodo, parseBackup } from "./factory";
import type { Backup, FocusLog, Note, NoteDraft, Status, Todo, TodoDraft } from "./types";
import { isPriority, isStatus } from "./types";

export const STORAGE_KEYS = {
  todos: "todo-ai.todos.v1",
  notes: "todo-ai.notes.v1",
  focus: "todo-ai.focus.v1",
  hydrated: "todo-ai.hydrated.v1",
} as const;

const EMPTY_TODOS: Todo[] = [];
const EMPTY_NOTES: Note[] = [];
const EMPTY_FOCUS_LOGS: FocusLog[] = [];

type Listener = () => void;
type Updater<T> = T | ((previous: T) => T);

class LocalStore<T> {
  private value: T;
  private hydrated = false;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly key: string,
    private readonly initial: T,
    private readonly persist: boolean = true,
  ) {
    this.value = initial;
  }

  readonly subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): T => this.value;

  readonly getServerSnapshot = (): T => this.initial;

  get isHydrated(): boolean {
    return this.hydrated;
  }

  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    this.hydrated = true;

    let next = this.initial;
    if (this.persist) {
      try {
        const raw = window.localStorage.getItem(this.key);
        if (raw !== null) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(this.initial) && Array.isArray(parsed)) next = parsed as T;
        }
      } catch {
        next = this.initial;
      }
    }

    if (next !== this.value) {
      this.value = next;
      this.emit();
    }
  }

  set(updater: Updater<T>): void {
    const next = typeof updater === "function" ? (updater as (p: T) => T)(this.value) : updater;
    if (Object.is(next, this.value)) return;
    this.value = next;
    if (this.persist) this.write(next);
    this.emit();
  }

  reset(): void {
    this.set(this.initial);
  }

  private write(value: T): void {
    try {
      window.localStorage.setItem(this.key, JSON.stringify(value));
    } catch {
      return;
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

const registry = new Map<string, LocalStore<unknown>>();

export function getLocalStore<T>(key: string, initial: T): LocalStore<T> {
  const existing = registry.get(key);
  if (existing) return existing as LocalStore<T>;
  const created = new LocalStore<T>(key, initial);
  registry.set(key, created as LocalStore<unknown>);
  return created;
}

const todosStore = getLocalStore<Todo[]>(STORAGE_KEYS.todos, EMPTY_TODOS);
const notesStore = getLocalStore<Note[]>(STORAGE_KEYS.notes, EMPTY_NOTES);
const focusStore = getLocalStore<FocusLog[]>(STORAGE_KEYS.focus, EMPTY_FOCUS_LOGS);
const hydratedStore = new LocalStore<boolean>(STORAGE_KEYS.hydrated, false, false);

export interface TodoActions {
  addTodo: (draft: TodoDraft) => Todo;
  addTodos: (drafts: TodoDraft[]) => Todo[];
  updateTodo: (id: string, patch: Partial<Todo>) => void;
  moveTodo: (id: string, status: Status) => void;
  deleteTodo: (id: string) => void;
  logFocus: (id: string) => void;
  replaceAll: (next: Todo[]) => void;
}

export interface NoteActions {
  addNote: (draft: NoteDraft) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  replaceAll: (next: Note[]) => void;
}

export function hydrateStores(): void {
  todosStore.hydrate();
  notesStore.hydrate();
  focusStore.hydrate();
  hydratedStore.set(true);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(hydratedStore.subscribe, hydratedStore.getSnapshot, () => false);
}

export function useLocalStore<T>(key: string, initial: T): [T, (updater: Updater<T>) => void] {
  const [store] = useState(() => getLocalStore(key, initial));
  const value = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const update = useCallback((updater: Updater<T>) => store.set(updater), [store]);
  return [value, update];
}

export function useTodos(): [Todo[], TodoActions] {
  const [todos, setTodos] = useLocalStore(STORAGE_KEYS.todos, EMPTY_TODOS);

  const addTodo = useCallback(
    (draft: TodoDraft) => {
      const todo = createTodo(draft);
      setTodos((previous) => [...previous, todo]);
      return todo;
    },
    [setTodos],
  );

  const addTodos = useCallback(
    (drafts: TodoDraft[]) => {
      if (drafts.length === 0) return [];
      const created = drafts.map((draft) => createTodo(draft));
      setTodos((previous) => [...previous, ...created]);
      return created;
    },
    [setTodos],
  );

  const updateTodo = useCallback(
    (id: string, patch: Partial<Todo>) => {
      setTodos((previous) =>
        previous.map((todo) => {
          if (todo.id !== id) return todo;
          const merged: Todo = { ...todo, ...patch, id: todo.id };
          if (!isPriority(merged.priority)) merged.priority = todo.priority;
          if (!isStatus(merged.status)) merged.status = todo.status;
          if (merged.status === "done" && !merged.completedAt) {
            merged.completedAt = new Date().toISOString();
          }
          if (merged.status !== "done") merged.completedAt = undefined;
          return merged;
        }),
      );
    },
    [setTodos],
  );

  const moveTodo = useCallback(
    (id: string, status: Status) => updateTodo(id, { status }),
    [updateTodo],
  );

  const deleteTodo = useCallback(
    (id: string) => setTodos((previous) => previous.filter((todo) => todo.id !== id)),
    [setTodos],
  );

  const logFocus = useCallback((id: string) => {
    setTodos((previous) =>
      previous.map((todo) =>
        todo.id === id ? { ...todo, focusSessions: todo.focusSessions + 1 } : todo,
      ),
    );
  }, [setTodos]);

  const replaceAll = useCallback((next: Todo[]) => setTodos(next), [setTodos]);

  return [
    todos,
    { addTodo, addTodos, updateTodo, moveTodo, deleteTodo, logFocus, replaceAll },
  ];
}

export function useNotes(): [Note[], NoteActions] {
  const [notes, setNotes] = useLocalStore(STORAGE_KEYS.notes, EMPTY_NOTES);

  const addNote = useCallback(
    (draft: NoteDraft) => {
      const note = createNote(draft);
      setNotes((previous) => [note, ...previous]);
      return note;
    },
    [setNotes],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      setNotes((previous) =>
        previous.map((note) =>
          note.id === id
            ? { ...note, ...patch, id: note.id, updatedAt: new Date().toISOString() }
            : note,
        ),
      );
    },
    [setNotes],
  );

  const deleteNote = useCallback(
    (id: string) => setNotes((previous) => previous.filter((note) => note.id !== id)),
    [setNotes],
  );

  const togglePin = useCallback(
    (id: string) => {
      setNotes((previous) =>
        previous.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note)),
      );
    },
    [setNotes],
  );

  const replaceAll = useCallback((next: Note[]) => setNotes(next), [setNotes]);

  return [notes, { addNote, updateNote, deleteNote, togglePin, replaceAll }];
}

export function useFocusLogs(): [FocusLog[], (log: { taskId?: string; taskTitle?: string; minutes: number }) => void, (next: FocusLog[]) => void] {
  const [logs, setLogs] = useLocalStore(STORAGE_KEYS.focus, EMPTY_FOCUS_LOGS);

  const addFocusLog = useCallback(
    (log: { taskId?: string; taskTitle?: string; minutes: number }) => {
      setLogs((previous) => [...previous, createFocusLog(log)]);
    },
    [setLogs],
  );

  const replaceAll = useCallback((next: FocusLog[]) => setLogs(next), [setLogs]);

  return [logs, addFocusLog, replaceAll];
}

export type ImportResult = { ok: true; counts: Backup } | { ok: false; error: string };

export function useBackupControls(): {
  exportBackup: () => void;
  importBackup: (raw: string) => ImportResult;
} {
  const exportBackup = useCallback(() => {
    const backup = buildBackup(todosStore.getSnapshot(), notesStore.getSnapshot(), focusStore.getSnapshot());
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `todo-ai-backup-${backup.exportedAt.slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  const importBackup = useCallback((raw: string): ImportResult => {
    try {
      const backup = parseBackup(raw);
      todosStore.set(backup.todos);
      notesStore.set(backup.notes);
      focusStore.set(backup.focusLogs);
      return { ok: true, counts: backup };    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Could not read that file.",
      };
    }
  }, []);

  return { exportBackup, importBackup };
}
