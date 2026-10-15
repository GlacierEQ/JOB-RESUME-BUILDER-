"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const dynamic_generator_1 = require("../services/dynamic-generator");
const truthfulness_1 = require("../lib/truthfulness");
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
const resume = {
    contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "", linkedin: "" },
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
(0, node_test_1.describe)("generateDynamicResume", () => {
    (0, node_test_1.it)("produces a tailored resume that passes the truthfulness guard", async () => {
        const { tailored } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const violations = (0, truthfulness_1.inspectTailoredResume)(resume, tailored);
        strict_1.default.deepEqual(violations, []);
    });
    (0, node_test_1.it)("keeps experience order, counts, and originals stable", async () => {
        const { tailored } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        strict_1.default.equal(tailored.tailoredExperience.length, resume.experience.length);
        tailored.tailoredExperience.forEach((entry, index) => {
            strict_1.default.equal(entry.company, resume.experience[index]?.company);
            strict_1.default.equal(entry.title, resume.experience[index]?.title);
            strict_1.default.equal(entry.bullets.length, resume.experience[index]?.bullets.length);
            entry.bullets.forEach((bullet, bulletIndex) => {
                strict_1.default.equal(bullet.original, resume.experience[index]?.bullets[bulletIndex]);
            });
        });
    });
    (0, node_test_1.it)("strengthens weak bullets and reorders skills by JD priority", async () => {
        const { tailored, report } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const firstBullet = tailored.tailoredExperience[0]?.bullets[0]?.tailored ?? "";
        strict_1.default.ok(!/^responsible for/i.test(firstBullet), `weak lead survived: ${firstBullet}`);
        strict_1.default.ok(report.bulletsStrengthened >= 1);
        strict_1.default.ok(tailored.tailoredSkills.indexOf("n8n") < tailored.tailoredSkills.indexOf("Excel"));
        strict_1.default.deepEqual([...tailored.tailoredSkills].sort(), [...resume.skills].sort());
    });
    (0, node_test_1.it)("reports coverage and never invents missing required terms", async () => {
        const { tailored, report } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        strict_1.default.ok(report.coveragePercent >= 0 && report.coveragePercent <= 100);
        strict_1.default.ok(["major-gaps", "competitive", "strong", "excellent"].includes(report.coverageBand));
        // Missing terms must not appear as claimed skills or bullet content. The
        // summary headline legitimately mirrors the JD's own job title.
        const claimCorpus = [
            ...tailored.tailoredSkills,
            ...tailored.tailoredExperience.flatMap((entry) => entry.bullets.map((b) => b.tailored)),
        ]
            .join(" ")
            .toLowerCase();
        for (const term of report.missingRequiredTerms) {
            strict_1.default.ok(!claimCorpus.includes(term.toLowerCase()), `missing term invented: ${term}`);
        }
    });
    (0, node_test_1.it)("is deterministic: same input yields the same output", async () => {
        const first = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const second = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        strict_1.default.deepEqual({ ...first.tailored, }, { ...second.tailored });
        strict_1.default.equal(first.report.coveragePercent, second.report.coveragePercent);
    });
    (0, node_test_1.it)("rejects empty JD text", async () => {
        await strict_1.default.rejects(() => (0, dynamic_generator_1.generateDynamicResume)({ jdText: "   ", resume }), /empty/i);
    });
});
