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

import { extractJdKeywords, type JdKeyword } from "../lib/jd-keywords";
import { alignKeywords, type AlignmentReport } from "../lib/keyword-align";
import { strengthenBullets } from "../lib/bullet-strength";
import { composeSummary } from "../lib/summary-composer";
import {
  TailoredResumeSchema,
  type JobDescriptionProfile,
  type ResumeProfile,
  type TailoredExperienceEntry,
  type TailoredResume,
} from "../lib/schemas";
import { assertTruthfulTailoring } from "../lib/truthfulness";
import { assertHelixBoundaries } from "../lib/helix-boundaries";
import { getHelixEvidenceContext } from "../lib/helix-evidence";

export interface DynamicGenerationInput {
  readonly jdText: string;
  readonly resume: ResumeProfile;
}

export interface RankedHelixSystem {
  readonly systemId: string;
  readonly repository: string;
  readonly role: string;
  readonly jdTermHits: number;
}

export interface DynamicReport {
  readonly generatedAt: string;
  readonly deterministic: true;
  readonly modelUsed: false;
  readonly jdTitle: string;
  readonly keywordCount: number;
  readonly requiredKeywordCount: number;
  readonly coveragePercent: number;
  readonly coverageBand: AlignmentReport["band"];
  readonly missingRequiredTerms: readonly string[];
  readonly bulletsStrengthened: number;
  readonly bulletsTotal: number;
  readonly rulesApplied: readonly string[];
  readonly skillsReordered: boolean;
  readonly summaryComposed: boolean;
  readonly summaryFellBackToSource: boolean;
  readonly rankedHelixSystems: readonly RankedHelixSystem[];
}

export interface DynamicGenerationResult {
  readonly jdProfile: JobDescriptionProfile;
  readonly tailored: TailoredResume;
  readonly report: DynamicReport;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function detectSeniority(jdText: string): string {
  const text = jdText.toLowerCase();
  if (/\bprincipal\b/.test(text)) return "Principal";
  if (/\bstaff\b/.test(text)) return "Staff";
  if (/\bsenior\b|\bsr\.?\b/.test(text)) return "Senior";
  if (/\bjunior\b|\bjr\.?\b/.test(text)) return "Junior";
  if (/\blead\b/.test(text)) return "Lead";
  return "Mid-Level";
}

/** Split JD text into rough responsibility / qualification lines. */
function sectionLines(jdText: string, cue: RegExp): string[] {
  const lines = jdText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: string[] = [];
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
    if (capture && line.length > 12) out.push(normalize(line).replace(/^[-*•\d.)\s]+/, ""));
    if (out.length >= 25) break;
  }
  return out;
}

function rankHelixSystems(
  jdTerms: readonly string[],
): RankedHelixSystem[] {
  const helix = getHelixEvidenceContext();
  const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const containsTerm = (haystack: string, term: string): boolean =>
    new RegExp(`(?<!\\w)${escapeRegExp(term.toLowerCase())}(?!\\w)`).test(
      haystack.toLowerCase(),
    );
  return helix.systems
    .map((system) => {
      const haystack = `${system.system_id} ${system.role} ${system.evidence}`;
      let jdTermHits = 0;
      for (const term of jdTerms) if (containsTerm(haystack, term)) jdTermHits++;
      return {
        systemId: system.system_id,
        repository: system.repository,
        role: system.role,
        jdTermHits,
      };
    })
    .sort((a, b) => b.jdTermHits - a.jdTermHits);
}

export async function generateDynamicResume(
  input: DynamicGenerationInput,
): Promise<DynamicGenerationResult> {
  const { jdText, resume } = input;
  if (!jdText.trim()) throw new Error("Job description text is empty.");
  const generatedAt = new Date().toISOString();

  // 1. Deterministic JD profile.
  const jdKeywords = extractJdKeywords(jdText);
  const required = jdKeywords.keywords.filter((kw) => kw.tier === "required");
  const preferred = jdKeywords.keywords.filter((kw) => kw.tier === "preferred");
  const jdProfile: JobDescriptionProfile = {
    jobTitle: jdKeywords.jobTitle,
    company: "",
    requiredSkills: required.map((kw: JdKeyword) => kw.term),
    preferredSkills: preferred.map((kw: JdKeyword) => kw.term),
    responsibilities: sectionLines(jdText, /\b(responsibilit|what you('ll| will) do|you will)\b/i),
    qualifications: sectionLines(jdText, /\b(qualifications?|requirements?|must have|you have)\b/i),
    tools: jdKeywords.keywords
      .filter((kw: JdKeyword) =>
        /^(Python|TypeScript|JavaScript|Go|Java|Rust|SQL|React|Next\.js|Node\.js|n8n|Zapier|Make|Workato|UiPath|Power Automate|AWS|GCP|Azure|Docker|Kubernetes|Terraform|PostgreSQL|MySQL|Redis|LangGraph|CrewAI|MCP)$/i.test(kw.term),
      )
      .map((kw: JdKeyword) => kw.term),
    keywords: jdKeywords.keywords.map((kw: JdKeyword) => kw.term),
    seniorityLevel: detectSeniority(jdText),
    domainSignals: jdKeywords.keywords
      .filter((kw: JdKeyword) => kw.tier !== "general")
      .slice(0, 10)
      .map((kw: JdKeyword) => kw.term),
  };

  // 2. Keyword alignment: coverage + JD-priority skill order (source skills only).
  const alignment = alignKeywords(resume, jdKeywords.keywords);
  const jdTerms = jdKeywords.keywords.map((kw) => kw.term);

  // 3. Bullet strengthening per experience entry (order and count preserved).
  const strengthenedEntries = resume.experience.map((entry) =>
    strengthenBullets(entry.bullets, jdTerms),
  );
  const tailoredExperience: TailoredExperienceEntry[] = resume.experience.map((entry, entryIndex) => {
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
  const composed = composeSummary(resume, jdKeywords.jobTitle, jdKeywords.keywords);

  let tailored: TailoredResume = TailoredResumeSchema.parse({
    tailoredSummary: composed.summary,
    tailoredSkills: [...alignment.reorderedSkills],
    tailoredExperience,
  });

  // 5. Deterministic guards. Truthfulness first; then Helix boundaries.
  //    If the composed summary trips a Helix boundary (e.g. newly promoting a
  //    REFERENCE_ONLY system term into the summary), fall back to the source
  //    summary rather than weakening the guard.
  assertTruthfulTailoring(resume, tailored);
  const helix = getHelixEvidenceContext();
  let summaryFellBackToSource = false;
  try {
    assertHelixBoundaries(resume, tailored, helix);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/tailoredSummary|REFERENCE_ONLY_SUMMARY_PROMOTION/.test(message)) {
      summaryFellBackToSource = true;
      tailored = TailoredResumeSchema.parse({
        ...tailored,
        tailoredSummary: resume.summary,
      });
      assertTruthfulTailoring(resume, tailored);
      assertHelixBoundaries(resume, tailored, helix);
    } else {
      throw error;
    }
  }

  const bulletsTotal = tailoredExperience.reduce(
    (count, entry) => count + entry.bullets.length,
    0,
  );
  const bulletsStrengthened = tailoredExperience.reduce(
    (count, entry) =>
      count + entry.bullets.filter((b) => b.tailored !== b.original).length,
    0,
  );
  const rulesApplied = [
    ...new Set(
      strengthenedEntries.flatMap((bullets) =>
        bullets.flatMap((b) => (b.tailored !== b.original ? b.appliedRules : [])),
      ),
    ),
  ];

  const report: DynamicReport = {
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
