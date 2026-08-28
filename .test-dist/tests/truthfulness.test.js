"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const truthfulness_1 = require("../lib/truthfulness");
const sourceResume = {
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
const faithfulTailoring = {
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
(0, node_test_1.describe)("truthfulness guard", () => {
    (0, node_test_1.it)("accepts a rewrite that preserves source entities and numeric claims", () => {
        strict_1.default.deepEqual((0, truthfulness_1.inspectTailoredResume)(sourceResume, faithfulTailoring), []);
        strict_1.default.doesNotThrow(() => (0, truthfulness_1.assertTruthfulTailoring)(sourceResume, faithfulTailoring));
    });
    (0, node_test_1.it)("rejects an employer that is absent from the source resume", () => {
        const result = (0, truthfulness_1.inspectTailoredResume)(sourceResume, {
            ...faithfulTailoring,
            tailoredExperience: [
                {
                    ...faithfulTailoring.tailoredExperience[0],
                    company: "Invented Labs",
                },
            ],
        });
        strict_1.default.ok(result.some((violation) => violation.code === "UNKNOWN_EXPERIENCE"));
    });
    (0, node_test_1.it)("rejects changed titles, mismatched source bullets, and invented metrics", () => {
        const result = (0, truthfulness_1.inspectTailoredResume)(sourceResume, {
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
        strict_1.default.ok(result.some((violation) => violation.code === "TITLE_CHANGED"));
        strict_1.default.ok(result.some((violation) => violation.code === "ORIGINAL_BULLET_MISMATCH"));
    });
    (0, node_test_1.it)("rejects skills that have no support in the source resume", () => {
        const result = (0, truthfulness_1.inspectTailoredResume)(sourceResume, {
            ...faithfulTailoring,
            tailoredSkills: [...faithfulTailoring.tailoredSkills, "Kubernetes"],
        });
        strict_1.default.ok(result.some((violation) => violation.code === "UNSUPPORTED_SKILL"));
    });
    (0, node_test_1.it)("throws a structured error containing all violations", () => {
        strict_1.default.throws(() => (0, truthfulness_1.assertTruthfulTailoring)(sourceResume, {
            ...faithfulTailoring,
            tailoredSkills: ["Fabricated Capability"],
        }), (error) => error instanceof truthfulness_1.TruthfulnessViolationError &&
            error.violations.some((violation) => violation.code === "UNSUPPORTED_SKILL"));
    });
});
