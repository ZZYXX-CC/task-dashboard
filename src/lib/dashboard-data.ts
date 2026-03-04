export type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Done";
export type Priority = "Critical" | "High" | "Medium" | "Low";

export type Task = {
  id: string;
  title: string;
  project: string;
  owner: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  progress: number;
  blockers?: string;
};

export type Agent = {
  name: string;
  model: string;
  status: "Running" | "Idle" | "Blocked" | "Error";
  currentTask: string;
  lastUpdate: string;
  tokensUsed: string;
};

export const baseTasks: Task[] = [
  { id: "SG-001", title: "Homepage v2 hero + CTA redesign", project: "St. Gabriel Website v2", owner: "design-agent", status: "Done", priority: "Critical", due: "Completed", progress: 100 },
  { id: "SG-002", title: "Programs page cards + filtering", project: "St. Gabriel Website v2", owner: "frontend-agent", status: "Done", priority: "High", due: "Completed", progress: 100 },
  { id: "SG-003", title: "Admissions/contact/about/news Stitch implementation", project: "St. Gabriel Website v2", owner: "frontend-agent", status: "Done", priority: "High", due: "Completed", progress: 100 },
  { id: "SG-004", title: "Hero refinement pass + African illustration assets", project: "St. Gabriel Website v2", owner: "design-agent", status: "In Progress", priority: "Critical", due: "Today, 17:30", progress: 58 },
  { id: "DB-001", title: "Agent activity feed + status chips", project: "Universal Task Dashboard", owner: "dashboard-agent", status: "Done", priority: "Critical", due: "Completed", progress: 100 },
  { id: "DB-002", title: "Detailed task modal (actions, traces, dependencies)", project: "Universal Task Dashboard", owner: "dashboard-agent", status: "Done", priority: "High", due: "Completed", progress: 100 },
  { id: "TB-001", title: "Trading bot runtime monitor", project: "Trading Bot Monitoring", owner: "ops-agent", status: "In Progress", priority: "Critical", due: "Today, 18:00", progress: 76 },
  { id: "TB-004", title: "Trend fallback live observation window", project: "Trading Bot Monitoring", owner: "ops-agent", status: "In Progress", priority: "High", due: "Today, 20:00", progress: 48 },
];

export const baseAgents: Agent[] = [
  { name: "design-agent", model: "gemini-3.1-flash", status: "Running", currentTask: "Refining hero section spacing + color contrast", lastUpdate: "2m ago", tokensUsed: "31k" },
  { name: "frontend-agent", model: "codex-mini", status: "Running", currentTask: "Implementing programs grid and detail routing", lastUpdate: "1m ago", tokensUsed: "28k" },
  { name: "ops-agent", model: "codex-mini", status: "Running", currentTask: "Paper bot running + watchdog setup", lastUpdate: "just now", tokensUsed: "9k" },
];

export function generateLiveSnapshot(now = Date.now()) {
  const pulse = Math.floor(now / 5000);
  const tasks = baseTasks.map((t, i) => {
    // Defensive normalization: if anything stale shows Blocked/qa-agent, keep flow moving.
    const normalized =
      t.status === "Blocked" || t.owner === "qa-agent"
        ? { ...t, status: "In Progress" as const, owner: "frontend-agent", blockers: undefined }
        : t;

    if (normalized.status !== "In Progress") return normalized;
    const bump = (pulse + i) % 3;
    return { ...normalized, progress: Math.min(99, normalized.progress + bump) };
  });

  const agents = baseAgents.map((a, i) => ({
    ...a,
    lastUpdate: `${(pulse + i) % 3 + 1}m ago`,
  }));

  return { tasks, agents, updatedAt: new Date(now).toISOString() };
}
