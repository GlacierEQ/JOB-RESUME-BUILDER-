import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDynamicResume } from "../services/dynamic-generator";
import {
  compileDynamicApplication,
  renderImpressiveHtml,
} from "../lib/dynamic-compiler";
import { renderAtsText } from "../lib/application-compiler";
import type { ResumeProfile } from "../lib/schemas";

const JD = `Senior Business Process Automation Expert

Requirements:
- n8n workflow automation
- PostgreSQL
`;

const resume: ResumeProfile = {
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

async function impressive(): Promise<string> {
  const { jdProfile, tailored } = await generateDynamicResume({ jdText: JD, resume });
  const { compileApplicationArtifacts } = await import("../lib/application-compiler");
  const base = compileApplicationArtifacts(resume, jdProfile, tailored);
  return renderImpressiveHtml(base.resume, jdProfile);
}

describe("visual identity — his spec", () => {
  it("renders the nameplate in Algerian, and Algerian nowhere else", async () => {
    const html = await impressive();
    assert.ok(html.includes('h1.nameplate{font-family:"Algerian"'));
    // Every non-comment occurrence of Algerian must sit inside the nameplate rule.
    const css = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
    const cssNoComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const rulesWithAlgerian = cssNoComments
      .split("}")
      .filter((rule) => rule.includes("Algerian"));
    assert.equal(rulesWithAlgerian.length, 1);
    assert.ok(rulesWithAlgerian[0].trimStart().startsWith("h1.nameplate{"));
    // Body text and section/entry headings never use it.
    assert.ok(!/body\{[^}]*Algerian/.test(cssNoComments));
    assert.ok(!/h2\{[^}]*Algerian/.test(cssNoComments));
    assert.ok(!/h3\{[^}]*Algerian/.test(cssNoComments));
  });

  it("uses the emerald/black/white palette with emerald reserved for meaning", async () => {
    const html = await impressive();
    assert.ok(html.includes("--emerald:#0E6B4A"));
    assert.ok(html.includes("--ink:#111111"));
    // Section rules and proof marks carry emerald; body text never does.
    assert.ok(html.includes("li.proven::marker{color:var(--emerald)}"));
    assert.ok(!/p\.(summary|skills|desc)\{[^}]*var\(--emerald\)/.test(html));
    assert.ok(!/li\{[^}]*var\(--emerald\)/.test(html.replace("li.proven::marker{color:var(--emerald)}", "")));
  });

  it("marks quantified bullets as proven (green = proven)", async () => {
    const html = await impressive();
    assert.ok(html.includes('<li class="proven">'));
    assert.ok(html.includes('<strong class="metric">60%</strong>'));
    // The unquantified bullet stays unmarked.
    assert.ok(html.includes("<li>Kept the on-call rotation honest.</li>"));
  });

  it("arranges contact metadata in a symmetrical framed row with emerald dividers", async () => {
    const html = await impressive();
    assert.ok(html.includes('class="meta"'));
    for (const item of [
      "casey@example.test",
      "(808) 936-5654",
      "Honolulu, HI",
      "linkedin.com/in/caseybartonai",
      "casey-barton-glaciereq.vercel.app",
    ]) {
      assert.ok(html.includes(item), `meta missing: ${item}`);
    }
    assert.ok(html.includes("◆"));
    assert.ok(html.includes("justify-content:center"));
    assert.ok(html.includes("border-top:1px solid var(--emerald-tint)"));
  });

  it("keeps the ATS text export free of font/color/decoration artifacts", async () => {
    const { jdProfile, tailored } = await generateDynamicResume({ jdText: JD, resume });
    const { compileApplicationArtifacts } = await import("../lib/application-compiler");
    const base = compileApplicationArtifacts(resume, jdProfile, tailored);
    const ats = renderAtsText(base.resume);
    for (const artifact of ["Algerian", "font-family", "color", "#0E6B4A", "◆", "✓", "<", ">", "emerald"]) {
      assert.ok(!ats.includes(artifact), `ATS leak: ${artifact}`);
    }
    // And the dynamic compilation path carries the same clean ATS artifact.
    const { report } = await generateDynamicResume({ jdText: JD, resume });
    const dynamic = compileDynamicApplication(resume, jdProfile, tailored, report);
    const dynamicAts = dynamic.artifacts.find((a) => a.kind === "ats")?.content ?? "";
    assert.equal(dynamicAts, ats);
  });
});
