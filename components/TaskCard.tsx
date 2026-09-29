"use client";

import { useState } from "react";
import { Badge, Button, Input, Select, Textarea } from "./ui";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  todayIso,
  type Priority,
  type Status,
  type Todo,
} from "@/lib/types";

const PRIORITY_TONE: Record<Priority, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

function formatDue(dueDate?: string): { label: string; overdue: boolean } {
  if (!dueDate) return { label: "No due date", overdue: false };
  const parsed = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return { label: "No due date", overdue: false };

  const today = todayIso();
  const diffDays = Math.round(
    (parsed.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000,
  );

  if (diffDays === 0) return { label: "Due today", overdue: false };
  if (diffDays === 1) return { label: "Due tomorrow", overdue: false };
  if (diffDays < 0) {
    const days = Math.abs(diffDays);
    return { label: `${days} day${days === 1 ? "" : "s"} overdue`, overdue: true };
  }
  return {
    label: `Due ${parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`,
    overdue: false,
  };
}

interface TaskCardProps {
  todo: Todo;
  onUpdate: (id: string, patch: Partial<Todo>) => void;
  onMove: (id: string, status: Status) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ todo, onUpdate, onMove, onDelete }: TaskCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const due = formatDue(todo.dueDate);
  const done = todo.status === "done";

  if (editing) {
    return (
      <article className="rounded-xl border border-accent bg-panel p-3">
        <div className="flex flex-col gap-2">
          <Input
            value={todo.title}
            aria-label="Task title"
            onChange={(event) => onUpdate(todo.id, { title: event.target.value })}
          />
          <Textarea
            rows={3}
            value={todo.details ?? ""}
            aria-label="Task details"
            placeholder="Add more detail…"
            onChange={(event) => onUpdate(todo.id, { details: event.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={todo.priority}
              aria-label="Priority"
              onChange={(event) => onUpdate(todo.id, { priority: event.target.value as Priority })}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={todo.dueDate ?? ""}
              aria-label="Due date"
              onChange={(event) => onUpdate(todo.id, { dueDate: event.target.value || undefined })}
            />
          </div>
          <Input
            value={todo.category}
            aria-label="Category"
            onChange={(event) => onUpdate(todo.id, { category: event.target.value })}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={() => setEditing(false)}>
              Done
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Close
            </Button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-edge bg-panel p-3 transition-colors hover:border-edge-strong">
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={done}
          aria-label={`Mark ${todo.title} as ${done ? "not done" : "done"}`}
          onChange={(event) => onMove(todo.id, event.target.checked ? "done" : "todo")}
          className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
        />
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm font-medium break-words ${done ? "text-muted line-through" : ""}`}
          >
            {todo.title}
          </h3>
          {todo.details ? (
            <p className="mt-1 text-xs leading-relaxed break-words text-muted">{todo.details}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <Badge tone={PRIORITY_TONE[todo.priority]}>{PRIORITY_LABELS[todo.priority]}</Badge>
            <Badge>{todo.category}</Badge>
            <Badge tone={due.overdue ? "danger" : "neutral"}>{due.label}</Badge>
            {todo.focusSessions > 0 ? (
              <Badge>
                {todo.focusSessions} focus {todo.focusSessions === 1 ? "session" : "sessions"}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <Select
          value={todo.status}
          aria-label={`Status for ${todo.title}`}
          onChange={(event) => onMove(todo.id, event.target.value as Status)}
          className="h-8 text-xs"
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        {confirming ? (
          <>
            <Button size="sm" variant="danger" onClick={() => onDelete(todo.id)}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}
