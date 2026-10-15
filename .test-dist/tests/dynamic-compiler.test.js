"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const dynamic_generator_1 = require("../services/dynamic-generator");
const dynamic_compiler_1 = require("../lib/dynamic-compiler");
const application_compiler_1 = require("../lib/application-compiler");
const JD = `Senior Business Process Automation Expert

Requirements:
- n8n workflow automation
- PostgreSQL
`;
const resume = {
    contact: { name: "Casey Barton", email: "casey@example.test", phone: "", location: "Honolulu, HI", website: "" },
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
(0, node_test_1.describe)("renderImpressiveHtml", () => {
    (0, node_test_1.it)("leads the top third with name, JD headline, and summary", async () => {
        const { jdProfile, tailored } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const { compileApplicationArtifacts } = await Promise.resolve().then(() => __importStar(require("../lib/application-compiler")));
        const base = compileApplicationArtifacts(resume, jdProfile, tailored);
        const html = (0, dynamic_compiler_1.renderImpressiveHtml)(base.resume, jdProfile);
        strict_1.default.ok(html.includes("Casey Barton"));
        strict_1.default.ok(html.includes("Senior Business Process Automation Expert"));
        const heroIndex = html.indexOf("<header");
        const summaryIndex = html.indexOf(">Summary<");
        const skillsIndex = html.indexOf(">Skills<");
        const experienceIndex = html.indexOf(">Experience<");
        strict_1.default.ok(heroIndex < summaryIndex && summaryIndex < skillsIndex && skillsIndex < experienceIndex);
    });
    (0, node_test_1.it)("emphasizes metrics and stays ATS-safe (no tables, single column)", async () => {
        const { jdProfile, tailored } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const { compileApplicationArtifacts } = await Promise.resolve().then(() => __importStar(require("../lib/application-compiler")));
        const base = compileApplicationArtifacts(resume, jdProfile, tailored);
        const html = (0, dynamic_compiler_1.renderImpressiveHtml)(base.resume, jdProfile);
        strict_1.default.ok(html.includes('<strong class="metric">60%</strong>'));
        strict_1.default.ok(!html.includes("<table"));
        strict_1.default.ok(html.includes("<h2>"));
    });
});
(0, node_test_1.describe)("compileDynamicApplication", () => {
    (0, node_test_1.it)("keeps the base artifacts byte-identical and appends dynamic ones", async () => {
        const { jdProfile, tailored, report } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const { compileApplicationArtifacts } = await Promise.resolve().then(() => __importStar(require("../lib/application-compiler")));
        const stamp = "2026-10-15T00:00:00.000Z";
        const base = compileApplicationArtifacts(resume, jdProfile, tailored, stamp);
        const dynamic = (0, dynamic_compiler_1.compileDynamicApplication)(resume, jdProfile, tailored, report, stamp);
        const baseAts = base.artifacts.find((a) => a.kind === "ats")?.content;
        const dynamicAts = dynamic.artifacts.find((a) => a.kind === "ats")?.content;
        strict_1.default.equal(dynamicAts, baseAts);
        strict_1.default.equal((0, application_compiler_1.renderAtsText)(dynamic.resume), baseAts);
        strict_1.default.equal(dynamic.artifacts.find((a) => a.filename.endsWith("-resume.html"))?.content, (0, application_compiler_1.renderPrintableHtml)(dynamic.resume));
        const filenames = dynamic.artifacts.map((a) => a.filename);
        strict_1.default.ok(filenames.some((f) => f.endsWith("-resume-impressive.html")));
        strict_1.default.ok(filenames.some((f) => f.endsWith("-resume-dynamic.json")));
        const manifest = JSON.parse(dynamic.artifacts.find((a) => a.filename.endsWith("-resume-dynamic.json"))?.content ?? "{}");
        strict_1.default.equal(manifest.schema, "glaciereq.dynamic-application-compilation.v1");
        strict_1.default.equal(manifest.dynamicReport.coveragePercent, report.coveragePercent);
        strict_1.default.equal(manifest.boundary.humanReviewRequired, true);
        strict_1.default.equal(manifest.boundary.externalSubmissionPerformed, false);
    });
});
