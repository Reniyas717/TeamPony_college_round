import "server-only";

import { createClient } from "./server";
import { OwnerContextError, resolveOwnerContext } from "./owner-context-core";
export { OwnerContextError, ownerContextErrorResponse, resolveOwnerContext } from "./owner-context-core";
export type { OwnerContext } from "./owner-context-core";

/** Resolves the only business the verified session owner may access. */
export async function requireOwnerContext() {
  let client: Awaited<ReturnType<typeof createClient>>;
  try {
    client = await createClient();
  } catch {
    throw new OwnerContextError("Business data is temporarily unavailable.", 503, "BUSINESS_CONTEXT_UNAVAILABLE");
  }
  return resolveOwnerContext(client);
}
