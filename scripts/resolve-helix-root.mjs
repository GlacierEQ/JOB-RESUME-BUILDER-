#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const POINTER = path.join(ROOT, "portfolio-source.json");
const SHA_PATTERN = /^[a-f0-9]{40}$/;

function fail(message) {
  throw new Error(`Helix revision resolution failed: ${message}`);
}

async function main() {
  let pointer;
  try {
    pointer = JSON.parse(await readFile(POINTER, "utf8"));
  } catch (error) {
    fail(`portfolio-source.json: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (pointer?.authority?.repository !== "GlacierEQ/job-app-helix") fail("authority repository mismatch");
  if (pointer?.authority?.branch !== "main") fail("authority branch must be main");
  if (pointer?.authority?.commit_api_url !== "https://api.github.com/repos/GlacierEQ/job-app-helix/commits/main") {
    fail("unexpected commit API URL");
  }

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GlacierEQ-resume-shapeshifter",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(pointer.authority.commit_api_url, {
      headers,
      signal: controller.signal,
    });
    if (!response.ok) fail(`commit API returned ${response.status}`);
    const payload = await response.json();
    const sha = String(payload?.sha ?? "").toLowerCase();
    if (!SHA_PATTERN.test(sha)) fail("commit API returned an invalid SHA");
    process.stdout.write(`HELIX_ROOT_SHA=${sha}\n`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Helix revision resolution failed:")) throw error;
    fail(error instanceof Error ? error.message : String(error));
  } finally {
    clearTimeout(timer);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
