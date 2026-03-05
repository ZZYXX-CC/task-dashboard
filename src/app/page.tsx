"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  baseAgents,
  baseTasks,
  taskHistory as baseTaskHistory,
  telemetrySources as baseTelemetrySources,
  type Agent,
  type Task,
  type TaskHistoryEvent,
  type TelemetrySourceTag,
} from "@/lib/dashboard-data";

type HistoryMap = Record<string, TaskHistoryEvent[]>;

const BUILD_TAG = "2026-03-05 12:46 GMT+1";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(baseTasks);
  const [agents, setAgents] = useState<Agent[]>(baseAgents);
  const [updatedAt, setUpdatedAt] = useState<string>(new Date().toISOString());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<HistoryMap>(baseTaskHistory);
  const [telemetrySources, setTelemetrySources] = useState<TelemetrySourceTag[]>(baseTelemetrySources);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("dashboard-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("dashboard-theme", theme);
  }, [theme]);

  useEffect(() => {
    const es = new EventSource("/api/live");
    es.addEventListener("update", (ev) => {
      const data = JSON.parse((ev as MessageEvent).data);
      setTasks(data.tasks);
      setAgents(data.agents);
      setUpdatedAt(data.updatedAt);
      setTaskHistory(data.taskHistory ?? baseTaskHistory);
      setTelemetrySources(data.telemetrySources ?? baseTelemetrySources);
    });
    return () => es.close();
  }, []);

  const sourceMap = useMemo(() => Object.fromEntries(telemetrySources.map((s) => [s.key, s])), [telemetrySources]);

  const stats = useMemo(() => {
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const blocked = tasks.filter((t) => t.status === "Blocked").length;
    const done = tasks.filter((t) => t.status === "Done").length;
    const avg = Math.round(tasks.reduce((a, t) => a + t.progress, 0) / Math.max(tasks.length, 1));
    return { inProgress, blocked, done, avg };
  }, [tasks]);

  const timelineRows = useMemo(() => {
    const rows = tasks
      .map((task) => {
        const events = [...(taskHistory[task.id] ?? [])].sort((a, b) => +new Date(a.at) - +new Date(b.at));
        if (!events.length) return null;
        return {
          task,
          events,
          start: +new Date(events[0].at),
          end: +new Date(events[events.length - 1].at),
          trust: events.every((e) => e.confidence === "verified") ? "verified" : "derived",
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const now = +new Date(updatedAt);
    const min = Math.min(...rows.map((r) => r.start), now - 3600_000);
    const max = Math.max(...rows.map((r) => r.end), now);
    const range = Math.max(max - min, 1);

    return rows
      .sort((a, b) => b.end - a.end)
      .slice(0, 8)
      .map((row) => ({
        ...row,
        left: ((row.start - min) / range) * 100,
        width: Math.max(((row.end - row.start) / range) * 100, 2.2),
      }));
  }, [tasks, taskHistory, updatedAt]);

  const selectedHistory = selectedTask ? [...(taskHistory[selectedTask.id] ?? [])].sort((a, b) => +new Date(b.at) - +new Date(a.at)) : [];

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[230px_1fr]">
        <aside className="panel h-fit p-4 lg:sticky lg:top-4">
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--text-muted)" }}>OpenClaw Dashboard</p>
          <h1 className="mt-2 text-xl font-semibold">Task Control Center</h1>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Reference UI system aligned with openclaw-dashboard.</p>

          <div className="mt-4 space-y-2 text-sm">
            <QuickNav href="#overview" label="Overview" />
            <QuickNav href="#timeline" label="Timeline" />
            <QuickNav href="#sessions" label="Sessions & Agents" />
            <QuickNav href="#sources" label="Trust Sources" />
          </div>

          <div className="mt-5 card p-3 text-xs">
            <p className="font-semibold">Trading Integration</p>
            <p className="mt-1" style={{ color: "var(--text-secondary)" }}>Direct entry points for runtime status, mode switch, and event stream.</p>
            <div className="mt-3 flex gap-2">
              <Link href="/trading" className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>Open /trading</Link>
              <a href="#sessions" className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>Agent Queue</a>
            </div>
          </div>

          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="mt-4 w-full rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>
            Theme: {theme === "dark" ? "Dark" : "Light"}
          </button>
        </aside>

        <section className="space-y-4">
          <header id="overview" className="panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>Live telemetry only</p>
                <h2 className="text-2xl font-semibold">Overview</h2>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>Updated {new Date(updatedAt).toLocaleTimeString()} · Build {BUILD_TAG}</p>
              </div>
              <span className="badge" style={{ background: "rgba(16,185,129,.18)", color: "var(--green)" }}>No synthetic timeline points</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="In Progress" value={stats.inProgress} color="var(--accent)" />
              <Metric label="Blocked" value={stats.blocked} color="var(--red)" />
              <Metric label="Done" value={stats.done} color="var(--green)" />
              <Metric label="Avg Progress" value={`${stats.avg}%`} color="var(--yellow)" />
            </div>
          </header>

          <section id="timeline" className="panel p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Timeline</h3>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Task spans from timestamped events</span>
            </div>
            <div className="space-y-2">
              {timelineRows.map((row) => (
                <button key={row.task.id} onClick={() => setSelectedTask(row.task)} className="card flex w-full items-center gap-3 px-3 py-2 text-left text-xs">
                  <span className="w-20 shrink-0 truncate font-semibold" style={{ color: "var(--text-secondary)" }}>{row.task.id}</span>
                  <div className="relative h-4 flex-1 rounded" style={{ background: "var(--bg-tertiary)" }}>
                    <div className="absolute h-4 rounded" style={{ left: `${row.left}%`, width: `${row.width}%`, background: row.trust === "verified" ? "linear-gradient(90deg,#6366f1,#8b5cf6)" : "linear-gradient(90deg,#f59e0b,#f97316)" }} />
                  </div>
                  <span className="badge" style={{ background: row.trust === "verified" ? "rgba(16,185,129,.14)" : "rgba(245,158,11,.15)", color: row.trust === "verified" ? "var(--green)" : "var(--yellow)" }}>{row.trust}</span>
                </button>
              ))}
            </div>
          </section>

          <section id="sessions" className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <div className="panel p-4">
              <h3 className="mb-2 text-sm font-semibold">Tasks & Sessions</h3>
              <div className="max-h-[430px] space-y-2 overflow-auto pr-1">
                {tasks.map((t) => {
                  const recentSources = Array.from(new Set((taskHistory[t.id] ?? []).slice(-3).map((e) => e.sourceKey)));
                  return (
                    <button key={t.id} onClick={() => setSelectedTask(t)} className="card w-full px-3 py-2 text-left">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{t.title}</p>
                        <StatusChip status={t.status} />
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{t.project} · {t.owner} · {t.id}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {recentSources.map((key) => (
                          <span key={key} className="badge" style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}>{sourceMap[key]?.label ?? key}</span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="panel p-4">
              <h3 className="mb-2 text-sm font-semibold">Agents</h3>
              <div className="space-y-2">
                {agents.map((a) => (
                  <div key={a.name} className="card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{a.name}</p>
                      <StatusChip status={a.status} />
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>{a.model}</p>
                    <p className="mt-1 text-xs">{a.currentTask}</p>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>{a.lastUpdate} · {a.tokensUsed}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="sources" className="panel p-4">
            <h3 className="mb-2 text-sm font-semibold">Trusted Telemetry Sources</h3>
            <div className="grid gap-2 md:grid-cols-2">
              {telemetrySources.map((src) => (
                <div key={src.key} className="card p-3 text-xs">
                  <p className="font-semibold">{src.label}</p>
                  <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{src.channel.toUpperCase()} source</p>
                  <span className="badge mt-2 inline-block" style={{ background: src.trust === "verified" ? "rgba(16,185,129,.15)" : "rgba(245,158,11,.16)", color: src.trust === "verified" ? "var(--green)" : "var(--yellow)" }}>{src.trust}</span>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>

      {selectedTask && (
        <div className="fixed inset-0 z-40 bg-black/45 p-4" onClick={() => setSelectedTask(null)}>
          <div className="mx-auto mt-6 max-w-3xl panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold">{selectedTask.title}</h3>
              <button className="rounded-md border px-3 py-1 text-xs" style={{ borderColor: "var(--border)" }} onClick={() => setSelectedTask(null)}>Close</button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="card p-3 text-sm">
                <p><b>ID:</b> {selectedTask.id}</p>
                <p><b>Project:</b> {selectedTask.project}</p>
                <p><b>Owner:</b> {selectedTask.owner}</p>
                <p><b>Status:</b> {selectedTask.status}</p>
                <p><b>Due:</b> {selectedTask.due}</p>
              </div>
              <div className="card p-3 text-xs">
                <p className="font-semibold">History (newest first)</p>
                <ul className="mt-2 space-y-2">
                  {selectedHistory.map((evt) => (
                    <li key={evt.id} className="rounded-md border p-2" style={{ borderColor: "var(--border)" }}>
                      <p className="font-semibold">{evt.event}</p>
                      <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{new Date(evt.at).toLocaleString()} · {sourceMap[evt.sourceKey]?.label ?? evt.sourceKey}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function QuickNav({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="block rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
      {label}
    </a>
  );
}

function Metric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={{ color }}>{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "In Progress" || status === "Running"
      ? { bg: "rgba(99,102,241,.16)", text: "var(--accent)" }
      : status === "Done" || status === "Idle"
        ? { bg: "rgba(16,185,129,.16)", text: "var(--green)" }
        : { bg: "rgba(239,68,68,.16)", text: "var(--red)" };

  return (
    <span className="badge" style={{ background: tone.bg, color: tone.text }}>
      {status}
    </span>
  );
}
