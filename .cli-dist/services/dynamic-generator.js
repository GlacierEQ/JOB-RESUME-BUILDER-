"use strict";
/**
 * Dynamic resume generation orchestrator — JD in, tailored resume out.
 *
 * Deterministic end-to-end path (no model calls, no API key required):
 *
 *   JD text + source ResumeProfile
 *     -> deterministic JD keyword profile (lib/jd-keywords)
 *     -> keyword alignment: coverage score + JD-priority skill order (lib/keyword-align)
 *     -> deterministic bullet strengthening, XYZ form (lib/bullet-strength)
 *     -> JD-aware summary composition from evidence (lib/summary-composer)
 *     -> TailoredResume assembly (same schema the model path emits)
 *     -> deterministic truthfulness guard (lib/truthfulness)
 *     -> Helix evidence boundary guard (lib/helix-boundaries)
 *
 * The output is a TailoredResume in the exact schema the existing pipeline
 * uses, so it flows into the same human side-by-side review and the same
 * deterministic application compiler. The human-review gate is preserved:
 * generated artifacts are marked humanReviewRequired and the CLI writes an
 * explicit review notice. Nothing is ever submitted anywhere.
 *
 * Model note: model-backed tailoring (services/tailoring-engine.ts) remains
 * available behind services/groq.ts, which fail-closes with
 * ModelServiceUnavailableError when GROQ_API_KEY is unset. The dynamic path
 * below never calls the model.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDynamicResume = generateDynamicResume;
const jd_keywords_1 = require("../lib/jd-keywords");
const keyword_align_1 = require("../lib/keyword-align");
const bullet_strength_1 = require("../lib/bullet-strength");
const summary_composer_1 = require("../lib/summary-composer");
const schemas_1 = require("../lib/schemas");
const truthfulness_1 = require("../lib/truthfulness");
const helix_boundaries_1 = require("../lib/helix-boundaries");
const helix_evidence_1 = require("../lib/helix-evidence");
function normalize(value) {
    return value.trim().replace(/\s+/g, " ");
}
function detectSeniority(jdText) {
    const text = jdText.toLowerCase();
    if (/\bprincipal\b/.test(text))
        return "Principal";
    if (/\bstaff\b/.test(text))
        return "Staff";
    if (/\bsenior\b|\bsr\.?\b/.test(text))
        return "Senior";
    if (/\bjunior\b|\bjr\.?\b/.test(text))
        return "Junior";
    if (/\blead\b/.test(text))
        return "Lead";
    return "Mid-Level";
}
/** Split JD text into rough responsibility / qualification lines. */
function sectionLines(jdText, cue) {
    const lines = jdText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const out = [];
    let capture = false;
    for (const line of lines) {
        if (cue.test(line) && line.length < 80) {
            capture = true;
            continue;
        }
        if (/^(requirements?|qualifications?|preferred|nice to have|about|benefits|compensation)\b/i.test(line) && line.length < 80) {
            capture = cue.test(line);
            continue;
        }
        if (capture && line.length > 12)
            out.push(normalize(line).replace(/^[-*•\d.)\s]+/, ""));
        if (out.length >= 25)
            break;
    }
    return out;
}
function rankHelixSystems(jdTerms) {
    const helix = (0, helix_evidence_1.getHelixEvidenceContext)();
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const containsTerm = (haystack, term) => new RegExp(`(?<!\\w)${escapeRegExp(term.toLowerCase())}(?!\\w)`).test(haystack.toLowerCase());
    return helix.systems
        .map((system) => {
        const haystack = `${system.system_id} ${system.role} ${system.evidence}`;
        let jdTermHits = 0;
        for (const term of jdTerms)
            if (containsTerm(haystack, term))
                jdTermHits++;
        return {
            systemId: system.system_id,
            repository: system.repository,
            role: system.role,
            jdTermHits,
        };
    })
        .sort((a, b) => b.jdTermHits - a.jdTermHits);
}
async function generateDynamicResume(input) {
    const { jdText, resume } = input;
    if (!jdText.trim())
        throw new Error("Job description text is empty.");
    const generatedAt = new Date().toISOString();
    // 1. Deterministic JD profile.
    const jdKeywords = (0, jd_keywords_1.extractJdKeywords)(jdText);
    const required = jdKeywords.keywords.filter((kw) => kw.tier === "required");
    const preferred = jdKeywords.keywords.filter((kw) => kw.tier === "preferred");
    const jdProfile = {
        jobTitle: jdKeywords.jobTitle,
        company: "",
        requiredSkills: required.map((kw) => kw.term),
        preferredSkills: preferred.map((kw) => kw.term),
        responsibilities: sectionLines(jdText, /\b(responsibilit|what you('ll| will) do|you will)\b/i),
        qualifications: sectionLines(jdText, /\b(qualifications?|requirements?|must have|you have)\b/i),
        tools: jdKeywords.keywords
            .filter((kw) => /^(Python|TypeScript|JavaScript|Go|Java|Rust|SQL|React|Next\.js|Node\.js|n8n|Zapier|Make|Workato|UiPath|Power Automate|AWS|GCP|Azure|Docker|Kubernetes|Terraform|PostgreSQL|MySQL|Redis|LangGraph|CrewAI|MCP)$/i.test(kw.term))
            .map((kw) => kw.term),
        keywords: jdKeywords.keywords.map((kw) => kw.term),
        seniorityLevel: detectSeniority(jdText),
        domainSignals: jdKeywords.keywords
            .filter((kw) => kw.tier !== "general")
            .slice(0, 10)
            .map((kw) => kw.term),
    };
    // 2. Keyword alignment: coverage + JD-priority skill order (source skills only).
    const alignment = (0, keyword_align_1.alignKeywords)(resume, jdKeywords.keywords);
    const jdTerms = jdKeywords.keywords.map((kw) => kw.term);
    // 3. Bullet strengthening per experience entry (order and count preserved).
    const strengthenedEntries = resume.experience.map((entry) => (0, bullet_strength_1.strengthenBullets)(entry.bullets, jdTerms));
    const tailoredExperience = resume.experience.map((entry, entryIndex) => {
        const strengthened = strengthenedEntries[entryIndex] ?? [];
        return {
            company: entry.company,
            title: entry.title,
            bullets: strengthened.map((bullet) => ({
                original: bullet.original,
                tailored: bullet.tailored,
                changeReason: bullet.changeReason,
                keywordsAddressed: [...bullet.keywordsAddressed],
                confidence: bullet.confidence,
            })),
        };
    });
    // 4. JD-aware summary from evidence.
    const composed = (0, summary_composer_1.composeSummary)(resume, jdKeywords.jobTitle, jdKeywords.keywords);
    let tailored = schemas_1.TailoredResumeSchema.parse({
        tailoredSummary: composed.summary,
        tailoredSkills: [...alignment.reorderedSkills],
        tailoredExperience,
    });
    // 5. Deterministic guards. Truthfulness first; then Helix boundaries.
    //    If the composed summary trips a Helix boundary (e.g. newly promoting a
    //    REFERENCE_ONLY system term into the summary), fall back to the source
    //    summary rather than weakening the guard.
    (0, truthfulness_1.assertTruthfulTailoring)(resume, tailored);
    const helix = (0, helix_evidence_1.getHelixEvidenceContext)();
    let summaryFellBackToSource = false;
    try {
        (0, helix_boundaries_1.assertHelixBoundaries)(resume, tailored, helix);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/tailoredSummary|REFERENCE_ONLY_SUMMARY_PROMOTION/.test(message)) {
            summaryFellBackToSource = true;
            tailored = schemas_1.TailoredResumeSchema.parse({
                ...tailored,
                tailoredSummary: resume.summary,
            });
            (0, truthfulness_1.assertTruthfulTailoring)(resume, tailored);
            (0, helix_boundaries_1.assertHelixBoundaries)(resume, tailored, helix);
        }
        else {
            throw error;
        }
    }
    const bulletsTotal = tailoredExperience.reduce((count, entry) => count + entry.bullets.length, 0);
    const bulletsStrengthened = tailoredExperience.reduce((count, entry) => count + entry.bullets.filter((b) => b.tailored !== b.original).length, 0);
    const rulesApplied = [
        ...new Set(strengthenedEntries.flatMap((bullets) => bullets.flatMap((b) => (b.tailored !== b.original ? b.appliedRules : [])))),
    ];
    const report = {
        generatedAt,
        deterministic: true,
        modelUsed: false,
        jdTitle: jdKeywords.jobTitle,
        keywordCount: jdKeywords.keywords.length,
        requiredKeywordCount: required.length,
        coveragePercent: alignment.coveragePercent,
        coverageBand: alignment.band,
        missingRequiredTerms: alignment.missing
            .filter((m) => m.tier === "required")
            .map((m) => m.term),
        bulletsStrengthened,
        bulletsTotal,
        rulesApplied,
        skillsReordered: alignment.skillsReordered,
        summaryComposed: !summaryFellBackToSource,
        summaryFellBackToSource,
        rankedHelixSystems: rankHelixSystems(jdTerms).slice(0, 10),
    };
    return { jdProfile, tailored, report };
}
