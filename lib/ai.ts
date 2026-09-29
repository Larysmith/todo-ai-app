import { planFromGoal } from "./planner";
import type { Engine, TodoDraft } from "./types";
import { isIsoDate, isPriority, normalizeCategory } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_TOKENS = 4000;
const TIMEOUT_MS = 20000;
const MAX_GOAL_LENGTH = 400;
const MAX_TASKS = 12;

const SYSTEM_PROMPT = [
  "You are the planning engine for a to-do application.",
  "Given a single free-text goal, you return a concrete, actionable plan.",
  "",
  "Respond with a JSON array and nothing else. No prose, no markdown, no code fences.",
  "",
  "Each element must be an object with exactly these keys:",
  '  "title"      - string, a specific action starting with a verb, max 90 characters',
  '  "details"    - string, one or two sentences of useful context, max 300 characters',
  '  "priority"   - one of "high", "medium", "low"',
  '  "category"   - one or two words, Title Case, for example "Product" or "Study"',
  '  "dueDate"    - an absolute date as "YYYY-MM-DD", never a relative phrase',
  "",
  "Rules:",
  `- Return between 6 and 10 tasks.`,
  "- Order the tasks so the plan can be worked from top to bottom.",
  "- Spread due dates across consecutive days starting today.",
  "- Use the priority field for urgency, not for the order of the plan.",
  "- Every task must be doable in a single sitting.",
].join("\n");

export interface GenerateResult {
  tasks: TodoDraft[];
  engine: Engine;
}

function truncateGoal(goal: string): string {
  return goal.replace(/\s+/g, " ").trim().slice(0, MAX_GOAL_LENGTH);
}

function localResult(goal: string): GenerateResult {
  return { tasks: planFromGoal(goal), engine: "local" };
}

function extractJsonArray(text: string): unknown {
  const withoutFences = text.replace(/```(?:json)?/gi, " ").trim();
  const start = withoutFences.indexOf("[");
  const end = withoutFences.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("The model response did not contain a JSON array.");
  }
  return JSON.parse(withoutFences.slice(start, end + 1));
}

function toDraft(value: unknown): TodoDraft | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entry = value as Record<string, unknown>;

  const title = typeof entry.title === "string" ? entry.title.trim() : "";
  if (!title) return null;

  return {
    title: title.slice(0, 200),
    details: typeof entry.details === "string" ? entry.details.trim().slice(0, 2000) : undefined,
    priority: isPriority(entry.priority) ? entry.priority : "medium",
    status: "todo",
    category: normalizeCategory(entry.category ?? "General"),
    dueDate: isIsoDate(entry.dueDate) ? entry.dueDate : undefined,
    focusSessions: 0,
  };
}

async function callClaude(goal: string, apiKey: string, model: string, today: string): Promise<TodoDraft[]> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Today's date is ${today}.\n\nGoal: ${goal}` }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Anthropic responded with ${response.status}.`);
  }

  const payload = (await response.json()) as { content?: { type?: string; text?: string }[] };
  const text = (payload.content ?? [])
    .filter((block) => block?.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("");

  if (!text.trim()) throw new Error("Anthropic returned an empty response.");

  const parsed = extractJsonArray(text);
  if (!Array.isArray(parsed)) throw new Error("The model response was not a JSON array.");

  return parsed
    .slice(0, MAX_TASKS)
    .map(toDraft)
    .filter((draft): draft is TodoDraft => draft !== null);
}

export async function generateTasks(goal: string): Promise<GenerateResult> {
  const safeGoal = truncateGoal(goal);
  if (!safeGoal) return localResult(safeGoal);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return localResult(safeGoal);

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  try {
    const tasks = await callClaude(safeGoal, apiKey, model, new Date().toISOString().slice(0, 10));
    if (tasks.length === 0) return localResult(safeGoal);
    return { tasks, engine: "claude" };
  } catch {
    return localResult(safeGoal);
  }
}
