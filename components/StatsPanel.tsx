"use client";

import { useMemo } from "react";
import { Badge, Card, CardHeader, EmptyState } from "./ui";
import { useFocusLogs, useNotes, useTodos } from "@/lib/store";
import { UNCATEGORIZED, todayIso, type Todo } from "@/lib/types";

interface StatCard {
  label: string;
  value: string;
  hint: string;
}

function Stat({ label, value, hint }: StatCard) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-3">
      <p className="text-[11px] tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function lastSevenDays(): { key: string; label: string }[] {
  const days: { key: string; label: string }[] = [];
  const now = new Date();

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - offset);
    days.push({
      key: dayKey(date),
      label: date.toLocaleDateString(undefined, { weekday: "narrow" }),
    });
  }

  return days;
}

function countByCategory(todos: Todo[], noteCategories: string[]): { category: string; tasks: number; notes: number }[] {
  const buckets = new Map<string, { tasks: number; notes: number }>();

  for (const todo of todos) {
    const key = todo.category.trim() || UNCATEGORIZED;
    const bucket = buckets.get(key) ?? { tasks: 0, notes: 0 };
    bucket.tasks += 1;
    buckets.set(key, bucket);
  }

  for (const category of noteCategories) {
    const bucket = buckets.get(category) ?? { tasks: 0, notes: 0 };
    bucket.notes += 1;
    buckets.set(category, bucket);
  }

  return [...buckets.entries()]
    .map(([category, bucket]) => ({ category, ...bucket }))
    .sort((a, b) => b.tasks + b.notes - (a.tasks + a.notes) || a.category.localeCompare(b.category));
}

export function StatsPanel() {
  const [todos] = useTodos();
  const [notes] = useNotes();
  const [logs] = useFocusLogs();

  const stats = useMemo(() => {
    const today = todayIso();
    const done = todos.filter((todo) => todo.status === "done");
    const open = todos.length - done.length;

    const dueToday = todos.filter(
      (todo) => todo.status !== "done" && todo.dueDate === today,
    ).length;
    const overdue = todos.filter(
      (todo) => todo.status !== "done" && todo.dueDate !== undefined && todo.dueDate < today,
    ).length;

    const focusToday = logs
      .filter((log) => log.completedAt.slice(0, 10) === today)
      .reduce((sum, log) => sum + log.minutes, 0);
    const focusTotal = logs.reduce((sum, log) => sum + log.minutes, 0);

    const days = lastSevenDays();
    const perDay = days.map((day) => ({
      ...day,
      count: done.filter((todo) => todo.completedAt?.slice(0, 10) === day.key).length,
    }));

    const categories = countByCategory(
      todos,
      notes.map((note) => note.category.trim() || UNCATEGORIZED),
    );

    return {
      open,
      done: done.length,
      completionRate: todos.length === 0 ? 0 : Math.round((done.length / todos.length) * 100),
      dueToday,
      overdue,
      focusToday,
      focusTotal,
      perDay,
      peak: Math.max(1, ...perDay.map((day) => day.count)),
      categories,
      categoryPeak: Math.max(1, ...categories.map((entry) => entry.tasks + entry.notes)),
    };
  }, [todos, notes, logs]);

  if (todos.length === 0 && notes.length === 0) {
    return (
      <Card>
        <CardHeader title="Stats" description="Progress at a glance" />
        <EmptyState
          title="Nothing to measure yet"
          description="Add a few tasks or notes and your completion rate, focus time and category breakdown will appear here."
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Open tasks" value={String(stats.open)} hint={`${stats.dueToday} due today`} />
        <Stat label="Completed" value={String(stats.done)} hint={`${stats.completionRate}% completion rate`} />
        <Stat
          label="Overdue"
          value={String(stats.overdue)}
          hint={stats.overdue === 0 ? "Nothing overdue" : "Worth a look today"}
        />
        <Stat label="Focus today" value={`${stats.focusToday}m`} hint={`${stats.focusTotal}m logged in total`} />
        <Stat label="Notes" value={String(notes.length)} hint={`${logs.length} focus sessions recorded`} />
        <Stat label="Categories" value={String(stats.categories.length)} hint="Across tasks and notes" />
      </div>

      <Card>
        <CardHeader
          title="Completions over the last 7 days"
          description={`Peak of ${stats.peak} in a single day`}
        />

        <div className="flex h-36 items-end justify-between gap-2">
          {stats.perDay.map((day) => {
            const heightPercent = (day.count / stats.peak) * 100;
            return (
              <div key={day.key} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] font-medium tabular-nums text-muted">
                  {day.count === 0 ? "" : day.count}
                </span>
                <div
                  title={`${day.count} completed on ${day.key}`}
                  className="w-full rounded-t-md bg-accent transition-[height] duration-300"
                  style={{ height: `${Math.max(heightPercent, 3)}%` }}
                />
                <span className="text-[11px] text-muted">{day.label}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <CardHeader title="Categories" description="How your work splits up" />
        <ul className="flex flex-col gap-2">
          {stats.categories.map((entry) => {
            const total = entry.tasks + entry.notes;
            const widthPercent = (total / stats.categoryPeak) * 100;
            return (
              <li key={entry.category} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-xs font-medium">{entry.category}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-soft">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${Math.max(widthPercent, 4)}%`,
                    }}
                  />
                </div>
                <span className="flex w-24 shrink-0 justify-end gap-1">
                  {entry.tasks > 0 ? <Badge>{entry.tasks} tasks</Badge> : null}
                  {entry.notes > 0 ? <Badge>{entry.notes} notes</Badge> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
