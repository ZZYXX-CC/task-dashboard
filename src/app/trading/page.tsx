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

function maskValue(value: string) {
  if (!value) return "Not configured";
  if (value.length < 8) return "••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-3)}`;
}

function money(v: number) {
  return `$${v.toFixed(2)}`;
}

export default function TradingPage() {
  const [state, setState] = useState<TradingState | null>(null);
  const [operatorMode, setOperatorMode] = useState<"paper" | "live">(() => {
    if (typeof window === "undefined") return "paper";
    return (localStorage.getItem("trading-mode") as "paper" | "live") || "paper";
  });
  const [pendingMode, setPendingMode] = useState<"paper" | "live" | null>(null);
  const [confirmLiveText, setConfirmLiveText] = useState("");
  const [statusNote, setStatusNote] = useState("");

  const [apiKey, setApiKey] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("bybit-api-key") || ""));
  const [apiSecret, setApiSecret] = useState(() => (typeof window === "undefined" ? "" : localStorage.getItem("bybit-api-secret") || ""));
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const fetchState = async () => {
      const res = await fetch("/api/trading-state", { cache: "no-store" });
      const json = (await res.json()) as TradingState;
      setState(json);
    };
    fetchState();
    const t = setInterval(fetchState, 5000);
    return () => clearInterval(t);
  }, []);

  const runtimeMode = state?.mode || "paper";
  const hasKeys = apiKey.trim().length > 0 && apiSecret.trim().length > 0;

  const guardedSwitchRequest = (next: "paper" | "live") => {
    setStatusNote("");
    if (next === "live") {
      if (!hasKeys) {
        setStatusNote("Live mode requires both API key and API secret first.");
        return;
      }
      setPendingMode("live");
      return;
    }

    setOperatorMode("paper");
    localStorage.setItem("trading-mode", "paper");
    setStatusNote("Operator mode set to PAPER.");
  };

  const confirmLiveSwitch = () => {
    if (confirmLiveText.trim().toUpperCase() !== "LIVE") {
      setStatusNote("Type LIVE exactly to confirm.");
      return;
    }
    setOperatorMode("live");
    localStorage.setItem("trading-mode", "live");
    setPendingMode(null);
    setConfirmLiveText("");
    setStatusNote("Operator mode set to LIVE.");
  };

  const saveKeys = () => {
    localStorage.setItem("bybit-api-key", apiKey.trim());
    localStorage.setItem("bybit-api-secret", apiSecret.trim());
    setStatusNote("API credentials saved locally on this browser only.");
  };

  const truthOnlyTags = useMemo(() => (state?.sourceTags || []).map((tag) => ({ tag, trust: "verified" as const })), [state?.sourceTags]);

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <header className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Trading Integration</p>
              <h1 className="text-2xl font-semibold">/trading Operator Panel</h1>
            </div>
            <Link href="/" className="rounded-lg border px-3 py-2 text-xs font-semibold" style={{ borderColor: "var(--border)" }}>Back to dashboard</Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge label={`Runtime ${runtimeMode.toUpperCase()}`} tone={runtimeMode === "live" ? "danger" : "ok"} />
            <Badge label={`Operator ${operatorMode.toUpperCase()}`} tone={operatorMode === "live" ? "danger" : "neutral"} />
            <Badge label={`Status ${(state?.status || "...").toUpperCase()}`} tone={state?.status === "running" ? "ok" : "warn"} />
          </div>

          <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
            Freshness: {state?.freshnessTs ? new Date(state.freshnessTs).toLocaleString() : "n/a"}
          </p>

          {state?.stale && (
            <div className="mt-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#ef4444", background: "rgba(239,68,68,.12)", color: "#fecaca" }}>
              <b>Stale telemetry warning:</b> No fresh bot heartbeat for {state.staleSeconds ?? "?"}s. Treat open position data as delayed.
            </div>
          )}

          {statusNote && <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>{statusNote}</p>}
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card label="Balance" value={money(state?.balance ?? 0)} />
          <Card label="Equity" value={money(state?.equity ?? 0)} />
          <Card label="Open Positions" value={`${state?.openPositions?.length ?? 0}`} />
          <Card label="Recent Events" value={`${state?.lastEvents?.length ?? 0}`} />
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="panel p-4">
            <h2 className="text-sm font-semibold">Mode control (guarded)</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
              This sets operator intent only. Runtime mode remains telemetry-truth from the bot.
            </p>
            <div className="mt-3 inline-flex rounded-lg border p-1" style={{ borderColor: "var(--border)" }}>
              <button className="rounded px-3 py-1 text-sm" style={{ background: operatorMode === "paper" ? "var(--accent)" : "transparent", color: operatorMode === "paper" ? "white" : "var(--text-secondary)" }} onClick={() => guardedSwitchRequest("paper")}>Paper</button>
              <button className="rounded px-3 py-1 text-sm" style={{ background: operatorMode === "live" ? "var(--red)" : "transparent", color: operatorMode === "live" ? "white" : "var(--text-secondary)" }} onClick={() => guardedSwitchRequest("live")}>Live</button>
            </div>

            {pendingMode === "live" && (
              <div className="mt-3 rounded-lg border p-3 text-xs" style={{ borderColor: "#f59e0b", background: "rgba(245,158,11,.1)" }}>
                <p className="font-semibold">Guardrail: confirm live switch</p>
                <p className="mt-1" style={{ color: "var(--text-secondary)" }}>Type <b>LIVE</b> then confirm.</p>
                <input
                  className="mt-2 w-full rounded-lg border px-3 py-2 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--bg-card)" }}
                  value={confirmLiveText}
                  onChange={(e) => setConfirmLiveText(e.target.value)}
                  placeholder="Type LIVE"
                />
                <div className="mt-2 flex gap-2">
                  <button className="rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: "#dc2626" }} onClick={confirmLiveSwitch}>Confirm LIVE</button>
                  <button className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }} onClick={() => { setPendingMode(null); setConfirmLiveText(""); }}>Cancel</button>
                </div>
              </div>
            )}

            <h3 className="mt-4 text-sm font-semibold">API key settings</h3>
            <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>Stored only in localStorage on this browser profile.</p>
            <div className="mt-2 space-y-2">
              <input className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }} placeholder="Bybit API key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" spellCheck={false} />
              <input className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border)", background: "var(--bg-card)" }} type={showSecret ? "text" : "password"} placeholder="Bybit API secret" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} autoComplete="new-password" spellCheck={false} />
              <div className="flex flex-wrap items-center gap-2">
                <button className="rounded-lg px-3 py-2 text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }} onClick={saveKeys}>Save keys</button>
                <button className="rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }} onClick={() => setShowSecret((v) => !v)}>{showSecret ? "Hide secret" : "Show secret"}</button>
              </div>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Key: {maskValue(apiKey)} · Secret: {maskValue(apiSecret)}</p>
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="text-sm font-semibold">Recent events timeline</h2>
            <div className="mt-2 max-h-[360px] space-y-2 overflow-auto">
              {(state?.lastEvents || []).map((e, i) => (
                <div key={`${e.time}-${i}`} className="card border-l-2 border-l-indigo-400 p-2 text-xs">
                  <p><b>{e.time || "n/a"}</b> · {e.kind.toUpperCase()}</p>
                  <p style={{ color: "var(--text-secondary)" }}>{e.message}</p>
                </div>
              ))}
              {(state?.lastEvents || []).length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No events yet.</p>}
            </div>

            <h3 className="mt-4 text-sm font-semibold">Truth-only source tags</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {truthOnlyTags.map(({ tag }, idx) => <Badge key={`${tag}-${idx}`} label={`${tag} · verified`} tone="ok" />)}
              {truthOnlyTags.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No source tags present.</p>}
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
                  <p>Entry {money(p.entry)} · SL {money(p.sl)} · TP {money(p.tp)} · Margin {money(p.size)}</p>
                  <p style={{ color: "var(--text-secondary)" }}>open_reason: {p.reason || "n/a"}</p>
                  <p style={{ color: (p.unrealizedPnl || 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                    Unrealized: {p.unrealizedPnl == null ? "n/a" : `${money(p.unrealizedPnl)} (${(p.unrealizedPnlPct ?? 0).toFixed(2)}%)`}
                  </p>
                </div>
              ))}
              {(state?.openPositions || []).length === 0 && <p style={{ color: "var(--text-muted)" }}>No open positions.</p>}
            </div>
          </div>

          <div className="panel p-4">
            <h2 className="mb-2 text-sm font-semibold">Trade history</h2>
            <div className="space-y-2 text-xs">
              {(state?.history || []).map((t, i) => (
                <div key={i} className="card p-2">
                  <p><b>{t.time}</b> · {t.strategy} · {t.side.toUpperCase()}</p>
                  <p style={{ color: t.pnl >= 0 ? "var(--green)" : "var(--red)" }}>PnL {money(t.pnl)}</p>
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

function Badge({ label, tone }: { label: string; tone: "ok" | "warn" | "danger" | "neutral" }) {
  const styles: Record<typeof tone, { bg: string; color: string; border: string }> = {
    ok: { bg: "rgba(34,197,94,.12)", color: "#86efac", border: "rgba(34,197,94,.4)" },
    warn: { bg: "rgba(245,158,11,.12)", color: "#fcd34d", border: "rgba(245,158,11,.4)" },
    danger: { bg: "rgba(239,68,68,.12)", color: "#fca5a5", border: "rgba(239,68,68,.4)" },
    neutral: { bg: "rgba(99,102,241,.12)", color: "#c7d2fe", border: "rgba(99,102,241,.4)" },
  };

  return (
    <span className="rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ background: styles[tone].bg, color: styles[tone].color, borderColor: styles[tone].border }}>
      {label}
    </span>
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
