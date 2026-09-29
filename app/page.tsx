"use client";

import { useEffect, useRef, useState } from "react";
import { GeneratePanel } from "@/components/GeneratePanel";
import { FocusTimer } from "@/components/FocusTimer";
import { NotesPanel } from "@/components/NotesPanel";
import { StatsPanel } from "@/components/StatsPanel";
import { TaskBoard } from "@/components/TaskBoard";
import { Button, Card } from "@/components/ui";
import { hydrateStores, useBackupControls, useHydrated } from "@/lib/store";

type Tab = "board" | "notes" | "stats";

const TABS: { id: Tab; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "notes", label: "Notes" },
  { id: "stats", label: "Stats" },
];

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your saved data…</span>
      <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
        <Card className="h-64 animate-pulse" />
        <Card className="h-96 animate-pulse" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const hydrated = useHydrated();
  const { exportBackup, importBackup } = useBackupControls();

  const [tab, setTab] = useState<Tab>("board");
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    hydrateStores();
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleImport = async (file: File) => {
    const raw = await file.text();
    const result = importBackup(raw);

    if (result.ok) {
      setNotice(
        `Restored ${result.counts.todos.length} tasks, ${result.counts.notes.length} notes and ${result.counts.focusLogs.length} focus sessions.`,
      );
    } else {
      setNotice(result.error);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-10 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Todo <span className="text-[var(--accent)]">AI</span>
          </h1>
          <p className="text-xs text-muted">
            Turn a goal into a plan, keep your notes, and stay focused. Everything stays in this browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={exportBackup}>
            Export
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImport(file);
              event.target.value = "";
            }}
          />
        </div>
      </header>

      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-lg border border-edge bg-panel-soft px-3 py-2 text-xs text-ink"
        >
          {notice}
        </p>
      ) : null}

      <nav className="mb-4 flex gap-1 border-b border-edge" aria-label="Sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? "border-[var(--accent)] text-ink"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        {!hydrated ? (
          <LoadingSkeleton />
        ) : tab === "board" ? (
          <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
            <div className="flex flex-col gap-4">
              <GeneratePanel />
              <FocusTimer />
            </div>
            <TaskBoard />
          </div>
        ) : tab === "notes" ? (
          <NotesPanel />
        ) : (
          <StatsPanel />
        )}
      </main>

      <footer className="mt-8 border-t border-edge pt-4 text-[11px] text-muted">
        Data is stored in this browser only. Use Export for a backup before clearing site data.
      </footer>
    </div>
  );
}
