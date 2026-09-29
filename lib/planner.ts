import type { Priority, TodoDraft } from "./types";
import { addDaysIso, todayIso } from "./types";

type PhaseKey = "research" | "prepare" | "execute" | "review";

interface Step {
  phase: PhaseKey;
  title: string;
  details: string;
}

interface Template {
  id: string;
  category: string;
  keywords: string[];
  steps: Step[];
}

const TEMPLATES: Template[] = [
  {
    id: "product",
    category: "Product",
    keywords: [
      "launch", "product", "release", "mvp", "feature", "ship", "saas", "startup",
      "website", "landing", "app", "prototype",
    ],
    steps: [
      { phase: "research", title: "Interview 3 target users about {goal}", details: "Write down the exact problem each person describes, in their own words. This becomes your positioning." },
      { phase: "research", title: "List 5 competitors and how they solve it", details: "Capture a screenshot and one sentence per competitor so the gaps are obvious later." },
      { phase: "prepare", title: "Write the scope and the success metric for {goal}", details: "Decide what is in v1 and what is explicitly deferred. Name one number that means success." },
      { phase: "prepare", title: "Sketch the screens or screens flow", details: "Low fidelity is fine. Optimise for the shortest path from landing to the core action." },
      { phase: "execute", title: "Build the core flow for {goal}", details: "Implement the single path that delivers the value. Skip polish until the flow works end to end." },
      { phase: "execute", title: "Add error states and empty states", details: "Every input needs a failure path and every list needs an empty state. Users find them before you do." },
      { phase: "review", title: "Test the full flow on a real device", details: "Run it on a phone on real mobile data, not just in the simulator." },
      { phase: "review", title: "Ship, then measure against the metric", details: "Push it live, share the link, and check the success metric after 48 hours." },
    ],
  },
  {
    id: "work",
    category: "Work",
    keywords: [
      "work", "project", "report", "presentation", "meeting", "deadline", "client",
      "proposal", "review", "quarter", "okr", "performance", "handover", "onboarding",
    ],
    steps: [
      { phase: "research", title: "Gather the background on {goal}", details: "Collect the last three relevant documents, decisions and numbers. One page of notes is enough." },
      { phase: "research", title: "Find out who decides and who cares", details: "Note the decision owner, the reviewers and the people who will be affected by the outcome." },
      { phase: "prepare", title: "Draft the outline for {goal}", details: "Start with the recommendation, then the evidence. Everything else supports those two parts." },
      { phase: "prepare", title: "Build the supporting material", details: "Prepare the data, the slides or the document. Keep one source of truth for the numbers." },
      { phase: "execute", title: "Run the first review round on {goal}", details: "Share early with one trusted reviewer to catch the big problems before the real audience sees it." },
      { phase: "execute", title: "Revise and circulate", details: "Apply the feedback, then send it out with a clear ask and a deadline." },
      { phase: "review", title: "Follow up on the open questions", details: "Send a short summary of decisions and owners so nothing stalls silently." },
      { phase: "review", title: "Close the loop and archive", details: "Confirm the outcome, record what changed because of your work, and file the final version." },
    ],
  },
  {
    id: "study",
    category: "Study",
    keywords: [
      "study", "exam", "course", "learn", "revision", "research", "thesis", "dissertation",
      "homework", "certification", "degree", "read", "book", "language", "maths", "science",
    ],
    steps: [
      { phase: "research", title: "Map the syllabus or scope for {goal}", details: "Turn the whole topic into a checklist so you always know what is left." },
      { phase: "research", title: "Collect the best three sources", details: "One textbook, one course and one practical example. More than that and you will not finish." },
      { phase: "prepare", title: "Set a weekly schedule for {goal}", details: "Block specific hours in your calendar rather than vague free time." },
      { phase: "prepare", title: "Do the first pass without notes", details: "Test what you actually remember before rereading. The gaps are the real syllabus." },
      { phase: "execute", title: "Work through the hard sections", details: "Spend most of your time on the 20% of material that is hardest for you." },
      { phase: "execute", title: "Explain each topic out loud in one minute", details: "If you cannot, you have not understood it yet. No notes, no script." },
      { phase: "review", title: "Run a past paper or practice quiz", details: "Under timed conditions to find both gaps and pacing problems." },
      { phase: "review", title: "Review mistakes and finish {goal}", details: "Log every mistake with the reason, then do a final light read the day before." },
    ],
  },
  {
    id: "travel",
    category: "Travel",
    keywords: ["trip", "travel", "flight", "holiday", "vacation", "tour", "visit", "itinerary", "abroad", "hotel", "booking"],
    steps: [
      { phase: "research", title: "Decide the dates and budget for {goal}", details: "Fix the total budget first, then find dates that fit inside it." },
      { phase: "research", title: "Compare flights or transport options", details: "Look at total door-to-door time and baggage rules, not just the headline price." },
      { phase: "prepare", title: "Book the transport", details: "Book first, because it sets the dates for everything else." },
      { phase: "prepare", title: "Book accommodation and key activities", details: "One free cancellation option is worth paying for on a long trip." },
      { phase: "execute", title: "Build the day-by-day itinerary", details: "Group things by area to avoid losing time in transit. Leave one slot free." },
      { phase: "execute", title: "Check documents, insurance and money", details: "Passport validity, travel insurance, foreign card and some local cash." },
      { phase: "review", title: "Prepare an offline copy of the plan", details: "Addresses, tickets and a map downloaded to your phone before you fly." },
      { phase: "review", title: "Pack and set the out-of-office message", details: "Pack two days before, then send the message with your return date." },
    ],
  },
  {
    id: "fitness",
    category: "Fitness",
    keywords: ["fitness", "gym", "workout", "run", "running", "marathon", "lose weight", "diet", "health", "yoga", "training", "muscle"],
    steps: [
      { phase: "research", title: "Set a measurable target for {goal}", details: "Pick one number and a date, such as a time, a weight or a weekly session count." },
      { phase: "research", title: "Check your baseline and any medical limits", details: "Record current numbers and speak to a professional if you have an injury or condition." },
      { phase: "prepare", title: "Plan three sessions a week", details: "Consistency beats intensity. Put them in your calendar like any other meeting." },
      { phase: "prepare", title: "Choose a progression that fits {goal}", details: "Write down exactly what changes each week so progress is not guesswork." },
      { phase: "execute", title: "Start the block and log every session", details: "Log what you actually did. Skipped sessions are data, not failure." },
      { phase: "execute", title: "Fix sleep and daily movement", details: "Most training gains are decided outside the session. Walk daily and protect sleep." },
      { phase: "review", title: "Measure progress every two weeks", details: "Same conditions, same measurements, written down." },
      { phase: "review", title: "Adjust {goal} and repeat", details: "Increase, decrease or hold based on the data. Then plan the next block." },
    ],
  },
  {
    id: "moving",
    category: "Moving",
    keywords: ["move", "moving", "flat", "apartment", "house", "relocate", "renovation", "furnish", "office move"],
    steps: [
      { phase: "research", title: "Confirm the dates and measure the new space", details: "Measure doorways, stairs and lifts before you commit to furniture." },
      { phase: "research", title: "Sort everything into keep, sell, donate, bin", details: "Be ruthless. The goal of the declutter is fewer boxes." },
      { phase: "prepare", title: "Book the movers, van or help", details: "Get two quotes and check insurance and what counts as extra." },
      { phase: "prepare", title: "Order boxes, tape and supplies", details: "Buy more boxes than you think. Underfilled boxes are the ones that break." },
      { phase: "execute", title: "Pack room by room, labelling each box", details: "Label by room and contents, not just by number. Mark fragile items twice." },
      { phase: "execute", title: "Load and move {goal}", details: "Heavy items first, fragile items last. Keep essentials with you, not in a box." },
      { phase: "review", title: "Unpack and rebuild the space", details: "Unpack in the order you will need each room, starting with the kitchen and bathroom." },
      { phase: "review", title: "Return or sell anything unused", details: "Do this two weeks after the move, while you still remember what you missed." },
    ],
  },
  {
    id: "event",
    category: "Event",
    keywords: ["event", "party", "wedding", "conference", "meetup", "birthday", "dinner", "ceremony", "workshop", "festival", "organise", "organize", "host"],
    steps: [
      { phase: "research", title: "Define the purpose and audience for {goal}", details: "Decide what people should feel or do afterwards. That sets every other choice." },
      { phase: "research", title: "Set the date, guest count and budget", details: "Work backwards from the budget and the number of guests." },
      { phase: "prepare", title: "Pick the venue and confirm the date", details: "Visit if you can. Confirm capacity, accessibility and cancellation terms." },
      { phase: "prepare", title: "Send invitations and track responses", details: "Include the date, time, place, dress code and RSVP deadline." },
      { phase: "execute", title: "Plan the run sheet for {goal}", details: "Write down the order of events, who runs each part and the fallback if something fails." },
      { phase: "execute", title: "Confirm suppliers and final numbers", details: "Re-confirm everything one week ahead with final headcount." },
      { phase: "review", title: "Run {goal} and keep a timeline", details: "Note what ran late and what ran well while it is fresh." },
      { phase: "review", title: "Thank everyone and settle costs", details: "Send thanks, pay suppliers, and write down what you would change next time." },
    ],
  },
  {
    id: "generic",
    category: "General",
    keywords: [],
    steps: [
      { phase: "research", title: "Define what \"{goal}\" actually means", details: "Write the outcome in one sentence, plus the deadline and the constraint you cannot change." },
      { phase: "research", title: "List the five biggest unknowns", details: "For each unknown, note who could answer it and how you would find out." },
      { phase: "prepare", title: "Break {goal} into milestones", details: "Three to five milestones, each small enough to finish in one sitting." },
      { phase: "prepare", title: "Check the deadline and work backwards", details: "Put the final date in your calendar first, then fill in the steps before it." },
      { phase: "execute", title: "Complete the first milestone for {goal}", details: "Finish something small end to end to build momentum and surface the real problems." },
      { phase: "execute", title: "Work the remaining milestones in order", details: "One active milestone at a time. Track blockers as they appear, not at the end." },
      { phase: "review", title: "Review the result against the goal", details: "Compare what you delivered with the outcome you defined in the first step." },
      { phase: "review", title: "Note the lessons and plan the next goal", details: "Record what worked, what did not, and what you would start with next time." },
    ],
  },
];

const PHASE_PRIORITIES: Record<PhaseKey, Priority[]> = {
  research: ["medium", "low"],
  prepare: ["high", "medium"],
  execute: ["high", "high"],
  review: ["medium", "low"],
};

function summarize(goal: string): string {
  const cleaned = goal.replace(/\s+/g, " ").trim().replace(/[.!?]+$/, "");
  if (cleaned.length === 0) return "this goal";
  const words = cleaned.split(" ").slice(0, 7).join(" ");
  return words.length < cleaned.length ? `${words}…` : words;
}

function pickTemplate(goal: string): Template {
  const haystack = goal.toLowerCase();
  let best: Template | null = null;
  let bestScore = 0;

  for (const template of TEMPLATES) {
    let score = 0;
    for (const keyword of template.keywords) {
      if (haystack.includes(keyword)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = template;
    }
  }

  return best ?? TEMPLATES[TEMPLATES.length - 1];
}

export function planFromGoal(goal: string, now: Date = new Date()): TodoDraft[] {
  const subject = summarize(goal);
  const template = pickTemplate(goal);
  const start = todayIso(now);

  return template.steps.map((step, index) => {
    const priorities = PHASE_PRIORITIES[step.phase];
    const slot = priorities.length === 2 ? index % 2 : 0;
    return {
      title: step.title.replace(/\{goal\}/g, subject),
      details: step.details.replace(/\{goal\}/g, subject),
      priority: priorities[slot],
      status: "todo",
      category: template.category,
      dueDate: addDaysIso(start, Math.floor(index / 2)),
      focusSessions: 0,
    };
  });
}
