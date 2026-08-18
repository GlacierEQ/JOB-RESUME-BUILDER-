import assert from "node:assert/strict";
import test from "node:test";
import {
  compileApplicationReadiness,
  compileReadinessDossierArtifact,
} from "../lib/application-readiness";
import type {
  JobDescriptionProfile,
  ResumeProfile,
  TailoredResume,
} from "../lib/schemas";

const source: ResumeProfile = {
  contact: {
    name: "Casey Barton",
    email: "casey@example.com",
    phone: "",
    location: "Honolulu, HI",
    website: "",
  },
  summary: "Builds reliable systems.",
  skills: ["Python", "TypeScript"],
  experience: [
    {
      company: "Example Systems",
      title: "Engineer",
      startDate: "2024",
      endDate: "Present",
      bullets: ["Built deterministic workflows."],
    },
  ],
  projects: [],
  education: [],
  certifications: [],
};

const target: JobDescriptionProfile = {
  jobTitle: "Principal Agentic Systems Architect",
  company: "Example AI",
  requiredSkills: ["Agent Systems", "Python"],
  preferredSkills: ["Distributed Systems"],
  responsibilities: [],
  qualifications: [],
  tools: ["TypeScript"],
  keywords: ["deterministic"],
  seniorityLevel: "Principal",
  domainSignals: ["AI"],
};

const tailored: TailoredResume = {
  tailoredSummary: "Builds reliable agent systems.",
  tailoredSkills: ["Python", "TypeScript", "Agent Systems"],
  tailoredExperience: [
    {
      company: "Example Systems",
      title: "Engineer",
      bullets: [
        {
          original: "Built deterministic workflows.",
          tailored: "Built deterministic agent workflows.",
          changeReason: "Target relevance using source-supported system work",
          keywordsAddressed: ["agent", "deterministic"],
          confidence: "high",
        },
      ],
    },
  ],
};

test("readiness reports gained requirement support without inventing unresolved qualifications", () => {
  const report = compileApplicationReadiness(source, target, tailored);

  assert.equal(report.schema, "glaciereq.application-readiness.v1");
  assert.equal(report.readiness, "EVIDENCE_GAPPED");
  assert.ok(report.gainedSupport.some((row) => row.requirement === "Agent Systems"));
  assert.ok(report.coverageDelta.required > 0);
  assert.ok(
    report.unresolvedRequired.every((row) => row.requirement !== "Agent Systems"),
    "newly supported required skill must not remain unresolved",
  );
  assert.equal(report.boundary.qualificationsInvented, false);
  assert.equal(report.boundary.hiringOutcomePredicted, false);
});

test("readiness becomes evidence-strong when every required skill is supported", () => {
  const report = compileApplicationReadiness(source, { ...target, requiredSkills: ["Python", "Agent Systems"] }, tailored);
  assert.equal(report.unresolvedRequired.length, 0);
  assert.equal(report.readiness, "EVIDENCE_STRONG");
});

test("readiness detects regressions introduced by tailoring", () => {
  const regressed: TailoredResume = {
    ...tailored,
    tailoredSkills: ["Agent Systems"],
  };
  const report = compileApplicationReadiness(source, target, regressed);

  assert.equal(report.readiness, "EVIDENCE_REGRESSED");
  assert.ok(report.regressions.some((row) => row.requirement === "Python"));
  assert.ok(report.regressions.some((row) => row.requirement === "TypeScript"));
});

test("requirement identities remain stable across before/after comparison", () => {
  const report = compileApplicationReadiness(source, target, tailored);
  const identities = report.requirements.map((row) => `${row.tier}:${row.requirement}`);
  assert.equal(new Set(identities).size, identities.length);
  assert.equal(report.requirements.length, 6);
});

test("readiness dossier is deterministic for a fixed compilation time and preserves evidence boundaries", () => {
  const report = compileApplicationReadiness(source, target, tailored);
  const compiledAt = "2026-08-18T02:00:00.000Z";
  const first = compileReadinessDossierArtifact(report, compiledAt);
  const second = compileReadinessDossierArtifact(report, compiledAt);

  assert.deepEqual(first, second);
  assert.equal(first.kind, "readiness");
  assert.equal(first.filename, "example-ai-principal-agentic-systems-architect-readiness-dossier.json");

  const payload = JSON.parse(first.content);
  assert.equal(payload.schema, "glaciereq.application-readiness-dossier.v1");
  assert.equal(payload.compiledAt, compiledAt);
  assert.equal(payload.readiness, report.readiness);
  assert.deepEqual(payload.requirements, report.requirements);
  assert.equal(payload.boundary.qualificationsInvented, false);
  assert.equal(payload.boundary.hiringOutcomePredicted, false);
  assert.equal(payload.boundary.externalSubmissionPerformed, false);
});
