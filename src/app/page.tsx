"use client";

import { useMemo, useState } from "react";

type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Done";
type Priority = "Critical" | "High" | "Medium" | "Low";

type Task = {
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

type Agent = {
  name: string;
  model: string;
  status: "Running" | "Idle" | "Error";
  currentTask: string;
  lastUpdate: string;
  tokensUsed: string;
};

const tasks: Task[] = [
  {
    id: "SG-001",
    title: "Homepage v2 hero + CTA redesign",
    project: "St. Gabriel Website v2",
    owner: "design-agent",
    status: "In Progress",
    priority: "Critical",
    due: "Today, 10:30",
    progress: 72,
  },
  {
    id: "SG-002",
    title: "Programs page cards + filtering",
    project: "St. Gabriel Website v2",
    owner: "frontend-agent",
    status: "In Progress",
    priority: "High",
    due: "Today, 12:00",
    progress: 54,
  },
  {
    id: "SG-003",
    title: "Admissions form validation and UX",
    project: "St. Gabriel Website v2",
    owner: "qa-agent",
    status: "Blocked",
    priority: "High",
    due: "Today, 13:30",
    progress: 38,
    blockers: "Need final required fields list",
  },
  {
    id: "DB-001",
    title: "Agent activity feed + status chips",
    project: "Universal Task Dashboard",
    owner: "dashboard-agent",
    status: "In Progress",
    priority: "Critical",
    due: "Today, 11:00",
    progress: 80,
  },
  {
    id: "DB-002",
    title: "Kanban/List toggle + summary stats",
    project: "Universal Task Dashboard",
    owner: "dashboard-agent",
    status: "Done",
    priority: "Medium",
    due: "Today, 09:00",
    progress: 100,
  },
  {
    id: "TB-001",
    title: "Trading bot runtime monitor",
    project: "Trading Bot Monitoring",
    owner: "ops-agent",
    status: "In Progress",
    priority: "Critical",
    due: "Today, 08:30",
    progress: 62,
  },
  {
    id: "TB-002",
    title: "Backtest bugfix + parameter optimization",
    project: "Trading Bot Monitoring",
    owner: "quant-agent",
    status: "Done",
    priority: "High",
    due: "Today, 07:55",
    progress: 100,
  },
  {
    id: "TB-003",
    title: "Paper trading engine restart + health check",
    project: "Trading Bot Monitoring",
    owner: "ops-agent",
    status: "Done",
    priority: "Critical",
    due: "Today, 07:52",
    progress: 100,
  },
  {
    id: "TB-004",
    title: "Watchdog auto-restart for bot session",
    project: "Trading Bot Monitoring",
    owner: "ops-agent",
    status: "In Progress",
    priority: "High",
    due: "Today, 09:15",
    progress: 35,
  },
];

const agents: Agent[] = [
  {
    name: "design-agent",
    model: "gemini-3.1-flash",
    status: "Running",
    currentTask: "Refining hero section spacing + color contrast",
    lastUpdate: "2m ago",
    tokensUsed: "31k",
  },
  {
    name: "frontend-agent",
    model: "codex-mini",
    status: "Running",
    currentTask: "Implementing programs grid and detail routing",
    lastUpdate: "1m ago",
    tokensUsed: "28k",
  },
  {
    name: "content-agent",
    model: "codex-mini",
    status: "Idle",
    currentTask: "Waiting for next content chunk",
    lastUpdate: "9m ago",
    tokensUsed: "14k",
  },
  {
    name: "qa-agent",
    model: "codex-mini",
    status: "Error",
    currentTask: "Admissions form schema mismatch",
    lastUpdate: "30s ago",
    tokensUsed: "10k",
  },
  {
    name: "ops-agent",
    model: "codex-mini",
    status: "Running",
    currentTask: "Paper bot running + watchdog setup",
    lastUpdate: "just now",
    tokensUsed: "9k",
  },
  {
    name: "quant-agent",
    model: "codex-mini",
    status: "Running",
    currentTask: "Evaluating RSI/EMA optimization outputs",
    lastUpdate: "2m ago",
    tokensUsed: "12k",
  },
];

const activityFeed = [
  "ops-agent restarted paper_trading_ws and confirmed WS subscription",
  "quant-agent completed backtest optimization: RSI(21,35/65) top performer",
  "frontend-agent pushed programs page card layout",
  "design-agent updated primary CTA contrast to AA-compliant colors",
  "qa-agent flagged missing field validation on admissions form",
  "dashboard-agent synced task progress metrics",
  "content-agent completed SEO draft for homepage",
];

const statusClasses: Record<TaskStatus, string> = {
  "Not Started": "bg-slate-100 text-slate-700",
  "In Progress": "bg-blue-100 text-blue-700",
  Blocked: "bg-red-100 text-red-700",
  Done: "bg-emerald-100 text-emerald-700",
};

const agentStatusClasses: Record<Agent["status"], string> = {
  Running: "bg-emerald-100 text-emerald-700",
  Idle: "bg-amber-100 text-amber-700",
  Error: "bg-red-100 text-red-700",
};

const priorityClasses: Record<Priority, string> = {
  Critical: "bg-[#ffd400] text-slate-900",
  High: "bg-orange-100 text-orange-700",
  Medium: "bg-indigo-100 text-indigo-700",
  Low: "bg-slate-100 text-slate-700",
};

export default function Home() {
  const [view, setView] = useState<"list" | "kanban">("list");

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "Done").length;
    const blocked = tasks.filter((t) => t.status === "Blocked").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const avgProgress = Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length);
    return { done, blocked, inProgress, avgProgress };
  }, []);

  const kanbanColumns: TaskStatus[] = ["Not Started", "In Progress", "Blocked", "Done"];

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl bg-[#4a94c4] p-6 text-white shadow-sm">
          <h1 className="text-3xl font-bold">Universal Task Dashboard</h1>
          <p className="mt-2 text-sm text-white/90">
            Live visibility into subagent activity, task execution, blockers, and delivery progress.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="In Progress" value={stats.inProgress.toString()} />
          <StatCard label="Blocked" value={stats.blocked.toString()} />
          <StatCard label="Completed" value={stats.done.toString()} />
          <StatCard label="Avg Progress" value={`${stats.avgProgress}%`} />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Task Tracking</h2>
              <div className="inline-flex rounded-lg border p-1">
                <button
                  className={`rounded-md px-3 py-1 text-sm ${
                    view === "list" ? "bg-[#4a94c4] text-white" : "text-slate-600"
                  }`}
                  onClick={() => setView("list")}
                >
                  List
                </button>
                <button
                  className={`rounded-md px-3 py-1 text-sm ${
                    view === "kanban" ? "bg-[#4a94c4] text-white" : "text-slate-600"
                  }`}
                  onClick={() => setView("kanban")}
                >
                  Kanban
                </button>
              </div>
            </div>

            {view === "list" ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="pb-3">Task</th>
                      <th className="pb-3">Owner</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Priority</th>
                      <th className="pb-3">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr key={task.id} className="border-t align-top">
                        <td className="py-3">
                          <p className="font-medium">{task.title}</p>
                          <p className="text-xs text-slate-500">{task.project} · {task.id}</p>
                          {task.blockers ? (
                            <p className="mt-1 text-xs text-red-600">Blocker: {task.blockers}</p>
                          ) : null}
                        </td>
                        <td className="py-3 text-slate-700">{task.owner}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClasses[task.status]}`}>
                            {task.status}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${priorityClasses[task.priority]}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">{task.due}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {kanbanColumns.map((column) => (
                  <div key={column} className="rounded-xl bg-slate-50 p-3">
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">{column}</h3>
                    <div className="space-y-2">
                      {tasks
                        .filter((t) => t.status === column)
                        .map((task) => (
                          <article key={task.id} className="rounded-lg border bg-white p-3">
                            <p className="text-sm font-medium">{task.title}</p>
                            <p className="mt-1 text-xs text-slate-500">{task.owner}</p>
                            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
                              <div className="h-full rounded-full bg-[#4a94c4]" style={{ width: `${task.progress}%` }} />
                            </div>
                          </article>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Subagent Activity</h2>
              <div className="space-y-3">
                {agents.map((agent) => (
                  <article key={agent.name} className="rounded-xl border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="font-medium">{agent.name}</p>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${agentStatusClasses[agent.status]}`}>
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{agent.model}</p>
                    <p className="mt-2 text-sm text-slate-700">{agent.currentTask}</p>
                    <p className="mt-2 text-xs text-slate-500">Updated {agent.lastUpdate} · Tokens {agent.tokensUsed}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold">Recent Activity Feed</h2>
              <ul className="space-y-2 text-sm text-slate-700">
                {activityFeed.map((entry) => (
                  <li key={entry} className="rounded-lg bg-slate-50 p-2">• {entry}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
