#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(script) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", script)], {
    cwd: ROOT,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} exited with status ${String(result.status)}`);
  }
}

try {
  if (process.env.HELIX_EVIDENCE_PREPARED !== "1") {
    run("sync-helix-resume-evidence.mjs");
    run("sync-helix-application-intelligence.mjs");
  }
  run("validate-helix-resume-evidence.mjs");
} catch (error) {
  console.error(`Helix evidence preparation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
