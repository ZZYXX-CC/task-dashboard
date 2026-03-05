import { NextRequest } from "next/server";
import { authenticateBridgeToken, BybitProfile, CredentialMetadata, getBridgeAuthStatus, getCredentialStatus, writeCredentials } from "@/lib/credential-bridge";

export const runtime = "nodejs";

function normalizeProfile(value?: string): BybitProfile | null {
  if ((value || "").toLowerCase() === "monitor") return "monitor";
  if ((value || "").toLowerCase() === "execution") return "execution";
  return null;
}

function isLocalRequest(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded.includes("127.0.0.1") || forwarded.includes("::1") || forwarded.includes("localhost")) return true;
  const host = req.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

function validConfirmText(profile: BybitProfile, confirmTextRaw: string) {
  const t = confirmTextRaw.trim().toUpperCase();
  if (t === "STORE LIVE KEYS") return true; // backward compatible
  if (profile === "monitor" && t === "STORE MONITOR KEYS") return true;
  if (profile === "execution" && t === "STORE EXECUTION KEYS") return true;
  return false;
}

export async function GET(req: NextRequest) {
  const local = isLocalRequest(req);
  const bridgeAuth = getBridgeAuthStatus(local);

  try {
    const status = getCredentialStatus();
    return Response.json({ ...status, bridgeAuth });
  } catch (error) {
    return Response.json({
      error: (error as Error).message,
      bridgeAuth,
    }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const local = isLocalRequest(req);
    const auth = authenticateBridgeToken(req.headers.get("authorization"), { allowImplicitLocal: local });
    if (!auth.ok) {
      const statusCode = auth.status === "setup-required" ? 503 : 401;
      return Response.json({ error: auth.message || "Unauthorized", bridgeAuth: auth }, { status: statusCode });
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
