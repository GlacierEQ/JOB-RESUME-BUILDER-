import type { ResumeProfile, TailoredResume } from "./schemas";

export type TruthfulnessViolationCode =
  | "EXPERIENCE_COUNT_CHANGED"
  | "UNKNOWN_EXPERIENCE"
  | "TITLE_CHANGED"
  | "BULLET_COUNT_CHANGED"
  | "ORIGINAL_BULLET_MISMATCH"
  | "NEW_NUMERIC_CLAIM"
  | "UNSUPPORTED_SKILL";

export interface TruthfulnessViolation {
  readonly code: TruthfulnessViolationCode;
  readonly path: string;
  readonly message: string;
}

export class TruthfulnessViolationError extends Error {
  readonly violations: readonly TruthfulnessViolation[];

  constructor(violations: readonly TruthfulnessViolation[]) {
    super(
      `Tailored resume failed deterministic truthfulness validation with ${violations.length} violation${violations.length === 1 ? "" : "s"}.`,
    );
    this.name = "TruthfulnessViolationError";
    this.violations = violations;
  }
}

export function inspectTailoredResume(
  source: ResumeProfile,
  tailored: TailoredResume,
): readonly TruthfulnessViolation[] {
  const violations: TruthfulnessViolation[] = [];

  if (tailored.tailoredExperience.length !== source.experience.length) {
    violations.push({
      code: "EXPERIENCE_COUNT_CHANGED",
      path: "tailoredExperience",
      message: `Expected ${source.experience.length} experience entries but received ${tailored.tailoredExperience.length}.`,
    });
  }

  tailored.tailoredExperience.forEach((entry, experienceIndex) => {
    const path = `tailoredExperience[${experienceIndex}]`;
    const sourceEntry = source.experience.find(
      (candidate) => normalize(candidate.company) === normalize(entry.company),
    );

    if (!sourceEntry) {
      violations.push({
        code: "UNKNOWN_EXPERIENCE",
        path: `${path}.company`,
        message: `Company "${entry.company}" does not exist in the source resume.`,
      });
      return;
    }

    if (normalize(sourceEntry.title) !== normalize(entry.title)) {
      violations.push({
        code: "TITLE_CHANGED",
        path: `${path}.title`,
        message: `Title "${entry.title}" does not match the source title "${sourceEntry.title}".`,
      });
    }

    if (entry.bullets.length !== sourceEntry.bullets.length) {
      violations.push({
        code: "BULLET_COUNT_CHANGED",
        path: `${path}.bullets`,
        message: `Expected ${sourceEntry.bullets.length} bullets for ${sourceEntry.company} but received ${entry.bullets.length}.`,
      });
    }

    entry.bullets.forEach((bullet, bulletIndex) => {
      const bulletPath = `${path}.bullets[${bulletIndex}]`;
      const sourceBullet = sourceEntry.bullets[bulletIndex];

      if (!sourceBullet || normalize(sourceBullet) !== normalize(bullet.original)) {
        violations.push({
          code: "ORIGINAL_BULLET_MISMATCH",
          path: `${bulletPath}.original`,
          message: "The preserved original bullet does not match the source resume at the same position.",
        });
        return;
      }

      for (const numericClaim of extractNumericClaims(bullet.tailored)) {
        if (!extractNumericClaims(sourceBullet).has(numericClaim)) {
          violations.push({
            code: "NEW_NUMERIC_CLAIM",
            path: `${bulletPath}.tailored`,
            message: `Numeric claim "${numericClaim}" is not present in the source bullet.`,
          });
        }
      }
    });
  });

  const sourceCorpus = buildSourceCorpus(source);
  tailored.tailoredSkills.forEach((skill, skillIndex) => {
    const normalizedSkill = normalize(skill);
    if (normalizedSkill && !sourceCorpus.includes(normalizedSkill)) {
      violations.push({
        code: "UNSUPPORTED_SKILL",
        path: `tailoredSkills[${skillIndex}]`,
        message: `Skill "${skill}" is not supported by the source resume.`,
      });
    }
  });

  for (const numericClaim of extractNumericClaims(tailored.tailoredSummary)) {
    if (!extractNumericClaims(sourceCorpus).has(numericClaim)) {
      violations.push({
        code: "NEW_NUMERIC_CLAIM",
        path: "tailoredSummary",
        message: `Numeric claim "${numericClaim}" is not supported by the source resume.`,
      });
    }
  }

  return violations;
}

export function assertTruthfulTailoring(source: ResumeProfile, tailored: TailoredResume): void {
  const violations = inspectTailoredResume(source, tailored);
  if (violations.length > 0) {
    throw new TruthfulnessViolationError(violations);
  }
}

function buildSourceCorpus(source: ResumeProfile): string {
  return normalize(
    [
      source.summary,
      ...source.skills,
      ...source.experience.flatMap((entry) => [entry.company, entry.title, ...entry.bullets]),
      ...source.projects.flatMap((project) => [
        project.name,
        project.description,
        ...project.bullets,
        ...project.technologies,
      ]),
      ...source.education.flatMap((entry) => [
        entry.institution,
        entry.degree,
        entry.fieldOfStudy,
        entry.graduationDate,
      ]),
      ...source.certifications.flatMap((entry) => [entry.name, entry.issuer, entry.date]),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function extractNumericClaims(text: string): Set<string> {
  const matches = text.match(/(?:[$€£]\s*)?\b\d+(?:[.,]\d+)*(?:\s?(?:%|x|k|m|b|hours?|years?|months?|days?))?/gi) ?? [];
  return new Set(matches.map((claim) => claim.toLowerCase().replace(/[\s,]/g, "")));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9+#.%$€£]+/g, " ").trim().replace(/\s+/g, " ");
}
