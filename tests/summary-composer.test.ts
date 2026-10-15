import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { composeSummary } from "../lib/summary-composer";
import type { JdKeyword } from "../lib/jd-keywords";
import type { ResumeProfile } from "../lib/schemas";
import { extractNumericClaims } from "../lib/truthfulness";

const resume: ResumeProfile = {
  contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "" },
  summary: "Automation engineer.",
  skills: ["n8n", "PostgreSQL", "Python"],
  experience: [
    {
      company: "Acme",
      title: "Automation Engineer",
      startDate: "2020",
      endDate: "2024",
      bullets: [
        "Built n8n workflows for invoice processing, reducing manual entry time by 60%.",
        "Maintained PostgreSQL pipelines serving 12 analysts.",
      ],
    },
  ],
  projects: [],
  education: [],
  certifications: [],
};

const jdKeywords: JdKeyword[] = [
  { term: "n8n", tier: "required", sources: ["requirements"] },
  { term: "PostgreSQL", tier: "required", sources: ["requirements"] },
];

describe("composeSummary", () => {
  it("mirrors the JD title as the headline", () => {
    const composed = composeSummary(resume, "Senior Business Process Automation Expert", jdKeywords);
    assert.equal(composed.headline, "Senior Business Process Automation Expert");
    assert.ok(composed.summary.startsWith("Senior Business Process Automation Expert"));
  });

  it("keeps the summary to a tight value-led shape without cliches", () => {
    const composed = composeSummary(resume, "Senior Business Process Automation Expert", jdKeywords);
    assert.ok(composed.summary.length < 600, `summary too long: ${composed.summary.length}`);
    for (const cliche of [/team player/i, /passionate/i, /hard-working/i, /seeking.*challenge/i]) {
      assert.ok(!cliche.test(composed.summary), `cliche found in: ${composed.summary}`);
    }
  });

  it("traces every numeric claim to the source resume", () => {
    const composed = composeSummary(resume, "Senior Business Process Automation Expert", jdKeywords);
    const corpusNumbers = extractNumericClaims(
      [resume.summary, ...resume.skills, ...resume.experience.flatMap((e) => e.bullets)].join(" "),
    );
    for (const claim of extractNumericClaims(composed.summary)) {
      assert.ok(corpusNumbers.has(claim), `untraced numeric claim "${claim}" in: ${composed.summary}`);
    }
  });

  it("selects quantified proof points first", () => {
    const composed = composeSummary(resume, "Senior Business Process Automation Expert", jdKeywords);
    assert.ok(composed.proofPoints.length > 0);
    assert.ok(
      composed.proofPoints[0]?.text.includes("60%"),
      `expected quantified proof first: ${composed.proofPoints[0]?.text}`,
    );
  });
});
