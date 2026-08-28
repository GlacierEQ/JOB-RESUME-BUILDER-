"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const run_store_1 = require("../lib/run-store");
const resume = {
    contact: { name: "Casey", email: "casey@example.com", phone: "", location: "", website: "" },
    summary: "Systems architect",
    skills: ["Python"],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
};
const target = {
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
const score = {
    overallScore: 50,
    skillCoverageScore: 50,
    responsibilityAlignmentScore: 50,
    keywordScore: 50,
    seniorityScore: 50,
    criticalMissingRequirements: [],
    explanation: "fixture",
};
const gaps = { gaps: [] };
(0, node_test_1.default)("new local runs are versioned and expire after bounded retention", () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const run = (0, run_store_1.createRun)({
        id: "run-1",
        stage: "ANALYZED",
        resumeText: "source resume",
        jobDescriptionText: "target role",
        resume,
        jobDescription: target,
        originalMatch: score,
        gapAnalysis: gaps,
    }, now, 7);
    strict_1.default.equal(run.revision, 0);
    strict_1.default.equal(run.createdAt, now.toISOString());
    strict_1.default.equal(run.expiresAt, "2026-08-16T12:00:00.000Z");
});
(0, node_test_1.default)("advancing a run preserves identity and increments revision", () => {
    const run = (0, run_store_1.createRun)({
        id: "run-1",
        stage: "ANALYZED",
        resumeText: "source resume",
        jobDescriptionText: "target role",
        resume,
        jobDescription: target,
        originalMatch: score,
        gapAnalysis: gaps,
    }, new Date("2026-08-09T12:00:00.000Z"));
    const next = (0, run_store_1.advanceRun)(run, { stage: "REVIEWED", reviewedAt: "2026-08-09T12:05:00.000Z" }, new Date("2026-08-09T12:05:00.000Z"));
    strict_1.default.equal(next.id, run.id);
    strict_1.default.equal(next.createdAt, run.createdAt);
    strict_1.default.equal(next.revision, 1);
    strict_1.default.equal(next.stage, "REVIEWED");
    strict_1.default.equal(next.updatedAt, "2026-08-09T12:05:00.000Z");
});
(0, node_test_1.default)("retention cannot silently become unbounded", () => {
    strict_1.default.throws(() => (0, run_store_1.createRun)({
        id: "run-1",
        stage: "ANALYZED",
        resumeText: "source resume",
        jobDescriptionText: "target role",
        resume,
        jobDescription: target,
        originalMatch: score,
        gapAnalysis: gaps,
    }, new Date(), 31), /between 1 and 30/);
});
