"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const application_compiler_1 = require("../lib/application-compiler");
const source = {
    contact: {
        name: "Casey <Barton>",
        email: "casey@example.com",
        phone: "",
        location: "Honolulu, HI",
        website: "https://example.com",
    },
    summary: "Builds reliable systems.",
    skills: ["Python", "TypeScript"],
    experience: [
        {
            company: "Example Systems",
            title: "Engineer",
            startDate: "2024",
            endDate: "Present",
            bullets: ["Built deterministic workflows.", "Reduced manual recovery steps."],
        },
    ],
    projects: [
        {
            name: "Proof Engine",
            description: "Evidence-bound execution.",
            bullets: ["Emits receipts."],
            technologies: ["Python"],
        },
    ],
    education: [
        {
            institution: "Example University",
            degree: "B.S.",
            fieldOfStudy: "Systems Engineering",
            graduationDate: "2020",
        },
    ],
    certifications: [
        {
            name: "Example Certification",
            issuer: "Example Institute",
            date: "2021",
        },
    ],
};
const tailored = {
    tailoredSummary: "Builds reliable agent systems.",
    tailoredSkills: ["Python", "TypeScript", "Agent Systems"],
    tailoredExperience: [
        {
            company: "Example Systems",
            title: "Engineer",
            bullets: [
                {
                    original: "Built deterministic workflows.",
                    tailored: "Built deterministic agent workflows.",
                    changeReason: "Target relevance",
                    keywordsAddressed: ["agent"],
                    confidence: "high",
                },
                {
                    original: "Reduced manual recovery steps.",
                    tailored: "Reduced manual recovery steps.",
                    changeReason: "No change needed",
                    keywordsAddressed: [],
                    confidence: "high",
                },
            ],
        },
    ],
};
const target = {
    jobTitle: "Principal AI Architect",
    company: "Example AI",
    requiredSkills: ["Agent Systems"],
    preferredSkills: [],
    responsibilities: [],
    qualifications: [],
    tools: [],
    keywords: ["agent"],
    seniorityLevel: "Principal",
    domainSignals: ["AI"],
};
(0, node_test_1.default)("materialization preserves source identity and applies only proposal fields", () => {
    const compiled = (0, application_compiler_1.materializeTailoredResume)(source, tailored);
    strict_1.default.equal(compiled.contact.name, source.contact.name);
    strict_1.default.equal(compiled.experience.length, source.experience.length);
    strict_1.default.equal(compiled.experience[0]?.company, source.experience[0]?.company);
    strict_1.default.equal(compiled.experience[0]?.title, source.experience[0]?.title);
    strict_1.default.equal(compiled.experience[0]?.bullets.length, source.experience[0]?.bullets.length);
    strict_1.default.equal(compiled.experience[0]?.bullets[0], "Built deterministic agent workflows.");
});
(0, node_test_1.default)("same-employer roles bind proposals by source identity rather than employer name", () => {
    const multiRoleSource = {
        ...source,
        experience: [
            {
                company: "Example Systems",
                title: "Engineer",
                startDate: "2022",
                endDate: "2024",
                bullets: ["Built deployment tooling."],
            },
            {
                company: "Example Systems",
                title: "Architect",
                startDate: "2024",
                endDate: "Present",
                bullets: ["Designed agent controls."],
            },
        ],
    };
    const multiRoleTailored = {
        tailoredSummary: source.summary,
        tailoredSkills: source.skills,
        tailoredExperience: [
            {
                company: "Example Systems",
                title: "Architect",
                bullets: [
                    {
                        original: "Designed agent controls.",
                        tailored: "Designed bounded agent controls.",
                        changeReason: "precision",
                        keywordsAddressed: ["bounded"],
                        confidence: "high",
                    },
                ],
            },
            {
                company: "Example Systems",
                title: "Engineer",
                bullets: [
                    {
                        original: "Built deployment tooling.",
                        tailored: "Built deterministic deployment tooling.",
                        changeReason: "precision",
                        keywordsAddressed: ["deterministic"],
                        confidence: "high",
                    },
                ],
            },
        ],
    };
    const compiled = (0, application_compiler_1.materializeTailoredResume)(multiRoleSource, multiRoleTailored);
    strict_1.default.equal(compiled.experience[0]?.bullets[0], "Built deterministic deployment tooling.");
    strict_1.default.equal(compiled.experience[1]?.bullets[0], "Designed bounded agent controls.");
});
(0, node_test_1.default)("unmatched experience proposals fail closed by preserving source bullets", () => {
    const incompatible = {
        ...tailored,
        tailoredExperience: [
            {
                company: "Example Systems",
                title: "Wrong title",
                bullets: tailored.tailoredExperience[0].bullets,
            },
        ],
    };
    const compiled = (0, application_compiler_1.materializeTailoredResume)(source, incompatible);
    strict_1.default.deepEqual(compiled.experience[0]?.bullets, source.experience[0]?.bullets);
});
(0, node_test_1.default)("change summary is explicit and bounded", () => {
    const compiled = (0, application_compiler_1.materializeTailoredResume)(source, tailored);
    const changes = (0, application_compiler_1.summarizeChanges)(source, compiled);
    strict_1.default.equal(changes.summaryChanged, true);
    strict_1.default.deepEqual(changes.skillsAdded, ["Agent Systems"]);
    strict_1.default.deepEqual(changes.skillsRemoved, []);
    strict_1.default.equal(changes.experienceBulletsChanged.length, 1);
    strict_1.default.equal(changes.experienceBulletsChanged[0]?.index, 0);
});
(0, node_test_1.default)("application compiler emits complete ATS, JSON, and printable HTML artifacts", () => {
    const result = (0, application_compiler_1.compileApplicationArtifacts)(source, target, tailored, "2026-08-09T12:00:00.000Z");
    strict_1.default.equal(result.artifacts.length, 3);
    strict_1.default.deepEqual(result.artifacts.map((artifact) => artifact.kind), ["ats", "json", "html"]);
    strict_1.default.equal(result.boundary.pdfGenerated, false);
    strict_1.default.equal(result.boundary.externalSubmissionPerformed, false);
    const ats = result.artifacts.find((artifact) => artifact.kind === "ats");
    strict_1.default.ok(ats?.content.includes("Built deterministic agent workflows."));
    strict_1.default.ok(ats?.content.includes("Example University"));
    strict_1.default.ok(ats?.content.includes("Example Certification"));
    const jsonArtifact = result.artifacts.find((artifact) => artifact.kind === "json");
    const manifest = JSON.parse(jsonArtifact?.content ?? "null");
    strict_1.default.equal(manifest.sourceResume.contact.name, "Casey <Barton>");
    strict_1.default.equal(manifest.compiledResume.skills.at(-1), "Agent Systems");
    strict_1.default.equal(manifest.changes.experienceBulletsChanged.length, 1);
    const html = result.artifacts.find((artifact) => artifact.kind === "html");
    strict_1.default.ok(html?.content.includes("Casey &lt;Barton&gt;"));
    strict_1.default.ok(html?.content.includes("Example University"));
    strict_1.default.ok(html?.content.includes("Systems Engineering"));
    strict_1.default.ok(html?.content.includes("Example Certification"));
    strict_1.default.ok(html?.content.includes("Example Institute"));
    strict_1.default.ok(html?.content.includes("Technologies:"));
    strict_1.default.ok(html?.content.includes("Python"));
    strict_1.default.ok(!html?.content.includes("<script>"));
});
(0, node_test_1.default)("ATS output is deterministic for the same materialized resume", () => {
    const resume = (0, application_compiler_1.materializeTailoredResume)(source, tailored);
    strict_1.default.equal((0, application_compiler_1.renderAtsText)(resume), (0, application_compiler_1.renderAtsText)(resume));
    strict_1.default.ok((0, application_compiler_1.renderAtsText)(resume).endsWith("\n"));
});
