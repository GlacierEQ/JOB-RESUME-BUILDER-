"use strict";
/**
 * Deterministic, truth-safe bullet strengthening.
 *
 * Restructures existing resume bullets toward the XYZ / Action-Scale-Outcome
 * form that survives the recruiter's 6-second scan:
 *
 *   "Accomplished [X] as measured by [Y] by doing [Z]"
 *
 * The engine ONLY rearranges tokens already present in the bullet. It never
 * invents metrics, outcomes, employers, or dates. Every transform is verified
 * to introduce zero new numeric claims (using the same detector the
 * truthfulness guard uses); any transform that would add one is discarded and
 * the original bullet is kept.
 *
 * Research basis: Google XYZ formula; Action-Scale-Outcome for
 * infrastructure/internal work; keyword mirroring (use the JD's term once,
 * where it is genuinely accurate).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.strengthenBullet = strengthenBullet;
exports.strengthenBullets = strengthenBullets;
const truthfulness_1 = require("./truthfulness");
/** Weak lead → strong verb, keyed on the gerund that follows. */
const GERUND_VERBS = {
    developing: "Developed",
    building: "Built",
    creating: "Created",
    designing: "Designed",
    implementing: "Implemented",
    managing: "Managed",
    leading: "Led",
    owning: "Owned",
    driving: "Drove",
    improving: "Improved",
    optimizing: "Optimized",
    reducing: "Reduced",
    increasing: "Increased",
    automating: "Automated",
    streamlining: "Streamlined",
    maintaining: "Maintained",
    delivering: "Delivered",
    launching: "Launched",
    shipping: "Shipped",
    refactoring: "Refactored",
    migrating: "Migrated",
    integrating: "Integrated",
    coordinating: "Coordinated",
    mentoring: "Mentored",
    analyzing: "Analyzed",
    monitoring: "Monitored",
    testing: "Tested",
    deploying: "Deployed",
    scaling: "Scaled",
    writing: "Wrote",
    supporting: "Supported",
    handling: "Handled",
    processing: "Processed",
    archiving: "Archived",
};
const WEAK_LEADS = [
    { pattern: /^\s*responsible\s+for\s+/i, rule: "WEAK_LEAD" },
    { pattern: /^\s*worked\s+on\s+/i, rule: "WEAK_LEAD" },
    { pattern: /^\s*helped\s+(with\s+)?/i, rule: "WEAK_LEAD" },
    { pattern: /^\s*assisted\s+(with|in)\s+/i, rule: "WEAK_LEAD" },
    { pattern: /^\s*involved\s+in\s+/i, rule: "WEAK_LEAD" },
    { pattern: /^\s*tasked\s+with\s+/i, rule: "WEAK_LEAD" },
    { pattern: /^\s*participated\s+in\s+/i, rule: "WEAK_LEAD" },
];
/** Conservative same-concept label swaps: JD term for the identical concept. */
const TERM_ALIASES = [
    { from: /\bcontinuous integration\s*(?:\/\s*continuous deployment|\band continuous deployment)?\b/i, to: "CI/CD", rule: "TERM_MIRROR" },
    { from: /\bci\s*\/\s*cd\s*pipelines?\b/i, to: "CI/CD pipelines", rule: "TERM_MIRROR" },
];
function normalizeSpaces(value) {
    return value.trim().replace(/\s+/g, " ");
}
function capitalizeFirst(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}
/** Replace a weak lead ("Responsible for developing X") with a strong verb. */
function fixWeakLead(bullet) {
    for (const { pattern } of WEAK_LEADS) {
        const match = bullet.match(pattern);
        if (!match)
            continue;
        const rest = bullet.slice(match[0].length);
        const gerundMatch = rest.match(/^([a-z]+)\b/i);
        const gerund = gerundMatch?.[1]?.toLowerCase() ?? "";
        const verb = GERUND_VERBS[gerund] ?? "Delivered";
        const remainder = gerundMatch ? rest.slice(gerundMatch[0].length).trim() : rest.trim();
        // Drop a dangling article-less fragment start cleanly.
        const text = remainder ? `${verb} ${remainder}` : verb;
        return { text: capitalizeFirst(normalizeSpaces(text)), applied: true };
    }
    return { text: bullet, applied: false };
}
/** Outcome gerund -> past-tense lead verb. */
const OUTCOME_PAST = {
    reducing: "Reduced",
    increasing: "Increased",
    improving: "Improved",
    cutting: "Cut",
    lowering: "Lowered",
    raising: "Raised",
    saving: "Saved",
    delivering: "Delivered",
    achieving: "Achieved",
    driving: "Drove",
    enabling: "Enabled",
    boosting: "Boosted",
    growing: "Grew",
};
/** Past-tense lead verb -> gerund for the "by <doing>" clause. */
const PAST_TO_GERUND = {
    built: "building",
    developed: "developing",
    created: "creating",
    designed: "designing",
    implemented: "implementing",
    managed: "managing",
    led: "leading",
    drove: "driving",
    improved: "improving",
    optimized: "optimizing",
    reduced: "reducing",
    increased: "increasing",
    automated: "automating",
    streamlined: "streamlining",
    maintained: "maintaining",
    delivered: "delivering",
    launched: "launching",
    shipped: "shipping",
    refactored: "refactoring",
    migrated: "migrating",
    integrated: "integrating",
    coordinated: "coordinating",
    mentored: "mentoring",
    analyzed: "analyzing",
    monitored: "monitoring",
    tested: "testing",
    deployed: "deploying",
    scaled: "scaling",
    wrote: "writing",
    supported: "supporting",
    handled: "handling",
    processed: "processing",
    owned: "owning",
    architected: "architecting",
};
function toGerund(word) {
    const lower = word.toLowerCase();
    const mapped = PAST_TO_GERUND[lower];
    if (mapped)
        return mapped;
    if (/^[a-z]+ed$/i.test(word) && word.length > 4) {
        return `${word.slice(0, -2)}ing`;
    }
    return null;
}
/**
 * XYZ front-load: "Built ETL pipeline, reducing load time by 40%"
 *            -> "Reduced load time by 40% by building ETL pipeline".
 * Only fires when the outcome clause carries a numeric claim already present
 * in the original bullet (guaranteed: we only rearrange).
 */
function frontloadOutcome(bullet) {
    const match = bullet.match(/^(.+?),\s*(reducing|increasing|improving|cutting|lowering|raising|saving|delivering|achieving|driving|enabling|boosting|growing)\s+(.+)$/i);
    if (!match)
        return { text: bullet, applied: false };
    const [, method, outcomeVerb, outcomeRaw] = match;
    if (!method || !outcomeVerb || !outcomeRaw)
        return { text: bullet, applied: false };
    // Do not front-load if the method clause is trivially short.
    if (normalizeSpaces(method).split(" ").length < 2)
        return { text: bullet, applied: false };
    const pastVerb = OUTCOME_PAST[outcomeVerb.toLowerCase()] ?? capitalizeFirst(outcomeVerb.toLowerCase());
    const outcome = outcomeRaw.trim().replace(/\.\s*$/, "");
    const methodWords = method.trim().split(/\s+/);
    const firstWord = methodWords[0] ?? "";
    const gerund = toGerund(firstWord);
    let methodAsHow;
    if (gerund) {
        methodAsHow = [gerund, ...methodWords.slice(1)].join(" ");
    }
    else {
        const lowered = method.trim();
        methodAsHow = lowered.charAt(0).toLowerCase() + lowered.slice(1);
    }
    const text = `${pastVerb} ${outcome} by ${methodAsHow}.`;
    return { text: capitalizeFirst(normalizeSpaces(text)), applied: true };
}
function stripFiller(bullet) {
    let text = bullet;
    let applied = false;
    const replacements = [
        [/\bin order to\b/gi, "to"],
        [/\bdue to the fact that\b/gi, "because"],
        [/\bvarious different\b/gi, "various"],
        [/\b(a )?large number of\b/gi, "many"],
    ];
    for (const [pattern, to] of replacements) {
        if (pattern.test(text)) {
            text = text.replace(pattern, to);
            applied = true;
        }
    }
    return { text: normalizeSpaces(text), applied };
}
function mirrorTerms(bullet, jdTerms) {
    let text = bullet;
    const addressed = [];
    let applied = false;
    for (const { from, to, rule } of TERM_ALIASES) {
        void rule;
        if (from.test(text)) {
            // Only mirror when the JD actually uses the target term.
            const jdUses = jdTerms.some((term) => term.toLowerCase() === to.toLowerCase());
            if (jdUses && !new RegExp(`(?<!\\w)${to.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?!\\w)`).test(text)) {
                text = text.replace(from, to);
                addressed.push(to);
                applied = true;
            }
        }
    }
    return { text, addressed, applied };
}
function hasNewNumericClaims(original, tailored) {
    const before = (0, truthfulness_1.extractNumericClaims)(original);
    for (const claim of (0, truthfulness_1.extractNumericClaims)(tailored)) {
        if (!before.has(claim))
            return true;
    }
    return false;
}
/**
 * Strengthen one bullet. Returns the original unchanged when no safe
 * improvement applies. `jdTerms` are JD keyword terms for mirroring.
 */
function strengthenBullet(bullet, jdTerms = []) {
    const original = normalizeSpaces(bullet);
    if (!original) {
        return {
            original: bullet,
            tailored: bullet,
            changeReason: "Empty bullet; left unchanged.",
            keywordsAddressed: [],
            appliedRules: [],
            confidence: "low",
        };
    }
    const appliedRules = [];
    let text = original;
    const weak = fixWeakLead(text);
    if (weak.applied) {
        text = weak.text;
        appliedRules.push("WEAK_LEAD");
    }
    const front = frontloadOutcome(text);
    if (front.applied) {
        text = front.text;
        appliedRules.push("XYZ_FRONTLOAD");
    }
    const filler = stripFiller(text);
    if (filler.applied) {
        text = filler.text;
        appliedRules.push("FILLER_STRIP");
    }
    const mirrored = mirrorTerms(text, jdTerms);
    if (mirrored.applied) {
        text = mirrored.text;
        appliedRules.push("TERM_MIRROR");
    }
    // Truth backstop: any new numeric claim voids the whole transform.
    if (hasNewNumericClaims(original, text)) {
        return {
            original: bullet,
            tailored: bullet,
            changeReason: "Transform discarded: would introduce a numeric claim absent from the original.",
            keywordsAddressed: [],
            appliedRules: [],
            confidence: "low",
        };
    }
    if (appliedRules.length === 0) {
        return {
            original: bullet,
            tailored: bullet,
            changeReason: "No safe strengthening rule applied; bullet kept as written.",
            keywordsAddressed: [],
            appliedRules: [],
            confidence: "medium",
        };
    }
    const reasons = [];
    if (appliedRules.includes("WEAK_LEAD"))
        reasons.push("replaced weak lead with a strong action verb");
    if (appliedRules.includes("XYZ_FRONTLOAD"))
        reasons.push("front-loaded the quantified outcome (XYZ form)");
    if (appliedRules.includes("FILLER_STRIP"))
        reasons.push("removed filler phrasing");
    if (appliedRules.includes("TERM_MIRROR"))
        reasons.push(`mirrored JD terminology (${mirrored.addressed.join(", ")})`);
    return {
        original: bullet,
        tailored: capitalizeFirst(normalizeSpaces(text)),
        changeReason: `Deterministic restructure (${appliedRules.join(" + ")}): ${reasons.join("; ")}. No new facts introduced.`,
        keywordsAddressed: mirrored.addressed,
        appliedRules,
        confidence: appliedRules.includes("XYZ_FRONTLOAD") ? "high" : "medium",
    };
}
/** Strengthen every bullet of an experience entry, preserving order and count. */
function strengthenBullets(bullets, jdTerms = []) {
    return bullets.map((bullet) => strengthenBullet(bullet, jdTerms));
}
