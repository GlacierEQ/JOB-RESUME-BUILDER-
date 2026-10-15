import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDynamicResume } from "../services/dynamic-generator";
import { inspectTailoredResume } from "../lib/truthfulness";
import type { ResumeProfile } from "../lib/schemas";

const JD = `Senior Business Process Automation Expert
Massive — Remote (US)

Requirements:
- Personally built the same kind of workflow dozens to 100+ times in n8n or Zapier
- Production experience with PostgreSQL and CI/CD
- 5+ years of experience

Preferred:
- Python scripting

Responsibilities:
- Build n8n automation workflows for invoice processing and lead routing
`;

const resume: ResumeProfile = {
  contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "" },
  summary: "Automation engineer building workflow systems.",
  skills: ["Excel", "n8n", "PostgreSQL", "Python"],
  experience: [
    {
      company: "Acme Corp",
      title: "Automation Engineer",
      startDate: "2020",
      endDate: "2024",
      bullets: [
        "Responsible for developing n8n workflows for invoice processing.",
        "Built lead routing automation, reducing manual triage time by 45%.",
      ],
    },
    {
      company: "Beta LLC",
      title: "Systems Analyst",
      startDate: "2018",
      endDate: "2020",
      bullets: ["Maintained PostgreSQL reporting pipelines for the finance team."],
    },
  ],
  projects: [],
  education: [{ institution: "State University", degree: "B.S.", fieldOfStudy: "Information Systems", graduationDate: "2018" }],
  certifications: [],
};

describe("generateDynamicResume", () => {
  it("produces a tailored resume that passes the truthfulness guard", async () => {
    const { tailored } = await generateDynamicResume({ jdText: JD, resume });
    const violations = inspectTailoredResume(resume, tailored);
    assert.deepEqual(violations, []);
  });

  it("keeps experience order, counts, and originals stable", async () => {
    const { tailored } = await generateDynamicResume({ jdText: JD, resume });
    assert.equal(tailored.tailoredExperience.length, resume.experience.length);
    tailored.tailoredExperience.forEach((entry, index) => {
      assert.equal(entry.company, resume.experience[index]?.company);
      assert.equal(entry.title, resume.experience[index]?.title);
      assert.equal(entry.bullets.length, resume.experience[index]?.bullets.length);
      entry.bullets.forEach((bullet, bulletIndex) => {
        assert.equal(bullet.original, resume.experience[index]?.bullets[bulletIndex]);
      });
    });
  });

  it("strengthens weak bullets and reorders skills by JD priority", async () => {
    const { tailored, report } = await generateDynamicResume({ jdText: JD, resume });
    const firstBullet = tailored.tailoredExperience[0]?.bullets[0]?.tailored ?? "";
    assert.ok(
      !/^responsible for/i.test(firstBullet),
      `weak lead survived: ${firstBullet}`,
    );
    assert.ok(report.bulletsStrengthened >= 1);
    assert.ok(tailored.tailoredSkills.indexOf("n8n") < tailored.tailoredSkills.indexOf("Excel"));
    assert.deepEqual([...tailored.tailoredSkills].sort(), [...resume.skills].sort());
  });

  it("reports coverage and never invents missing required terms", async () => {
    const { tailored, report } = await generateDynamicResume({ jdText: JD, resume });
    assert.ok(report.coveragePercent >= 0 && report.coveragePercent <= 100);
    assert.ok(["major-gaps", "competitive", "strong", "excellent"].includes(report.coverageBand));
    // Missing terms must not appear as claimed skills or bullet content. The
    // summary headline legitimately mirrors the JD's own job title.
    const claimCorpus = [
      ...tailored.tailoredSkills,
      ...tailored.tailoredExperience.flatMap((entry) => entry.bullets.map((b) => b.tailored)),
    ]
      .join(" ")
      .toLowerCase();
    for (const term of report.missingRequiredTerms) {
      assert.ok(!claimCorpus.includes(term.toLowerCase()), `missing term invented: ${term}`);
    }
  });

  it("is deterministic: same input yields the same output", async () => {
    const first = await generateDynamicResume({ jdText: JD, resume });
    const second = await generateDynamicResume({ jdText: JD, resume });
    assert.deepEqual(
      { ...first.tailored, },
      { ...second.tailored },
    );
    assert.equal(first.report.coveragePercent, second.report.coveragePercent);
  });

  it("rejects empty JD text", async () => {
    await assert.rejects(() => generateDynamicResume({ jdText: "   ", resume }), /empty/i);
  });
});
