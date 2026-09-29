import { generateTasks } from "@/lib/ai";
import { createTodo } from "@/lib/factory";

export const maxDuration = 30;

export async function POST(request: Request) {
  let goal = "";

  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null) {
      const candidate = (body as Record<string, unknown>).goal;
      if (typeof candidate === "string") goal = candidate;
    }
  } catch {
    goal = "";
  }

  const { tasks, engine } = await generateTasks(goal);

  return Response.json({ tasks: tasks.map((draft) => createTodo(draft)), engine });
}
