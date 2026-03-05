import { existsSync, readFileSync } from "node:fs";

export const runtime = "nodejs";

type TelemetryPosition = {
  strategy: string;
  symbol: string;
  side: string;
  entry_price: number;
  sl: number;
  tp: number;
  margin: number;
  open_reason?: string;
  unrealized_pnl?: number | null;
  unrealized_pnl_pct?: number | null;
};

type TelemetryTrade = {
  exit_time?: string;
  strategy: string;
  side: string;
  pnl: number;
  reason: string;
};

type TelemetryEvent = {
  ts: string;
  kind: string;
  message: string;
  data?: Record<string, unknown>;
};

type TelemetryState = {
  source?: string;
  freshness_ts?: string;
  status?: {
    running?: boolean;
    ws_connected?: boolean;
    reason?: string;
  };
  account?: {
    capital?: number;
  };
  open_positions?: TelemetryPosition[];
  closed_trades?: TelemetryTrade[];
  last_events?: TelemetryEvent[];
};

const FALLBACK = {
  status: "degraded",
  mode: "paper",
  balance: 968.22,
  equity: 968.22,
  freshnessTs: null,
  stale: true,
  staleSeconds: null,
  sourceTags: ["fallback", "paper"],
  openPositions: [
    {
      strategy: "SOL_RSI",
      symbol: "SOLUSDT",
      side: "short",
      entry: 91.49,
      sl: 94.2347,
      tp: 86.0006,
      size: 193.76,
      reason: "RSI reject overbought + context filter",
      unrealizedPnl: null,
      unrealizedPnlPct: null,
    },
  ],
  history: [
    {
      time: "2026-03-04 16:29",
      strategy: "SOL_RSI",
      side: "short",
      pnl: -30.6,
      reason: "Stop Loss",
    },
  ],
  lastEvents: [],
};

function toPrettyTime(ts?: string) {
  if (!ts) return "";
  return ts.replace("T", " ").slice(0, 19);
}

export async function GET() {
  try {
    const telemetryPath = "C:/Users/umari/.openclaw/workspace/skills/bybit-futures/scripts/paper_telemetry.json";
    if (!existsSync(telemetryPath)) return Response.json(FALLBACK);

    const raw = JSON.parse(readFileSync(telemetryPath, "utf-8")) as TelemetryState;

    const freshnessTs = raw.freshness_ts || null;
    const freshnessMs = freshnessTs ? new Date(freshnessTs).getTime() : NaN;
    const staleSeconds = Number.isFinite(freshnessMs) ? Math.max(0, Math.floor((Date.now() - freshnessMs) / 1000)) : null;
    const stale = staleSeconds === null ? true : staleSeconds > 60;

    const running = raw.status?.running === true;
    const wsConnected = raw.status?.ws_connected === true;
    const status = stale ? "stale" : running && wsConnected ? "running" : running ? "degraded" : "stopped";

    const openPositions = (raw.open_positions || []).map((p) => ({
      strategy: p.strategy,
      symbol: p.symbol,
      side: p.side,
      entry: p.entry_price,
      sl: p.sl,
      tp: p.tp,
      size: p.margin,
      reason: p.open_reason || "n/a",
      unrealizedPnl: p.unrealized_pnl ?? null,
      unrealizedPnlPct: p.unrealized_pnl_pct ?? null,
    }));

    const history = (raw.closed_trades || [])
      .slice(-20)
      .reverse()
      .map((t) => ({
        time: toPrettyTime(t.exit_time),
        strategy: t.strategy,
        side: t.side,
        pnl: t.pnl,
        reason: t.reason,
      }));

    const lastEvents = (raw.last_events || []).slice(-30).reverse().map((e) => ({
      time: toPrettyTime(e.ts),
      kind: e.kind,
      message: e.message,
      data: e.data || {},
    }));

    const sourceTags = [raw.source || "unknown-source", "paper", wsConnected ? "ws-connected" : "ws-disconnected"];

    return Response.json({
      status,
      mode: "paper",
      balance: Number(raw.account?.capital || 0),
      equity: Number(raw.account?.capital || 0),
      freshnessTs,
      stale,
      staleSeconds,
      sourceTags,
      openPositions,
      history,
      lastEvents,
    });
  } catch {
    return Response.json(FALLBACK);
  }
}
