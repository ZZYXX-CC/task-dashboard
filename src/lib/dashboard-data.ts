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
  status: "Running" | "Idle" | "Error";
  currentTask: string;
  lastUpdate: string;
  tokensUsed: string;
};

export const baseTasks: Task[] = [
  { id: "SG-001", title: "Homepage v2 hero + CTA redesign", project: "St. Gabriel Website v2", owner: "design-agent", status: "In Progress", priority: "Critical", due: "Today, 10:30", progress: 72 },
  { id: "SG-002", title: "Programs page cards + filtering", project: "St. Gabriel Website v2", owner: "frontend-agent", status: "In Progress", priority: "High", due: "Today, 12:00", progress: 54 },
  { id: "SG-003", title: "Admissions form validation and UX", project: "St. Gabriel Website v2", owner: "qa-agent", status: "Blocked", priority: "High", due: "Today, 13:30", progress: 38, blockers: "Need final required fields list" },
  { id: "DB-001", title: "Agent activity feed + status chips", project: "Universal Task Dashboard", owner: "dashboard-agent", status: "In Progress", priority: "Critical", due: "Today, 11:00", progress: 80 },
  { id: "TB-001", title: "Trading bot runtime monitor", project: "Trading Bot Monitoring", owner: "ops-agent", status: "In Progress", priority: "Critical", due: "Today, 08:30", progress: 62 },
  { id: "TB-004", title: "Watchdog auto-restart for bot session", project: "Trading Bot Monitoring", owner: "ops-agent", status: "In Progress", priority: "High", due: "Today, 09:15", progress: 35 },
];

export const baseAgents: Agent[] = [
  { name: "design-agent", model: "gemini-3.1-flash", status: "Running", currentTask: "Refining hero section spacing + color contrast", lastUpdate: "2m ago", tokensUsed: "31k" },
  { name: "frontend-agent", model: "codex-mini", status: "Running", currentTask: "Implementing programs grid and detail routing", lastUpdate: "1m ago", tokensUsed: "28k" },
  { name: "qa-agent", model: "codex-mini", status: "Error", currentTask: "Admissions form schema mismatch", lastUpdate: "30s ago", tokensUsed: "10k" },
  { name: "ops-agent", model: "codex-mini", status: "Running", currentTask: "Paper bot running + watchdog setup", lastUpdate: "just now", tokensUsed: "9k" },
];

export function generateLiveSnapshot(now = Date.now()) {
  const pulse = Math.floor(now / 5000);
  const tasks = baseTasks.map((t, i) => {
    if (t.status !== "In Progress") return t;
    const bump = (pulse + i) % 3;
    return { ...t, progress: Math.min(99, t.progress + bump) };
  });

  const agents = baseAgents.map((a, i) => ({
    ...a,
    lastUpdate: `${(pulse + i) % 3 + 1}m ago`,
    status: a.name === "qa-agent" && pulse % 4 === 0 ? "Running" : a.status,
  }));

  return { tasks, agents, updatedAt: new Date(now).toISOString() };
}
