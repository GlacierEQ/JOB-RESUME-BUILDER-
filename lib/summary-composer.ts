/**
 * Deterministic, JD-aware professional summary composer.
 *
 * Builds the 3-4 line value-led summary that owns the top third of the page:
 * role-aligned headline first, proof points from the source resume second,
 * role-relevant value close third. No aspirations, no clichés, no objectives.
 *
 * Truth boundary: every noun phrase and every number comes from the source
 * resume corpus. The JD contributes only the role title mirror and the
 * priority order of proof points. Numeric claims are checked against the
 * source corpus; the summary is rejected to a safe fallback if a number
 * cannot be traced.
 */

import type { JdKeyword } from "./jd-keywords";
import type { ResumeProfile } from "./schemas";
import { extractNumericClaims } from "./truthfulness";

export interface ComposedSummary {
  readonly summary: string;
  /** Proof points selected, in order, with their source location. */
  readonly proofPoints: readonly { readonly text: string; readonly source: string }[];
  readonly headline: string;
}

const CLICHE_PATTERNS: readonly RegExp[] = [
  /\bhard[\s-]?working\b/i,
  /\bteam player\b/i,
  /\bpassionate\b/i,
  /\bseeking (a )?new challenge/i,
  /\bdetail-oriented\b/i,
  /\bself-starter\b/i,
  /\bresults-driven\b/i,
];

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Whole source resume as one searchable corpus. */
function buildCorpus(resume: ResumeProfile): string {
  return normalize(
    [
      resume.summary,
      ...resume.skills,
      ...resume.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
      ...resume.projects.flatMap((p) => [p.name, p.description, ...p.bullets, ...p.technologies]),
      ...resume.education.flatMap((e) => [e.institution, e.degree, e.fieldOfStudy]),
      ...resume.certifications.flatMap((c) => [c.name, c.issuer]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsTerm(haystack: string, term: string): boolean {
  return new RegExp(
    `(?<!\\w)${escapeRegExp(term.toLowerCase())}(?!\\w)`,
  ).test(haystack.toLowerCase());
}

interface ScoredBullet {
  readonly text: string;
  readonly source: string;
  readonly score: number;
  readonly numbers: number;
}

/** Rank bullets by quantified outcomes first, then JD-term overlap. */
function rankProofBullets(
  resume: ResumeProfile,
  jdTerms: readonly string[],
): ScoredBullet[] {
  const out: ScoredBullet[] = [];
  const push = (text: string, source: string) => {
    const numbers = extractNumericClaims(text).size;
    let jdHits = 0;
    for (const term of jdTerms) if (containsTerm(text, term)) jdHits++;
    // Recency matters: experience entries earlier in the array score higher.
    out.push({ text: normalize(text), source, score: numbers * 10 + jdHits * 3, numbers });
  };
  resume.experience.forEach((entry, entryIndex) =>
    entry.bullets.forEach((bullet) =>
      push(bullet, `${entry.title} · ${entry.company} (role ${entryIndex + 1})`),
    ),
  );
  resume.projects.forEach((project) =>
    project.bullets.forEach((bullet) => push(bullet, `Project: ${project.name}`)),
  );
  // Stable: keep source order for ties so the most recent role wins.
  return out
    .map((item, index) => ({ item, index }))
    .sort((a, b) => b.item.score - a.item.score || a.index - b.index)
    .map(({ item }) => item);
}

/** Extract the "scale" nouns of the candidate: domains from titles + top tech. */
function domainPhrase(resume: ResumeProfile, jdTerms: readonly string[]): string {
  const GENERIC_ROLE_NOUNS = /^(senior|junior|lead|staff|principal|engineer|developer|analyst|manager|designer|architect|specialist|consultant|expert)$/i;
  const titleWords = resume.experience
    .slice(0, 2)
    .flatMap((e) => e.title.split(/[\s/&,|-]+/))
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !GENERIC_ROLE_NOUNS.test(w));
  const seen = new Set<string>();
  const domains: string[] = [];
  for (const word of titleWords) {
    const key = word.toLowerCase();
    if (!seen.has(key) && domains.length < 3) {
      seen.add(key);
      domains.push(word);
    }
  }
  const jdTech = jdTerms
    .filter((term) => resume.skills.some((skill) => containsTerm(skill, term)))
    .slice(0, 3);
  const parts: string[] = [];
  if (domains.length) parts.push(domains.join(" / "));
  if (jdTech.length) parts.push(`specializing in ${jdTech.join(", ")}`);
  return parts.join(" ");
}

function stripCliches(text: string): string {
  let out = text;
  for (const pattern of CLICHE_PATTERNS) out = out.replace(pattern, "").trim();
  return normalize(out.replace(/\s{2,}/g, " "));
}

export function composeSummary(
  resume: ResumeProfile,
  jdTitle: string,
  jdKeywords: readonly JdKeyword[],
): ComposedSummary {
  const corpus = buildCorpus(resume);
  const requiredTerms = jdKeywords.filter((kw) => kw.tier === "required").map((kw) => kw.term);
  const allTerms = jdKeywords.map((kw) => kw.term);

  const headline = jdTitle
    ? `${normalize(jdTitle)}`
    : normalize(resume.experience[0]?.title ?? "Professional");

  const ranked = rankProofBullets(resume, allTerms);
  const proofPoints = ranked.slice(0, 2).map((item) => ({
    text: item.text,
    source: item.source,
  }));

  const domain = domainPhrase(resume, requiredTerms);

  const lines: string[] = [];
  const open = domain
    ? `${headline} with a track record in ${domain}.`
    : `${headline} with a track record across ${normalize(resume.experience[0]?.title ?? "multiple roles")}.`;
  lines.push(open);

  for (const point of proofPoints) {
    // Compress the proof bullet to its outcome clause when it front-loads one.
    const compressed = compressProof(point.text);
    lines.push(compressed.endsWith(".") ? compressed : `${compressed}.`);
  }

  if (requiredTerms.length > 0) {
    const matched = requiredTerms.filter((term) =>
      resume.skills.some((skill) => containsTerm(skill, term)),
    );
    if (matched.length > 0) {
      lines.push(`Core stack includes ${matched.slice(0, 5).join(", ")}.`);
    }
  }

  let summary = stripCliches(lines.join(" "));

  // Truth backstop: every numeric claim must trace to the source corpus.
  const corpusNumbers = extractNumericClaims(corpus);
  const summaryNumbers = extractNumericClaims(summary);
  let untraced = false;
  for (const claim of summaryNumbers) {
    if (!corpusNumbers.has(claim)) {
      untraced = true;
      break;
    }
  }
  if (untraced) {
    // Fall back to a number-free summary rather than risk an invented metric.
    const safeLines = lines.map((line) =>
      line.replace(/(?:[$€£]\s*)?\b\d+(?:[.,]\d+)*(?:\s?(?:%|x|k|m|b|hours?|years?|months?|days?))?/gi, "").trim(),
    );
    summary = stripCliches(normalize(safeLines.join(" ")).replace(/\s{2,}/g, " "));
  }

  return { summary, proofPoints, headline };
}

/**
 * Compress a proof bullet to a summary-sized outcome statement.
 * "Reduced load time by 40% by building ETL pipeline" stays whole;
 * longer bullets are trimmed at the first sentence boundary.
 */
function compressProof(bullet: string): string {
  const text = normalize(bullet);
  if (text.length <= 140) return text;
  const sentenceEnd = text.search(/[.;]/);
  if (sentenceEnd > 40 && sentenceEnd < 140) return text.slice(0, sentenceEnd).trim();
  return `${text.slice(0, 137).trim()}...`;
}
