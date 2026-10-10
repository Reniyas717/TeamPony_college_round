import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AddStageInputSchema,
  CustomerJourneyMapSchema,
  JourneyMapStageSchema,
  JourneyStageActionSchema,
} from "../lib/validations/journey-map";

const root = process.cwd();

async function source(relativePath: string) {
  return readFile(`${root}/${relativePath}`, "utf8");
}

const UUID = "11111111-1111-4111-8111-111111111111";

test("journey UI schemas require persisted UUID identifiers", () => {
  assert.equal(AddStageInputSchema.safeParse({ stage_name: "Activation" }).success, true);
  assert.equal(AddStageInputSchema.safeParse({ stage_name: "" }).success, false);
  assert.equal(JourneyMapStageSchema.shape.id.safeParse(UUID).success, true);
  assert.equal(JourneyMapStageSchema.shape.id.safeParse("stg-map-1").success, false);
  assert.equal(JourneyStageActionSchema.shape.id.safeParse("act-map-1").success, false);
  assert.equal(CustomerJourneyMapSchema.shape.business_id.safeParse(UUID).success, true);
});

test("journey routes require verified owner context and expose persisted stage mutations", async () => {
  const files = [
    "app/api/journey-maps/route.ts",
    "app/api/journey-maps/generate/route.ts",
    "app/api/journey-maps/[id]/route.ts",
    "app/api/journey-maps/[id]/stages/route.ts",
    "app/api/journey-maps/[id]/stages/[stageId]/route.ts",
    "app/api/journey-maps/[id]/actions/[actionId]/route.ts",
  ];
  const contents = await Promise.all(files.map(source));
  const combined = contents.join("\n");

  for (const content of contents) assert.match(content, /requireOwnerContext/);
  assert.match(combined, /UpdateStageInputSchema/);
  assert.match(combined, /AddStageInputSchema/);
  assert.match(combined, /JourneyMapService\.deleteStage/);
  assert.match(combined, /JourneyMapService\.executeAction/);
});

test("journey service has no process memory fallback and approval stays truthful", async () => {
  const service = await source("services/journey-map.service.ts");
  const migration = await source("supabase/migrations/20261021_atomic_crm_journey_rpc.sql");

  assert.doesNotMatch(service, /memoryMaps|DEFAULT_BUSINESS_ID|getSupabaseServerClient/);
  assert.doesNotMatch(service, /id: `(?:map|stg|act)-/);
  assert.match(service, /\.eq\("business_id", context\.businessId\)/);
  assert.match(migration, /Proposal approved\. No downstream module change was executed\./);
  assert.match(migration, /'journey\.action\.approved'/);
  assert.match(migration, /'journey\.stage\.updated'/);
  assert.match(service, /decide_journey_action_transaction/);
  assert.match(service, /generate_customer_journey_map_transaction/);
});
