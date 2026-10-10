import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/server";

type GoogleTokenBundle = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
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
    super("Google Meet authorization is unavailable. Reconnect Google sign-in or check the server configuration.");
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

  const { admin, businessId } = await businessForOwner(ownerId);
  const { data: previous } = await admin.from("business_google_provider_tokens")
    .select("token_ciphertext,token_iv,token_auth_tag,granted_scopes")
    .eq("business_id", businessId)
    .maybeSingle();
  let refreshToken = session.provider_refresh_token ?? null;
  if (!refreshToken && previous) {
    refreshToken = decryptTokenBundle(encryptedFields(previous as StoredEncryptedToken), businessId).refreshToken;
  }
  if (!refreshToken) return;

  const expiresAt = typeof session.provider_token_expires_at === "number"
    ? session.provider_token_expires_at
    : Math.floor(Date.now() / 1000) + 3600;
  await storeBundle(admin, businessId, {
    accessToken: session.provider_token,
    refreshToken,
    expiresAt,
    scopes: ["https://www.googleapis.com/auth/meetings.space.created"],
  });
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
  if (!returnedScopes.includes("https://www.googleapis.com/auth/meetings.space.created")) {
    throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  }
  return {
    accessToken: result.access_token,
    refreshToken: typeof result.refresh_token === "string" ? result.refresh_token : bundle.refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (typeof result.expires_in === "number" ? result.expires_in : 3600),
    scopes: returnedScopes,
  };
}

export async function getGoogleAccessTokenForBusiness(businessId: string) {
  const admin = createAdminClient();
  const { data: rawRow, error } = await admin.from("business_google_provider_tokens")
    .select("token_ciphertext,token_iv,token_auth_tag,granted_scopes")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error || !rawRow) throw new GoogleTokenVaultError("NOT_CONNECTED");

  let bundle = decryptTokenBundle(encryptedFields(rawRow as StoredEncryptedToken), businessId);
  const requiredScope = "https://www.googleapis.com/auth/meetings.space.created";
  if (!bundle.scopes.includes(requiredScope)) throw new GoogleTokenVaultError("RECONNECT_REQUIRED");
  if (bundle.expiresAt <= Math.floor(Date.now() / 1000) + 60) {
    bundle = await refreshBundle(bundle);
    await storeBundle(admin, businessId, bundle);
  }
  return bundle.accessToken;
}

export async function getGoogleConnectionStatus(businessId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin.from("business_google_provider_tokens")
    .select("granted_scopes,access_token_expires_at,updated_at")
    .eq("business_id", businessId)
    .maybeSingle();
  if (error) throw new GoogleTokenVaultError("CONFIGURATION_ERROR");
  return {
    connected: Boolean(data),
    scope_granted: Boolean(data?.granted_scopes?.includes("https://www.googleapis.com/auth/meetings.space.created")),
    access_token_expires_at: data?.access_token_expires_at ?? null,
    updated_at: data?.updated_at ?? null,
  };
}
