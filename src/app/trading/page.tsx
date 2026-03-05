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

type TestScenario = {
  symbol?: string;
  timeframe?: string;
  candles?: number;
  start?: string;
  end?: string;
  result?: {
    trades?: number;
    win_rate?: number;
    total_pnl?: number;
    final_balance?: number;
    strategy?: string;
    regime?: {
      trend?: { trades?: number; win_rate?: number; pnl?: number };
      range?: { trades?: number; win_rate?: number; pnl?: number };
    };
  };
  risk?: {
    max_drawdown_proxy_pct?: number;
    trade_frequency_per_day?: number;
    diagnostic_note?: string;
  };
};

type TradingTestsPayload = {
  generatedAtUtc: string | null;
  recommendation?: {
    demo_go?: boolean;
    note?: string;
  };
  scenarios: TestScenario[];
  reportSnippet: string;
  sources: { json: string; report: string };
};

function maskValue(value: string) {
  if (!value) return "Not configured";
  if (value.length < 8) return "••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-3)}`;
}

function money(v: number) {
  return `$${v.toFixed(2)}`;
}

function pct(v: number) {
  return `${v.toFixed(2)}%`;
}

export default function TradingPage() {
  const [state, setState] = useState<TradingState | null>(null);
  const [tests, setTests] = useState<TradingTestsPayload | null>(null);
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

  useEffect(() => {
    const fetchTests = async () => {
      const res = await fetch("/api/trading-tests", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as TradingTestsPayload;
      setTests(json);
    };
    fetchTests();
  }, []);

  const runtimeMode = state?.mode || "paper";
  const hasKeys = apiKey.trim().length > 0 && apiSecret.trim().length > 0;

  const testSummaryCards = useMemo(
    () =>
      (tests?.scenarios || []).map((scenario, idx) => ({
        id: `${scenario.symbol || "n/a"}-${scenario.timeframe || "n/a"}-${idx}`,
        symbol: scenario.symbol || "Unknown",
        timeframe: scenario.timeframe || "n/a",
        pnl: scenario.result?.total_pnl ?? 0,
        wr: scenario.result?.win_rate ?? 0,
        trades: scenario.result?.trades ?? 0,
      })),
    [tests?.scenarios],
  );

  const validationMetrics = useMemo(() => {
    const scenarios = tests?.scenarios || [];
    if (!scenarios.length) {
      return { totalTrades: 0, totalPnl: 0, avgWr: 0, best: null as TestScenario | null, worst: null as TestScenario | null };
    }

    const totalTrades = scenarios.reduce((sum, s) => sum + (s.result?.trades ?? 0), 0);
    const totalPnl = scenarios.reduce((sum, s) => sum + (s.result?.total_pnl ?? 0), 0);
    const avgWr = scenarios.reduce((sum, s) => sum + (s.result?.win_rate ?? 0), 0) / scenarios.length;
    const sorted = [...scenarios].sort((a, b) => (b.result?.total_pnl ?? 0) - (a.result?.total_pnl ?? 0));

    return {
      totalTrades,
      totalPnl,
      avgWr,
      best: sorted[0] || null,
      worst: sorted[sorted.length - 1] || null,
    };
  }, [tests?.scenarios]);

  const reportSummaryLines = useMemo(
    () =>
      (tests?.reportSnippet || "")
        .split("\n")
        .map((line) => line.replace(/^[-#\s]+/, "").trim())
        .filter(Boolean)
        .slice(0, 4),
    [tests?.reportSnippet],
  );

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

        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Validation & backtest results</h2>
            {tests?.recommendation?.demo_go != null && (
              <Badge label={tests.recommendation.demo_go ? "Recommendation: GO" : "Recommendation: NO-GO"} tone={tests.recommendation.demo_go ? "ok" : "danger"} />
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Badge label={`Generated ${tests?.generatedAtUtc ? new Date(tests.generatedAtUtc).toLocaleString() : "n/a"}`} tone="neutral" />
            <Badge label={`Scenarios ${(tests?.scenarios || []).length}`} tone="neutral" />
            <Badge label="Validation snapshots loaded" tone="neutral" />
          </div>

          {tests?.recommendation?.note && (
            <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>{tests.recommendation.note}</p>
          )}

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <Card label="Total Scenario Trades" value={`${validationMetrics.totalTrades}`} />
            <Card label="Net Scenario PnL" value={money(validationMetrics.totalPnl)} />
            <Card label="Average Win Rate" value={pct(validationMetrics.avgWr)} />
            <Card label="Best Scenario" value={`${validationMetrics.best?.symbol || "n/a"} ${validationMetrics.best?.timeframe || ""}`.trim()} />
          </div>

          <div className="mt-3 card p-3 text-xs">
            <p className="font-semibold">Report summary</p>
            <ul className="mt-2 list-disc space-y-1 pl-4" style={{ color: "var(--text-secondary)" }}>
              {reportSummaryLines.map((line, idx) => <li key={`summary-${idx}`}>{line}</li>)}
              {reportSummaryLines.length === 0 && <li>No report summary found.</li>}
            </ul>
            <details className="mt-2">
              <summary className="cursor-pointer text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Show report excerpt</summary>
              <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded border p-2 text-[11px]" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                {tests?.reportSnippet || "No report excerpt available."}
              </pre>
            </details>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {testSummaryCards.map((item) => (
              <div key={item.id} className="card p-3 text-xs">
                <p className="font-semibold">{item.symbol} · {item.timeframe}</p>
                <p className="mt-1" style={{ color: item.pnl >= 0 ? "var(--green)" : "var(--red)" }}>PnL {money(item.pnl)}</p>
                <p style={{ color: "var(--text-secondary)" }}>WR {pct(item.wr)} · Trades {item.trades}</p>
              </div>
            ))}
            {testSummaryCards.length === 0 && <p className="text-xs" style={{ color: "var(--text-muted)" }}>No validation snapshots found.</p>}
          </div>

          <div className="mt-4 space-y-2">
            {(tests?.scenarios || []).map((s, i) => {
              const diagnostic = s.risk?.diagnostic_note?.trim() || "";
              const longDiagnostic = diagnostic.length > 160;
              return (
                <article key={`${s.symbol}-${s.timeframe}-${i}`} className="card p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{s.symbol || "n/a"} · {s.timeframe || "n/a"}</p>
                    <p style={{ color: "var(--text-secondary)" }}>{s.start || "?"} → {s.end || "?"}</p>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <p>Trades <b>{s.result?.trades ?? 0}</b></p>
                    <p>Win rate <b>{pct(s.result?.win_rate ?? 0)}</b></p>
                    <p>PnL <b style={{ color: (s.result?.total_pnl ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>{money(s.result?.total_pnl ?? 0)}</b></p>
                    <p>Final balance <b>{money(s.result?.final_balance ?? 0)}</b></p>
                  </div>
                  <div className="mt-2 space-y-1" style={{ color: "var(--text-secondary)" }}>
                    <p>Strategy: {s.result?.strategy || "n/a"}</p>
                    <p>Trend regime: trades {s.result?.regime?.trend?.trades ?? 0}, WR {pct(s.result?.regime?.trend?.win_rate ?? 0)}, pnl {money(s.result?.regime?.trend?.pnl ?? 0)}</p>
                    <p>Range regime: trades {s.result?.regime?.range?.trades ?? 0}, WR {pct(s.result?.regime?.range?.win_rate ?? 0)}, pnl {money(s.result?.regime?.range?.pnl ?? 0)}</p>
                    <p>Risk proxy: max DD {pct(s.risk?.max_drawdown_proxy_pct ?? 0)} · trades/day {(s.risk?.trade_frequency_per_day ?? 0).toFixed(2)}</p>
                    {!!diagnostic && !longDiagnostic && <p>Diagnostic: {diagnostic}</p>}
                    {!!diagnostic && longDiagnostic && (
                      <details>
                        <summary className="cursor-pointer font-semibold" style={{ color: "var(--text-muted)" }}>Diagnostic note (expand)</summary>
                        <p className="mt-1">{diagnostic}</p>
                      </details>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Validation data is rendered directly in this panel for quick review. Source files remain server-side.
          </p>
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
