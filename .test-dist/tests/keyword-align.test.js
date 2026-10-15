"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const keyword_align_1 = require("../lib/keyword-align");
const resume = {
    contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "", linkedin: "" },
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
const keywords = [
    { term: "n8n", tier: "required", sources: ["requirements"] },
    { term: "PostgreSQL", tier: "required", sources: ["requirements"] },
    { term: "LangGraph", tier: "preferred", sources: ["preferred"] },
];
(0, node_test_1.describe)("alignKeywords", () => {
    (0, node_test_1.it)("scores coverage over the supplied JD terms", () => {
        const report = (0, keyword_align_1.alignKeywords)(resume, keywords);
        strict_1.default.equal(report.covered.length, 2);
        strict_1.default.equal(report.missing.length, 1);
        strict_1.default.equal(report.missing[0]?.term, "LangGraph");
        strict_1.default.equal(report.coveragePercent, 67);
    });
    (0, node_test_1.it)("reorders skills so JD must-haves come first without changing the set", () => {
        const report = (0, keyword_align_1.alignKeywords)(resume, keywords);
        strict_1.default.deepEqual([...report.reorderedSkills].sort(), [...resume.skills].sort());
        strict_1.default.ok(report.reorderedSkills.indexOf("n8n") < report.reorderedSkills.indexOf("Excel"));
        strict_1.default.ok(report.reorderedSkills.indexOf("PostgreSQL") < report.reorderedSkills.indexOf("Word"));
        strict_1.default.equal(report.skillsReordered, true);
    });
    (0, node_test_1.it)("records where each covered term was found", () => {
        const report = (0, keyword_align_1.alignKeywords)(resume, keywords);
        const n8n = report.covered.find((c) => c.term === "n8n");
        strict_1.default.ok(n8n?.evidence.includes("skills"));
        strict_1.default.ok(n8n?.evidence.includes("experience"));
    });
    (0, node_test_1.it)("reports no reorder when skills already lead with JD terms", () => {
        const ordered = { ...resume, skills: ["n8n", "PostgreSQL", "Python"] };
        const report = (0, keyword_align_1.alignKeywords)(ordered, keywords);
        strict_1.default.equal(report.skillsReordered, false);
    });
});
(0, node_test_1.describe)("coverageBandFor", () => {
    (0, node_test_1.it)("assigns the documented bands", () => {
        strict_1.default.equal((0, keyword_align_1.coverageBandFor)(20).band, "major-gaps");
        strict_1.default.equal((0, keyword_align_1.coverageBandFor)(60).band, "competitive");
        strict_1.default.equal((0, keyword_align_1.coverageBandFor)(80).band, "strong");
        strict_1.default.equal((0, keyword_align_1.coverageBandFor)(95).band, "excellent");
    });
});
