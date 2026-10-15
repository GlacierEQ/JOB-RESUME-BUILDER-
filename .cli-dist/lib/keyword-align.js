"use strict";
/**
 * Deterministic JD↔resume keyword alignment.
 *
 * Computes keyword coverage (the "match check" recruiters and tools like
 * Jobscan perform), assigns the rough interpretation band, and produces a
 * JD-priority skill ordering drawn ONLY from skills already on the source
 * resume. Nothing is ever added; reordering is the emphasis lever.
 *
 * Truth boundary: alignment ranks and reorders. It never invents a skill.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.coverageBandFor = coverageBandFor;
exports.alignKeywords = alignKeywords;
function normalize(value) {
    return value.toLowerCase().replace(/[^a-z0-9+#./]+/g, " ").trim().replace(/\s+/g, " ");
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function termIn(haystack, term) {
    return new RegExp(`(?<!\\w)${escapeRegExp(normalize(term))}(?!\\w)`).test(normalize(haystack));
}
function buildSections(resume) {
    return [
        { label: "summary", text: resume.summary },
        { label: "skills", text: resume.skills.join(" ") },
        {
            label: "experience",
            text: resume.experience
                .map((e) => `${e.title} ${e.company} ${e.bullets.join(" ")}`)
                .join(" "),
        },
        {
            label: "projects",
            text: resume.projects
                .map((p) => `${p.name} ${p.description} ${p.bullets.join(" ")} ${p.technologies.join(" ")}`)
                .join(" "),
        },
        {
            label: "education",
            text: resume.education
                .map((e) => `${e.institution} ${e.degree} ${e.fieldOfStudy}`)
                .join(" "),
        },
        {
            label: "certifications",
            text: resume.certifications.map((c) => `${c.name} ${c.issuer}`).join(" "),
        },
    ];
}
function coverageBandFor(percent) {
    if (percent < 50)
        return {
            band: "major-gaps",
            guidance: "Major keyword gaps between resume and posting. Heavy tailoring needed, or this role may not be a strong fit.",
        };
    if (percent < 70)
        return {
            band: "competitive",
            guidance: "Competitive but gaps remain in key areas. Targeted swaps in summary, skills, and 2-3 bullets.",
        };
    if (percent < 85)
        return {
            band: "strong",
            guidance: "Strong alignment with the posting. Minor adjustments to close remaining gaps.",
        };
    return {
        band: "excellent",
        guidance: "Excellent alignment. Minimal changes needed; focus on the human reader.",
    };
}
const TIER_RANK = { required: 0, preferred: 1, general: 2 };
/** Highest tier at which any JD keyword matches this skill, or null. */
function skillTier(skill, keywords) {
    let best = null;
    for (const kw of keywords) {
        if (termIn(skill, kw.term) || termIn(kw.term, skill)) {
            if (best === null || TIER_RANK[kw.tier] < TIER_RANK[best])
                best = kw.tier;
        }
    }
    return best;
}
function alignKeywords(resume, keywords) {
    const sections = buildSections(resume);
    const coverage = keywords.map((kw) => {
        const evidence = sections
            .filter((section) => termIn(section.text, kw.term))
            .map((section) => section.label);
        return { term: kw.term, tier: kw.tier, covered: evidence.length > 0, evidence };
    });
    const covered = coverage.filter((c) => c.covered);
    const missing = coverage.filter((c) => !c.covered);
    const coveragePercent = coverage.length === 0 ? 0 : Math.round((covered.length / coverage.length) * 100);
    const { band, guidance } = coverageBandFor(coveragePercent);
    const indexed = resume.skills.map((skill, index) => ({ skill, index }));
    const reordered = [...indexed].sort((a, b) => {
        const tierA = skillTier(a.skill, keywords);
        const tierB = skillTier(b.skill, keywords);
        const rankA = tierA === null ? 3 : TIER_RANK[tierA];
        const rankB = tierB === null ? 3 : TIER_RANK[tierB];
        if (rankA !== rankB)
            return rankA - rankB;
        return a.index - b.index;
    });
    const reorderedSkills = reordered.map((entry) => entry.skill);
    const skillsReordered = reorderedSkills.some((skill, index) => skill !== resume.skills[index]);
    return {
        coveragePercent,
        band,
        bandGuidance: guidance,
        covered,
        missing,
        reorderedSkills,
        skillsReordered,
    };
}
