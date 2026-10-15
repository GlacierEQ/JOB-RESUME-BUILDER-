"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const summary_composer_1 = require("../lib/summary-composer");
const truthfulness_1 = require("../lib/truthfulness");
const resume = {
    contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "", linkedin: "" },
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
const jdKeywords = [
    { term: "n8n", tier: "required", sources: ["requirements"] },
    { term: "PostgreSQL", tier: "required", sources: ["requirements"] },
];
(0, node_test_1.describe)("composeSummary", () => {
    (0, node_test_1.it)("mirrors the JD title as the headline", () => {
        const composed = (0, summary_composer_1.composeSummary)(resume, "Senior Business Process Automation Expert", jdKeywords);
        strict_1.default.equal(composed.headline, "Senior Business Process Automation Expert");
        strict_1.default.ok(composed.summary.startsWith("Senior Business Process Automation Expert"));
    });
    (0, node_test_1.it)("keeps the summary to a tight value-led shape without cliches", () => {
        const composed = (0, summary_composer_1.composeSummary)(resume, "Senior Business Process Automation Expert", jdKeywords);
        strict_1.default.ok(composed.summary.length < 600, `summary too long: ${composed.summary.length}`);
        for (const cliche of [/team player/i, /passionate/i, /hard-working/i, /seeking.*challenge/i]) {
            strict_1.default.ok(!cliche.test(composed.summary), `cliche found in: ${composed.summary}`);
        }
    });
    (0, node_test_1.it)("traces every numeric claim to the source resume", () => {
        const composed = (0, summary_composer_1.composeSummary)(resume, "Senior Business Process Automation Expert", jdKeywords);
        const corpusNumbers = (0, truthfulness_1.extractNumericClaims)([resume.summary, ...resume.skills, ...resume.experience.flatMap((e) => e.bullets)].join(" "));
        for (const claim of (0, truthfulness_1.extractNumericClaims)(composed.summary)) {
            strict_1.default.ok(corpusNumbers.has(claim), `untraced numeric claim "${claim}" in: ${composed.summary}`);
        }
    });
    (0, node_test_1.it)("selects quantified proof points first", () => {
        const composed = (0, summary_composer_1.composeSummary)(resume, "Senior Business Process Automation Expert", jdKeywords);
        strict_1.default.ok(composed.proofPoints.length > 0);
        strict_1.default.ok(composed.proofPoints[0]?.text.includes("60%"), `expected quantified proof first: ${composed.proofPoints[0]?.text}`);
    });
});
