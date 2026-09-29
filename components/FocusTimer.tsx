"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Card, CardHeader, Select } from "./ui";
import { useFocusLogs, useTodos } from "@/lib/store";

type TimerMode = "focus" | "short" | "long";

const DURATIONS: Record<TimerMode, number> = {
  focus: 25 * 60,
  short: 5 * 60,
  long: 15 * 60,
};

const MODE_LABELS: Record<TimerMode, string> = {
  focus: "Focus",
  short: "Short break",
  long: "Long break",
};

const MODE_HINTS: Record<TimerMode, string> = {
  focus: "25 minutes of deep work",
  short: "5 minutes away from the screen",
  long: "15 minutes to properly recharge",
};

const LONG_BREAK_EVERY = 4;
const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function FocusTimer() {
  const [todos, { logFocus }] = useTodos();
  const [, addFocusLog] = useFocusLogs();

  const [mode, setMode] = useState<TimerMode>("focus");
  const [remaining, setRemaining] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const [logged, setLogged] = useState<string | null>(null);

  const deadlineRef = useRef<number | null>(null);
  const focusStreakRef = useRef(0);

  useEffect(() => {
    if (deadlineRef.current === null) return;

    const tick = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;

      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);

      if (left === 0) {
        deadlineRef.current = null;
        setRunning(false);

        if (mode === "focus") {
          focusStreakRef.current += 1;
          const next: TimerMode =
            focusStreakRef.current % LONG_BREAK_EVERY === 0 ? "long" : "short";
          setMode(next);
          setRemaining(DURATIONS[next]);
        } else {
          focusStreakRef.current = 0;
          setMode("focus");
          setRemaining(DURATIONS.focus);
        }
      }
    };

    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [mode]);

  const start = useCallback(() => {
    const seconds = remaining > 0 ? remaining : DURATIONS[mode];
    deadlineRef.current = Date.now() + seconds * 1000;
    setRemaining(seconds);
    setRunning(true);
  }, [mode, remaining]);

  const pause = useCallback(() => {
    deadlineRef.current = null;
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    deadlineRef.current = null;
    setRunning(false);
    setRemaining(DURATIONS[mode]);
  }, [mode]);

  const switchMode = useCallback((next: TimerMode) => {
    deadlineRef.current = null;
    setRunning(false);
    setMode(next);
    setRemaining(DURATIONS[next]);
  }, []);

  const openTasks = useMemo(
    () => todos.filter((todo) => todo.status !== "done"),
    [todos],
  );

  const logSession = useCallback(() => {
    const minutes = Math.round(DURATIONS[mode] / 60);
    const task = openTasks.find((todo) => todo.id === taskId);

    addFocusLog({ taskId: task?.id, taskTitle: task?.title, minutes });
    if (task) logFocus(task.id);

    setLogged(`${minutes} min logged${task ? ` for "${task.title}"` : ""}.`);
    setTimeout(() => setLogged(null), 4000);
  }, [addFocusLog, logFocus, mode, openTasks, taskId]);

  const total = DURATIONS[mode];
  const progress = total === 0 ? 0 : (total - remaining) / total;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <Card>
      <CardHeader
        title="Focus timer"
        description={MODE_HINTS[mode]}
        actions={<Badge tone={running ? "accent" : "neutral"}>{running ? "Running" : "Paused"}</Badge>}
      />

      <div
        role="group"
        aria-label="Timer mode"
        className="flex overflow-hidden rounded-lg border border-edge"
      >
        {(Object.keys(DURATIONS) as TimerMode[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => switchMode(option)}
            aria-pressed={mode === option}
            className={`h-8 flex-1 px-2 text-xs font-medium transition-colors ${
              mode === option
                ? "bg-accent text-accent-ink"
                : "bg-panel text-muted hover:bg-panel-soft hover:text-ink"
            }`}
          >
            {MODE_LABELS[option]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-center">
        <div className="relative">
          <svg width={128} height={128} viewBox="0 0 128 128" role="img" aria-label={`${formatClock(remaining)} remaining`}>
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke="var(--edge)"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r={RADIUS}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              transform="rotate(-90 64 64)"
              style={{ transition: "stroke-dashoffset 250ms linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums">{formatClock(remaining)}</span>
            <span className="text-[11px] text-muted">{MODE_LABELS[mode]}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {running ? (
          <Button variant="primary" onClick={pause}>
            Pause
          </Button>
        ) : (
          <Button variant="primary" onClick={start}>
            Start
          </Button>
        )}
        <Button onClick={reset}>Reset</Button>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <label className="text-xs text-muted" htmlFor="focus-task">
          Log this session against
        </label>
        <Select
          id="focus-task"
          value={taskId}
          onChange={(event) => setTaskId(event.target.value)}
        >
          <option value="">No task (general focus)</option>
          {openTasks.map((todo) => (
            <option key={todo.id} value={todo.id}>
              {todo.title}
            </option>
          ))}
        </Select>
        <Button onClick={logSession} disabled={openTasks.length === 0 && taskId !== ""}>
          Log a {Math.round(DURATIONS[mode] / 60)} minute session
        </Button>
        {logged ? <p className="text-xs text-success">{logged}</p> : null}
      </div>
    </Card>
  );
}
