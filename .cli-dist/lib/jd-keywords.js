"use strict";
/**
 * Deterministic job-description keyword extraction.
 *
 * No model calls. Extracts ranked, tiered keyword terms from raw JD text so the
 * dynamic generation path can align a resume without a GROQ_API_KEY.
 *
 * Truth boundary: extraction only *reads* the JD. It never invents
 * requirements. Tiers come from the JD's own section cues ("must have",
 * "preferred", ...).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractJdKeywords = extractJdKeywords;
/** Canonical tech/skill lexicon. Matched case-insensitively on word boundaries. */
const TECH_LEXICON = [
    // languages
    "Python",
    "TypeScript",
    "JavaScript",
    "Go",
    "Java",
    "Rust",
    "C++",
    "C#",
    "SQL",
    "Bash",
    // frontend / frameworks
    "React",
    "Next.js",
    "Node.js",
    "Vue",
    "Angular",
    // automation / RPA
    "n8n",
    "Zapier",
    "Make",
    "Workato",
    "UiPath",
    "Power Automate",
    "Automation Anywhere",
    "Blue Prism",
    "process automation",
    "workflow automation",
    "business process automation",
    "RPA",
    // agent frameworks
    "LangGraph",
    "CrewAI",
    "Google ADK",
    "AutoGen",
    "MCP",
    // AI / ML
    "LLM",
    "RAG",
    "embeddings",
    "prompt engineering",
    "fine-tuning",
    "agents",
    "evals",
    // cloud / infra
    "AWS",
    "GCP",
    "Azure",
    "Docker",
    "Kubernetes",
    "Terraform",
    "CI/CD",
    // data
    "PostgreSQL",
    "MySQL",
    "Redis",
    "Pinecone",
    "Supabase",
    "MongoDB",
    "Elasticsearch",
    "data pipeline",
    "ETL",
    // methods / practices
    "REST",
    "GraphQL",
    "webhooks",
    "idempotency",
    "observability",
    "tracing",
    "dashboards",
    "Agile",
    "Scrum",
    // business-process nouns common in automation JDs
    "quote to cash",
    "lead routing",
    "ticket triage",
    "invoice processing",
    "AP processing",
    "claims",
    "document intake",
    "onboarding",
    // general engineering
    "system design",
    "distributed systems",
    "microservices",
    "testing",
    "code review",
];
const REQUIRED_CUES = /\b(must have|must-have|required|requirements?|essential|what you'll (do|need)|you have|you'll bring)\b/i;
const PREFERRED_CUES = /\b(preferred|nice to have|nice-to-have|bonus|pluses|a plus|ideal candidate|great to have)\b/i;
const RESPONSIBILITY_CUES = /\b(responsibilit|what you('ll| will) do|the role|you will)\b/i;
const TITLE_PATTERNS = [
    /^\s*(?:job\s*title|position|role)\s*[:\-]\s*(.+)$/i,
    /^\s*(senior|staff|principal|lead|junior)?\s*([a-z][a-z\s/\-&]*?(?:engineer|developer|architect|scientist|analyst|manager|designer|expert|specialist|consultant))\b/i,
];
function normalizeTerm(term) {
    return term.trim().replace(/\s+/g, " ");
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
/** Match a lexicon term against text on word boundaries (case-insensitive). */
function termPresent(text, term) {
    const pattern = new RegExp(`(?<!\\w)${escapeRegExp(term)}(?!\\w)`, "i");
    return pattern.test(text);
}
function extractJdKeywords(jdText) {
    const text = jdText ?? "";
    const lines = text.split(/\r?\n/);
    const jobTitle = detectJobTitle(lines, text);
    const yearsOfExperience = extractYears(text);
    const found = new Map();
    let currentTier = "general";
    let currentSource = "body";
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line)
            continue;
        const hasLexiconTerm = TECH_LEXICON.some((candidate) => termPresent(line, candidate));
        // Section cues only count as headers when the line carries no extractable
        // term; otherwise a bullet like "- LangGraph experience is a plus" would
        // be swallowed as a header and its term lost.
        if (!hasLexiconTerm) {
            if (REQUIRED_CUES.test(line) && line.length < 80) {
                currentTier = "required";
                currentSource = "requirements";
                continue;
            }
            if (PREFERRED_CUES.test(line) && line.length < 80) {
                currentTier = "preferred";
                currentSource = "preferred";
                continue;
            }
            if (RESPONSIBILITY_CUES.test(line) && line.length < 80) {
                currentTier = "general";
                currentSource = "responsibilities";
                continue;
            }
        }
        for (const candidate of TECH_LEXICON) {
            if (!termPresent(line, candidate))
                continue;
            const term = normalizeTerm(candidate);
            const key = term.toLowerCase();
            const existing = found.get(key);
            const tierRank = (t) => t === "required" ? 0 : t === "preferred" ? 1 : 2;
            if (!existing) {
                found.set(key, { term, tier: currentTier, sources: [currentSource] });
            }
            else if (tierRank(currentTier) < tierRank(existing.tier)) {
                found.set(key, {
                    term: existing.term,
                    tier: currentTier,
                    sources: [...existing.sources, currentSource],
                });
            }
            else if (!existing.sources.includes(currentSource)) {
                found.set(key, {
                    term: existing.term,
                    tier: existing.tier,
                    sources: [...existing.sources, currentSource],
                });
            }
        }
    }
    // Title terms are high-signal: promote any lexicon term present in the title.
    if (jobTitle) {
        for (const candidate of TECH_LEXICON) {
            if (!termPresent(jobTitle, candidate))
                continue;
            const key = normalizeTerm(candidate).toLowerCase();
            const existing = found.get(key);
            if (existing && existing.tier !== "required") {
                found.set(key, {
                    term: existing.term,
                    tier: "required",
                    sources: [...existing.sources, "title"],
                });
            }
            else if (!existing) {
                found.set(key, {
                    term: normalizeTerm(candidate),
                    tier: "required",
                    sources: ["title"],
                });
            }
        }
    }
    const tierRank = (t) => t === "required" ? 0 : t === "preferred" ? 1 : 2;
    const keywords = [...found.values()].sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || a.term.localeCompare(b.term));
    return { jobTitle, keywords, yearsOfExperience };
}
function detectJobTitle(lines, fullText) {
    for (const line of lines.slice(0, 12)) {
        const explicit = line.match(TITLE_PATTERNS[0]);
        if (explicit) {
            const title = normalizeTerm(explicit[1] ?? "");
            if (title.length >= 3 && title.length <= 80)
                return title;
        }
        // A role-titled line is itself the title; keep the whole line so
        // seniority prefixes ("Senior ...") are preserved.
        if (TITLE_PATTERNS[1].test(line) && line.trim().length <= 80) {
            return normalizeTerm(line.replace(/^#+/, "").trim());
        }
    }
    const first = lines.map((l) => l.trim()).find((l) => l.length >= 3 && l.length <= 80);
    if (first && /engineer|developer|architect|scientist|analyst|manager|designer|expert|specialist|consultant/i.test(first)) {
        return normalizeTerm(first.replace(/^#+/, "").trim());
    }
    void fullText;
    return "";
}
function extractYears(text) {
    const matches = text.match(/\b\d+\+?\s*(?:years?|yrs?)\b/gi) ?? [];
    const seen = new Set();
    const out = [];
    for (const m of matches) {
        const key = m.toLowerCase().replace(/\s+/g, " ");
        if (!seen.has(key)) {
            seen.add(key);
            out.push(normalizeTerm(m));
        }
    }
    return out.slice(0, 5);
}
