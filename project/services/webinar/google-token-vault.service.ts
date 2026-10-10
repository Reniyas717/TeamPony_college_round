import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";
import { GOOGLE_GMAIL_SEND_SCOPE, GOOGLE_MEET_SCOPE } from "@/lib/google-oauth";

type GoogleTokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  googleSub?: string;
  senderEmail?: string;
};

type OAuthSession = {
  provider_token?: string | null;
  provider_refresh_token?: string | null;
  provider_token_expires_at?: number | null;
  expires_at?: number | null;
  user?: { app_metadata?: { provider?: string }; identities?: Array<{ provider?: string }> };
};

type EncryptedToken = { ciphertext: string; iv: string; tag: string };
type StoredEncryptedToken = { token_ciphertext: string; token_iv: string; token_auth_tag: string };

function encryptedFields(row: StoredEncryptedToken): EncryptedToken {
  return { ciphertext: row.token_ciphertext, iv: row.token_iv, tag: row.token_auth_tag };
}

export class GoogleTokenVaultError extends Error {
  constructor(public readonly code: "NOT_CONNECTED" | "RECONNECT_REQUIRED" | "CONFIGURATION_ERROR" | "PROVIDER_ERROR") {
    super("Google authorization is unavailable. Reconnect Google sign-in or check the server configuration.");
  }
}

function encryptionKey() {
  const configured = process.env.WEBINAR_GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!configured) throw new GoogleTokenVaultError("CONFIGURATION_ERROR");
  const key = /^[0-9a-f]{64}$/i.test(configured)
    ? Buffer.from(configured, "hex")
    : Buffer.from(configured, "base64");
  if (key.length !== 32) throw new GoogleTokenVaultError("CONFIGURATION_ERROR");
  return key;
}

function encryptTokenBundle(bundle: GoogleTokenBundle, businessId: string): EncryptedToken {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(businessId));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(bundle), "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decryptTokenBundle(row: EncryptedToken, businessId: string): GoogleTokenBundle {
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.iv, "base64"));
    decipher.setAAD(Buffer.from(businessId));
    decipher.setAuthTag(Buffer.from(row.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(row.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");
    const bundle = JSON.parse(plaintext) as GoogleTokenBundle;
    if (!bundle.accessToken || !bundle.refreshToken || !Number.isFinite(bundle.expiresAt)) {
      throw new Error("Invalid encrypted token payload.");
    }
    return bundle;
  } catch {
    throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  }
}

async function businessForOwner(ownerId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("businesses").select("id").eq("owner_id", ownerId).maybeSingle();
  if (error || !data) throw new GoogleTokenVaultError("NOT_CONNECTED");
  return { admin, businessId: data.id };
}

async function storeBundle(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  bundle: GoogleTokenBundle,
) {
  const encrypted = encryptTokenBundle(bundle, businessId);
  const { error } = await admin.from("business_google_provider_tokens").upsert({
    business_id: businessId,
    token_ciphertext: encrypted.ciphertext,
    token_iv: encrypted.iv,
    token_auth_tag: encrypted.tag,
    access_token_expires_at: new Date(bundle.expiresAt * 1000).toISOString(),
    granted_scopes: bundle.scopes,
    updated_at: new Date().toISOString(),
  }, { onConflict: "business_id" });
  if (error) throw new GoogleTokenVaultError("CONFIGURATION_ERROR");
}

export async function storeGoogleTokensFromLogin(ownerId: string, session: OAuthSession | null) {
  if (!session?.provider_token) return;
  const isGoogle = session.user?.app_metadata?.provider === "google"
    || session.user?.identities?.some((identity) => identity.provider === "google");
  if (!isGoogle) return;

  const tokenInfo = await inspectGoogleAccessToken(session.provider_token);
  const { admin, businessId } = await businessForOwner(ownerId);
  const { data: previous } = await admin.from("business_google_provider_tokens")
    .select("token_ciphertext,token_iv,token_auth_tag,granted_scopes")
    .eq("business_id", businessId)
    .maybeSingle();
  let previousBundle: GoogleTokenBundle | null = null;
  if (previous) {
    try { previousBundle = decryptTokenBundle(encryptedFields(previous as StoredEncryptedToken), businessId); } catch { /* A new Google grant can replace an unreadable old bundle. */ }
  }
  const sameGoogleAccount = previousBundle?.googleSub === tokenInfo.sub;
  const refreshToken = session.provider_refresh_token ?? (sameGoogleAccount ? previousBundle?.refreshToken : null) ?? null;
  if (!refreshToken) return { scopes: tokenInfo.scopes };

  const expiresAt = typeof session.provider_token_expires_at === "number"
    ? session.provider_token_expires_at
    : Math.floor(Date.now() / 1000) + 3600;
  await storeBundle(admin, businessId, {
    accessToken: session.provider_token,
    refreshToken,
    expiresAt,
    scopes: tokenInfo.scopes,
    googleSub: tokenInfo.sub,
    senderEmail: tokenInfo.email,
  });
  return { scopes: tokenInfo.scopes };
}

async function inspectGoogleAccessToken(accessToken: string) {
  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/tokeninfo", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ access_token: accessToken }),
      cache: "no-store",
    });
  } catch {
    throw new GoogleTokenVaultError("PROVIDER_ERROR");
  }
  const info = await response.json().catch(() => null) as {
    sub?: unknown; email?: unknown; email_verified?: unknown; scope?: unknown;
  } | null;
  if (!response.ok || typeof info?.sub !== "string" || !info.sub
    || typeof info.email !== "string" || !info.email.includes("@")
    || ![true, "true"].includes(info.email_verified as boolean | string)
    || typeof info.scope !== "string") {
    throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  }
  return { sub: info.sub, email: info.email.trim().toLowerCase(), scopes: info.scope.split(" ").filter(Boolean) };
}

async function refreshBundle(bundle: GoogleTokenBundle): Promise<GoogleTokenBundle> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new GoogleTokenVaultError("CONFIGURATION_ERROR");

  let response: Response;
  try {
    response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: bundle.refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });
  } catch {
    throw new GoogleTokenVaultError("PROVIDER_ERROR");
  }

  const result = await response.json().catch(() => null) as {
    access_token?: unknown;
    expires_in?: unknown;
    refresh_token?: unknown;
    scope?: unknown;
  } | null;
  if (!response.ok || typeof result?.access_token !== "string") {
    throw new GoogleTokenVaultError(response.status === 400 ? "RECONNECT_REQUIRED" : "PROVIDER_ERROR");
  }

  const returnedScopes = typeof result.scope === "string" ? result.scope.split(" ").filter(Boolean) : bundle.scopes;
  return {
    accessToken: result.access_token,
    refreshToken: typeof result.refresh_token === "string" ? result.refresh_token : bundle.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (typeof result.expires_in === "number" ? result.expires_in : 3600),
    scopes: returnedScopes,
  };
}

async function loadGoogleTokenBundle(businessId: string) {
  const admin = createAdminClient();
  const { data: rawRow, error } = await admin.from("business_google_provider_tokens")
    .select("token_ciphertext,token_iv,token_auth_tag,granted_scopes")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !rawRow) throw new GoogleTokenVaultError("NOT_CONNECTED");

  let bundle = decryptTokenBundle(encryptedFields(rawRow as StoredEncryptedToken), businessId);
  if (bundle.expiresAt <= Math.floor(Date.now() / 1000) + 60) {
    bundle = await refreshBundle(bundle);
    await storeBundle(admin, businessId, bundle);
  }
  return bundle;
}

export async function getGoogleAccessTokenForBusiness(businessId: string, requiredScope = GOOGLE_MEET_SCOPE) {
  const bundle = await loadGoogleTokenBundle(businessId);
  if (!bundle.scopes.includes(requiredScope)) throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  return bundle.accessToken;
}

export async function getGoogleEmailSenderForBusiness(businessId: string) {
  const bundle = await loadGoogleTokenBundle(businessId);
  if (!bundle.scopes.includes(GOOGLE_GMAIL_SEND_SCOPE) || !bundle.googleSub || !bundle.senderEmail) {
    throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  }
  return bundle.senderEmail;
}

export async function getGoogleGmailCredentialsForBusiness(businessId: string) {
  const bundle = await loadGoogleTokenBundle(businessId);
  if (!bundle.scopes.includes(GOOGLE_GMAIL_SEND_SCOPE) || !bundle.googleSub || !bundle.senderEmail) {
    throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  }
  return { accessToken: bundle.accessToken, senderEmail: bundle.senderEmail };
}

export async function getGoogleConnectionStatus(businessId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("business_google_provider_tokens")
    .select("token_ciphertext,token_iv,token_auth_tag,granted_scopes,access_token_expires_at,updated_at")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new GoogleTokenVaultError("CONFIGURATION_ERROR");
  return {
    connected: Boolean(data),
    scope_granted: Boolean(data?.granted_scopes?.includes(GOOGLE_MEET_SCOPE)),
    gmail_scope_granted: Boolean(data?.granted_scopes?.includes(GOOGLE_GMAIL_SEND_SCOPE)),
    sender_email: data?.token_ciphertext ? decryptTokenBundle(encryptedFields(data as StoredEncryptedToken), businessId).senderEmail ?? null : null,
    access_token_expires_at: data?.access_token_expires_at ?? null,
    updated_at: data?.updated_at ?? null,
  };
}
