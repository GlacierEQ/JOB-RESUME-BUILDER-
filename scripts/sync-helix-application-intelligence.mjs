#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER_PATH = path.join(ROOT, "portfolio-source.json");
const SHA40 = /^[a-f0-9]{40}$/;

function fail(message) {
  throw new Error(`Helix application-intelligence sync failed: ${message}`);
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
    if (error instanceof Error && error.message.startsWith("Helix application-intelligence sync failed:")) throw error;
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
  } finally {
    clearTimeout(timer);
  }
}

async function resolveHelixSha(pointer) {
  const supplied = process.env.HELIX_ROOT_SHA?.trim().toLowerCase();
  if (supplied) {
    requireValue(SHA40.test(supplied), "HELIX_ROOT_SHA must be a full lowercase commit SHA");
    return supplied;
  }
  const response = parse(
    await fetchText(pointer.authority.commit_api_url, "application/vnd.github+json"),
    "Helix commit response",
  );
  const sha = String(response.sha ?? "").toLowerCase();
  requireValue(SHA40.test(sha), "Helix commit API did not return a full commit SHA");
  return sha;
}

function publicSecondDepth(secondDepth, companyId) {
  const defaults = secondDepth.default_company_state ?? {};
  const override = secondDepth.company_overrides?.[companyId] ?? {};
  const merged = { ...defaults, ...override };
  return {
    stage: String(merged.stage ?? "MAPPED_ONLY"),
    claim_ceiling: String(merged.claim_ceiling ?? "company_alignment_only"),
    blockers: Array.isArray(merged.blockers) ? merged.blockers.map(String) : [],
    next_gate: String(merged.next_gate ?? ""),
  };
}

async function main() {
  const pointer = parse(await readFile(POINTER_PATH, "utf8"), "portfolio-source.json");
  requireValue(pointer.consumer === "GlacierEQ/JOB-RESUME-BUILDER-", "consumer identity mismatch");
  requireValue(pointer.projection_id === "resume_shapeshifter", "projection identity mismatch");
  requireValue(pointer.sync?.fail_closed === true, "consumer must fail closed");
  requireValue(pointer.sync?.allow_stale_fallback === false, "stale fallback must remain disabled");

  const resolvedCommit = await resolveHelixSha(pointer);
  const rawBase = `${pointer.authority.raw_base_url}/${resolvedCommit}`;
  const rootText = await fetchText(`${rawBase}/${pointer.authority.manifest_path}`);
  const root = parse(rootText, "Helix root manifest");
  const projection = root.projections?.find?.((row) => row?.id === pointer.projection_id);
  requireValue(projection, "resume_shapeshifter projection missing from Helix root");
  requireValue(projection.repository === pointer.consumer, "projection consumer mismatch");
  requireValue(projection.may_publish_private_records === false, "resume projection permits private records");

  const sourceMap = new Map((root.sources ?? []).map((source) => [source.id, source]));
  const required = new Set(projection.required_sources ?? []);
  for (const id of [
    "company_second_depth",
    "estate_compiler_policy",
    "estate_projection_policy",
    "external_company_intelligence",
  ]) {
    requireValue(required.has(id), `current Helix résumé projection no longer requires ${id}`);
    requireValue(sourceMap.has(id), `Helix root is missing source ${id}`);
  }

  const sourceTexts = new Map([[pointer.authority.manifest_path, rootText]]);
  async function load(id) {
    const source = sourceMap.get(id);
    requireValue(source?.path, `missing path for ${id}`);
    const text = await fetchText(`${rawBase}/${source.path}`);
    sourceTexts.set(source.path, text);
    return parse(text, source.path);
  }

  const secondDepth = await load("company_second_depth");
  await load("estate_compiler_policy");
  await load("estate_projection_policy");
  const externalIndex = await load("external_company_intelligence");

  requireValue(
    secondDepth.schema === "glaciereq.company-second-depth.v1",
    "unexpected company second-depth schema",
  );
  requireValue(
    externalIndex.schema === "glaciereq.external-company-bottleneck-atlas.v1",
    "unexpected external intelligence schema",
  );
  requireValue(
    externalIndex.truth_boundary?.official_source_observation_separate_from_glaciereq_inference === true,
    "external intelligence must preserve observation/inference separation",
  );

  const records = [];
  const seen = new Set();
  for (const shard of externalIndex.shards ?? []) {
    requireValue(typeof shard?.path === "string", "external intelligence shard path missing");
    const text = await fetchText(`${rawBase}/${shard.path}`);
    requireValue(sha256(text) === shard.shard_sha256, `${shard.path} hash mismatch`);
    sourceTexts.set(shard.path, text);
    const parsed = parse(text, shard.path);
    for (const row of parsed.records ?? []) {
      requireValue(typeof row?.company_id === "string" && row.company_id.length > 0, `${shard.path}: company_id missing`);
      requireValue(!seen.has(row.company_id), `duplicate company intelligence ${row.company_id}`);
      seen.add(row.company_id);
      const depth = publicSecondDepth(secondDepth, row.company_id);
      records.push({
        company_id: row.company_id,
        display_name: String(row.display_name ?? row.company_id),
        target_roles: Array.isArray(row.target_roles) ? row.target_roles.map(String) : [],
        observed_current_pressure: String(row.observed_current_pressure ?? ""),
        inferred_bottleneck: String(row.inferred_bottleneck ?? ""),
        inferred_brick_wall: String(row.inferred_brick_wall ?? ""),
        application_move: String(row.application_move ?? ""),
        next_deep_dive: String(row.next_deep_dive ?? ""),
        leverage: {
          impact_class: String(row.leverage?.impact_class ?? ""),
          mechanism: String(row.leverage?.mechanism ?? ""),
          expected_impact: String(row.leverage?.expected_impact ?? ""),
          glaciereq_systems: Array.isArray(row.leverage?.glaciereq_systems)
            ? row.leverage.glaciereq_systems.map(String)
            : [],
        },
        second_depth: depth,
      });
    }
  }

  requireValue(records.length === externalIndex.record_count, "external intelligence record count mismatch");
  records.sort((a, b) => a.company_id.localeCompare(b.company_id));

  const sourceHashes = Object.fromEntries(
    [...sourceTexts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([sourcePath, text]) => [sourcePath, sha256(text)]),
  );
  const sourceDigest = sha256(stableJson(sourceHashes));
  const snapshot = {
    schema: "glaciereq.resume-application-intelligence.v1",
    source: {
      root_ref: resolvedCommit,
      root_version: root.version,
      source_digest: sourceDigest,
      source_hashes: sourceHashes,
      external_research_as_of: externalIndex.research_as_of,
      external_freshness_state: externalIndex.freshness_state,
    },
    boundary: {
      may_publish_private_records: false,
      inference_boundary: externalIndex.inference_boundary,
      source_resume_remains_authoritative: true,
      company_intelligence_may_rank_but_not_invent_experience: true,
    },
    companies: records,
  };

  const output = path.join(ROOT, "data", "helix-application-intelligence.json");
  const snapshotText = stableJson(snapshot);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, snapshotText, "utf8");

  const receipt = {
    schema: "glaciereq.resume-application-intelligence-receipt.v1",
    source_commit: resolvedCommit,
    source_digest: sourceDigest,
    output_sha256: sha256(snapshotText),
    company_count: records.length,
    status: "PASS",
  };
  await writeFile(
    path.join(ROOT, "data", "helix-application-intelligence.receipt.json"),
    stableJson(receipt),
    "utf8",
  );

  console.log(`Helix application intelligence synchronized from ${resolvedCommit}: ${records.length} companies`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
