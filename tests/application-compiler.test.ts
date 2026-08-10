import assert from "node:assert/strict";
import test from "node:test";
import {
  compileApplicationArtifacts,
  materializeTailoredResume,
  renderAtsText,
  summarizeChanges,
} from "../lib/application-compiler";
import type {
  JobDescriptionProfile,
  ResumeProfile,
  TailoredResume,
} from "../lib/schemas";

const source: ResumeProfile = {
  contact: {
    name: "Casey <Barton>",
    email: "casey@example.com",
    phone: "",
    location: "Honolulu, HI",
    website: "https://example.com",
  },
  summary: "Builds reliable systems.",
  skills: ["Python", "TypeScript"],
  experience: [
    {
      company: "Example Systems",
      title: "Engineer",
      startDate: "2024",
      endDate: "Present",
      bullets: ["Built deterministic workflows.", "Reduced manual recovery steps."],
    },
  ],
  projects: [
    {
      name: "Proof Engine",
      description: "Evidence-bound execution.",
      bullets: ["Emits receipts."],
      technologies: ["Python"],
    },
  ],
  education: [],
  certifications: [],
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
          changeReason: "Target relevance",
          keywordsAddressed: ["agent"],
          confidence: "high",
        },
        {
          original: "Reduced manual recovery steps.",
          tailored: "Reduced manual recovery steps.",
          changeReason: "No change needed",
          keywordsAddressed: [],
          confidence: "high",
        },
      ],
    },
  ],
};

const target: JobDescriptionProfile = {
  jobTitle: "Principal AI Architect",
  company: "Example AI",
  requiredSkills: ["Agent Systems"],
  preferredSkills: [],
  responsibilities: [],
  qualifications: [],
  tools: [],
  keywords: ["agent"],
  seniorityLevel: "Principal",
  domainSignals: ["AI"],
};

test("materialization preserves source identity and applies only proposal fields", () => {
  const compiled = materializeTailoredResume(source, tailored);
  assert.equal(compiled.contact.name, source.contact.name);
  assert.equal(compiled.experience.length, source.experience.length);
  assert.equal(compiled.experience[0]?.company, source.experience[0]?.company);
  assert.equal(compiled.experience[0]?.title, source.experience[0]?.title);
  assert.equal(compiled.experience[0]?.bullets.length, source.experience[0]?.bullets.length);
  assert.equal(compiled.experience[0]?.bullets[0], "Built deterministic agent workflows.");
});

test("change summary is explicit and bounded", () => {
  const compiled = materializeTailoredResume(source, tailored);
  const changes = summarizeChanges(source, compiled);
  assert.equal(changes.summaryChanged, true);
  assert.deepEqual(changes.skillsAdded, ["Agent Systems"]);
  assert.deepEqual(changes.skillsRemoved, []);
  assert.equal(changes.experienceBulletsChanged.length, 1);
  assert.equal(changes.experienceBulletsChanged[0]?.index, 0);
});

test("application compiler emits real ATS, JSON, and printable HTML artifacts", () => {
  const result = compileApplicationArtifacts(
    source,
    target,
    tailored,
    "2026-08-09T12:00:00.000Z",
  );
  assert.equal(result.artifacts.length, 3);
  assert.deepEqual(result.artifacts.map((artifact) => artifact.kind), ["ats", "json", "html"]);
  assert.equal(result.boundary.pdfGenerated, false);
  assert.equal(result.boundary.externalSubmissionPerformed, false);

  const ats = result.artifacts.find((artifact) => artifact.kind === "ats");
  assert.ok(ats?.content.includes("PRINCIPAL") === false);
  assert.ok(ats?.content.includes("Built deterministic agent workflows."));

  const jsonArtifact = result.artifacts.find((artifact) => artifact.kind === "json");
  const manifest = JSON.parse(jsonArtifact?.content ?? "null");
  assert.equal(manifest.sourceResume.contact.name, "Casey <Barton>");
  assert.equal(manifest.compiledResume.skills.at(-1), "Agent Systems");
  assert.equal(manifest.changes.experienceBulletsChanged.length, 1);

  const html = result.artifacts.find((artifact) => artifact.kind === "html");
  assert.ok(html?.content.includes("Casey &lt;Barton&gt;"));
  assert.ok(!html?.content.includes("<script>"));
});

test("ATS output is deterministic for the same materialized resume", () => {
  const resume = materializeTailoredResume(source, tailored);
  assert.equal(renderAtsText(resume), renderAtsText(resume));
  assert.ok(renderAtsText(resume).endsWith("\n"));
});
