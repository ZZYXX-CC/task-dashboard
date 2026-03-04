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
};

type Trade = {
  time: string;
  strategy: string;
  side: string;
  pnl: number;
  reason: string;
};

type TradingState = {
  status: "running" | "stopped";
  mode: "paper" | "live";
  balance: number;
  equity: number;
  openPositions: Position[];
  history: Trade[];
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

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="glass rounded-2xl p-4">
          <h1 className="text-2xl font-bold">Trading Bot Control Panel</h1>
          <p className="text-sm text-slate-600">History, balance, status, open positions, and mode/settings in one place.</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label="Bot Status" value={state?.status?.toUpperCase() || "..."} />
          <Card label="Mode" value={mode.toUpperCase()} />
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
                  <p className="text-xs text-slate-500">Reason: {p.reason || "n/a"}</p>
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
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
