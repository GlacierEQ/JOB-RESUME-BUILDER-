#!/usr/bin/env node
/**
 * Dynamic resume generation CLI — JD in, tailored resume artifacts out.
 *
 *   node .cli-dist/tools/generate-resume.js \
 *     --jd path/to/jd.txt \
 *     --resume-profile path/to/resume-profile.json \
 *     --out ./out \
 *     [--formats ats,json,html,impressive,docx,report]
 *
 * Fully deterministic: no model calls, no API key required. Every artifact is
 * truth-constrained by lib/truthfulness.ts (never invents qualifications,
 * employers, dates, or metrics) and Helix evidence boundaries. Output is
 * marked humanReviewRequired; this tool generates documents only and never
 * submits an application anywhere.
 *
 * Build:  npm run generate:resume -- --jd ... --resume-profile ... --out ...
 * (the npm script compiles this CLI with tsc -p tsconfig.cli.json first)
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { generateDynamicResume } from "../services/dynamic-generator";
import { compileDynamicApplication } from "../lib/dynamic-compiler";
import { ResumeProfileSchema } from "../lib/schemas";

const ALL_FORMATS = ["ats", "json", "html", "impressive", "docx", "report"] as const;
type Format = (typeof ALL_FORMATS)[number];

interface CliArgs {
  jd: string;
  resumeProfile: string;
  out: string;
  formats: Format[];
}

function printUsage(): void {
  console.log(`Dynamic Resume Generator — truth-constrained, deterministic.

Usage:
  generate-resume --jd <jd.txt> --resume-profile <resume-profile.json> --out <dir>
                  [--formats ats,json,html,impressive,docx,report]

  --jd              Path to the target job description as plain text (required).
  --resume-profile  Path to a ResumeProfile JSON file: the authoritative source
                    resume. Validated against ResumeProfileSchema (required).
  --out             Output directory; created if missing (required).
  --formats         Comma-separated subset of: ${ALL_FORMATS.join(",")}.
                    Default: all.

Every bullet traces to the source resume. The truthfulness guard and Helix
evidence boundaries run on every generation; violations fail the run loudly.
Artifacts are drafts for human review — nothing is submitted anywhere.`);
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index === -1 ? undefined : argv[index + 1];
  };
  const jd = get("--jd");
  const resumeProfile = get("--resume-profile");
  const out = get("--out");
  if (!jd || !resumeProfile || !out || argv.includes("--help") || argv.includes("-h")) {
    printUsage();
    process.exit(2);
  }
  const formatsRaw = get("--formats");
  let formats: Format[] = [...ALL_FORMATS];
  if (formatsRaw) {
    formats = formatsRaw.split(",").map((f) => f.trim().toLowerCase()) as Format[];
    const unknown = formats.filter((f) => !(ALL_FORMATS as readonly string[]).includes(f));
    if (unknown.length > 0) {
      console.error(`error: unknown formats: ${unknown.join(", ")}`);
      printUsage();
      process.exit(2);
    }
  }
  return { jd, resumeProfile, out, formats };
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "target-role";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  for (const [label, path] of [
    ["--jd", args.jd],
    ["--resume-profile", args.resumeProfile],
  ] as const) {
    if (!existsSync(path)) {
      console.error(`error: ${label} file not found: ${path}`);
      process.exit(2);
    }
  }

  const jdText = readFileSync(args.jd, "utf-8");
  let resumeJson: unknown;
  try {
    resumeJson = JSON.parse(readFileSync(args.resumeProfile, "utf-8"));
  } catch (error) {
    console.error(`error: resume profile is not valid JSON: ${error instanceof Error ? error.message : error}`);
    process.exit(2);
  }
  const parsedResume = ResumeProfileSchema.safeParse(resumeJson);
  if (!parsedResume.success) {
    console.error("error: resume profile failed schema validation:");
    for (const issue of parsedResume.error.issues.slice(0, 10)) {
      console.error(`  - ${issue.path.join(".") || "<root>"}: ${issue.message}`);
    }
    process.exit(2);
  }
  const resume = parsedResume.data;

  const { jdProfile, tailored, report } = await generateDynamicResume({ jdText, resume });
  const compilation = compileDynamicApplication(resume, jdProfile, tailored, report);

  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  const slug = slugify(`${jdProfile.company || "role"}-${jdProfile.jobTitle || "target"}`);

  const written: string[] = [];
  const write = (filename: string, content: string | Buffer): void => {
    const dest = join(outDir, filename);
    writeFileSync(dest, content);
    written.push(dest);
  };

  const byKind = new Map(compilation.artifacts.map((a) => [a.filename, a]));
  void byKind;

  if (args.formats.includes("ats")) {
    const artifact = compilation.artifacts.find((a) => a.kind === "ats");
    if (artifact) write(artifact.filename, artifact.content);
  }
  if (args.formats.includes("html")) {
    const artifact = compilation.artifacts.find(
      (a) => a.kind === "html" && a.filename !== compilation.dynamic.impressiveHtmlFilename,
    );
    if (artifact) write(artifact.filename, artifact.content);
  }
  if (args.formats.includes("impressive")) {
    const artifact = compilation.artifacts.find(
      (a) => a.kind === "html" && a.filename === compilation.dynamic.impressiveHtmlFilename,
    );
    if (artifact) write(artifact.filename, artifact.content);
  }

  let manifestFilename = "";
  if (args.formats.includes("json") || args.formats.includes("docx")) {
    const artifact = compilation.artifacts.find((a) => a.filename === `${slug}-resume-dynamic.json`);
    if (artifact) {
      manifestFilename = artifact.filename;
      write(artifact.filename, artifact.content);
    }
  }

  if (args.formats.includes("report")) {
    write(
      `${slug}-dynamic-report.json`,
      `${JSON.stringify({ ...report, humanReviewRequired: true }, null, 2)}\n`,
    );
    write(
      "REVIEW_REQUIRED.txt",
      [
        "HUMAN REVIEW REQUIRED BEFORE USE",
        "",
        "These artifacts were generated deterministically from your source resume",
        "and the target job description. They are drafts, not submissions.",
        "",
        `Keyword coverage: ${report.coveragePercent}% (${report.coverageBand})`,
        `Bullets strengthened: ${report.bulletsStrengthened}/${report.bulletsTotal}`,
        report.missingRequiredTerms.length > 0
          ? `Missing required JD terms (not on source resume; NOT added): ${report.missingRequiredTerms.join(", ")}`
          : "All required JD terms are covered by the source resume.",
        "",
        "Review every tailored bullet side-by-side with the original before",
        "attaching any artifact to an application.",
        "",
        `Generated: ${report.generatedAt} (deterministic engine, no model used)`,
        "",
      ].join("\n"),
    );
  }

  if (args.formats.includes("docx")) {
    const repoRoot = resolve(__dirname, "..", "..");
    const script = join(repoRoot, "tools", "generate_docx.py");
    const manifestPath = join(outDir, manifestFilename || `${slug}-resume-dynamic.json`);
    const docxPath = join(outDir, `${slug}-resume.docx`);
    try {
      execFileSync("python3", [script, "--manifest", manifestPath, "--out", docxPath], {
        stdio: "pipe",
      });
      written.push(docxPath);
    } catch (error) {
      console.error(
        `warning: DOCX generation skipped (${error instanceof Error ? error.message.split("\n")[0] : error}). ` +
          "Install python3 or run tools/generate_docx.py manually against the manifest.",
      );
    }
  }

  console.log(`JD: ${report.jdTitle || "(untitled)"}`);
  console.log(
    `Keyword coverage: ${report.coveragePercent}% (${report.coverageBand}) — ${report.keywordCount} JD terms, ${report.requiredKeywordCount} required`,
  );
  console.log(
    `Bullets strengthened: ${report.bulletsStrengthened}/${report.bulletsTotal} ` +
      `(rules: ${report.rulesApplied.join(", ") || "none"})`,
  );
  console.log(
    `Skills reordered: ${report.skillsReordered ? "yes" : "no"}; summary: ${
      report.summaryComposed ? "composed from evidence" : "source summary kept (Helix boundary)"
    }`,
  );
  if (report.missingRequiredTerms.length > 0) {
    console.log(`Missing required terms (not invented): ${report.missingRequiredTerms.join(", ")}`);
  }
  console.log(`Wrote ${written.length} file(s) to ${outDir}:`);
  for (const file of written) console.log(`  - ${file}`);
}

main().catch((error) => {
  console.error(`error: ${error instanceof Error ? error.message : error}`);
  if (error instanceof Error && "violations" in error) {
    for (const violation of (error as { violations: readonly { path: string; message: string }[] }).violations.slice(0, 10)) {
      console.error(`  - ${violation.path}: ${violation.message}`);
    }
  }
  process.exit(1);
});
