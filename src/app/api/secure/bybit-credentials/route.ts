import { NextRequest } from "next/server";
import { authenticateBridgeToken, BybitProfile, CredentialMetadata, getCredentialStatus, writeCredentials } from "@/lib/credential-bridge";

export const runtime = "nodejs";

function normalizeProfile(value?: string): BybitProfile | null {
  if ((value || "").toLowerCase() === "monitor") return "monitor";
  if ((value || "").toLowerCase() === "execution") return "execution";
  return null;
}

function validConfirmText(profile: BybitProfile, confirmTextRaw: string) {
  const t = confirmTextRaw.trim().toUpperCase();
  if (t === "STORE LIVE KEYS") return true; // backward compatible
  if (profile === "monitor" && t === "STORE MONITOR KEYS") return true;
  if (profile === "execution" && t === "STORE EXECUTION KEYS") return true;
  return false;
}

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
      profile?: string;
      apiKey?: string;
      apiSecret?: string;
      confirmText?: string;
      metadata?: CredentialMetadata;
    };

    const profile = normalizeProfile(body.profile);
    if (!profile) {
      return Response.json({ error: "Profile is required: monitor | execution." }, { status: 400 });
    }

    const apiKey = (body.apiKey || "").trim();
    const apiSecret = (body.apiSecret || "").trim();

    if (!apiKey || !apiSecret) {
      return Response.json({ error: "Both API key and API secret are required." }, { status: 400 });
    }

    if (!validConfirmText(profile, body.confirmText || "")) {
      return Response.json({ error: "Confirmation text mismatch." }, { status: 400 });
    }

    const status = writeCredentials(profile, apiKey, apiSecret, body.metadata);
    return Response.json({ ok: true, status });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
