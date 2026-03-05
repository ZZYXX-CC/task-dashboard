export type TaskStatus = "Not Started" | "In Progress" | "Blocked" | "Done";
export type Priority = "Critical" | "High" | "Medium" | "Low";
export type EventConfidence = "verified" | "derived";

export type TelemetrySourceTag = {
  key: string;
  label: string;
  channel: "sse" | "snapshot" | "heartbeat" | "manual";
  trust: EventConfidence;
};

export type TaskHistoryEvent = {
  id: string;
  at: string;
  event: string;
  sourceKey: string;
  confidence: EventConfidence;
};

export type Task = {
  id: string;
  title: string;
  project: string;
  owner: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
  progress: number;
  blockers?: string;
};

export type Agent = {
  name: string;
  model: string;
  status: "Running" | "Idle" | "Blocked" | "Error";
  currentTask: string;
  lastUpdate: string;
  tokensUsed: string;
};

export const telemetrySources: TelemetrySourceTag[] = [
  { key: "live-sse", label: "Live SSE /api/live", channel: "sse", trust: "verified" },
  { key: "truth-snapshot", label: "Truth-only snapshot", channel: "snapshot", trust: "verified" },
  { key: "agent-heartbeat", label: "Agent heartbeat", channel: "heartbeat", trust: "verified" },
  { key: "manual-note", label: "Manual operator note", channel: "manual", trust: "derived" },
];

export const baseTasks: Task[] = [
  { id: "SG-001", title: "Homepage v2 hero + CTA redesign", project: "St. Gabriel Website v2", owner: "design-agent", status: "Done", priority: "Critical", due: "Completed", progress: 100 },
  { id: "SG-002", title: "Programs page cards + filtering", project: "St. Gabriel Website v2", owner: "frontend-agent", status: "Done", priority: "High", due: "Completed", progress: 100 },
  { id: "SG-003", title: "Admissions/contact/about/news Stitch implementation", project: "St. Gabriel Website v2", owner: "frontend-agent", status: "Done", priority: "High", due: "Completed", progress: 100 },
  { id: "SG-004", title: "Hero refinement pass + African illustration assets", project: "St. Gabriel Website v2", owner: "design-agent", status: "Done", priority: "Critical", due: "Completed", progress: 100 },
  { id: "DB-001", title: "Agent activity feed + status chips", project: "Universal Task Dashboard", owner: "dashboard-agent", status: "Done", priority: "Critical", due: "Completed", progress: 100 },
  { id: "DB-002", title: "Detailed task modal (actions, traces, dependencies)", project: "Universal Task Dashboard", owner: "dashboard-agent", status: "Done", priority: "High", due: "Completed", progress: 100 },
  { id: "TB-001", title: "Trading bot runtime monitor", project: "Trading Bot Monitoring", owner: "ops-agent", status: "In Progress", priority: "Critical", due: "Today, 18:00", progress: 76 },
  { id: "TB-004", title: "Trend fallback live observation window", project: "Trading Bot Monitoring", owner: "ops-agent", status: "In Progress", priority: "High", due: "Today, 20:00", progress: 48 },
];

export const taskHistory: Record<string, TaskHistoryEvent[]> = {
  "SG-001": [
    { id: "sg1-1", at: "2026-03-04T07:15:00.000Z", event: "Design brief approved", sourceKey: "agent-heartbeat", confidence: "verified" },
    { id: "sg1-2", at: "2026-03-04T08:22:00.000Z", event: "Hero composition merged", sourceKey: "live-sse", confidence: "verified" },
    { id: "sg1-3", at: "2026-03-04T09:03:00.000Z", event: "CTA contrast patch deployed", sourceKey: "truth-snapshot", confidence: "verified" },
  ],
  "SG-002": [
    { id: "sg2-1", at: "2026-03-04T08:10:00.000Z", event: "Card schema locked", sourceKey: "agent-heartbeat", confidence: "verified" },
    { id: "sg2-2", at: "2026-03-04T09:41:00.000Z", event: "Filter state persistence fixed", sourceKey: "live-sse", confidence: "verified" },
    { id: "sg2-3", at: "2026-03-04T10:12:00.000Z", event: "Regression checklist signed", sourceKey: "truth-snapshot", confidence: "verified" },
  ],
  "SG-003": [
    { id: "sg3-1", at: "2026-03-04T10:24:00.000Z", event: "Admissions form wiring complete", sourceKey: "live-sse", confidence: "verified" },
    { id: "sg3-2", at: "2026-03-04T10:59:00.000Z", event: "About + News routes validated", sourceKey: "truth-snapshot", confidence: "verified" },
  ],
  "SG-004": [
    { id: "sg4-1", at: "2026-03-04T09:26:00.000Z", event: "Illustration export delivered", sourceKey: "agent-heartbeat", confidence: "verified" },
    { id: "sg4-2", at: "2026-03-04T10:32:00.000Z", event: "Hero spacing adjusted", sourceKey: "live-sse", confidence: "verified" },
    { id: "sg4-3", at: "2026-03-04T11:02:00.000Z", event: "A11y contrast sign-off", sourceKey: "truth-snapshot", confidence: "verified" },
  ],
  "DB-001": [
    { id: "db1-1", at: "2026-03-04T11:15:00.000Z", event: "Agent status chips connected", sourceKey: "live-sse", confidence: "verified" },
    { id: "db1-2", at: "2026-03-04T11:38:00.000Z", event: "Token summary card calibrated", sourceKey: "truth-snapshot", confidence: "verified" },
  ],
  "DB-002": [
    { id: "db2-1", at: "2026-03-04T11:44:00.000Z", event: "Task modal dependency panel added", sourceKey: "live-sse", confidence: "verified" },
    { id: "db2-2", at: "2026-03-04T12:02:00.000Z", event: "Trace list made scroll-safe", sourceKey: "agent-heartbeat", confidence: "verified" },
  ],
  "TB-001": [
    { id: "tb1-1", at: "2026-03-05T08:15:00.000Z", event: "Paper bot monitor started", sourceKey: "live-sse", confidence: "verified" },
    { id: "tb1-2", at: "2026-03-05T09:04:00.000Z", event: "Watchdog threshold tuned", sourceKey: "agent-heartbeat", confidence: "verified" },
    { id: "tb1-3", at: "2026-03-05T10:17:00.000Z", event: "Fallback trend mode observed", sourceKey: "manual-note", confidence: "derived" },
  ],
  "TB-004": [
    { id: "tb4-1", at: "2026-03-05T09:12:00.000Z", event: "Observation window opened", sourceKey: "live-sse", confidence: "verified" },
    { id: "tb4-2", at: "2026-03-05T10:29:00.000Z", event: "Signal drift anomaly flagged", sourceKey: "manual-note", confidence: "derived" },
  ],
};

export const baseAgents: Agent[] = [
  { name: "design-agent", model: "gemini-3.1-flash", status: "Running", currentTask: "Refining hero section spacing + color contrast", lastUpdate: "2m ago", tokensUsed: "31k" },
  { name: "frontend-agent", model: "codex-mini", status: "Running", currentTask: "Implementing programs grid and detail routing", lastUpdate: "1m ago", tokensUsed: "28k" },
  { name: "ops-agent", model: "codex-mini", status: "Running", currentTask: "Paper bot running + watchdog setup", lastUpdate: "just now", tokensUsed: "9k" },
];

export function generateLiveSnapshot(now = Date.now()) {
  return {
    tasks: baseTasks,
    agents: baseAgents,
    updatedAt: new Date(now).toISOString(),
    source: "truth-snapshot",
    telemetrySources,
    taskHistory,
  };
}
