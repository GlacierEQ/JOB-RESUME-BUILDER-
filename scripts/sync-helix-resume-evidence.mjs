#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER_PATH = path.join(ROOT, "portfolio-source.json");

function fail(message) {
  throw new Error(`Helix résumé evidence sync failed: ${message}`);
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
    if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`);
    return value;
  } catch (error) {
    fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "GlacierEQ-resume-shapeshifter" },
      signal: controller.signal,
    });
    if (!response.ok) fail(`${url} returned ${response.status}`);
    return await response.text();
  } catch (error) {
    fail(`${url}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCompany(shard, company) {
  const defaults = shard.defaults && typeof shard.defaults === "object" ? shard.defaults : {};
  return { ...defaults, ...company };
}

async function main() {
  const pointer = parse(await readFile(POINTER_PATH, "utf8"), "portfolio-source.json");
  if (pointer.schema !== "glaciereq.portfolio-consumer-pointer.v1") fail("unexpected pointer schema");
  if (pointer.consumer !== "GlacierEQ/JOB-RESUME-BUILDER-") fail("consumer identity mismatch");
  if (pointer.projection_id !== "resume_shapeshifter") fail("projection identity mismatch");
  if (pointer.selection_policy?.private_repository_names_allowed !== false) fail("private repository names must be forbidden");

  const ref = process.env.HELIX_ROOT_REF || pointer.authority.branch;
  const rawBase = `https://raw.githubusercontent.com/GlacierEQ/job-app-helix/${encodeURIComponent(ref)}`;
  const rootText = await fetchText(`${rawBase}/${pointer.authority.manifest_path}`);
  const root = parse(rootText, "Helix root manifest");
  if (root.schema !== "glaciereq.portfolio-root-truth.v1") fail("unexpected Helix root schema");

  const projection = root.projections?.find((row) => row.id === pointer.projection_id);
  if (!projection) fail("resume_shapeshifter projection is absent from Helix root");
  if (projection.may_publish_private_records !== false) fail("resume projection permits private records");

  const sources = new Map((root.sources ?? []).map((row) => [row.id, row]));
  for (const sourceId of projection.required_sources ?? []) {
    if (!sources.has(sourceId)) fail(`projection references unknown source ${sourceId}`);
  }

  const sourceTexts = new Map();
  async function load(sourceId) {
    const source = sources.get(sourceId);
    if (!source) fail(`missing source ${sourceId}`);
    const text = await fetchText(`${rawBase}/${source.path}`);
    sourceTexts.set(source.path, text);
    return parse(text, source.path);
  }

  const flagships = await load("flagships");
  const companiesIndex = await load("companies");
  const languageFit = await load("language_fit");
  const liveEvidence = await load("live_evidence");

  const allowedStates = new Set(pointer.selection_policy.allowed_public_states);
  const systems = (flagships.flagships ?? [])
    .filter((row) => row.repository && typeof row.repository === "string")
    .filter((row) => allowedStates.has(row.state))
    .filter((row) => !String(row.public_surface ?? "").includes("PRIVATE"))
    .filter((row) => !String(row.public_surface ?? "").includes("EXCLUDED"))
    .filter((row) => !String(row.public_surface ?? "").includes("QUARANTINED"))
    .map((row) => ({
      system_id: row.system_id,
      repository: row.repository,
      level: row.level,
      state: row.state,
      role: row.role,
      evidence: row.evidence,
      next_gate: row.next_gate,
      resume_use: row.state === "PROMOTED" ? "PRIMARY_EVIDENCE" : "SUPPORTING_EVIDENCE_WITH_BOUNDARY",
    }));

  const companies = [];
  for (const shardPath of companiesIndex.dossier_files ?? []) {
    const text = await fetchText(`${rawBase}/${shardPath}`);
    sourceTexts.set(shardPath, text);
    const shard = parse(text, shardPath);
    for (const raw of shard.companies ?? []) {
      const company = normalizeCompany(shard, raw);
      const publicRepositories = (company.repositories ?? [])
        .filter((row) => Array.isArray(row) && row.length === 6)
        .filter((row) => row[3] === "public" && allowedStates.has(row[2]))
        .map(([repository, level, promotion_state]) => ({ repository, level, promotion_state }));
      companies.push({
        company_id: company.company_id,
        display_name: company.display_name,
        target_roles: company.target_roles,
        recruiter_thesis: company.recruiter_thesis,
        gap_or_next_gate: company.gap_or_next_gate,
        public_repositories: publicRepositories,
        applicable_flagships: company.applicable_flagships ?? [],
        non_affiliation: company.non_affiliation,
      });
    }
  }

  const serializedCompanies = JSON.stringify(companies);
  if (serializedCompanies.includes('"visibility":"private"') || serializedCompanies.includes("PRIVATE_CANDIDATE")) {
    fail("private company evidence leaked into résumé projection");
  }

  const sourceHashes = Object.fromEntries(
    [...sourceTexts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, text]) => [sourcePath, sha256(text)]),
  );
  sourceHashes[pointer.authority.manifest_path] = sha256(rootText);

  const snapshot = {
    schema: "glaciereq.resume-evidence-projection.v1",
    source: {
      authority: root.authority,
      root_version: root.version,
      root_ref: ref,
      source_digest: sha256(stableJson(sourceHashes)),
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
    language_fit: languageFit,
    live_evidence_reference: {
      schema: liveEvidence.schema,
      source_path: sources.get("live_evidence").path,
      content_sha256: sourceHashes[sources.get("live_evidence").path],
      boundary: "Repository-native current-SHA receipts remain authoritative; this projection does not promote unfiltered evidence rows into résumé claims.",
    },
    invariants: pointer.invariants,
  };

  const output = path.resolve(ROOT, pointer.sync.output);
  if (!output.startsWith(`${ROOT}${path.sep}`)) fail("output escapes repository root");
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, stableJson(snapshot), "utf8");
  console.log(`Helix résumé evidence written: ${path.relative(ROOT, output)}`);
  console.log(`source_digest=${snapshot.source.source_digest} systems=${systems.length} companies=${companies.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
