"use client";

import { useEffect, useMemo, useState } from "react";

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
  data?: Record<string, unknown>;
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
    const saved = localStorage.getItem("trading-mode");
    return saved === "live" ? "live" : "paper";
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
  const maskedSecret = useMemo(() => (apiSecret ? `${apiSecret.slice(0, 4)}***${apiSecret.slice(-3)}` : "Not set"), [apiSecret]);

  const saveKeys = () => {
    localStorage.setItem("bybit-api-key", apiKey);
    localStorage.setItem("bybit-api-secret", apiSecret);
    alert("Saved locally for now. Server-side secure storage will be added next.");
  };

  const switchMode = (m: "paper" | "live") => {
    setMode(m);
    localStorage.setItem("trading-mode", m);
  };

  const effectiveMode = state?.mode || mode;

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="glass rounded-2xl p-4">
          <h1 className="text-2xl font-bold">Trading Bot Control Panel</h1>
          <p className="text-sm text-slate-600">History, balance, status, open positions, and mode/settings in one place.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(state?.sourceTags || []).map((tag) => (
              <span key={tag} className="rounded-full border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700">#{tag}</span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Freshness: {state?.freshnessTs ? new Date(state.freshnessTs).toLocaleString() : "n/a"}
            {state?.stale ? ` · stale (${state?.staleSeconds ?? "?"}s)` : " · healthy"}
          </p>
          {state?.stale && <p className="mt-1 text-sm font-semibold text-amber-700">⚠️ Telemetry stale: no fresh snapshot in &gt;60s.</p>}
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Bot Status" value={state?.status?.toUpperCase() || "..."} tone={state?.status} />
          <Card label="Mode" value={effectiveMode.toUpperCase()} tone={effectiveMode === "live" ? "live" : "paper"} />
          <Card label="Balance" value={`$${(state?.balance ?? 0).toFixed(2)}`} />
          <Card label="Open Positions" value={`${state?.openPositions?.length ?? 0}`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Mode Switch</h2>
              <span className="text-xs text-slate-500">Default is Paper</span>
            </div>
            <div className="inline-flex rounded-lg border p-1">
              <button className={`rounded px-3 py-1 text-sm ${mode === "paper" ? "bg-[#4a94c4] text-white" : ""}`} onClick={() => switchMode("paper")}>Paper</button>
              <button className={`rounded px-3 py-1 text-sm ${mode === "live" ? "bg-red-600 text-white" : ""}`} onClick={() => switchMode("live")}>Live</button>
            </div>
            {mode === "live" && <p className="mt-2 text-xs text-red-600">Live mode selected. Ensure risk limits and keys are valid before enabling execution.</p>}
          </div>

          <div className="glass rounded-2xl p-4">
            <h2 className="mb-3 font-bold">Bybit API Settings</h2>
            <div className="space-y-2">
              <input className="w-full rounded border p-2 text-sm" placeholder="Bybit API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              <input className="w-full rounded border p-2 text-sm" placeholder="Bybit API Secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
              <button className="rounded bg-[#4a94c4] px-3 py-2 text-sm font-semibold text-white" onClick={saveKeys}>Save Keys</button>
              <p className="text-xs text-slate-500">Stored: key {maskedKey} | secret {maskedSecret}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4">
            <h2 className="mb-3 font-bold">Open Positions</h2>
            <div className="space-y-2 text-sm">
              {(state?.openPositions || []).map((p, i) => (
                <div key={i} className="rounded border p-3">
                  <p><b>{p.strategy}</b> · {p.symbol} · {p.side.toUpperCase()}</p>
                  <p>Entry ${p.entry} · SL ${p.sl} · TP ${p.tp}</p>
                  <p>Size ${p.size}</p>
                  <p className="text-xs text-slate-500">Open reason: {p.reason || "n/a"}</p>
                  <p className={`text-xs ${!p.unrealizedPnl ? "text-slate-500" : p.unrealizedPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    Unrealized: {p.unrealizedPnl == null ? "n/a" : `$${p.unrealizedPnl.toFixed(2)} (${(p.unrealizedPnlPct ?? 0).toFixed(2)}%)`}
                  </p>
                </div>
              ))}
              {(!state || state.openPositions.length === 0) && <p className="text-slate-500">No open positions.</p>}
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h2 className="mb-3 font-bold">Trade History (latest)</h2>
            <div className="max-h-80 space-y-2 overflow-auto text-sm">
              {(state?.history || []).map((t, i) => (
                <div key={i} className="rounded border p-3">
                  <p><b>{t.time}</b> · {t.strategy} · {t.side.toUpperCase()}</p>
                  <p className={t.pnl >= 0 ? "text-emerald-600" : "text-red-600"}>PnL ${t.pnl}</p>
                  <p className="text-xs text-slate-500">{t.reason}</p>
                </div>
              ))}
              {(!state || state.history.length === 0) && <p className="text-slate-500">No trades yet.</p>}
            </div>
          </div>
        </section>

        <section className="glass rounded-2xl p-4">
          <h2 className="mb-3 font-bold">Recent Event Timeline</h2>
          <div className="max-h-72 space-y-2 overflow-auto text-sm">
            {(state?.lastEvents || []).map((e, i) => (
              <div key={`${e.time}-${i}`} className="rounded border p-3">
                <p><b>{e.time}</b> · <span className="uppercase text-slate-600">{e.kind}</span></p>
                <p>{e.message}</p>
              </div>
            ))}
            {(!state || state.lastEvents.length === 0) && <p className="text-slate-500">No recent telemetry events.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const toneClass =
    tone === "running"
      ? "border-emerald-200"
      : tone === "degraded" || tone === "stale"
        ? "border-amber-200"
        : tone === "stopped" || tone === "live"
          ? "border-red-200"
          : "border-slate-200";

  return (
    <div className={`glass rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
