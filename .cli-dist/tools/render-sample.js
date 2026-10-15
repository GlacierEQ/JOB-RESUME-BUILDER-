#!/usr/bin/env node
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const dynamic_generator_1 = require("../services/dynamic-generator");
const dynamic_compiler_1 = require("../lib/dynamic-compiler");
const schemas_1 = require("../lib/schemas");
async function main() {
    const root = (0, node_path_1.resolve)(__dirname, "..", "..");
    const jdPath = (0, node_path_1.join)(root, "samples", "senior-business-process-automation-expert.jd.txt");
    const profilePath = (0, node_path_1.join)(root, "samples", "casey-barton.SAMPLE-profile.json");
    const outDir = (0, node_path_1.join)(root, "samples", "out");
    const jdText = (0, node_fs_1.readFileSync)(jdPath, "utf-8");
    const profile = schemas_1.ResumeProfileSchema.parse(JSON.parse((0, node_fs_1.readFileSync)(profilePath, "utf-8")));
    const { jdProfile, tailored, report } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText, resume: profile });
    const compiled = (0, dynamic_compiler_1.compileDynamicApplication)(profile, jdProfile, tailored, report);
    (0, node_fs_1.mkdirSync)(outDir, { recursive: true });
    for (const artifact of compiled.artifacts) {
        (0, node_fs_1.writeFileSync)((0, node_path_1.join)(outDir, artifact.filename), artifact.content, "utf-8");
        console.log(`wrote samples/out/${artifact.filename}`);
    }
    console.log(`\ncoverage: ${report.coveragePercent}% (${report.coverageBand})`);
    console.log("SAMPLE ONLY — human review required; nothing submitted anywhere.");
}
main().catch((error) => {
    console.error(error);
    process.exit(1);
});
