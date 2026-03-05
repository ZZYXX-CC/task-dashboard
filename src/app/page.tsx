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

const BUILD_TAG = "2026-03-05 12:45 GMT+1";

type HistoryMap = Record<string, TaskHistoryEvent[]>;

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(baseTasks);
  const [agents, setAgents] = useState<Agent[]>(baseAgents);
  const [updatedAt, setUpdatedAt] = useState<string>(new Date().toISOString());
  const [active, setActive] = useState<"tasks" | "agents">("tasks");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<HistoryMap>(baseTaskHistory);
  const [telemetrySources, setTelemetrySources] = useState<TelemetrySourceTag[]>(baseTelemetrySources);

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

  const timeline = useMemo(() => {
    const segments = tasks
      .map((task) => {
        const events = [...(taskHistory[task.id] ?? [])].sort((a, b) => +new Date(a.at) - +new Date(b.at));
        if (!events.length) return null;
        return {
          task,
          start: +new Date(events[0].at),
          end: +new Date(events[events.length - 1].at),
          trust: events.every((e) => e.confidence === "verified") ? "verified" : "derived",
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));

    const referenceNow = +new Date(updatedAt);
    const min = Math.min(...segments.map((s) => s.start), referenceNow - 1000 * 60 * 60);
    const max = Math.max(...segments.map((s) => s.end), referenceNow);
    const range = Math.max(max - min, 1);

    return {
      min,
      max,
      ticks: [0, 0.25, 0.5, 0.75, 1].map((pct) => ({ pct, label: new Date(min + range * pct).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })),
      rows: segments
        .sort((a, b) => b.end - a.end)
        .slice(0, 8)
        .map((s) => ({ ...s, left: ((s.start - min) / range) * 100, width: Math.max(((s.end - s.start) / range) * 100, 1.6) })),
    };
  }, [tasks, taskHistory, updatedAt]);

  const selectedHistory = selectedTask ? [...(taskHistory[selectedTask.id] ?? [])].sort((a, b) => +new Date(b.at) - +new Date(a.at)) : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f5f9ff] to-[#edf4ff] text-slate-900 dark:from-[#0a1428] dark:to-[#050b18] dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-28 pt-6">
        <header className="glass rounded-3xl border border-white/40 p-5 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-300">Stitch UI · Ops Center</p>
              <h1 className="text-2xl font-extrabold">Universal Task Dashboard</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/trading" className="rounded-full bg-[#ffd400] px-3 py-1 text-xs font-bold text-slate-900 hover:opacity-90">Trading Panel</Link>
              <span className="rounded-full bg-[#4a94c4] px-3 py-1 text-xs font-bold text-white">Live</span>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Updated {new Date(updatedAt).toLocaleTimeString()} · Build {BUILD_TAG}</p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">History only shows timestamped logged events. No synthetic timeline points are rendered.</p>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="In Progress" value={stats.inProgress} tone="blue" />
          <Metric label="Blocked" value={stats.blocked} tone="red" />
          <Metric label="Done" value={stats.done} tone="green" />
          <Metric label="Avg Progress" value={`${stats.avg}%`} tone="amber" />
        </section>

        <section className="mt-3 glass rounded-2xl border border-white/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Telemetry Sources</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Trust tags on every history row</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {telemetrySources.map((src) => (
              <div key={src.key} className="rounded-xl border border-white/40 bg-white/70 p-2 text-xs dark:bg-slate-900/40">
                <p className="font-semibold">{src.label}</p>
                <p className="mt-1 text-slate-500 dark:text-slate-300">{src.channel.toUpperCase()} · {src.trust === "verified" ? "Verified" : "Derived"}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-3 glass rounded-2xl border border-white/40 p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold">Session Timeline (last capture window)</h3>
            <span className="text-xs text-slate-500 dark:text-slate-400">Inspired by openclaw-dashboard timeline bars</span>
          </div>
          <div className="space-y-2">
            {timeline.rows.map((row) => (
              <div key={row.task.id} className="flex items-center gap-2 text-xs">
                <div className="w-24 shrink-0 truncate text-right font-semibold text-slate-600 dark:text-slate-300">{row.task.id}</div>
                <div className="relative h-4 flex-1 rounded bg-slate-200/70 dark:bg-slate-800/70">
                  <div
                    className={`absolute h-4 rounded ${row.trust === "verified" ? "bg-[#4a94c4]" : "bg-amber-500"}`}
                    style={{ left: `${row.left}%`, width: `${row.width}%` }}
                    title={`${row.task.title}`}
                  />
                </div>
              </div>
            ))}
            <div className="relative ml-[6.5rem] h-5">
              {timeline.ticks.map((tick) => (
                <span key={tick.pct} className="absolute -translate-x-1/2 text-[10px] text-slate-500" style={{ left: `${tick.pct * 100}%` }}>
                  {tick.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="glass rounded-3xl border border-white/40 p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Task Stream</h2>
              <span className="rounded-full bg-[#ffd400] px-2 py-1 text-[11px] font-semibold text-slate-900">Tap for verified history</span>
            </div>
            <div className="space-y-2">
              {tasks.map((t) => {
                const recentSources = Array.from(new Set((taskHistory[t.id] ?? []).slice(-3).map((e) => e.sourceKey)));
                return (
                  <button key={t.id} onClick={() => setSelectedTask(t)} className="w-full rounded-2xl border border-white/40 bg-white/70 p-3 text-left transition hover:scale-[1.01] dark:bg-slate-900/40">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{t.title}</p>
                      <StatusChip status={t.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.project} · {t.owner} · {t.id}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {recentSources.map((key) => (
                        <span key={key} className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                          {sourceMap[key]?.label ?? key}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700">
                      <div className="h-full rounded-full bg-[#4a94c4]" style={{ width: `${t.progress}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass rounded-3xl border border-white/40 p-4 shadow-lg">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Agents</h2>
              <span className="text-xs text-slate-500">{agents.length} active</span>
            </div>
            <div className="space-y-2">
              {agents.map((a) => (
                <div key={a.name} className="rounded-2xl border border-white/40 bg-white/70 p-3 dark:bg-slate-900/40">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{a.name}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${a.status === "Running" ? "bg-emerald-100 text-emerald-700" : a.status === "Blocked" || a.status === "Error" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{a.model}</p>
                  <p className="mt-1 text-xs">{a.currentTask}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <nav className="fixed bottom-3 left-1/2 z-40 w-[92%] max-w-md -translate-x-1/2 rounded-2xl border border-white/40 bg-white/80 p-2 shadow-2xl backdrop-blur dark:bg-slate-900/70">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button onClick={() => setActive("tasks")} className={`rounded-xl px-3 py-2 font-semibold ${active === "tasks" ? "bg-[#4a94c4] text-white" : "text-slate-600 dark:text-slate-300"}`}>Tasks</button>
          <button onClick={() => setActive("agents")} className={`rounded-xl px-3 py-2 font-semibold ${active === "agents" ? "bg-[#4a94c4] text-white" : "text-slate-600 dark:text-slate-300"}`}>Agents</button>
        </div>
      </nav>

      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 p-3 backdrop-blur-sm" onClick={() => setSelectedTask(null)}>
          <div className="mx-auto mt-10 max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="glass rounded-3xl border border-white/40 p-4 shadow-2xl">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-bold">{selectedTask.title}</h3>
                <button className="rounded-full border px-3 py-1 text-xs" onClick={() => setSelectedTask(null)}>Close</button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <p><b>ID:</b> {selectedTask.id}</p>
                  <p><b>Project:</b> {selectedTask.project}</p>
                  <p><b>Owner:</b> {selectedTask.owner}</p>
                  <p><b>Status:</b> {selectedTask.status}</p>
                  <p><b>Due:</b> {selectedTask.due}</p>
                  <p><b>Progress:</b> {selectedTask.progress}%</p>
                  {selectedTask.blockers ? <p><b>Blocker:</b> {selectedTask.blockers}</p> : null}
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/60 p-3 text-xs dark:bg-slate-900/40">
                  <p className="mb-2 font-bold">Dependency Chain</p>
                  <ul className="space-y-1 text-slate-700 dark:text-slate-300">
                    <li>• Content brief finalized</li>
                    <li>• Design tokens approved</li>
                    <li>• Frontend integration complete</li>
                    <li>• QA regression pass</li>
                    <li>• Deploy + verify</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/40 bg-white/60 p-3 text-xs dark:bg-slate-900/40">
                <p className="mb-2 font-bold">Task History (newest first)</p>
                <ul className="space-y-2">
                  {selectedHistory.map((evt) => (
                    <li key={evt.id} className="rounded-lg border border-slate-200/70 p-2 dark:border-slate-700">
                      <p className="font-semibold">{evt.event}</p>
                      <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                        {new Date(evt.at).toLocaleString()} · {sourceMap[evt.sourceKey]?.label ?? evt.sourceKey}
                      </p>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${evt.confidence === "verified" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {evt.confidence === "verified" ? "Verified" : "Derived"}
                      </span>
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

function Metric({ label, value, tone }: { label: string; value: string | number; tone: "blue" | "red" | "green" | "amber" }) {
  const toneClass = {
    blue: "from-blue-500/20 to-blue-200/20",
    red: "from-red-500/20 to-red-200/20",
    green: "from-emerald-500/20 to-emerald-200/20",
    amber: "from-amber-500/20 to-amber-200/20",
  }[tone];
  return (
    <div className={`glass rounded-2xl border border-white/40 bg-gradient-to-br ${toneClass} p-3`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const cls = status === "In Progress" ? "bg-blue-100 text-blue-700" : status === "Done" ? "bg-emerald-100 text-emerald-700" : status === "Blocked" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${cls}`}>{status}</span>;
}
