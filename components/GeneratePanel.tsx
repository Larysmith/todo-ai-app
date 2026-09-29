"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge, Button, Card, CardHeader, Spinner, Textarea } from "./ui";
import { useTodos } from "@/lib/store";
import { PRIORITY_LABELS, type Engine, type Todo } from "@/lib/types";

const EXAMPLES = [
  "Launch the marketing site for my bakery",
  "Prepare for a data structures exam in three weeks",
  "Plan a week in Lisbon with a tight budget",
];

interface GenerateResponse {
  tasks: Todo[];
  engine: Engine;
}

function isGenerateResponse(value: unknown): value is GenerateResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.tasks) && (candidate.engine === "claude" || candidate.engine === "local");
}

function formatDate(value?: string): string {
  if (!value) return "No date";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "No date";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GeneratePanel() {
  const [, { addTodos }] = useTodos();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [addedCount, setAddedCount] = useState(0);

  const canGenerate = goal.trim().length > 2 && !loading;

  const togglePicked = useCallback((id: string) => {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const generate = useCallback(async () => {
    const trimmed = goal.trim();
    if (trimmed.length < 3) return;

    setLoading(true);
    setError(null);
    setAddedCount(0);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goal: trimmed }),
      });

      const payload: unknown = await response.json();
      if (!isGenerateResponse(payload)) throw new Error("Unexpected response from the planner.");

      setResult(payload);
      setPicked(new Set(payload.tasks.map((task) => task.id)));
    } catch {
      setResult(null);
      setError(
        "Could not reach the planner. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [goal]);

  const selected = useMemo(() => {
    if (!result) return [] as Todo[];
    return result.tasks.filter((task) => picked.has(task.id));
  }, [result, picked]);

  const addSelected = useCallback(() => {
    if (selected.length === 0) return;
    addTodos(
      selected.map((task) => ({
        title: task.title,
        details: task.details,
        priority: task.priority,
        status: "todo",
        category: task.category,
        dueDate: task.dueDate,
        focusSessions: 0,
      })),
    );
    setAddedCount((count) => count + selected.length);
    setResult(null);
    setPicked(new Set());
  }, [addTodos, selected]);

  const discard = useCallback(() => {
    setResult(null);
    setPicked(new Set());
    setAddedCount(0);
  }, []);

  return (
    <Card>
      <CardHeader
        title="Plan with AI"
        description="Describe a goal and get a task plan you can edit before it hits your board."
      />

      <Textarea
        rows={3}
        value={goal}
        onChange={(event) => setGoal(event.target.value)}
        placeholder="e.g. Organise a 500-person conference"
        aria-label="Goal"
      />

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setGoal(example)}
            className="rounded-full border border-edge px-2 py-1 text-[11px] text-muted transition-colors hover:bg-panel-soft hover:text-ink"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button variant="primary" onClick={generate} disabled={!canGenerate}>
          {loading ? <Spinner /> : null}
          {loading ? "Planning…" : "Generate plan"}
        </Button>
        {result ? (
          <Badge tone={result.engine === "claude" ? "accent" : "neutral"}>
            {result.engine === "claude" ? "Generated with Claude" : "Generated with the built-in planner"}
          </Badge>
        ) : null}
      </div>

      {addedCount > 0 ? (
        <p className="mt-3 text-xs text-success">
          Added {addedCount} task{addedCount === 1 ? "" : "s"} to your board.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-xs text-danger">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              Review {result.tasks.length} suggested task{result.tasks.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <Button size="sm" onClick={addSelected} disabled={selected.length === 0}>
                Add selected ({selected.length})
              </Button>
              <Button size="sm" variant="ghost" onClick={discard}>
                Discard
              </Button>
            </div>
          </div>

          <ul className="mt-2 flex flex-col gap-1.5">
            {result.tasks.map((task) => (
              <li key={task.id}>
                <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-edge bg-panel-soft p-2.5 transition-colors hover:border-edge-strong">
                  <input
                    type="checkbox"
                    checked={picked.has(task.id)}
                    onChange={() => togglePicked(task.id)}
                    className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{task.title}</span>
                    {task.details ? (
                      <span className="mt-0.5 block text-xs text-muted">{task.details}</span>
                    ) : null}
                    <span className="mt-1.5 flex flex-wrap items-center gap-1">
                      <Badge>{task.category}</Badge>
                      <Badge>{PRIORITY_LABELS[task.priority]}</Badge>
                      <Badge>{formatDate(task.dueDate)}</Badge>
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
