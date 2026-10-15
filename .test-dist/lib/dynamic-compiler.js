"use strict";
/**
 * Dynamic application compiler.
 *
 * Extends the existing deterministic application compiler (lib/application-compiler.ts)
 * without changing it: the base ATS text, auditable JSON, and printable HTML
 * artifacts are produced exactly as before, then the dynamic path appends
 * presentation-grade artifacts.
 *
 * - renderImpressiveHtml: top-third optimized render. Role-aligned headline,
 *   value-led summary, JD-ordered skills, metric-emphasized bullets.
 *
 * VISUAL IDENTITY (his spec, implemented faithfully):
 * - MASTHEAD: candidate name in Algerian — and ONLY the nameplate. Never body
 *   text, never section headings (readability + taste). Font stack degrades
 *   gracefully on systems without Algerian installed:
 *     "Algerian","Algerian Regular" (Windows)
 *     -> "Engravers MT","Copperplate Gothic Bold" (macOS display faces)
 *     -> "Palatino Linotype","Book Antiqua",Georgia,serif
 * - PALETTE: emerald #0E6B4A accent, black #111111 primary text, white ground.
 *   Emerald is reserved for accents with meaning: section rules, proof marks
 *   (green = proven — his proposed/executed/verified brand language), contact
 *   dividers. Never green body text (contrast/accessibility).
 * - SYMMETRICAL METADATA HEADER: contact metadata (email, phone, location,
 *   LinkedIn, portfolio) in a balanced centered row under the masthead,
 *   framed by subtle emerald rules, items divided by emerald diamonds.
 * - PARSER-SAFETY: this is the visual layer only. ATS text / JSON / base HTML
 *   are untouched and parser-clean; tests assert the ATS export carries zero
 *   font/color/decoration artifacts.
 * - compileDynamicApplication: base compilation + impressive HTML + the
 *   dynamic generation report embedded in the manifest. DOCX is produced by
 *   the CLI stage (tools/generate_docx.py, stdlib only) from the manifest.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderImpressiveHtml = renderImpressiveHtml;
exports.compileDynamicApplication = compileDynamicApplication;
const application_compiler_1 = require("./application-compiler");
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}
function normalize(value) {
    return value.trim().replace(/\s+/g, " ");
}
const METRIC_PATTERN = /(\$?\d[\d,]*(?:\.\d+)?\s?(?:%|x|\+)?|\b\d+\+?\s?(?:years?|yrs?|months?|days?|hours?)\b|\b\d+(?:\.\d+)?\s?\/\s?5\b)/gi;
/** True when a bullet carries a quantified claim — those get the proof mark. */
function hasMetric(text) {
    METRIC_PATTERN.lastIndex = 0;
    return METRIC_PATTERN.test(text);
}
/** Emphasize numeric claims so quantified outcomes survive the 6-second scan. */
function emphasizeMetrics(text) {
    METRIC_PATTERN.lastIndex = 0;
    return escapeHtml(text).replace(METRIC_PATTERN, (match) => `<strong class="metric">${match}</strong>`);
}
function safeFilename(value) {
    const normalized = value
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return normalized || "target-role";
}
/**
 * Presentation-grade HTML render of a tailored resume — his visual identity.
 * - Masthead: name in Algerian (nameplate only), role headline, symmetrical
 *   contact metadata framed by emerald rules with emerald diamond dividers.
 * - Palette: emerald #0E6B4A accents, black #111111 text, white ground.
 * - Proof marks: quantified bullets get emerald markers (green = proven).
 * - Summary (3-4 lines, value-led) before skills; skills JD-ordered.
 * - Single column, standard headings, no tables/text boxes (ATS-safe).
 */
function renderImpressiveHtml(resume, jd) {
    const headline = jd.jobTitle ? normalize(jd.jobTitle) : normalize(resume.experience[0]?.title ?? "");
    /** Prettify a contact value for the symmetrical metadata row (strip protocol). */
    const displayContact = (value) => normalize(value).replace(/^https?:\/\/(www\.)?/i, "");
    const metaItems = [
        resume.contact.email,
        resume.contact.phone,
        resume.contact.location,
        resume.contact.linkedin,
        resume.contact.website,
    ]
        .map((value) => displayContact(value || ""))
        .filter(Boolean)
        .map((value) => `<span class="item">${escapeHtml(value)}</span>`)
        .join(`<span class="sep" aria-hidden="true">◆</span>`);
    const metaBlock = metaItems
        ? `<div class="meta" role="presentation">${metaItems}</div>`
        : "";
    const bullet = (text) => hasMetric(text)
        ? `<li class="proven">${emphasizeMetrics(text)}</li>`
        : `<li>${emphasizeMetrics(text)}</li>`;
    const section = (title, body) => body ? `<section class="block"><h2>${escapeHtml(title)}</h2>${body}</section>` : "";
    const experience = resume.experience
        .map((entry) => {
        const dates = [entry.startDate, entry.endDate]
            .map((value) => normalize(value || ""))
            .filter(Boolean)
            .join(" – ");
        return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(entry.title)} <span class="at">·</span> ${escapeHtml(entry.company)}</h3>${dates ? `<p class="dates">${escapeHtml(dates)}</p>` : ""}</div><ul>${entry.bullets
            .map((b) => bullet(b))
            .join("")}</ul></article>`;
    })
        .join("");
    const projects = resume.projects
        .map((entry) => {
        const technologies = entry.technologies.length
            ? `<p class="tech">${entry.technologies.map(escapeHtml).join(" · ")}</p>`
            : "";
        return `<article class="entry"><div class="entry-head"><h3>${escapeHtml(entry.name)}</h3></div>${entry.description ? `<p class="desc">${escapeHtml(entry.description)}</p>` : ""}<ul>${entry.bullets
            .map((b) => bullet(b))
            .join("")}</ul>${technologies}</article>`;
    })
        .join("");
    const education = resume.education
        .map((entry) => `<article class="entry"><div class="entry-head"><h3>${escapeHtml(entry.institution)}</h3>${entry.graduationDate ? `<p class="dates">${escapeHtml(entry.graduationDate)}</p>` : ""}</div><p>${escapeHtml([entry.degree, entry.fieldOfStudy].filter(Boolean).join(" · "))}</p></article>`)
        .join("");
    const certifications = resume.certifications.length
        ? `<ul class="certs">${resume.certifications
            .map((entry) => `<li>${escapeHtml([entry.name, entry.issuer, entry.date].filter(Boolean).join(" · "))}</li>`)
            .join("")}</ul>`
        : "";
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(resume.contact.name || "Tailored Resume")}${headline ? ` — ${escapeHtml(headline)}` : ""}</title><style>
/* ---- Visual identity: his spec ----
   EMERALD #0E6B4A = accents with meaning (rules, proof marks, dividers).
   BLACK #111111 = primary text. WHITE = ground. Never green body text.
   ALGERIAN = nameplate only. Stack degrades gracefully where Algerian is
   absent: Windows ("Algerian","Algerian Regular") -> macOS display faces
   ("Engravers MT","Copperplate Gothic Bold") -> classical serif fallbacks. */
:root{--emerald:#0E6B4A;--emerald-deep:#0A4F37;--emerald-tint:#D8EBE1;--ink:#111111;--muted:#3f3f3f;--paper:#FFFFFF}
@page{margin:.65in}
body{font:11pt/1.5 "Segoe UI",system-ui,-apple-system,sans-serif;max-width:8in;margin:auto;color:var(--ink);background:var(--paper)}
header.hero{border-bottom:3px solid var(--emerald);padding-bottom:10px;margin-bottom:0;text-align:center}
h1.nameplate{font-family:"Algerian","Algerian Regular","Engravers MT","Copperplate Gothic Bold","Palatino Linotype","Book Antiqua",Georgia,serif;font-size:30pt;font-weight:400;margin:0;letter-spacing:1px;color:var(--ink)}
p.headline{font-size:12.5pt;font-weight:600;color:var(--ink);margin:6px 0 2px}
.meta{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;margin:8px 0 4px;padding:7px 4px;border-top:1px solid var(--emerald-tint);border-bottom:1px solid var(--emerald-tint);font-size:9.5pt;color:var(--muted)}
.meta .item{padding:0 12px;white-space:nowrap}
.meta .sep{color:var(--emerald);font-size:8pt}
section.block{margin-top:14px}
section.block h2{font-size:11pt;text-transform:uppercase;letter-spacing:1.5px;color:var(--emerald-deep);border-bottom:2px solid var(--emerald);padding-bottom:3px;margin:0 0 8px}
p.summary{font-size:10.5pt;margin:0}
p.skills{font-size:10pt;margin:0}
article.entry{margin-bottom:10px}
.entry-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.entry-head h3{font-size:11pt;margin:8px 0 2px}
.entry-head h3 .at{color:var(--emerald)}
p.dates{font-size:9.5pt;color:var(--muted);white-space:nowrap;margin:8px 0 2px}
ul{margin:4px 0 6px;padding-left:20px}
li{margin-bottom:3px}
li.proven::marker{color:var(--emerald)}
strong.metric{color:var(--ink)}
p.tech{font-size:9.5pt;color:var(--muted)}
p.desc{font-size:10pt;margin:2px 0}
ul.certs{list-style:none;padding-left:0}
ul.certs li{margin-bottom:2px}
</style></head><body>
<header class="hero"><h1 class="nameplate">${escapeHtml(resume.contact.name)}</h1>${headline ? `<p class="headline">${escapeHtml(headline)}</p>` : ""}${metaBlock}</header>
${section("Summary", resume.summary ? `<p class="summary">${escapeHtml(resume.summary)}</p>` : "")}
${section("Skills", resume.skills.length ? `<p class="skills">${resume.skills.map(escapeHtml).join(" · ")}</p>` : "")}
${section("Experience", experience)}
${section("Projects", projects)}
${section("Education", education)}
${section("Certifications", certifications)}
</body></html>\n`;
}
function compileDynamicApplication(source, target, tailored, report, compiledAt = new Date().toISOString()) {
    const base = (0, application_compiler_1.compileApplicationArtifacts)(source, target, tailored, compiledAt);
    const slug = safeFilename(`${target.company || "role"}-${target.jobTitle || "target"}`);
    const impressiveHtmlFilename = `${slug}-resume-impressive.html`;
    const impressiveArtifact = {
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
    const jsonArtifact = {
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
