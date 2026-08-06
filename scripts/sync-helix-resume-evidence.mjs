#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER_PATH = path.join(ROOT, "portfolio-source.json");
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const REPOSITORY_PATTERN = /^GlacierEQ\/[A-Za-z0-9_.-]+$/;
const LEVELS = new Set(["L0", "L1", "L2", "L3", "L4", "L5"]);

function fail(message) {
  throw new Error(`Helix résumé evidence sync failed: ${message}`);
}

function requireValue(condition, message) {
  if (!condition) fail(message);
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

function parse(text, label) {
  try {
    const value = JSON.parse(text);
    requireValue(value && typeof value === "object" && !Array.isArray(value), `${label} must be an object`);
    return value;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix résumé evidence sync failed:")) throw error;
    fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url, accept = "application/json") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: accept, "User-Agent": "GlacierEQ-resume-shapeshifter" },
      signal: controller.signal,
    });
    requireValue(response.ok, `${url} returned ${response.status}`);
    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix résumé evidence sync failed:")) throw error;
    fail(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCompany(shard, company) {
  const defaults = shard.defaults && typeof shard.defaults === "object" && !Array.isArray(shard.defaults)
    ? shard.defaults
    : {};
  requireValue(company && typeof company === "object" && !Array.isArray(company), "company entries must be objects");
  return { ...defaults, ...company };
}

function validateRepository(repository, label) {
  requireValue(typeof repository === "string" && REPOSITORY_PATTERN.test(repository), `${label}: invalid repository identity ${String(repository)}`);
  return repository;
}

function resolveOutput(relative, label) {
  requireValue(typeof relative === "string" && relative.length > 0, `${label} path is missing`);
  const output = path.resolve(ROOT, relative);
  requireValue(output.startsWith(`${ROOT}${path.sep}`), `${label} escapes repository root`);
  return output;
}

async function resolveHelixSha(pointer) {
  const supplied = process.env.HELIX_ROOT_SHA?.trim().toLowerCase();
  if (supplied) {
    requireValue(SHA_PATTERN.test(supplied), "HELIX_ROOT_SHA must be a full 40-character lowercase commit SHA");
    return supplied;
  }
  const commitText = await fetchText(pointer.authority.commit_api_url, "application/vnd.github+json");
  const commit = parse(commitText, "Helix commit response");
  const sha = String(commit.sha ?? "").toLowerCase();
  requireValue(SHA_PATTERN.test(sha), "Helix commit API did not return a full commit SHA");
  return sha;
}

async function main() {
  const pointer = parse(await readFile(POINTER_PATH, "utf8"), "portfolio-source.json");
  requireValue(pointer.schema === "glaciereq.portfolio-consumer-pointer.v1", "unexpected pointer schema");
  requireValue(pointer.consumer === "GlacierEQ/JOB-RESUME-BUILDER-", "consumer identity mismatch");
  requireValue(pointer.projection_id === "resume_shapeshifter", "projection identity mismatch");
  requireValue(pointer.selection_policy?.private_repository_names_allowed === false, "private repository names must be forbidden");
  requireValue(pointer.selection_policy?.preserve_source_resume_truth_gate === true, "source résumé truth gate must remain enabled");
  requireValue(pointer.selection_policy?.helix_evidence_may_rank_but_not_invent === true, "rank-not-invent policy must remain enabled");
  requireValue(pointer.sync?.fail_closed === true && pointer.sync?.allow_stale_fallback === false, "projection must fail closed without stale fallback");
  requireValue(pointer.authority?.repository === "GlacierEQ/job-app-helix", "unexpected Helix authority repository");
  requireValue(pointer.authority?.branch === "main", "résumé evidence must resolve from canonical Helix main");
  requireValue(pointer.authority?.raw_base_url === "https://raw.githubusercontent.com/GlacierEQ/job-app-helix", "unexpected Helix raw base URL");
  requireValue(pointer.authority?.commit_api_url === "https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main", "unexpected Helix commit API URL");

  const resolvedCommit = await resolveHelixSha(pointer);
  const rawBase = `${pointer.authority.raw_base_url}/${resolvedCommit}`;
  const rootText = await fetchText(`${rawBase}/${pointer.authority.manifest_path}`);
  const root = parse(rootText, "Helix root manifest");
  requireValue(root.schema === "glaciereq.portfolio-root-truth.v1", "unexpected Helix root schema");
  requireValue(root.authority?.repository === pointer.authority.repository, "Helix root authority mismatch");
  requireValue(root.authority?.branch === pointer.authority.branch, "Helix root branch contract mismatch");

  const projection = Array.isArray(root.projections)
    ? root.projections.find((row) => row && typeof row === "object" && row.id === pointer.projection_id)
    : undefined;
  requireValue(projection, "resume_shapeshifter projection is absent from Helix root");
  requireValue(projection.repository === pointer.consumer, "Helix projection consumer mismatch");
  requireValue(projection.may_publish_private_records === false, "resume projection permits private records");

  const sources = new Map();
  for (const row of Array.isArray(root.sources) ? root.sources : []) {
    requireValue(row && typeof row === "object" && !Array.isArray(row), "Helix source rows must be objects");
    requireValue(typeof row.id === "string" && row.id.length > 0, "Helix source id is missing");
    requireValue(!sources.has(row.id), `duplicate Helix source id ${row.id}`);
    requireValue(typeof row.path === "string" && /^(manifests|status|generated)\//.test(row.path), `invalid Helix source path for ${row.id}`);
    sources.set(row.id, row);
  }
  for (const sourceId of projection.required_sources ?? []) {
    requireValue(sources.has(sourceId), `projection references unknown source ${sourceId}`);
  }

  const sourceTexts = new Map();
  const sourceObjects = new Map();
  async function load(sourceId) {
    if (sourceObjects.has(sourceId)) return sourceObjects.get(sourceId);
    const source = sources.get(sourceId);
    requireValue(source, `missing source ${sourceId}`);
    const text = await fetchText(`${rawBase}/${source.path}`);
    sourceTexts.set(source.path, text);
    const value = parse(text, source.path);
    sourceObjects.set(sourceId, value);
    return value;
  }

  const flagships = await load("flagships");
  const companiesIndex = await load("companies");
  await load("language_fit");
  const liveEvidence = await load("live_evidence");

  const columns = companiesIndex.repository_record_columns;
  requireValue(Array.isArray(columns) && columns.length > 0 && new Set(columns).size === columns.length, "company repository columns are invalid");
  const requiredColumns = ["repository", "skill_innovation_level", "promotion_state", "visibility", "inventory_scope", "provenance_state"];
  for (const column of requiredColumns) requireValue(columns.includes(column), `company repository column is missing: ${column}`);
  const enums = companiesIndex.repository_record_enums;
  requireValue(enums && typeof enums === "object" && !Array.isArray(enums), "company repository enums are missing");
  const promotionStates = new Set(enums.promotion_state ?? []);
  const visibilityStates = new Set(enums.visibility ?? []);
  const inventoryScopes = new Set(enums.inventory_scope ?? []);
  const provenanceStates = new Set(enums.provenance_state ?? []);
  const aliases = companiesIndex.repository_record_legacy_aliases?.promotion_state ?? {};
  const recruiterStates = new Set(companiesIndex.truth_boundary?.public_recruiter_admission_states ?? []);
  const allowedStates = new Set(pointer.selection_policy.allowed_public_states ?? []);
  requireValue(recruiterStates.size === allowedStates.size && [...recruiterStates].every((state) => allowedStates.has(state)), "résumé admission states differ from Helix recruiter contract");

  const companies = [];
  const companyIds = new Set();
  const publicRepositoryIdentities = new Set();
  const dossierFiles = companiesIndex.dossier_files;
  requireValue(Array.isArray(dossierFiles) && dossierFiles.length > 0, "Helix company dossier list is empty");

  for (const shardPath of dossierFiles) {
    requireValue(typeof shardPath === "string" && shardPath.startsWith("manifests/company_dossiers/"), `invalid dossier path ${String(shardPath)}`);
    const text = await fetchText(`${rawBase}/${shardPath}`);
    sourceTexts.set(shardPath, text);
    const shard = parse(text, shardPath);
    requireValue(Array.isArray(shard.companies), `${shardPath}: companies must be an array`);
    for (const raw of shard.companies) {
      const company = normalizeCompany(shard, raw);
      requireValue(typeof company.company_id === "string" && company.company_id.length > 0, `${shardPath}: company_id is missing`);
      requireValue(!companyIds.has(company.company_id), `duplicate company_id ${company.company_id}`);
      companyIds.add(company.company_id);
      requireValue(typeof company.display_name === "string" && company.display_name.length > 0, `${company.company_id}: display_name is missing`);
      requireValue(typeof company.non_affiliation === "string" && company.non_affiliation.length > 0, `${company.company_id}: non_affiliation is missing`);
      requireValue(Array.isArray(company.repositories), `${company.company_id}: repositories must be an array`);

      const publicRepositories = [];
      for (const tuple of company.repositories) {
        requireValue(Array.isArray(tuple) && tuple.length === columns.length, `${company.company_id}: repository tuple does not match declared columns`);
        const record = Object.fromEntries(columns.map((column, index) => [column, tuple[index]]));
        const repository = validateRepository(record.repository, company.company_id);
        const level = record.skill_innovation_level;
        const rawPromotionState = record.promotion_state;
        const promotionState = aliases[rawPromotionState] ?? rawPromotionState;
        const visibility = record.visibility;
        const inventoryScope = record.inventory_scope;
        const provenanceState = record.provenance_state;
        requireValue(LEVELS.has(level), `${repository}: invalid skill level ${String(level)}`);
        requireValue(promotionStates.has(promotionState), `${repository}: unknown promotion state ${String(rawPromotionState)}`);
        requireValue(visibilityStates.has(visibility), `${repository}: invalid visibility ${String(visibility)}`);
        requireValue(inventoryScopes.has(inventoryScope), `${repository}: invalid inventory scope ${String(inventoryScope)}`);
        requireValue(provenanceStates.has(provenanceState), `${repository}: invalid provenance state ${String(provenanceState)}`);
        if (visibility === "public") publicRepositoryIdentities.add(repository);
        if (visibility === "public" && level !== "L0" && recruiterStates.has(promotionState)) {
          publicRepositories.push({ repository, level, promotion_state: promotionState });
        }
      }

      companies.push({
        company_id: company.company_id,
        display_name: company.display_name,
        target_roles: Array.isArray(company.target_roles) ? company.target_roles : [],
        recruiter_thesis: String(company.recruiter_thesis ?? ""),
        gap_or_next_gate: String(company.gap_or_next_gate ?? ""),
        public_repositories: publicRepositories,
        applicable_flagships: Array.isArray(company.applicable_flagships) ? company.applicable_flagships : [],
        non_affiliation: company.non_affiliation,
      });
    }
  }

  const requiredCompanyTracks = companiesIndex.required_company_tracks;
  requireValue(Array.isArray(requiredCompanyTracks) && requiredCompanyTracks.length === companyIds.size, "required company-track count differs from dossier records");
  requireValue(requiredCompanyTracks.every((companyId) => companyIds.has(companyId)), "required company tracks are incomplete");

  requireValue(Array.isArray(flagships.flagships), "flagship registry is invalid");
  const systems = [];
  const systemIds = new Set();
  for (const row of flagships.flagships) {
    requireValue(row && typeof row === "object" && !Array.isArray(row), "flagship rows must be objects");
    requireValue(typeof row.system_id === "string" && row.system_id.length > 0, "flagship system_id is invalid");
    requireValue(!systemIds.has(row.system_id), `duplicate flagship system_id ${row.system_id}`);
    systemIds.add(row.system_id);
    if (row.repository === null || row.repository === undefined) continue;
    const repository = validateRepository(row.repository, row.system_id);
    const state = String(row.state ?? "");
    const surface = String(row.public_surface ?? "");
    const excluded = ["PRIVATE", "EXCLUDED", "QUARANTINED", "BLOCKED", "SANITIZED_CARD_ONLY"].some((marker) => surface.includes(marker));
    if (excluded || !publicRepositoryIdentities.has(repository) || !allowedStates.has(state)) continue;
    requireValue(typeof row.level === "string" && LEVELS.has(row.level), `${row.system_id}: invalid flagship level`);
    requireValue(typeof row.role === "string" && row.role.length > 0, `${row.system_id}: role is missing`);
    requireValue(typeof row.evidence === "string" && row.evidence.length > 0, `${row.system_id}: evidence is missing`);
    requireValue(typeof row.next_gate === "string" && row.next_gate.length > 0, `${row.system_id}: next gate is missing`);
    systems.push({
      system_id: row.system_id,
      repository,
      level: row.level,
      state,
      role: row.role,
      evidence: row.evidence,
      next_gate: row.next_gate,
      resume_use: state === "PROMOTED" ? "PRIMARY_EVIDENCE" : "SUPPORTING_EVIDENCE_WITH_BOUNDARY",
    });
  }
  requireValue(systems.length > 0, "résumé system evidence is empty");

  const liveEvidenceSource = sources.get("live_evidence");
  requireValue(liveEvidenceSource, "missing live_evidence source definition");
  const sourceHashes = Object.fromEntries(
    [...sourceTexts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, text]) => [sourcePath, sha256(text)]),
  );
  sourceHashes[pointer.authority.manifest_path] = sha256(rootText);
  const sourceDigest = sha256(stableJson(sourceHashes));

  const snapshot = {
    schema: "glaciereq.resume-evidence-projection.v1",
    source: {
      authority: root.authority,
      root_version: root.version,
      root_ref: resolvedCommit,
      source_digest: sourceDigest,
      source_hashes: sourceHashes,
    },
    policy: {
      source_resume_remains_authoritative: true,
      helix_may_rank_but_not_invent: true,
      private_repository_names_allowed: false,
      allowed_public_states: [...allowedStates].sort(),
      blocked_states_are_context_only: pointer.selection_policy.blocked_states_are_context_only,
    },
    systems,
    companies,
    live_evidence_reference: {
      schema: liveEvidence.schema,
      source_path: liveEvidenceSource.path,
      content_sha256: sourceHashes[liveEvidenceSource.path],
      boundary: "Repository-native current-SHA receipts remain authoritative; this projection does not promote unfiltered evidence rows into résumé claims.",
    },
    invariants: pointer.invariants,
  };

  const output = resolveOutput(pointer.sync.output, "résumé evidence output");
  const snapshotText = stableJson(snapshot);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, snapshotText, "utf8");

  const receiptOutput = resolveOutput(pointer.sync.receipt_output, "résumé evidence receipt output");
  const receipt = {
    schema: "glaciereq.portfolio-projection-receipt.v1",
    projection_id: pointer.projection_id,
    consumer_repository: pointer.consumer,
    consumed_source_digest: sourceDigest,
    source_commit: resolvedCommit,
    output_path: path.relative(ROOT, output).replaceAll(path.sep, "/"),
    output_sha256: sha256(snapshotText),
    root_version: root.version,
    status: "PASS",
  };
  await mkdir(path.dirname(receiptOutput), { recursive: true });
  await writeFile(receiptOutput, stableJson(receipt), "utf8");

  console.log(`Helix résumé evidence written: ${path.relative(ROOT, output)}`);
  console.log(`Helix résumé receipt written: ${path.relative(ROOT, receiptOutput)}`);
  console.log(`source_commit=${resolvedCommit} source_digest=${sourceDigest} systems=${systems.length} companies=${companies.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
