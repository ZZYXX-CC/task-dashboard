import { NextRequest } from "next/server";
import { authenticateBridgeToken, getCredentialStatus, writeCredentials } from "@/lib/credential-bridge";

export const runtime = "nodejs";

export async function GET() {
  try {
    const status = getCredentialStatus();
    return Response.json(status);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ok = authenticateBridgeToken(req.headers.get("authorization"));
    if (!ok) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as {
      apiKey?: string;
      apiSecret?: string;
      confirmText?: string;
    };

    const apiKey = (body.apiKey || "").trim();
    const apiSecret = (body.apiSecret || "").trim();
    const confirmText = (body.confirmText || "").trim().toUpperCase();

    if (!apiKey || !apiSecret) {
      return Response.json({ error: "Both API key and API secret are required." }, { status: 400 });
    }

    if (confirmText !== "STORE LIVE KEYS") {
      return Response.json({ error: "Confirmation text mismatch." }, { status: 400 });
    }

    const status = writeCredentials(apiKey, apiSecret);
    return Response.json({ ok: true, status });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
