#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SHA_PATTERN = /^[a-f0-9]{40}$/;

function resolveHelixSha() {
  const supplied = process.env.HELIX_ROOT_SHA?.trim().toLowerCase();
  if (supplied) {
    if (!SHA_PATTERN.test(supplied)) throw new Error("HELIX_ROOT_SHA must be a full lowercase commit SHA");
    return supplied;
  }

  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "resolve-helix-root.mjs")], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`resolve-helix-root.mjs exited with status ${String(result.status)}: ${result.stderr}`);
  }
  const match = String(result.stdout).match(/HELIX_ROOT_SHA=([a-f0-9]{40})/);
  if (!match?.[1]) throw new Error("resolve-helix-root.mjs did not emit HELIX_ROOT_SHA");
  return match[1];
}

function run(script, helixSha) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", script)], {
    cwd: ROOT,
    env: { ...process.env, HELIX_ROOT_SHA: helixSha },
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} exited with status ${String(result.status)}`);
  }
}

try {
  const helixSha = resolveHelixSha();
  if (process.env.HELIX_EVIDENCE_PREPARED !== "1") {
    run("sync-helix-resume-evidence.mjs", helixSha);
    run("sync-helix-application-intelligence.mjs", helixSha);
  }
  run("validate-helix-resume-evidence.mjs", helixSha);
} catch (error) {
  console.error(`Helix evidence preparation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
