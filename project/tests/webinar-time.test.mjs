import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Module } from "node:module";
import ts from "typescript";

const sourcePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../app/dashboard/webinars/webinar-time.ts");
const source = readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const implementation = new Module(sourcePath, null);
implementation.filename = sourcePath;
implementation.paths = Module._nodeModulePaths(path.dirname(sourcePath));
implementation._compile(compiled, sourcePath);
const { isoToLocalTimeInZone, localTimeInZoneToIso } = implementation.exports;

test("converts local event time in the selected IANA timezone", () => {
  const instant = localTimeInZoneToIso("2026-01-10T12:00", "Asia/Kolkata");
  assert.equal(instant, "2026-01-10T06:30:00.000Z");
  assert.equal(isoToLocalTimeInZone(instant, "Asia/Kolkata"), "2026-01-10T12:00");
});

test("rejects wall-clock times skipped by a daylight-saving transition", () => {
  assert.throws(() => localTimeInZoneToIso("2026-03-08T02:30", "America/New_York"), /does not exist/);
});

test("rejects wall-clock times repeated by a daylight-saving transition", () => {
  assert.throws(() => localTimeInZoneToIso("2026-11-01T01:30", "America/New_York"), /occurs twice/);
});
