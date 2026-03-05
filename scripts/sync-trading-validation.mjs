#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceJsonPath = path.resolve(root, "../skills/bybit-futures/references/pre_demo_validation_output.json");
const sourceReportPath = path.resolve(root, "../skills/bybit-futures/references/pre_demo_validation_report.md");
const targetPath = path.resolve(root, "src/data/trading-tests.snapshot.json");

function flattenScenarios(data) {
  return [
    ...(Array.isArray(data?.sol_multi_timeframe) ? data.sol_multi_timeframe : []),
    ...(Array.isArray(data?.multi_symbol_1h) ? data.multi_symbol_1h : []),
  ];
}

async function readJsonFile(filePath) {
  const buf = await fs.readFile(filePath);
  const utf8Text = buf.toString("utf8");
  if (!utf8Text.includes("\u0000")) return JSON.parse(utf8Text);
  const utf16Text = buf.toString("utf16le").replace(/^\uFEFF/, "");
  return JSON.parse(utf16Text);
}

async function main() {
  const [jsonData, reportMarkdown, jsonStat, reportStat] = await Promise.all([
    readJsonFile(sourceJsonPath),
    fs.readFile(sourceReportPath, "utf8"),
    fs.stat(sourceJsonPath),
    fs.stat(sourceReportPath),
  ]);

  const payload = {
    schemaVersion: 1,
    source: "bybit-futures/reference-sync",
    syncedAtUtc: new Date().toISOString(),
    sourceFiles: {
      json: {
        path: "skills/bybit-futures/references/pre_demo_validation_output.json",
        mtimeUtc: jsonStat.mtime.toISOString(),
      },
      report: {
        path: "skills/bybit-futures/references/pre_demo_validation_report.md",
        mtimeUtc: reportStat.mtime.toISOString(),
      },
    },
    generatedAtUtc: jsonData?.generated_at_utc ?? null,
    recommendation: jsonData?.recommendation ?? null,
    scenarios: flattenScenarios(jsonData),
    reportMarkdown,
  };

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Synced trading validation snapshot -> ${targetPath}`);
}

main().catch((error) => {
  console.error("Failed to sync trading validation snapshot", error);
  process.exit(1);
});
