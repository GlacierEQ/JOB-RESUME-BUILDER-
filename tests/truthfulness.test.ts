import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ResumeProfile, TailoredResume } from "../lib/schemas";
import {
  assertTruthfulTailoring,
  inspectTailoredResume,
  TruthfulnessViolationError,
} from "../lib/truthfulness";

const sourceResume: ResumeProfile = {
  contact: {
    name: "Casey Barton",
    email: "casey@example.test",
    phone: "",
    location: "Honolulu, HI",
    website: "",
  },
  summary: "Systems architect building TypeScript services and agent workflows.",
  skills: ["TypeScript", "Node.js", "Supabase"],
  experience: [
    {
      company: "Example Systems",
      title: "Systems Architect",
      startDate: "2024",
      endDate: "Present",
      bullets: ["Built TypeScript services supporting 40 internal users."],
    },
  ],
  projects: [],
  education: [],
  certifications: [],
};

const faithfulTailoring: TailoredResume = {
  tailoredSummary: "Systems architect building TypeScript services and agent workflows.",
  tailoredSkills: ["TypeScript", "Node.js", "Supabase"],
  tailoredExperience: [
    {
      company: "Example Systems",
      title: "Systems Architect",
      bullets: [
        {
          original: "Built TypeScript services supporting 40 internal users.",
          tailored: "Built reliable TypeScript services supporting 40 internal users.",
          changeReason: "Improves relevance without changing the underlying claim.",
          keywordsAddressed: ["TypeScript"],
          confidence: "high",
        },
      ],
    },
  ],
};

describe("truthfulness guard", () => {
  it("accepts a rewrite that preserves source entities and numeric claims", () => {
    assert.deepEqual(inspectTailoredResume(sourceResume, faithfulTailoring), []);
    assert.doesNotThrow(() => assertTruthfulTailoring(sourceResume, faithfulTailoring));
  });

  it("rejects an employer that is absent from the source resume", () => {
    const result = inspectTailoredResume(sourceResume, {
      ...faithfulTailoring,
      tailoredExperience: [
        {
          ...faithfulTailoring.tailoredExperience[0],
          company: "Invented Labs",
        },
      ],
    });

    assert.ok(result.some((violation) => violation.code === "UNKNOWN_EXPERIENCE"));
  });

  it("rejects changed titles, mismatched source bullets, and invented metrics", () => {
    const result = inspectTailoredResume(sourceResume, {
      ...faithfulTailoring,
      tailoredExperience: [
        {
          ...faithfulTailoring.tailoredExperience[0],
          title: "Vice President of Engineering",
          bullets: [
            {
              ...faithfulTailoring.tailoredExperience[0].bullets[0],
              original: "Built a different system.",
              tailored: "Increased platform performance by 99%.",
            },
          ],
        },
      ],
    });

    assert.ok(result.some((violation) => violation.code === "TITLE_CHANGED"));
    assert.ok(result.some((violation) => violation.code === "ORIGINAL_BULLET_MISMATCH"));
  });

  it("rejects skills that have no support in the source resume", () => {
    const result = inspectTailoredResume(sourceResume, {
      ...faithfulTailoring,
      tailoredSkills: [...faithfulTailoring.tailoredSkills, "Kubernetes"],
    });

    assert.ok(result.some((violation) => violation.code === "UNSUPPORTED_SKILL"));
  });

  it("throws a structured error containing all violations", () => {
    assert.throws(
      () =>
        assertTruthfulTailoring(sourceResume, {
          ...faithfulTailoring,
          tailoredSkills: ["Fabricated Capability"],
        }),
      (error) =>
        error instanceof TruthfulnessViolationError &&
        error.violations.some((violation) => violation.code === "UNSUPPORTED_SKILL"),
    );
  });
});
