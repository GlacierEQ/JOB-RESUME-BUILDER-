#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "portfolio-source.json");
const SNAPSHOT = path.join(ROOT, "data", "helix-resume-evidence.json");
const SHA40 = /^[a-f0-9]{40}$/;
const SHA64 = /^[a-f0-9]{64}$/;
const REPOSITORY = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(stable(value), null, 2)}\n`;
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

async function load(file, label) {
  try {
    const text = await readFile(file, "utf8");
    const value = JSON.parse(text);
    assert(value && typeof value === "object" && !Array.isArray(value), `${label} must contain an object`);
    return { text, value };
  } catch (error) {
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  const pointer = (await load(POINTER, "portfolio-source.json")).value;
  const { text, value: snapshot } = await load(SNAPSHOT, "Helix résumé evidence");
  const receiptPath = path.resolve(ROOT, pointer.sync?.receipt_output ?? "");
  assert(receiptPath.startsWith(`${ROOT}${path.sep}`), "receipt path escapes repository root");
  const { value: receipt } = await load(receiptPath, "Helix résumé evidence receipt");

  assert(pointer.schema === "glaciereq.portfolio-consumer-pointer.v1", "pointer schema mismatch");
  assert(pointer.consumer === "GlacierEQ/JOB-RESUME-BUILDER-", "consumer mismatch");
  assert(pointer.projection_id === "resume_shapeshifter", "projection mismatch");
  assert(pointer.authority?.repository === "GlacierEQ/job-app-helix", "authority repository mismatch");
  assert(pointer.authority?.branch === "main", "résumé projection must consume canonical Helix main");
  assert(pointer.sync?.fail_closed === true && pointer.sync?.allow_stale_fallback === false, "projection must fail closed without stale fallback");
  assert(pointer.selection_policy?.preserve_source_resume_truth_gate === true, "source truth gate must remain enabled");
  assert(pointer.selection_policy?.helix_evidence_may_rank_but_not_invent === true, "rank-not-invent policy is missing");
  assert(pointer.selection_policy?.private_repository_names_allowed === false, "private repository names must be forbidden");

  assert(snapshot.schema === "glaciereq.resume-evidence-projection.v1", "snapshot schema mismatch");
  assert(snapshot.source?.authority?.repository === "GlacierEQ/job-app-helix", "authority mismatch");
  assert(typeof snapshot.source?.root_ref === "string" && SHA40.test(snapshot.source.root_ref), "source commit must be an immutable 40-character SHA");
  assert(snapshot.source?.source_hashes && typeof snapshot.source.source_hashes === "object" && !Array.isArray(snapshot.source.source_hashes), "source hashes are missing");
  assert(typeof snapshot.source?.source_digest === "string" && SHA64.test(snapshot.source.source_digest), "invalid source digest");
  assert(sha256(stableJson(snapshot.source.source_hashes)) === snapshot.source.source_digest, "source digest does not match source hashes");
  assert(snapshot.policy?.source_resume_remains_authoritative === true, "source résumé authority is missing");
  assert(snapshot.policy?.helix_may_rank_but_not_invent === true, "rank-not-invent contract is missing");
  assert(snapshot.policy?.private_repository_names_allowed === false, "private repository names must be forbidden");
  assert(Array.isArray(snapshot.policy?.allowed_public_states), "allowed public states are missing");
  assert(new Set(snapshot.policy.allowed_public_states).size === snapshot.policy.allowed_public_states.length, "allowed public states contain duplicates");
  assert(snapshot.policy.allowed_public_states.every((state) => ["PROMOTED", "REFERENCE_ONLY"].includes(state)), "unsupported allowed public state");

  assert(Array.isArray(snapshot.systems) && snapshot.systems.length > 0, "system evidence is empty");
  const ids = snapshot.systems.map((system) => system.system_id);
  assert(new Set(ids).size === ids.length, "duplicate system IDs");
  for (const system of snapshot.systems) {
    assert(typeof system.system_id === "string" && system.system_id.length > 0, "system_id must be a nonempty string");
    assert(typeof system.repository === "string" && REPOSITORY.test(system.repository), `invalid system repository: ${system.system_id}`);
    assert(["PROMOTED", "REFERENCE_ONLY"].includes(system.state), `unsupported system state: ${system.system_id}`);
    assert(typeof system.level === "string" && /^L[1-5]$/.test(system.level), `invalid system level: ${system.system_id}`);
    assert(typeof system.role === "string" && system.role.length > 0, `missing system role: ${system.system_id}`);
    assert(typeof system.evidence === "string" && system.evidence.length > 0, `missing system evidence: ${system.system_id}`);
    assert(typeof system.next_gate === "string" && system.next_gate.length > 0, `missing system next gate: ${system.system_id}`);
    assert(["PRIMARY_EVIDENCE", "SUPPORTING_EVIDENCE_WITH_BOUNDARY"].includes(system.resume_use), `invalid résumé use: ${system.system_id}`);
    if (system.state === "REFERENCE_ONLY") {
      assert(system.resume_use === "SUPPORTING_EVIDENCE_WITH_BOUNDARY", `REFERENCE_ONLY system lacks supporting-evidence boundary: ${system.system_id}`);
    }
  }

  assert(Array.isArray(snapshot.companies) && snapshot.companies.length > 0, "company evidence is empty");
  const companyIds = snapshot.companies.map((company) => company.company_id);
  assert(new Set(companyIds).size === companyIds.length, "duplicate company IDs");
  for (const company of snapshot.companies) {
    assert(typeof company.company_id === "string" && company.company_id.length > 0, "company_id must be a nonempty string");
    assert(typeof company.display_name === "string" && company.display_name.length > 0, `missing display name: ${company.company_id}`);
    assert(Array.isArray(company.target_roles), `target roles must be an array: ${company.company_id}`);
    assert(typeof company.recruiter_thesis === "string", `recruiter thesis must be a string: ${company.company_id}`);
    assert(typeof company.gap_or_next_gate === "string", `gap or next gate must be a string: ${company.company_id}`);
    assert(Array.isArray(company.public_repositories), `public repositories must be an array: ${company.company_id}`);
    assert(Array.isArray(company.applicable_flagships), `applicable flagships must be an array: ${company.company_id}`);
    assert(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `missing non-affiliation boundary: ${company.company_id}`);
    for (const repository of company.public_repositories) {
      assert(typeof repository.repository === "string" && REPOSITORY.test(repository.repository), `invalid company repository identity: ${repository.repository}`);
      assert(typeof repository.level === "string" && /^L[1-5]$/.test(repository.level), `invalid company repository level: ${repository.repository}`);
      assert(["PROMOTED", "REFERENCE_ONLY"].includes(repository.promotion_state), `disallowed company repository state: ${repository.repository}`);
    }
  }

  assert(!Object.prototype.hasOwnProperty.call(snapshot, "language_fit"), "raw language_fit source must not enter résumé evidence");
  assert(!text.includes("PRIVATE_CANDIDATE"), "private candidate leaked");
  assert(!text.includes("PRIVATE_EXPERIMENT"), "private experiment leaked");
  assert(!text.includes('"visibility": "private"'), "private visibility leaked");
  assert(snapshot.live_evidence_reference?.boundary?.includes("Repository-native current-SHA receipts remain authoritative"), "live evidence authority boundary missing");
  assert(typeof snapshot.live_evidence_reference?.content_sha256 === "string" && SHA64.test(snapshot.live_evidence_reference.content_sha256), "live evidence content hash is invalid");
  assert(Array.isArray(snapshot.invariants) && snapshot.invariants.length >= 5, "snapshot invariants are incomplete");

  assert(receipt.schema === "glaciereq.portfolio-projection-receipt.v1", "receipt schema mismatch");
  assert(receipt.status === "PASS", "receipt is not PASS");
  assert(receipt.projection_id === pointer.projection_id, "receipt projection mismatch");
  assert(receipt.consumer_repository === pointer.consumer, "receipt consumer mismatch");
  assert(receipt.source_commit === snapshot.source.root_ref, "receipt source commit mismatch");
  assert(receipt.consumed_source_digest === snapshot.source.source_digest, "receipt source digest mismatch");
  assert(receipt.output_sha256 === sha256(text), "receipt output hash mismatch");

  console.log(JSON.stringify({
    schema: "glaciereq.resume-evidence-projection-validation.v1",
    status: "PASS",
    snapshot_sha256: sha256(text),
    source_commit: snapshot.source.root_ref,
    source_digest: snapshot.source.source_digest,
    systems: snapshot.systems.length,
    companies: snapshot.companies.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(`Helix résumé evidence validation: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
