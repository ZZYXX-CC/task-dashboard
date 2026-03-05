import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const JSON_FILE = path.resolve(process.cwd(), "../skills/bybit-futures/references/pre_demo_validation_output.json");
const REPORT_FILE = path.resolve(process.cwd(), "../skills/bybit-futures/references/pre_demo_validation_report.md");

type Scenario = {
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

async function readJsonFile() {
  const buf = await fs.readFile(JSON_FILE);
  const utf8Text = buf.toString("utf8");
  if (!utf8Text.includes("\u0000")) return JSON.parse(utf8Text);
  const utf16Text = buf.toString("utf16le").replace(/^\uFEFF/, "");
  return JSON.parse(utf16Text);
}

function flattenScenarios(data: Record<string, unknown>): Scenario[] {
  const groups = [
    ...(Array.isArray(data?.sol_multi_timeframe) ? data.sol_multi_timeframe : []),
    ...(Array.isArray(data?.multi_symbol_1h) ? data.multi_symbol_1h : []),
  ];
  return groups;
}

export async function GET() {
  try {
    const [jsonData, reportMarkdown] = await Promise.all([readJsonFile(), fs.readFile(REPORT_FILE, "utf8")]);
    const scenarios = flattenScenarios(jsonData);

    return NextResponse.json({
      generatedAtUtc: jsonData?.generated_at_utc ?? null,
      recommendation: jsonData?.recommendation ?? null,
      scenarios,
      reportSnippet: reportMarkdown.slice(0, 1400),
      sources: {
        json: JSON_FILE,
        report: REPORT_FILE,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Unable to load validation outputs",
        details: error instanceof Error ? error.message : "unknown",
      },
      { status: 500 },
    );
  }
}
