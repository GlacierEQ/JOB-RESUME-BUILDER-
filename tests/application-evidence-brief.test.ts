import assert from "node:assert/strict";
import test from "node:test";
import { compileApplicationEvidenceBrief } from "../lib/application-evidence-brief";
import type { JobDescriptionProfile, ResumeProfile } from "../lib/schemas";

const resume: ResumeProfile = {
  contact: {
    name: "Casey Barton",
    email: "casey@example.com",
    phone: "",
    location: "Honolulu, HI",
    website: "https://example.com",
  },
  summary: "Principal systems architect building reliable agentic AI platforms.",
  skills: ["Python", "TypeScript", "PostgreSQL", "Agent Systems"],
  experience: [
    {
      company: "GlacierEQ",
      title: "Applied AI Systems Builder",
      startDate: "2025",
      endDate: "Present",
      bullets: [
        "Designed deterministic multi-agent workflows with explicit authority and recovery.",
        "Built evidence-bound application automation and recruiter-facing proof systems.",
      ],
    },
  ],
  projects: [
    {
      name: "Helix",
      description: "Application intelligence and portfolio orchestration.",
      bullets: ["Compiled role research into machine-readable application evidence."],
      technologies: ["TypeScript", "Node.js", "PostgreSQL"],
    },
  ],
  education: [],
  certifications: [],
};

const target: JobDescriptionProfile = {
  jobTitle: "Principal Agentic AI Engineer",
  company: "Target AI",
  requiredSkills: ["Python", "Agent Systems", "Kubernetes"],
  preferredSkills: ["PostgreSQL"],
  responsibilities: ["Design reliable multi-agent platforms"],
  qualifications: [],
  tools: ["TypeScript", "Terraform"],
  keywords: ["application intelligence", "distributed tracing"],
  seniorityLevel: "Principal",
  domainSignals: ["AI"],
};

test("application evidence brief reports supported and unsupported target requirements without inventing evidence", () => {
  const brief = compileApplicationEvidenceBrief(resume, target);

  assert.equal(brief.schema, "glaciereq.application-evidence-brief.v1");
  assert.deepEqual(brief.coverage.required, { supported: 2, total: 3, ratio: 2 / 3 });
  assert.deepEqual(brief.unsupportedRequired, ["Kubernetes"]);

  const python = brief.requirements.find((row) => row.requirement === "Python");
  assert.equal(python?.status, "SUPPORTED");
  assert.equal(python?.bestEvidence?.text, "Python");

  const kubernetes = brief.requirements.find((row) => row.requirement === "Kubernetes");
  assert.equal(kubernetes?.status, "UNSUPPORTED");
  assert.equal(kubernetes?.bestEvidence, null);

  const postgres = brief.requirements.find((row) => row.requirement === "PostgreSQL");
  assert.equal(postgres?.status, "SUPPORTED");
  assert.ok(postgres?.bestEvidence?.source.startsWith("skills[") || postgres?.bestEvidence?.source.includes("technologies"));

  assert.equal(brief.boundary.lexicalEvidenceOnly, true);
  assert.equal(brief.boundary.semanticQualificationInferred, false);
  assert.equal(brief.boundary.hiringOutcomePredicted, false);
});

test("partial token overlap never promotes a requirement to supported evidence", () => {
  const fuzzyTarget: JobDescriptionProfile = {
    ...target,
    requiredSkills: ["distributed Kubernetes platform"],
    preferredSkills: [],
    tools: [],
    keywords: [],
  };
  const brief = compileApplicationEvidenceBrief(resume, fuzzyTarget);
  const row = brief.requirements[0];
  assert.ok(row);
  assert.notEqual(row.status, "SUPPORTED");
});

test("application evidence brief is deterministic for identical structured inputs", () => {
  assert.deepEqual(
    compileApplicationEvidenceBrief(resume, target),
    compileApplicationEvidenceBrief(resume, target),
  );
});
