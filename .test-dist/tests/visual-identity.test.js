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
    contact: {
        name: "Casey Barton",
        email: "casey@example.test",
        phone: "(808) 936-5654",
        location: "Honolulu, HI",
        website: "casey-barton-glaciereq.vercel.app",
        linkedin: "linkedin.com/in/caseybartonai",
    },
    summary: "Automation engineer.",
    skills: ["n8n", "PostgreSQL"],
    experience: [
        {
            company: "Acme Corp",
            title: "Automation Engineer",
            startDate: "2020",
            endDate: "2024",
            bullets: [
                "Built n8n workflows, reducing manual entry time by 60%.",
                "Kept the on-call rotation honest.",
            ],
        },
    ],
    projects: [],
    education: [],
    certifications: [],
};
async function impressive() {
    const { jdProfile, tailored } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
    const { compileApplicationArtifacts } = await Promise.resolve().then(() => __importStar(require("../lib/application-compiler")));
    const base = compileApplicationArtifacts(resume, jdProfile, tailored);
    return (0, dynamic_compiler_1.renderImpressiveHtml)(base.resume, jdProfile);
}
(0, node_test_1.describe)("visual identity — his spec", () => {
    (0, node_test_1.it)("renders the nameplate in Algerian, and Algerian nowhere else", async () => {
        const html = await impressive();
        strict_1.default.ok(html.includes('h1.nameplate{font-family:"Algerian"'));
        // Every non-comment occurrence of Algerian must sit inside the nameplate rule.
        const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
        const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
        const rulesWithAlgerian = cssNoComments
            .split("}")
            .filter((rule) => rule.includes("Algerian"));
        strict_1.default.equal(rulesWithAlgerian.length, 1);
        strict_1.default.ok(rulesWithAlgerian[0].trimStart().startsWith("h1.nameplate{"));
        // Body text and section/entry headings never use it.
        strict_1.default.ok(!/body\{[^}]*Algerian/.test(cssNoComments));
        strict_1.default.ok(!/h2\{[^}]*Algerian/.test(cssNoComments));
        strict_1.default.ok(!/h3\{[^}]*Algerian/.test(cssNoComments));
    });
    (0, node_test_1.it)("uses the emerald/black/white palette with emerald reserved for meaning", async () => {
        const html = await impressive();
        strict_1.default.ok(html.includes("--emerald:#0E6B4A"));
        strict_1.default.ok(html.includes("--ink:#111111"));
        // Section rules and proof marks carry emerald; body text never does.
        strict_1.default.ok(html.includes("li.proven::marker{color:var(--emerald)}"));
        strict_1.default.ok(!/p\.(summary|skills|desc)\{[^}]*var\(--emerald\)/.test(html));
        strict_1.default.ok(!/li\{[^}]*var\(--emerald\)/.test(html.replace("li.proven::marker{color:var(--emerald)}", "")));
    });
    (0, node_test_1.it)("marks quantified bullets as proven (green = proven)", async () => {
        const html = await impressive();
        strict_1.default.ok(html.includes('<li class="proven">'));
        strict_1.default.ok(html.includes('<strong class="metric">60%</strong>'));
        // The unquantified bullet stays unmarked.
        strict_1.default.ok(html.includes("<li>Kept the on-call rotation honest.</li>"));
    });
    (0, node_test_1.it)("arranges contact metadata in a symmetrical framed row with emerald dividers", async () => {
        const html = await impressive();
        strict_1.default.ok(html.includes('class="meta"'));
        for (const item of [
            "casey@example.test",
            "(808) 936-5654",
            "Honolulu, HI",
            "linkedin.com/in/caseybartonai",
            "casey-barton-glaciereq.vercel.app",
        ]) {
            strict_1.default.ok(html.includes(item), `meta missing: ${item}`);
        }
        strict_1.default.ok(html.includes("◆"));
        strict_1.default.ok(html.includes("justify-content:center"));
        strict_1.default.ok(html.includes("border-top:1px solid var(--emerald-tint)"));
    });
    (0, node_test_1.it)("keeps the ATS text export free of font/color/decoration artifacts", async () => {
        const { jdProfile, tailored } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const { compileApplicationArtifacts } = await Promise.resolve().then(() => __importStar(require("../lib/application-compiler")));
        const base = compileApplicationArtifacts(resume, jdProfile, tailored);
        const ats = (0, application_compiler_1.renderAtsText)(base.resume);
        for (const artifact of ["Algerian", "font-family", "color", "#0E6B4A", "◆", "✓", "<", ">", "emerald"]) {
            strict_1.default.ok(!ats.includes(artifact), `ATS leak: ${artifact}`);
        }
        // And the dynamic compilation path carries the same clean ATS artifact.
        const { report } = await (0, dynamic_generator_1.generateDynamicResume)({ jdText: JD, resume });
        const dynamic = (0, dynamic_compiler_1.compileDynamicApplication)(resume, jdProfile, tailored, report);
        const dynamicAts = dynamic.artifacts.find((a) => a.kind === "ats")?.content ?? "";
        strict_1.default.equal(dynamicAts, ats);
    });
});
