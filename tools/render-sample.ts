#!/usr/bin/env node
/**
 * Sample render — impressive HTML, his visual identity.
 *
 * Renders the SAMPLE profile (samples/casey-barton.SAMPLE-profile.json)
 * against the SAMPLE Senior Business Process Automation Expert JD and writes
 * every artifact to samples/out/. The SAMPLE profile is a fixture built from
 * his own stated facts; it is not the canonical profile. Replace
 * --resume-profile with the real profile for production renders.
 *
 *   npm run sample:impressive
 *
 * The committed face-of-it render lives at:
 *   samples/senior-business-process-automation-expert.impressive.SAMPLE.html
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateDynamicResume } from "../services/dynamic-generator";
import { compileDynamicApplication } from "../lib/dynamic-compiler";
import { ResumeProfileSchema } from "../lib/schemas";

async function main(): Promise<void> {
  const root = resolve(__dirname, "..", "..");
  const jdPath = join(root, "samples", "senior-business-process-automation-expert.jd.txt");
  const profilePath = join(root, "samples", "casey-barton.SAMPLE-profile.json");
  const outDir = join(root, "samples", "out");

  const jdText = readFileSync(jdPath, "utf-8");
  const profile = ResumeProfileSchema.parse(JSON.parse(readFileSync(profilePath, "utf-8")));

  const { jdProfile, tailored, report } = await generateDynamicResume({ jdText, resume: profile });
  const compiled = compileDynamicApplication(profile, jdProfile, tailored, report);

  mkdirSync(outDir, { recursive: true });
  for (const artifact of compiled.artifacts) {
    writeFileSync(join(outDir, artifact.filename), artifact.content, "utf-8");
    console.log(`wrote samples/out/${artifact.filename}`);
  }
  console.log(`\ncoverage: ${report.coveragePercent}% (${report.coverageBand})`);
  console.log("SAMPLE ONLY — human review required; nothing submitted anywhere.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
