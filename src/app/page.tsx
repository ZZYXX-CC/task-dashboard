"use client";

import { useEffect, useMemo, useState } from "react";
import { baseAgents, baseTasks, type Agent, type Task } from "@/lib/dashboard-data";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(baseTasks);
  const [agents, setAgents] = useState<Agent[]>(baseAgents);
  const [updatedAt, setUpdatedAt] = useState<string>(new Date().toISOString());
  const [view, setView] = useState<"list" | "kanban">("list");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dashboard-theme");
    if (saved === "dark") setDark(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    const es = new EventSource("/api/live");
    es.addEventListener("update", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data);
      setTasks(data.tasks);
      setAgents(data.agents);
      setUpdatedAt(data.updatedAt);
    });
    return () => es.close();
  }, []);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "Done").length;
    const blocked = tasks.filter((t) => t.status === "Blocked").length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const avgProgress = Math.round(tasks.reduce((acc, t) => acc + t.progress, 0) / tasks.length);
    return { done, blocked, inProgress, avgProgress };
  }, [tasks]);

  const taskStatusClass = (status: string) =>
    ({
      "Not Started": "bg-slate-100 text-slate-700",
      "In Progress": "bg-blue-100 text-blue-700",
      Blocked: "bg-red-100 text-red-700",
      Done: "bg-emerald-100 text-emerald-700",
    }[status] || "bg-slate-100 text-slate-700");

  const agentStatusClass = (status: Agent["status"]) =>
    ({
      Running: "bg-emerald-100 text-emerald-700",
      Idle: "bg-amber-100 text-amber-700",
      Blocked: "bg-red-100 text-red-700",
      Error: "bg-red-100 text-red-700",
    }[status]);

  return (
    <main className={`${dark ? "dark" : ""} min-h-screen p-4 text-slate-900 transition-colors md:p-6`}>
      <div className="mx-auto max-w-7xl space-y-4 md:space-y-6">
        <header className="glass rounded-3xl p-5 text-slate-900 dark:text-slate-100 md:p-7">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">Live Ops</p>
            <button
              onClick={() => setDark((d) => !d)}
              className="rounded-full border border-slate-300/70 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-200"
            >
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
          <h1 className="text-2xl font-bold md:text-3xl">Universal Task Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Realtime subagent activity + premium mobile UX</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Last synced: {new Date(updatedAt).toLocaleTimeString()}</p>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="In Progress" value={`${stats.inProgress}`} />
          <Stat label="Blocked" value={`${stats.blocked}`} />
          <Stat label="Done" value={`${stats.done}`} />
          <Stat label="Avg" value={`${stats.avgProgress}%`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-2xl p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold dark:text-slate-100">Tasks</h2>
              <div className="rounded-lg border border-slate-300/60 p-1 text-xs dark:border-slate-600">
                <button className={`rounded px-2 py-1 ${view === "list" ? "bg-[#4a94c4] text-white" : "dark:text-slate-200"}`} onClick={() => setView("list")}>List</button>
                <button className={`rounded px-2 py-1 ${view === "kanban" ? "bg-[#4a94c4] text-white" : "dark:text-slate-200"}`} onClick={() => setView("kanban")}>Kanban</button>
              </div>
            </div>

            {view === "list" ? (
              <div className="space-y-2">
                {tasks.map((t) => (
                  <article key={t.id} className="glass rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold dark:text-slate-100">{t.title}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{t.project} · {t.id} · {t.owner}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${taskStatusClass(t.status)}`}>{t.status}</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700">
                      <div className="h-full rounded-full bg-[#4a94c4]" style={{ width: `${t.progress}%` }} />
                    </div>
                    {t.blockers ? <p className="mt-1 text-xs text-red-600">Blocker: {t.blockers}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {["Not Started", "In Progress", "Blocked", "Done"].map((col) => (
                  <div key={col} className="glass rounded-xl p-2">
                    <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">{col}</p>
                    <div className="space-y-2">
                      {tasks.filter((t) => t.status === col).map((t) => (
                        <div key={t.id} className="glass rounded-lg p-2 text-xs">
                          <p className="font-medium dark:text-slate-100">{t.title}</p>
                          <p className="text-slate-600 dark:text-slate-400">{t.owner}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass rounded-2xl p-4">
              <h2 className="mb-2 font-semibold dark:text-slate-100">Subagents</h2>
              <div className="space-y-2">
                {agents.map((a) => (
                  <article key={a.name} className="glass rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold dark:text-slate-100">{a.name}</p>
                      <span className={`rounded-full px-2 py-1 text-xs ${agentStatusClass(a.status)}`}>{a.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{a.model}</p>
                    <p className="mt-1 text-xs dark:text-slate-200">{a.currentTask}</p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{a.lastUpdate} · {a.tokensUsed}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-3 md:p-4">
      <p className="text-xs text-slate-600 dark:text-slate-400">{label}</p>
      <p className="text-xl font-bold dark:text-slate-100 md:text-2xl">{value}</p>
    </div>
  );
}
