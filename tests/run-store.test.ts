import assert from "node:assert/strict";
import test from "node:test";
import { advanceRun, createRun } from "../lib/run-store";
import type {
  GapAnalysis,
  JobDescriptionProfile,
  MatchScore,
  ResumeProfile,
} from "../lib/schemas";

const resume: ResumeProfile = {
  contact: { name: "Casey", email: "casey@example.com", phone: "", location: "", website: "" },
  summary: "Systems architect",
  skills: ["Python"],
  experience: [],
  projects: [],
  education: [],
  certifications: [],
};
const target: JobDescriptionProfile = {
  jobTitle: "AI Architect",
  company: "Example",
  requiredSkills: [],
  preferredSkills: [],
  responsibilities: [],
  qualifications: [],
  tools: [],
  keywords: [],
  seniorityLevel: "Principal",
  domainSignals: [],
};
const score: MatchScore = {
  overallScore: 50,
  skillCoverageScore: 50,
  responsibilityAlignmentScore: 50,
  keywordScore: 50,
  seniorityScore: 50,
  criticalMissingRequirements: [],
  explanation: "fixture",
};
const gaps: GapAnalysis = { gaps: [] };

test("new local runs are versioned and expire after bounded retention", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");
  const run = createRun(
    {
      id: "run-1",
      stage: "ANALYZED",
      resumeText: "source resume",
      jobDescriptionText: "target role",
      resume,
      jobDescription: target,
      originalMatch: score,
      gapAnalysis: gaps,
    },
    now,
    7,
  );
  assert.equal(run.revision, 0);
  assert.equal(run.createdAt, now.toISOString());
  assert.equal(run.expiresAt, "2026-08-16T12:00:00.000Z");
});

test("advancing a run preserves identity and increments revision", () => {
  const run = createRun(
    {
      id: "run-1",
      stage: "ANALYZED",
      resumeText: "source resume",
      jobDescriptionText: "target role",
      resume,
      jobDescription: target,
      originalMatch: score,
      gapAnalysis: gaps,
    },
    new Date("2026-08-09T12:00:00.000Z"),
  );
  const next = advanceRun(
    run,
    { stage: "REVIEWED", reviewedAt: "2026-08-09T12:05:00.000Z" },
    new Date("2026-08-09T12:05:00.000Z"),
  );
  assert.equal(next.id, run.id);
  assert.equal(next.createdAt, run.createdAt);
  assert.equal(next.revision, 1);
  assert.equal(next.stage, "REVIEWED");
  assert.equal(next.updatedAt, "2026-08-09T12:05:00.000Z");
});

test("retention cannot silently become unbounded", () => {
  assert.throws(
    () =>
      createRun(
        {
          id: "run-1",
          stage: "ANALYZED",
          resumeText: "source resume",
          jobDescriptionText: "target role",
          resume,
          jobDescription: target,
          originalMatch: score,
          gapAnalysis: gaps,
        },
        new Date(),
        31,
      ),
    /between 1 and 30/,
  );
});
