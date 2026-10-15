/**
 * Dynamic application compiler.
 *
 * Extends the existing deterministic application compiler (lib/application-compiler.ts)
 * without changing it: the base ATS text, auditable JSON, and printable HTML
 * artifacts are produced exactly as before, then the dynamic path appends
 * presentation-grade artifacts.
 *
 * - renderImpressiveHtml: top-third optimized render. Role-aligned headline,
 *   value-led summary, JD-ordered skills, metric-emphasized bullets, subtle
 *   accent color. Still single-column, standard headings, no tables, no
 *   graphics: ATS-safe by construction (research: 75% of resumes die in the
 *   ATS; visual polish must never break the parser).
 * - compileDynamicApplication: base compilation + impressive HTML + the
 *   dynamic generation report embedded in the manifest. DOCX is produced by
 *   the CLI stage (tools/generate_docx.py, stdlib only) from the manifest.
 */

import {
  compileApplicationArtifacts,
  type ApplicationCompilation,
  type CompiledArtifact,
} from "./application-compiler";
import type {
  DynamicReport,
} from "../services/dynamic-generator";
import type {
  JobDescriptionProfile,
  ResumeProfile,
  TailoredResume,
} from "./schemas";

export interface DynamicCompilation extends ApplicationCompilation {
  readonly dynamic: {
    readonly report: DynamicReport;
    readonly impressiveHtmlFilename: string;
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Emphasize numeric claims so quantified outcomes survive the 6-second scan. */
function emphasizeMetrics(text: string): string {
  const pattern =
    /(\$?\d[\d,]*(?:\.\d+)?\s?(?:%|x|\+)?|\b\d+\+?\s?(?:years?|yrs?|months?|days?|hours?)\b|\b\d+(?:\.\d+)?\s?\/\s?5\b)/gi;
  return escapeHtml(text).replace(
    pattern,
    (match) => `<strong class="metric">${match}</strong>`,
  );
}

function safeFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "target-role";
}

/**
 * Presentation-grade HTML render of a tailored resume.
 * Design decisions from the 2026 research pass:
 * - Name + role-aligned headline + contact dominate the top third.
 * - Summary (3-4 lines, value-led) before skills; skills JD-ordered.
 * - Experience bullets with metric emphasis (<strong class="metric">).
 * - Subtle deep-teal accent; generous whitespace; single column.
 * - Standard section headings; no tables/text boxes/columns (ATS-safe).
 */
export function renderImpressiveHtml(
  resume: ResumeProfile,
  jd: JobDescriptionProfile,
): string {
  const headline = jd.jobTitle ? normalize(jd.jobTitle) : normalize(resume.experience[0]?.title ?? "");
  const contactLine = [resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.website]
    .map((value) => normalize(value || ""))
    .filter(Boolean)
    .join(" · ");

  const section = (title: string, body: string) =>
    body ? `<section class="block"><h2>${escapeHtml(title)}</h2>${body}</section>` : "";

  const experience = resume.experience
    .map((entry) => {
      const dates = [entry.startDate, entry.endDate]
        .map((value) => normalize(value || ""))
        .filter(Boolean)
        .join(" – ");
      return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(entry.title)} <span class="at">·</span> ${escapeHtml(entry.company)}</h3>${
        dates ? `<p class="dates">${escapeHtml(dates)}</p>` : ""
      }</div><ul>${entry.bullets
        .map((bullet) => `<li>${emphasizeMetrics(bullet)}</li>`)
        .join("")}</ul></article>`;
    })
    .join("");

  const projects = resume.projects
    .map((entry) => {
      const technologies = entry.technologies.length
        ? `<p class="tech">${entry.technologies.map(escapeHtml).join(" · ")}</p>`
        : "";
      return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(entry.name)}</h3></div>${
        entry.description ? `<p class="desc">${escapeHtml(entry.description)}</p>` : ""
      }<ul>${entry.bullets
        .map((bullet) => `<li>${emphasizeMetrics(bullet)}</li>`)
        .join("")}</ul>${technologies}</article>`;
    })
    .join("");

  const education = resume.education
    .map(
      (entry) => `<article class="entry"><div class="entry-head"><h3>${escapeHtml(entry.institution)}</h3>${
        entry.graduationDate ? `<p class="dates">${escapeHtml(entry.graduationDate)}</p>` : ""
      }</div><p>${escapeHtml(
        [entry.degree, entry.fieldOfStudy].filter(Boolean).join(" · "),
      )}</p></article>`,
    )
    .join("");

  const certifications = resume.certifications.length
    ? `<ul class="certs">${resume.certifications
        .map(
          (entry) => `<li>${escapeHtml(
            [entry.name, entry.issuer, entry.date].filter(Boolean).join(" · "),
          )}</li>`,
        )
        .join("")}</ul>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    resume.contact.name || "Tailored Resume",
  )}${headline ? ` — ${escapeHtml(headline)}` : ""}</title><style>
:root{--accent:#0f766e;--ink:#14201f;--muted:#5b6b6a}
@page{margin:.65in}
body{font:11pt/1.5 "Segoe UI",system-ui,-apple-system,sans-serif;max-width:8in;margin:auto;color:var(--ink);background:#fff}
header.hero{border-bottom:3px solid var(--accent);padding-bottom:10px;margin-bottom:6px}
header.hero h1{font-size:24pt;margin:0;letter-spacing:.5px}
p.headline{font-size:12.5pt;font-weight:600;color:var(--accent);margin:4px 0}
p.contact{font-size:9.5pt;color:var(--muted);margin:2px 0}
section.block{margin-top:14px}
section.block h2{font-size:11pt;text-transform:uppercase;letter-spacing:1.5px;color:var(--accent);border-bottom:1px solid #d7e3e2;padding-bottom:3px;margin:0 0 8px}
p.summary{font-size:10.5pt;margin:0}
p.skills{font-size:10pt;margin:0}
article.entry{margin-bottom:10px}
.entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-head h3{font-size:11pt;margin:8px 0 2px}
.entry-head h3 .at{color:var(--accent)}
p.dates{font-size:9.5pt;color:var(--muted);white-space:nowrap;margin:8px 0 2px}
ul{margin:4px 0 6px;padding-left:20px}
li{margin-bottom:3px}
strong.metric{color:var(--ink)}
p.tech{font-size:9.5pt;color:var(--muted)}
p.desc{font-size:10pt;margin:2px 0}
ul.certs{list-style:none;padding-left:0}
ul.certs li{margin-bottom:2px}
</style></head><body>
<header class="hero"><h1>${escapeHtml(resume.contact.name)}</h1>${
    headline ? `<p class="headline">${escapeHtml(headline)}</p>` : ""
  }<p class="contact">${escapeHtml(contactLine)}</p></header>
${section("Summary", resume.summary ? `<p class="summary">${escapeHtml(resume.summary)}</p>` : "")}
${section("Skills", resume.skills.length ? `<p class="skills">${resume.skills.map(escapeHtml).join(" · ")}</p>` : "")}
${section("Experience", experience)}
${section("Projects", projects)}
${section("Education", education)}
${section("Certifications", certifications)}
</body></html>\n`;
}

export function compileDynamicApplication(
  source: ResumeProfile,
  target: JobDescriptionProfile,
  tailored: TailoredResume,
  report: DynamicReport,
  compiledAt = new Date().toISOString(),
): DynamicCompilation {
  const base = compileApplicationArtifacts(source, target, tailored, compiledAt);

  const slug = safeFilename(`${target.company || "role"}-${target.jobTitle || "target"}`);
  const impressiveHtmlFilename = `${slug}-resume-impressive.html`;
  const impressiveArtifact: CompiledArtifact = {
    kind: "html",
    filename: impressiveHtmlFilename,
    mimeType: "text/html;charset=utf-8",
    content: renderImpressiveHtml(base.resume, target),
  };

  const manifest = {
    schema: "glaciereq.dynamic-application-compilation.v1",
    compiledAt: base.compiledAt,
    target: {
      company: target.company,
      jobTitle: target.jobTitle,
    },
    sourceResume: base.source,
    compiledResume: base.resume,
    changes: base.changes,
    dynamicReport: report,
    boundary: {
      ...base.boundary,
      docxGeneratedByCliStage: true,
      externalSubmissionPerformed: false,
    },
  };

  const jsonArtifact: CompiledArtifact = {
    kind: "json",
    filename: `${slug}-resume-dynamic.json`,
    mimeType: "application/json;charset=utf-8",
    content: `${JSON.stringify(manifest, null, 2)}\n`,
  };

  return {
    ...base,
    artifacts: [...base.artifacts, impressiveArtifact, jsonArtifact],
    dynamic: {
      report,
      impressiveHtmlFilename,
    },
  };
}
