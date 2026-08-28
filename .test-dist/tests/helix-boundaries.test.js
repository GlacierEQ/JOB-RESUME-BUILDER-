"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const helix_boundaries_1 = require("../lib/helix-boundaries");
const helix = {
    sourceCommit: "a".repeat(40),
    sourceDigest: "b".repeat(64),
    systems: [
        {
            system_id: "tower-of-babel",
            repository: "GlacierEQ/the-tower-of-babel",
            level: "L4",
            state: "REFERENCE_ONLY",
            role: "Polyglot architecture authority",
            evidence: "Public source and bounded exhibits",
            next_gate: "Complete hardware-backed promotion evidence",
            resume_use: "SUPPORTING_EVIDENCE_WITH_BOUNDARY",
        },
        {
            system_id: "akos",
            repository: "GlacierEQ/AKOS",
            level: "L5",
            state: "PROMOTED",
            role: "Governed agent runtime",
            evidence: "Tests, schemas, and receipts",
            next_gate: "Expand current-SHA integration evidence",
            resume_use: "PRIMARY_EVIDENCE",
        },
    ],
    companies: [
        {
            company_id: "apple",
            display_name: "Apple",
            target_roles: ["Applied AI Engineer"],
            recruiter_thesis: "Independent Apple-aligned systems work",
            gap_or_next_gate: "Verify company-specific packet",
            public_repositories: [],
            applicable_flagships: ["tower-of-babel"],
            non_affiliation: "Independent work; no affiliation or endorsement.",
        },
    ],
    applicationIntelligence: {
        sourceCommit: "a".repeat(40),
        sourceDigest: "c".repeat(64),
        externalResearchAsOf: "2026-08-01",
        externalFreshnessState: "CURRENT_FOR_FIXTURE",
        inferenceBoundary: "Observed facts remain separate from GlacierEQ inferences.",
        companies: [],
    },
    instructions: [],
};
const sourceResume = {
    contact: {
        name: "Casey Barton",
        email: "casey@example.test",
        phone: "",
        location: "Honolulu, HI",
        website: "",
    },
    summary: "Systems architect building governed agent runtimes.",
    skills: ["TypeScript", "Python"],
    experience: [
        {
            company: "Example Systems",
            title: "Systems Architect",
            startDate: "2024",
            endDate: "Present",
            bullets: ["Built governed agent workflows with explicit evidence boundaries."],
        },
    ],
    projects: [
        {
            name: "AKOS",
            description: "Governed agent runtime.",
            bullets: ["Implemented deterministic authority and evidence controls."],
            technologies: ["Python"],
        },
        {
            name: "The Tower of Babel",
            description: "Bounded polyglot architecture exhibit.",
            bullets: ["Mapped languages to explicit architectural boundaries."],
            technologies: ["TypeScript", "Python"],
        },
    ],
    education: [],
    certifications: [],
};
function tailored(summary = sourceResume.summary, bullet = sourceResume.experience[0].bullets[0], riskFlag) {
    return {
        tailoredSummary: summary,
        tailoredSkills: [...sourceResume.skills],
        tailoredExperience: [
            {
                company: sourceResume.experience[0].company,
                title: sourceResume.experience[0].title,
                bullets: [
                    {
                        original: sourceResume.experience[0].bullets[0],
                        tailored: bullet,
                        changeReason: "Role alignment without changing the source fact.",
                        keywordsAddressed: [],
                        confidence: "high",
                        riskFlag,
                    },
                ],
            },
        ],
    };
}
(0, node_test_1.describe)("Helix post-generation boundary guard", () => {
    (0, node_test_1.it)("accepts a promoted system already present in the source resume", () => {
        const candidate = tailored("Systems architect building governed agent runtimes including AKOS.");
        strict_1.default.deepEqual((0, helix_boundaries_1.inspectHelixBoundaries)(sourceResume, candidate, helix), []);
        strict_1.default.doesNotThrow(() => (0, helix_boundaries_1.assertHelixBoundaries)(sourceResume, candidate, helix));
    });
    (0, node_test_1.it)("rejects a Helix system that is absent from the source resume", () => {
        const sourceWithoutAkos = {
            ...sourceResume,
            projects: sourceResume.projects.filter((project) => project.name !== "AKOS"),
        };
        const violations = (0, helix_boundaries_1.inspectHelixBoundaries)(sourceWithoutAkos, tailored("Systems architect building AKOS agent runtimes."), helix);
        strict_1.default.ok(violations.some((violation) => violation.code === "HELIX_SYSTEM_NOT_IN_SOURCE"));
    });
    (0, node_test_1.it)("rejects production claims for REFERENCE_ONLY systems", () => {
        const violations = (0, helix_boundaries_1.inspectHelixBoundaries)(sourceResume, tailored(sourceResume.summary, "Deployed The Tower of Babel in production for governed agent workflows.", "REFERENCE_ONLY; production status requires verification."), helix);
        strict_1.default.ok(violations.some((violation) => violation.code === "REFERENCE_ONLY_PRODUCTION_CLAIM"));
    });
    (0, node_test_1.it)("requires an evidence-boundary risk flag for new REFERENCE_ONLY emphasis", () => {
        const violations = (0, helix_boundaries_1.inspectHelixBoundaries)(sourceResume, tailored(sourceResume.summary, "Applied The Tower of Babel architecture to governed agent workflows."), helix);
        strict_1.default.ok(violations.some((violation) => violation.code === "REFERENCE_ONLY_RISK_FLAG_REQUIRED"));
    });
    (0, node_test_1.it)("rejects target-company names and affiliation claims absent from source history", () => {
        const violations = (0, helix_boundaries_1.inspectHelixBoundaries)(sourceResume, tailored("Applied AI architect who built agent systems for Apple."), helix);
        strict_1.default.ok(violations.some((violation) => violation.code === "TARGET_COMPANY_NOT_IN_SOURCE"));
        strict_1.default.ok(violations.some((violation) => violation.code === "TARGET_COMPANY_AFFILIATION_CLAIM"));
    });
    (0, node_test_1.it)("throws a structured Helix boundary error", () => {
        strict_1.default.throws(() => (0, helix_boundaries_1.assertHelixBoundaries)(sourceResume, tailored("Applied AI architect who worked for Apple."), helix), (error) => error instanceof helix_boundaries_1.HelixBoundaryViolationError &&
            error.violations.some((violation) => violation.code === "TARGET_COMPANY_AFFILIATION_CLAIM"));
    });
});
