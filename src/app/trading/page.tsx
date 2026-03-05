"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Position = {
  strategy: string;
  symbol: string;
  side: string;
  entry: number;
  sl: number;
  tp: number;
  size: number;
  reason: string;
  unrealizedPnl: number | null;
  unrealizedPnlPct: number | null;
};

type Trade = {
  time: string;
  strategy: string;
  side: string;
  pnl: number;
  reason: string;
};

type EventItem = {
  time: string;
  kind: string;
  message: string;
};

type TradingState = {
  status: "running" | "stopped" | "degraded" | "stale";
  mode: "paper" | "live";
  balance: number;
  equity: number;
  freshnessTs: string | null;
  stale: boolean;
  staleSeconds: number | null;
  sourceTags: string[];
  openPositions: Position[];
  history: Trade[];
  lastEvents: EventItem[];
};

export default function TradingPage() {
  const [state, setState] = useState<TradingState | null>(null);
  const [mode, setMode] = useState<"paper" | "live">(() => {
    if (typeof window === "undefined") return "paper";
    return (localStorage.getItem("trading-mode") as "paper" | "live") || "paper";
  });
  const [apiKey, setApiKey] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("bybit-api-key") || ""));
  const [apiSecret, setApiSecret] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("bybit-api-secret") || ""));

  useEffect(() => {
    const fetchState = async () => {
      const res = await fetch("/api/trading-state", { cache: "no-store" });
      const json = await res.json();
      setState(json);
    };
    fetchState();
    const t = setInterval(fetchState, 5000);
    return () => clearInterval(t);
  }, []);

  const maskedKey = useMemo(() => (apiKey ? `${apiKey.slice(0, 6)}***${apiKey.slice(-4)}` : "Not set"), [apiKey]);

  const saveKeys = () => {
    localStorage.setItem("bybit-api-key", apiKey);
    localStorage.setItem("bybit-api-secret", apiSecret);
    alert("Saved locally.");
  };

  const switchMode = (m: "paper" | "live") => {
    setMode(m);
    localStorage.setItem("trading-mode", m);
  };

  const effectiveMode = state?.mode || mode;

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Trading Integration</p>
              <h1 className="text-2xl font-semibold">/trading Control Surface</h1>
            </div>
            <Link href="/" className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>Back to dashboard</Link>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Freshness: {state?.freshnessTs ? new Date(state.freshnessTs).toLocaleString() : "n/a"}
            {state?.stale ? ` · stale (${state.staleSeconds ?? "?"}s)` : " · healthy"}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card label="Status" value={state?.status?.toUpperCase() || "..."} />
          <Card label="Mode" value={effectiveMode.toUpperCase()} />
          <Card label="Balance" value={`$${(state?.balance ?? 0).toFixed(2)}`} />
          <Card label="Open Positions" value={`${state?.openPositions?.length ?? 0}`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-4">
            <h2 className="text-sm font-semibold">Mode and credentials</h2>
            <div className="mt-2 inline-flex rounded-lg border p-1" style={{ borderColor: "var(--border)" }}>
              <button className="rounded px-3 py-1 text-sm" style={{ background: mode === "paper" ? "var(--accent)" : "transparent", color: mode === "paper" ? "white" : "var(--text-secondary)" }} onClick={() => switchMode("paper")}>Paper</button>
              <button className="rounded px-3 py-1 text-sm" style={{ background: mode === "live" ? "var(--red)" : "transparent", color: mode === "live" ? "white" : "var(--text-secondary)" }} onClick={() => switchMode("live")}>Live</button>
            </div>
            <div className="mt-3 space-y-2">
              <input className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }} placeholder="Bybit API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <input className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }} placeholder="Bybit API secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
              <button className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={saveKeys}>Save keys</button>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Stored key: {maskedKey}</p>
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="text-sm font-semibold">Recent events</h2>
            <div className="mt-2 max-h-[260px] space-y-2 overflow-auto">
              {(state?.lastEvents || []).map((e, i) => (
                <div key={`${e.time}-${i}`} className="card p-2 text-xs">
                  <p><b>{e.time}</b> · {e.kind.toUpperCase()}</p>
                  <p style={{ color: "var(--text-secondary)" }}>{e.message}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Open positions</h2>
            <div className="space-y-2 text-xs">
              {(state?.openPositions || []).map((p, i) => (
                <div key={i} className="card p-2">
                  <p><b>{p.strategy}</b> · {p.symbol} · {p.side.toUpperCase()}</p>
                  <p>Entry ${p.entry} · SL ${p.sl} · TP ${p.tp}</p>
                  <p style={{ color: "var(--text-secondary)" }}>Reason: {p.reason}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Trade history</h2>
            <div className="space-y-2 text-xs">
              {(state?.history || []).map((t, i) => (
                <div key={i} className="card p-2">
                  <p><b>{t.time}</b> · {t.strategy} · {t.side.toUpperCase()}</p>
                  <p style={{ color: t.pnl >= 0 ? "var(--green)" : "var(--red)" }}>PnL ${t.pnl}</p>
                  <p style={{ color: "var(--text-secondary)" }}>{t.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3">
      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
