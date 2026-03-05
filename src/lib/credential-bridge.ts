import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const PURPOSE = "task-dashboard-bybit-credentials-v1";

type StoredRecord = {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
  updatedAt: string;
};

export type CredentialPayload = {
  apiKey: string;
  apiSecret: string;
  updatedAt: string;
};

function isServerlessRuntime() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NOW_REGION);
}

function getStoragePath() {
  const appData = process.env.APPDATA;
  if (!appData) throw new Error("APPDATA is unavailable on this host.");
  return join(appData, "task-dashboard", "bybit-credentials.enc.json");
}

function getMasterKey() {
  const raw = process.env.BYBIT_CREDENTIALS_MASTER_KEY || "";
  if (!raw) {
    throw new Error("BYBIT_CREDENTIALS_MASTER_KEY is not configured. Refusing to store credentials.");
  }

  const normalized = raw.trim();
  if (/^[A-Za-z0-9+/=]+$/.test(normalized)) {
    const asBuffer = Buffer.from(normalized, "base64");
    if (asBuffer.length === 32) return asBuffer;
  }

  return createHash("sha256").update(normalized).digest();
}

function maskValue(value: string) {
  if (!value) return "Not configured";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••${value.slice(-3)}`;
}

export function assertWritableHostStorage() {
  if (isServerlessRuntime()) {
    throw new Error("Credential bridge is disabled on serverless/Vercel runtime. Run this panel on your local trusted host.");
  }
}

export function getCredentialStatus() {
  assertWritableHostStorage();
  const path = getStoragePath();
  if (!existsSync(path)) {
    return {
      configured: false,
      storage: "windows-encrypted-file",
      updatedAt: null,
      keyMasked: "Not configured",
      secretMasked: "Not configured",
    };
  }

  const creds = readCredentials();
  return {
    configured: true,
    storage: "windows-encrypted-file",
    updatedAt: creds.updatedAt,
    keyMasked: maskValue(creds.apiKey),
    secretMasked: maskValue(creds.apiSecret),
  };
}

export function writeCredentials(apiKey: string, apiSecret: string) {
  assertWritableHostStorage();

  const payload: CredentialPayload = {
    apiKey: apiKey.trim(),
    apiSecret: apiSecret.trim(),
    updatedAt: new Date().toISOString(),
  };

  const plaintext = Buffer.from(JSON.stringify(payload), "utf-8");
  const iv = randomBytes(12);
  const key = getMasterKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const aad = Buffer.from(PURPOSE, "utf-8");
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  const out: StoredRecord = {
    version: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    updatedAt: payload.updatedAt,
  };

  const path = getStoragePath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(out, null, 2), { encoding: "utf-8", mode: 0o600 });

  return getCredentialStatus();
}

export function readCredentials(): CredentialPayload {
  assertWritableHostStorage();

  const path = getStoragePath();
  if (!existsSync(path)) {
    throw new Error("Credentials are not configured.");
  }

  const raw = JSON.parse(readFileSync(path, "utf-8")) as StoredRecord;
  if (raw.version !== 1) throw new Error("Unsupported credential file version.");

  const key = getMasterKey();
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(raw.iv, "base64"));
  decipher.setAAD(Buffer.from(PURPOSE, "utf-8"));
  decipher.setAuthTag(Buffer.from(raw.tag, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(raw.ciphertext, "base64")),
    decipher.final(),
  ]);

  const payload = JSON.parse(decrypted.toString("utf-8")) as CredentialPayload;
  if (!payload.apiKey || !payload.apiSecret) throw new Error("Credential payload is incomplete.");

  return payload;
}

export function authenticateBridgeToken(authHeader: string | null) {
  const expected = (process.env.TRADING_BRIDGE_TOKEN || "").trim();
  if (!expected) throw new Error("TRADING_BRIDGE_TOKEN is not configured on this host.");

  if (!authHeader?.startsWith("Bearer ")) return false;
  const actual = authHeader.slice("Bearer ".length).trim();
  return actual.length > 0 && actual === expected;
}
