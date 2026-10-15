import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { alignKeywords, coverageBandFor } from "../lib/keyword-align";
import type { JdKeyword } from "../lib/jd-keywords";
import type { ResumeProfile } from "../lib/schemas";

const resume: ResumeProfile = {
  contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "" },
  summary: "Automation engineer building n8n workflows for invoice processing.",
  skills: ["Excel", "n8n", "PostgreSQL", "Python", "Word"],
  experience: [
    {
      company: "Acme",
      title: "Automation Engineer",
      startDate: "2020",
      endDate: "2024",
      bullets: ["Built n8n workflows for invoice processing, reducing manual entry time by 60%."],
    },
  ],
  projects: [],
  education: [],
  certifications: [],
};

const keywords: JdKeyword[] = [
  { term: "n8n", tier: "required", sources: ["requirements"] },
  { term: "PostgreSQL", tier: "required", sources: ["requirements"] },
  { term: "LangGraph", tier: "preferred", sources: ["preferred"] },
];

describe("alignKeywords", () => {
  it("scores coverage over the supplied JD terms", () => {
    const report = alignKeywords(resume, keywords);
    assert.equal(report.covered.length, 2);
    assert.equal(report.missing.length, 1);
    assert.equal(report.missing[0]?.term, "LangGraph");
    assert.equal(report.coveragePercent, 67);
  });

  it("reorders skills so JD must-haves come first without changing the set", () => {
    const report = alignKeywords(resume, keywords);
    assert.deepEqual([...report.reorderedSkills].sort(), [...resume.skills].sort());
    assert.ok(report.reorderedSkills.indexOf("n8n") < report.reorderedSkills.indexOf("Excel"));
    assert.ok(report.reorderedSkills.indexOf("PostgreSQL") < report.reorderedSkills.indexOf("Word"));
    assert.equal(report.skillsReordered, true);
  });

  it("records where each covered term was found", () => {
    const report = alignKeywords(resume, keywords);
    const n8n = report.covered.find((c) => c.term === "n8n");
    assert.ok(n8n?.evidence.includes("skills"));
    assert.ok(n8n?.evidence.includes("experience"));
  });

  it("reports no reorder when skills already lead with JD terms", () => {
    const ordered: ResumeProfile = { ...resume, skills: ["n8n", "PostgreSQL", "Python"] };
    const report = alignKeywords(ordered, keywords);
    assert.equal(report.skillsReordered, false);
  });
});

describe("coverageBandFor", () => {
  it("assigns the documented bands", () => {
    assert.equal(coverageBandFor(20).band, "major-gaps");
    assert.equal(coverageBandFor(60).band, "competitive");
    assert.equal(coverageBandFor(80).band, "strong");
    assert.equal(coverageBandFor(95).band, "excellent");
  });
});
