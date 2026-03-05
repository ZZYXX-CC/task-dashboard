import { NextResponse } from "next/server";

const IP_ENDPOINTS = [
  "https://api.ipify.org?format=json",
  "https://ifconfig.me/all.json",
  "https://api64.ipify.org?format=json",
];

function extractIp(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const maybe = payload as Record<string, unknown>;
  const ip = maybe.ip ?? maybe.ip_addr ?? maybe.address;
  return typeof ip === "string" && ip.trim() ? ip.trim() : null;
}

export async function GET() {
  for (const endpoint of IP_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) continue;
      const json = (await response.json()) as unknown;
      const ip = extractIp(json);

      if (ip) {
        return NextResponse.json({
          ip,
          checkedAt: new Date().toISOString(),
          source: endpoint,
        });
      }
    } catch {
      // try next provider
    }
  }

  return NextResponse.json(
    {
      error: "Failed to resolve public IP from upstream providers.",
      checkedAt: new Date().toISOString(),
    },
    { status: 502 },
  );
}
