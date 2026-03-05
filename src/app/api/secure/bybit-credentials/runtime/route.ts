import { NextRequest } from "next/server";
import { authenticateBridgeToken, readCredentials } from "@/lib/credential-bridge";

export const runtime = "nodejs";

function isLocalRequest(req: NextRequest) {
  const forwarded = req.headers.get("x-forwarded-for") || "";
  if (forwarded.includes("127.0.0.1") || forwarded.includes("::1") || forwarded.includes("localhost")) return true;
  const host = req.headers.get("host") || "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

export async function GET(req: NextRequest) {
  try {
    if (!isLocalRequest(req)) {
      return Response.json({ error: "Runtime credential access allowed only from localhost." }, { status: 403 });
    }

    const ok = authenticateBridgeToken(req.headers.get("authorization"));
    if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const creds = readCredentials();
    return Response.json({
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      updatedAt: creds.updatedAt,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
