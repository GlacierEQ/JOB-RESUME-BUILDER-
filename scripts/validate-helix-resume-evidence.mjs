#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "portfolio-source.json");
const SNAPSHOT = path.join(ROOT, "data", "helix-resume-evidence.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function load(file) {
  const text = await readFile(file, "utf8");
  return { text, value: JSON.parse(text) };
}

async function main() {
  const pointer = (await load(POINTER)).value;
  const { text, value: snapshot } = await load(SNAPSHOT);

  assert(pointer.consumer === "GlacierEQ/JOB-RESUME-BUILDER-", "consumer mismatch");
  assert(pointer.projection_id === "resume_shapeshifter", "projection mismatch");
  assert(pointer.selection_policy.preserve_source_resume_truth_gate === true, "source truth gate must remain enabled");
  assert(pointer.selection_policy.helix_evidence_may_rank_but_not_invent === true, "rank-not-invent policy is missing");

  assert(snapshot.schema === "glaciereq.resume-evidence-projection.v1", "snapshot schema mismatch");
  assert(snapshot.source?.authority?.repository === "GlacierEQ/job-app-helix", "authority mismatch");
  assert(typeof snapshot.source?.source_digest === "string" && snapshot.source.source_digest.length === 64, "missing source digest");
  assert(snapshot.policy?.source_resume_remains_authoritative === true, "source résumé authority is missing");
  assert(snapshot.policy?.helix_may_rank_but_not_invent === true, "rank-not-invent contract is missing");
  assert(snapshot.policy?.private_repository_names_allowed === false, "private repository names must be forbidden");

  assert(Array.isArray(snapshot.systems) && snapshot.systems.length > 0, "system evidence is empty");
  const ids = snapshot.systems.map((system) => system.system_id);
  assert(new Set(ids).size === ids.length, "duplicate system IDs");
  for (const system of snapshot.systems) {
    assert(["PROMOTED", "REFERENCE_ONLY"].includes(system.state), `unsupported system state: ${system.system_id}`);
    assert(system.repository.startsWith("GlacierEQ/"), `invalid system repository: ${system.system_id}`);
    assert(["PRIMARY_EVIDENCE", "SUPPORTING_EVIDENCE_WITH_BOUNDARY"].includes(system.resume_use), `invalid résumé use: ${system.system_id}`);
  }

  assert(Array.isArray(snapshot.companies) && snapshot.companies.length >= 49, "company evidence is incomplete");
  const companyIds = snapshot.companies.map((company) => company.company_id);
  assert(new Set(companyIds).size === companyIds.length, "duplicate company IDs");
  for (const company of snapshot.companies) {
    assert(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `missing non-affiliation boundary: ${company.company_id}`);
    for (const repository of company.public_repositories) {
      assert(["PROMOTED", "REFERENCE_ONLY"].includes(repository.promotion_state), `disallowed company repository state: ${repository.repository}`);
      assert(repository.repository.startsWith("GlacierEQ/"), "invalid company repository identity");
    }
  }

  assert(!text.includes("PRIVATE_CANDIDATE"), "private candidate leaked");
  assert(!text.includes("PRIVATE_EXPERIMENT"), "private experiment leaked");
  assert(!text.includes('"visibility": "private"'), "private visibility leaked");
  assert(snapshot.live_evidence_reference?.boundary?.includes("Repository-native current-SHA receipts remain authoritative"), "live evidence authority boundary missing");

  console.log(JSON.stringify({
    schema: "glaciereq.resume-evidence-projection-validation.v1",
    status: "PASS",
    snapshot_sha256: createHash("sha256").update(text).digest("hex"),
    source_digest: snapshot.source.source_digest,
    systems: snapshot.systems.length,
    companies: snapshot.companies.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Helix résumé evidence validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
