import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractJdKeywords } from "../lib/jd-keywords";

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

describe("extractJdKeywords", () => {
  it("detects the job title from the first lines", () => {
    const profile = extractJdKeywords(JD);
    assert.match(profile.jobTitle, /Senior Business Process Automation Expert/i);
  });

  it("tiers lexicon terms by the JD's own section cues", () => {
    const profile = extractJdKeywords(JD);
    const byTerm = new Map(profile.keywords.map((kw) => [kw.term.toLowerCase(), kw.tier]));
    assert.equal(byTerm.get("n8n"), "required");
    assert.equal(byTerm.get("postgresql"), "required");
    assert.equal(byTerm.get("ci/cd"), "required");
    assert.equal(byTerm.get("langgraph"), "preferred");
    assert.equal(byTerm.get("python"), "preferred");
  });

  it("extracts years-of-experience signals", () => {
    const profile = extractJdKeywords(JD);
    assert.ok(profile.yearsOfExperience.some((y) => /5\+?\s*years/i.test(y)));
  });

  it("promotes title terms to required tier", () => {
    const profile = extractJdKeywords("Junior Python Developer\n\nWe need Python help.");
    const python = profile.keywords.find((kw) => kw.term.toLowerCase() === "python");
    assert.equal(python?.tier, "required");
    assert.ok(python?.sources.includes("title"));
  });

  it("returns empty keywords for empty input without throwing", () => {
    const profile = extractJdKeywords("");
    assert.equal(profile.keywords.length, 0);
    assert.equal(profile.jobTitle, "");
  });
});
