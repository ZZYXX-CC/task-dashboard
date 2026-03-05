import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

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

type SnapshotPayload = {
  generatedAtUtc?: string | null;
  recommendation?: { demo_go?: boolean; note?: string } | null;
  scenarios?: Scenario[];
  reportMarkdown?: string;
  syncedAtUtc?: string;
  sourceFiles?: {
    json?: { path?: string; mtimeUtc?: string };
    report?: { path?: string; mtimeUtc?: string };
  };
};

const HOST_JSON_FILE = path.resolve(process.cwd(), "../skills/bybit-futures/references/pre_demo_validation_output.json");
const HOST_REPORT_FILE = path.resolve(process.cwd(), "../skills/bybit-futures/references/pre_demo_validation_report.md");
const SNAPSHOT_FILE = path.resolve(process.cwd(), "src/data/trading-tests.snapshot.json");

async function readJsonFile(filePath: string) {
  const buf = await fs.readFile(filePath);
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

async function loadFromHostRefs() {
  const [jsonData, reportMarkdown] = await Promise.all([readJsonFile(HOST_JSON_FILE), fs.readFile(HOST_REPORT_FILE, "utf8")]);
  return {
    generatedAtUtc: jsonData?.generated_at_utc ?? null,
    recommendation: jsonData?.recommendation ?? null,
    scenarios: flattenScenarios(jsonData),
    reportSnippet: reportMarkdown.slice(0, 1400),
    reportMarkdown,
    sourceType: "host-reference-files",
    sourceTags: ["validation:host-ref", "truth:runtime-local"],
    freshness: {
      generatedAtUtc: jsonData?.generated_at_utc ?? null,
      snapshotSyncedAtUtc: null,
    },
    sources: {
      json: "skills/bybit-futures/references/pre_demo_validation_output.json",
      report: "skills/bybit-futures/references/pre_demo_validation_report.md",
    },
  };
}

async function loadFromSnapshot() {
  const snapshot = (await readJsonFile(SNAPSHOT_FILE)) as SnapshotPayload;
  const reportMarkdown = snapshot.reportMarkdown || "";
  return {
    generatedAtUtc: snapshot.generatedAtUtc ?? null,
    recommendation: snapshot.recommendation ?? null,
    scenarios: Array.isArray(snapshot.scenarios) ? snapshot.scenarios : [],
    reportSnippet: reportMarkdown.slice(0, 1400),
    reportMarkdown,
    sourceType: "bundled-repo-snapshot",
    sourceTags: ["validation:repo-snapshot", "truth:deployment-bundled"],
    freshness: {
      generatedAtUtc: snapshot.generatedAtUtc ?? null,
      snapshotSyncedAtUtc: snapshot.syncedAtUtc ?? null,
      snapshotSourceJsonMtimeUtc: snapshot.sourceFiles?.json?.mtimeUtc ?? null,
      snapshotSourceReportMtimeUtc: snapshot.sourceFiles?.report?.mtimeUtc ?? null,
    },
    sources: {
      json: snapshot.sourceFiles?.json?.path || "snapshot:embedded-json",
      report: snapshot.sourceFiles?.report?.path || "snapshot:embedded-report",
      snapshot: "src/data/trading-tests.snapshot.json",
    },
  };
}

export async function GET() {
  try {
    try {
      const hostPayload = await loadFromHostRefs();
      return NextResponse.json(hostPayload);
    } catch {
      const snapshotPayload = await loadFromSnapshot();
      return NextResponse.json(snapshotPayload);
    }
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
