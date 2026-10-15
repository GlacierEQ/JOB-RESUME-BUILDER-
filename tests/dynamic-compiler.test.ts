import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDynamicResume } from "../services/dynamic-generator";
import {
  compileDynamicApplication,
  renderImpressiveHtml,
} from "../lib/dynamic-compiler";
import { renderAtsText, renderPrintableHtml } from "../lib/application-compiler";
import type { ResumeProfile } from "../lib/schemas";

const JD = `Senior Business Process Automation Expert

Requirements:
- n8n workflow automation
- PostgreSQL
`;

const resume: ResumeProfile = {
  contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "", linkedin: "" },
  summary: "Automation engineer.",
  skills: ["n8n", "PostgreSQL"],
  experience: [
    {
      company: "Acme Corp",
      title: "Automation Engineer",
      startDate: "2020",
      endDate: "2024",
      bullets: ["Built n8n workflows, reducing manual entry time by 60%."],
    },
  ],
  projects: [],
  education: [],
  certifications: [],
};

describe("renderImpressiveHtml", () => {
  it("leads the top third with name, JD headline, and summary", async () => {
    const { jdProfile, tailored } = await generateDynamicResume({ jdText: JD, resume });
    const { compileApplicationArtifacts } = await import("../lib/application-compiler");
    const base = compileApplicationArtifacts(resume, jdProfile, tailored);
    const html = renderImpressiveHtml(base.resume, jdProfile);
    assert.ok(html.includes("Casey Barton"));
    assert.ok(html.includes("Senior Business Process Automation Expert"));
    const heroIndex = html.indexOf("<header");
    const summaryIndex = html.indexOf(">Summary<");
    const skillsIndex = html.indexOf(">Skills<");
    const experienceIndex = html.indexOf(">Experience<");
    assert.ok(heroIndex < summaryIndex && summaryIndex < skillsIndex && skillsIndex < experienceIndex);
  });

  it("emphasizes metrics and stays ATS-safe (no tables, single column)", async () => {
    const { jdProfile, tailored } = await generateDynamicResume({ jdText: JD, resume });
    const { compileApplicationArtifacts } = await import("../lib/application-compiler");
    const base = compileApplicationArtifacts(resume, jdProfile, tailored);
    const html = renderImpressiveHtml(base.resume, jdProfile);
    assert.ok(html.includes('<strong class="metric">60%</strong>'));
    assert.ok(!html.includes("<table"));
    assert.ok(html.includes("<h2>"));
  });
});

describe("compileDynamicApplication", () => {
  it("keeps the base artifacts byte-identical and appends dynamic ones", async () => {
    const { jdProfile, tailored, report } = await generateDynamicResume({ jdText: JD, resume });
    const { compileApplicationArtifacts } = await import("../lib/application-compiler");
    const stamp = "2026-10-15T00:00:00.000Z";
    const base = compileApplicationArtifacts(resume, jdProfile, tailored, stamp);
    const dynamic = compileDynamicApplication(resume, jdProfile, tailored, report, stamp);

    const baseAts = base.artifacts.find((a) => a.kind === "ats")?.content;
    const dynamicAts = dynamic.artifacts.find((a) => a.kind === "ats")?.content;
    assert.equal(dynamicAts, baseAts);
    assert.equal(renderAtsText(dynamic.resume), baseAts);
    assert.equal(
      dynamic.artifacts.find((a) => a.filename.endsWith("-resume.html"))?.content,
      renderPrintableHtml(dynamic.resume),
    );

    const filenames = dynamic.artifacts.map((a) => a.filename);
    assert.ok(filenames.some((f) => f.endsWith("-resume-impressive.html")));
    assert.ok(filenames.some((f) => f.endsWith("-resume-dynamic.json")));

    const manifest = JSON.parse(
      dynamic.artifacts.find((a) => a.filename.endsWith("-resume-dynamic.json"))?.content ?? "{}",
    );
    assert.equal(manifest.schema, "glaciereq.dynamic-application-compilation.v1");
    assert.equal(manifest.dynamicReport.coveragePercent, report.coveragePercent);
    assert.equal(manifest.boundary.humanReviewRequired, true);
    assert.equal(manifest.boundary.externalSubmissionPerformed, false);
  });
});
