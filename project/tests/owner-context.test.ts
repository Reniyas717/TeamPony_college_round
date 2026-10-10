import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { OwnerContextError, resolveOwnerContext } from "../lib/supabase/owner-context-core";

function clientFor(userId: string | null, businessId: string | null) {
  const lookedUpOwners: string[] = [];
  const client = {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null }, error: userId ? null : { message: "No session" } }),
    },
    from(table: string) {
      assert.equal(table, "businesses");
      return {
        select() { return this; },
        eq(column: string, value: string) {
          assert.equal(column, "owner_id");
          lookedUpOwners.push(value);
          return this;
        },
        maybeSingle: async () => ({ data: businessId ? { id: businessId } : null, error: null }),
      };
    },
  };
  return { client: client as unknown as SupabaseClient, lookedUpOwners };
}

test("verified owner context", async (t) => {
  await t.test("rejects anonymous callers before resolving a business", async () => {
    const { client, lookedUpOwners } = clientFor(null, null);
    await assert.rejects(() => resolveOwnerContext(client), (error: unknown) => {
      assert.ok(error instanceof OwnerContextError);
      assert.equal(error.status, 401);
      return true;
    });
    assert.deepEqual(lookedUpOwners, []);
  });

  await t.test("resolves only the business owned by the verified user", async () => {
    const first = clientFor("owner-a", "business-a");
    const second = clientFor("owner-b", "business-b");
    const firstContext = await resolveOwnerContext(first.client);
    const secondContext = await resolveOwnerContext(second.client);
    assert.equal(firstContext.businessId, "business-a");
    assert.equal(firstContext.user.id, "owner-a");
    assert.equal(secondContext.businessId, "business-b");
    assert.deepEqual(first.lookedUpOwners, ["owner-a"]);
    assert.deepEqual(second.lookedUpOwners, ["owner-b"]);
  });

  await t.test("returns not found without using a fallback business", async () => {
    const { client } = clientFor("owner-without-business", null);
    await assert.rejects(() => resolveOwnerContext(client), (error: unknown) => {
      assert.ok(error instanceof OwnerContextError);
      assert.equal(error.status, 404);
      assert.equal(error.code, "BUSINESS_NOT_FOUND");
      return true;
    });
  });
});
