"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const jd_keywords_1 = require("../lib/jd-keywords");
const JD = `Senior Business Process Automation Expert
Massive — Remote (US)

Requirements:
- Personally built the same kind of workflow dozens to 100+ times in n8n, Zapier, or Make
- Production experience with PostgreSQL and CI/CD
- 5+ years of experience building automation

Preferred:
- LangGraph experience is a plus
- Python scripting

Responsibilities:
- Build n8n automation workflows for invoice processing and lead routing
- Dissect AI attempts at these workflows with researchers
`;
(0, node_test_1.describe)("extractJdKeywords", () => {
    (0, node_test_1.it)("detects the job title from the first lines", () => {
        const profile = (0, jd_keywords_1.extractJdKeywords)(JD);
        strict_1.default.match(profile.jobTitle, /Senior Business Process Automation Expert/i);
    });
    (0, node_test_1.it)("tiers lexicon terms by the JD's own section cues", () => {
        const profile = (0, jd_keywords_1.extractJdKeywords)(JD);
        const byTerm = new Map(profile.keywords.map((kw) => [kw.term.toLowerCase(), kw.tier]));
        strict_1.default.equal(byTerm.get("n8n"), "required");
        strict_1.default.equal(byTerm.get("postgresql"), "required");
        strict_1.default.equal(byTerm.get("ci/cd"), "required");
        strict_1.default.equal(byTerm.get("langgraph"), "preferred");
        strict_1.default.equal(byTerm.get("python"), "preferred");
    });
    (0, node_test_1.it)("extracts years-of-experience signals", () => {
        const profile = (0, jd_keywords_1.extractJdKeywords)(JD);
        strict_1.default.ok(profile.yearsOfExperience.some((y) => /5\+?\s*years/i.test(y)));
    });
    (0, node_test_1.it)("promotes title terms to required tier", () => {
        const profile = (0, jd_keywords_1.extractJdKeywords)("Junior Python Developer\n\nWe need Python help.");
        const python = profile.keywords.find((kw) => kw.term.toLowerCase() === "python");
        strict_1.default.equal(python?.tier, "required");
        strict_1.default.ok(python?.sources.includes("title"));
    });
    (0, node_test_1.it)("returns empty keywords for empty input without throwing", () => {
        const profile = (0, jd_keywords_1.extractJdKeywords)("");
        strict_1.default.equal(profile.keywords.length, 0);
        strict_1.default.equal(profile.jobTitle, "");
    });
});
