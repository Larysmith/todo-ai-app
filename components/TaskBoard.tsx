"use client";

import { useMemo, useState } from "react";
import { TaskCard } from "./TaskCard";
import { Badge, Button, Card, EmptyState, Input, ProgressBar, Select } from "./ui";
import { useTodos } from "@/lib/store";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  UNCATEGORIZED,
  todayIso,
  type Priority,
  type Status,
  type Todo,
} from "@/lib/types";

type ViewMode = "list" | "kanban";
type StatusFilter = Status | "all";
type PriorityFilter = Priority | "all";

const ANY = "all";

function matchesSearch(todo: Todo, query: string): boolean {
  if (!query) return true;
  const haystack = `${todo.title} ${todo.details ?? ""} ${todo.category}`.toLowerCase();
  return haystack.includes(query);
}

export function TaskBoard() {
  const [todos, { addTodo, updateTodo, moveTodo, deleteTodo }] = useTodos();

  const [view, setView] = useState<ViewMode>("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ANY);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(ANY);
  const [categoryFilter, setCategoryFilter] = useState<string>(ANY);
  const [newTitle, setNewTitle] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const todo of todos) {
      const trimmed = todo.category.trim();
      set.add(trimmed.length > 0 ? trimmed : UNCATEGORIZED);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [todos]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return todos.filter((todo) => {
      if (statusFilter !== ANY && todo.status !== statusFilter) return false;
      if (priorityFilter !== ANY && todo.priority !== priorityFilter) return false;
      if (categoryFilter !== ANY) {
        const todoCategory = todo.category.trim() || UNCATEGORIZED;
        if (todoCategory !== categoryFilter) return false;
      }
      return matchesSearch(todo, query);
    });
  }, [todos, search, statusFilter, priorityFilter, categoryFilter]);

  const done = todos.filter((todo) => todo.status === "done").length;
  const completionRate = todos.length === 0 ? 0 : (done / todos.length) * 100;
  const open = todos.length - done;

  const filtersActive =
    search.trim().length > 0 ||
    statusFilter !== ANY ||
    priorityFilter !== ANY ||
    categoryFilter !== ANY;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter(ANY);
    setPriorityFilter(ANY);
    setCategoryFilter(ANY);
  };

  const createTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    addTodo({ title, status: "todo", priority: "medium", category: "General" });
    setNewTitle("");
  };

  const overdue = todos.filter((todo) => {
    if (todo.status === "done" || !todo.dueDate) return false;
    return todo.dueDate < todayIso();
  }).length;

  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Task board</h2>
          <p className="mt-0.5 text-xs text-muted">
            {open} open · {done} done
            {overdue > 0 ? ` · ${overdue} overdue` : ""}
          </p>
        </div>
        <div
          role="group"
          aria-label="View mode"
          className="flex overflow-hidden rounded-lg border border-edge"
        >
          {(["list", "kanban"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setView(mode)}
              aria-pressed={view === mode}
              className={`h-8 px-3 text-xs font-medium capitalize transition-colors ${
                view === mode
                  ? "bg-accent text-accent-ink"
                  : "bg-panel text-muted hover:bg-panel-soft hover:text-ink"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={completionRate} label="Completion" />
        <p className="mt-1 text-[11px] text-muted">{Math.round(completionRate)}% complete</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="min-w-[10rem] flex-1"
        />
        <Select
          value={statusFilter}
          aria-label="Filter by status"
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
        >
          <option value={ANY}>All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
        <Select
          value={priorityFilter}
          aria-label="Filter by priority"
          onChange={(event) => setPriorityFilter(event.target.value as PriorityFilter)}
        >
          <option value={ANY}>All priorities</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </Select>
        <Select
          value={categoryFilter}
          aria-label="Filter by category"
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value={ANY}>All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
        {filtersActive ? (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              createTask();
            }
          }}
          placeholder="Add a task and press Enter"
          aria-label="New task title"
        />
        <Button variant="primary" onClick={createTask} disabled={!newTitle.trim()}>
          Add
        </Button>
      </div>

      <div className="mt-4 flex-1">
        {filtered.length === 0 ? (
          <EmptyState
            title={todos.length === 0 ? "No tasks yet" : "Nothing matches those filters"}
            description={
              todos.length === 0
                ? "Describe a goal in the planner, or add your first task by hand above."
                : "Try clearing a filter or searching for something else."
            }
            action={
              todos.length > 0 && filtersActive ? (
                <Button size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : view === "list" ? (
          <ul className="flex flex-col gap-2">
            {filtered.map((todo) => (
              <li key={todo.id}>
                <TaskCard
                  todo={todo}
                  onUpdate={updateTodo}
                  onMove={moveTodo}
                  onDelete={deleteTodo}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {STATUSES.map((status) => {
              const column = filtered.filter((todo) => todo.status === status);
              return (
                <div key={status} className="rounded-xl border border-edge bg-panel-soft p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-semibold">{STATUS_LABELS[status]}</h3>
                    <Badge>{column.length}</Badge>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {column.map((todo) => (
                      <li key={todo.id}>
                        <TaskCard
                          todo={todo}
                          onUpdate={updateTodo}
                          onMove={moveTodo}
                          onDelete={deleteTodo}
                        />
                      </li>
                    ))}
                    {column.length === 0 ? (
                      <li className="rounded-lg border border-dashed border-edge px-2 py-4 text-center text-[11px] text-muted">
                        Nothing here
                      </li>
                    ) : null}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
