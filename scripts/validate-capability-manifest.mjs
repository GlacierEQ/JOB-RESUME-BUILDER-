#!/usr/bin/env node
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = path.join(ROOT, "machine", "capabilities.json");
const CAPABILITY_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assert(condition, message) {
  if (!condition) throw new Error(`Capability manifest: ${message}`);
}

function safeRelative(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !path.isAbsolute(value) &&
    !value.includes("\\") &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  );
}

async function requirePath(ref, capabilityId) {
  assert(safeRelative(ref), `${capabilityId}: unsafe repository ref ${String(ref)}`);
  const resolved = path.resolve(ROOT, ref);
  assert(resolved.startsWith(`${ROOT}${path.sep}`), `${capabilityId}: ref escapes repository`);
  await access(resolved);
}

const payload = JSON.parse(await readFile(MANIFEST, "utf8"));
assert(payload.schema === "glaciereq.capability-manifest.v1", "unsupported schema");
assert(payload.repository === "GlacierEQ/JOB-RESUME-BUILDER-", "repository identity mismatch");
assert(Array.isArray(payload.capabilities) && payload.capabilities.length > 0, "capabilities must be non-empty");

const seen = new Set();
for (const row of payload.capabilities) {
  assert(row && typeof row === "object" && !Array.isArray(row), "capability must be an object");
  assert(typeof row.capability_id === "string" && CAPABILITY_ID.test(row.capability_id), "invalid capability_id");
  assert(!seen.has(row.capability_id), `duplicate capability_id ${row.capability_id}`);
  seen.add(row.capability_id);
  assert(typeof row.summary === "string" && row.summary.trim(), `${row.capability_id}: summary required`);
  assert(typeof row.claim_ceiling === "string" && row.claim_ceiling.trim(), `${row.capability_id}: claim ceiling required`);
  assert(Array.isArray(row.implementation_refs) && row.implementation_refs.length > 0, `${row.capability_id}: implementation refs required`);
  assert(Array.isArray(row.verification_refs) && row.verification_refs.length > 0, `${row.capability_id}: verification refs required`);
  for (const ref of [...row.implementation_refs, ...row.verification_refs]) {
    await requirePath(ref, row.capability_id);
  }
}

assert(payload.truth_boundary?.manifest_describes_repository_owned_mechanisms_only === true, "owned-mechanism boundary required");
assert(payload.truth_boundary?.verification_refs_are_not_deployment_receipts === true, "verification/deployment boundary required");
assert(payload.truth_boundary?.capabilities_do_not_imply_external_adoption_or_company_affiliation === true, "affiliation boundary required");

console.log(JSON.stringify({
  schema: payload.schema,
  repository: payload.repository,
  capability_count: payload.capabilities.length,
  status: "PASS"
}));
