import { existsSync, readFileSync } from "node:fs";

export const runtime = "nodejs";

const FALLBACK = {
  status: "running",
  mode: "paper",
  balance: 968.22,
  equity: 968.22,
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
};

export async function GET() {
  try {
    const localPath = "C:/Users/umari/.openclaw/workspace/skills/bybit-futures/scripts/paper_state.json";
    if (!existsSync(localPath)) return Response.json(FALLBACK);

    const raw = JSON.parse(readFileSync(localPath, "utf-8")) as {
      capital?: number;
      positions?: Record<string, {
        strategy?: string;
        symbol: string;
        side: string;
        entry_price: number;
        sl: number;
        tp: number;
        margin: number;
        open_reason?: string;
      }>;
      trades?: Array<{
        exit_time?: string;
        strategy: string;
        side: string;
        pnl: number;
        reason: string;
      }>;
    };

    const openPositions = Object.values(raw.positions || {}).map((p) => ({
      strategy: p.strategy || "unknown",
      symbol: p.symbol,
      side: p.side,
      entry: p.entry_price,
      sl: p.sl,
      tp: p.tp,
      size: p.margin,
      reason: p.open_reason || "n/a",
    }));

    const history = (raw.trades || []).slice(-20).reverse().map((t) => ({
      time: (t.exit_time || "").replace("T", " ").slice(0, 16),
      strategy: t.strategy,
      side: t.side,
      pnl: t.pnl,
      reason: t.reason,
    }));

    return Response.json({
      status: "running",
      mode: "paper",
      balance: Number(raw.capital || 0),
      equity: Number(raw.capital || 0),
      openPositions,
      history,
    });
  } catch {
    return Response.json(FALLBACK);
  }
}
