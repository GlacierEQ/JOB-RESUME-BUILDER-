import type { JobDescriptionProfile, ResumeProfile } from "./schemas";

export type RequirementTier = "required" | "preferred" | "tool" | "keyword";

export interface EvidenceHit {
  readonly source: string;
  readonly text: string;
  readonly score: number;
}

export interface RequirementEvidence {
  readonly requirement: string;
  readonly tier: RequirementTier;
  readonly status: "SUPPORTED" | "PARTIAL" | "UNSUPPORTED";
  readonly bestEvidence: EvidenceHit | null;
}

export interface ApplicationEvidenceBrief {
  readonly schema: "glaciereq.application-evidence-brief.v1";
  readonly target: {
    readonly company: string;
    readonly jobTitle: string;
    readonly seniorityLevel: string;
  };
  readonly coverage: {
    readonly required: { readonly supported: number; readonly total: number; readonly ratio: number };
    readonly preferred: { readonly supported: number; readonly total: number; readonly ratio: number };
    readonly tools: { readonly supported: number; readonly total: number; readonly ratio: number };
    readonly keywords: { readonly supported: number; readonly total: number; readonly ratio: number };
  };
  readonly requirements: readonly RequirementEvidence[];
  readonly strongestEvidence: readonly EvidenceHit[];
  readonly unsupportedRequired: readonly string[];
  readonly boundary: {
    readonly lexicalEvidenceOnly: true;
    readonly semanticQualificationInferred: false;
    readonly hiringOutcomePredicted: false;
    readonly humanReviewRequired: true;
  };
}

interface CorpusEntry {
  readonly source: string;
  readonly text: string;
  readonly normalized: string;
  readonly tokens: ReadonlySet<string>;
}

function normalize(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9+#./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): Set<string> {
  return new Set(normalize(value).split(" ").filter((token) => token.length >= 2));
}

function evidenceCorpus(resume: ResumeProfile): CorpusEntry[] {
  const rows: Array<{ source: string; text: string }> = [];
  if (resume.summary.trim()) rows.push({ source: "summary", text: resume.summary });
  resume.skills.forEach((text, index) => rows.push({ source: `skills[${index}]`, text }));
  resume.experience.forEach((entry, entryIndex) => {
    rows.push({ source: `experience[${entryIndex}].title`, text: entry.title });
    entry.bullets.forEach((text, bulletIndex) =>
      rows.push({ source: `experience[${entryIndex}].bullets[${bulletIndex}]`, text }),
    );
  });
  resume.projects.forEach((project, projectIndex) => {
    rows.push({ source: `projects[${projectIndex}].name`, text: project.name });
    if (project.description.trim()) {
      rows.push({ source: `projects[${projectIndex}].description`, text: project.description });
    }
    project.bullets.forEach((text, bulletIndex) =>
      rows.push({ source: `projects[${projectIndex}].bullets[${bulletIndex}]`, text }),
    );
    project.technologies.forEach((text, techIndex) =>
      rows.push({ source: `projects[${projectIndex}].technologies[${techIndex}]`, text }),
    );
  });
  resume.certifications.forEach((cert, index) => {
    rows.push({ source: `certifications[${index}].name`, text: cert.name });
    if (cert.issuer.trim()) rows.push({ source: `certifications[${index}].issuer`, text: cert.issuer });
  });

  return rows
    .map((row) => ({ ...row, normalized: normalize(row.text), tokens: tokens(row.text) }))
    .filter((row) => row.normalized.length > 0);
}

function scoreRequirement(requirement: string, row: CorpusEntry): number {
  const needle = normalize(requirement);
  if (!needle) return 0;
  if (row.normalized === needle) return 1;
  if (row.normalized.includes(needle) || needle.includes(row.normalized)) return 0.95;

  const requiredTokens = tokens(requirement);
  if (requiredTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of requiredTokens) if (row.tokens.has(token)) overlap += 1;
  const coverage = overlap / requiredTokens.size;
  const precision = row.tokens.size > 0 ? overlap / row.tokens.size : 0;
  return Math.min(0.9, coverage * 0.8 + precision * 0.2);
}

function evaluateRequirement(
  requirement: string,
  tier: RequirementTier,
  corpus: readonly CorpusEntry[],
): RequirementEvidence {
  let best: EvidenceHit | null = null;
  for (const row of corpus) {
    const score = scoreRequirement(requirement, row);
    if (!best || score > best.score) best = { source: row.source, text: row.text, score };
  }
  const bestScore = best?.score ?? 0;
  const status = bestScore >= 0.8 ? "SUPPORTED" : bestScore >= 0.5 ? "PARTIAL" : "UNSUPPORTED";
  return {
    requirement,
    tier,
    status,
    bestEvidence: bestScore > 0 ? best : null,
  };
}

function coverage(rows: readonly RequirementEvidence[]) {
  const total = rows.length;
  const supported = rows.filter((row) => row.status === "SUPPORTED").length;
  return { supported, total, ratio: total === 0 ? 1 : supported / total };
}

export function compileApplicationEvidenceBrief(
  resume: ResumeProfile,
  target: JobDescriptionProfile,
): ApplicationEvidenceBrief {
  const corpus = evidenceCorpus(resume);
  const requirements: RequirementEvidence[] = [
    ...target.requiredSkills.map((value) => evaluateRequirement(value, "required", corpus)),
    ...target.preferredSkills.map((value) => evaluateRequirement(value, "preferred", corpus)),
    ...target.tools.map((value) => evaluateRequirement(value, "tool", corpus)),
    ...target.keywords.map((value) => evaluateRequirement(value, "keyword", corpus)),
  ];

  const byTier = (tier: RequirementTier) => requirements.filter((row) => row.tier === tier);
  const strongestEvidence = requirements
    .flatMap((row) => (row.bestEvidence ? [row.bestEvidence] : []))
    .sort((left, right) => right.score - left.score || left.source.localeCompare(right.source))
    .filter((row, index, all) => all.findIndex((candidate) => candidate.source === row.source && candidate.text === row.text) === index)
    .slice(0, 8);

  return {
    schema: "glaciereq.application-evidence-brief.v1",
    target: {
      company: target.company,
      jobTitle: target.jobTitle,
      seniorityLevel: target.seniorityLevel,
    },
    coverage: {
      required: coverage(byTier("required")),
      preferred: coverage(byTier("preferred")),
      tools: coverage(byTier("tool")),
      keywords: coverage(byTier("keyword")),
    },
    requirements,
    strongestEvidence,
    unsupportedRequired: byTier("required")
      .filter((row) => row.status === "UNSUPPORTED")
      .map((row) => row.requirement),
    boundary: {
      lexicalEvidenceOnly: true,
      semanticQualificationInferred: false,
      hiringOutcomePredicted: false,
      humanReviewRequired: true,
    },
  };
}
