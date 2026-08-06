import type { HelixEvidenceContext, HelixSystemEvidence } from "./helix-evidence";
import type { ResumeProfile, TailoredResume } from "./schemas";

export type HelixBoundaryViolationCode =
  | "HELIX_SYSTEM_NOT_IN_SOURCE"
  | "REFERENCE_ONLY_SUMMARY_PROMOTION"
  | "REFERENCE_ONLY_PRODUCTION_CLAIM"
  | "REFERENCE_ONLY_RISK_FLAG_REQUIRED"
  | "TARGET_COMPANY_NOT_IN_SOURCE"
  | "TARGET_COMPANY_AFFILIATION_CLAIM";

export interface HelixBoundaryViolation {
  readonly code: HelixBoundaryViolationCode;
  readonly path: string;
  readonly message: string;
}

export class HelixBoundaryViolationError extends Error {
  readonly violations: readonly HelixBoundaryViolation[];

  constructor(violations: readonly HelixBoundaryViolation[]) {
    super(
      `Tailored resume failed deterministic Helix boundary validation with ${violations.length} violation${violations.length === 1 ? "" : "s"}.`,
    );
    this.name = "HelixBoundaryViolationError";
    this.violations = violations;
  }
}

const PRODUCTION_CLAIMS = [
  "deployed",
  "deployed at",
  "deployed for",
  "deployed to",
  "in production",
  "production grade",
  "production proven",
  "production ready",
  "operating at scale",
  "running at scale",
  "used at scale",
  "used by customers",
  "customer deployed",
  "enterprise deployed",
  "adopted by",
  "live customer",
  "live production",
];

const AFFILIATION_CLAIMS = [
  "worked at",
  "worked for",
  "employed by",
  "employee of",
  "built for",
  "deployed at",
  "deployed for",
  "partnered with",
  "in partnership with",
  "customer of",
  "used by",
  "adopted by",
  "proprietary access",
  "internal access",
  "production at",
];

const ACCEPTABLE_REFERENCE_FLAGS = [
  "reference",
  "supporting evidence",
  "boundary",
  "not production",
  "verify",
  "verification",
  "limited evidence",
];

export function inspectHelixBoundaries(
  source: ResumeProfile,
  tailored: TailoredResume,
  helix: HelixEvidenceContext,
): readonly HelixBoundaryViolation[] {
  const violations: HelixBoundaryViolation[] = [];
  const sourceCorpus = buildSourceCorpus(source);
  const sourceSummary = normalize(source.summary);
  const outputSummary = normalize(tailored.tailoredSummary);
  const sourceExperienceCompanies = new Set(
    source.experience.map((entry) => normalize(entry.company)).filter(Boolean),
  );

  const finalTextFields: Array<{ path: string; text: string }> = [
    { path: "tailoredSummary", text: tailored.tailoredSummary },
    ...tailored.tailoredSkills.map((skill, index) => ({
      path: `tailoredSkills[${index}]`,
      text: skill,
    })),
    ...tailored.tailoredExperience.flatMap((entry, experienceIndex) =>
      entry.bullets.map((bullet, bulletIndex) => ({
        path: `tailoredExperience[${experienceIndex}].bullets[${bulletIndex}].tailored`,
        text: bullet.tailored,
      })),
    ),
  ];

  for (const system of helix.systems) {
    const terms = systemTerms(system);
    const sourceContainsSystem = terms.some((term) => containsTerm(sourceCorpus, term));
    const outputFields = finalTextFields.filter((field) =>
      terms.some((term) => containsTerm(normalize(field.text), term)),
    );

    if (outputFields.length > 0 && !sourceContainsSystem) {
      for (const field of outputFields) {
        violations.push({
          code: "HELIX_SYSTEM_NOT_IN_SOURCE",
          path: field.path,
          message: `Helix system "${system.system_id}" is not identified in the source resume and cannot be introduced by tailoring.`,
        });
      }
      continue;
    }

    if (system.state !== "REFERENCE_ONLY" || outputFields.length === 0) {
      continue;
    }

    const summaryContainsSystem = terms.some((term) => containsTerm(outputSummary, term));
    const sourceSummaryContainsSystem = terms.some((term) => containsTerm(sourceSummary, term));
    if (summaryContainsSystem && !sourceSummaryContainsSystem) {
      violations.push({
        code: "REFERENCE_ONLY_SUMMARY_PROMOTION",
        path: "tailoredSummary",
        message: `REFERENCE_ONLY system "${system.system_id}" cannot be newly promoted into the resume summary.`,
      });
    }

    for (const field of outputFields) {
      const normalizedText = normalize(field.text);
      const productionClaim = PRODUCTION_CLAIMS.find((claim) =>
        containsPhrase(normalizedText, claim),
      );
      if (productionClaim) {
        violations.push({
          code: "REFERENCE_ONLY_PRODUCTION_CLAIM",
          path: field.path,
          message: `REFERENCE_ONLY system "${system.system_id}" cannot be paired with "${productionClaim}".`,
        });
      }
    }

    tailored.tailoredExperience.forEach((entry, experienceIndex) => {
      entry.bullets.forEach((bullet, bulletIndex) => {
        const tailoredContainsSystem = terms.some((term) =>
          containsTerm(normalize(bullet.tailored), term),
        );
        const originalContainsSystem = terms.some((term) =>
          containsTerm(normalize(bullet.original), term),
        );
        if (!tailoredContainsSystem || originalContainsSystem) return;
        const normalizedFlag = normalize(bullet.riskFlag ?? "");
        if (
          !normalizedFlag ||
          !ACCEPTABLE_REFERENCE_FLAGS.some((flag) => containsPhrase(normalizedFlag, flag))
        ) {
          violations.push({
            code: "REFERENCE_ONLY_RISK_FLAG_REQUIRED",
            path: `tailoredExperience[${experienceIndex}].bullets[${bulletIndex}].riskFlag`,
            message: `New emphasis on REFERENCE_ONLY system "${system.system_id}" requires an explicit evidence-boundary risk flag.`,
          });
        }
      });
    });
  }

  for (const company of helix.companies) {
    const aliases = companyAliases(company.company_id, company.display_name);
    const establishedEmployer = [...sourceExperienceCompanies].some((sourceCompany) =>
      aliases.some((alias) => containsTerm(sourceCompany, alias)),
    );
    const sourceContainsCompany = aliases.some((alias) => containsTerm(sourceCorpus, alias));

    for (const field of finalTextFields) {
      const normalizedText = normalize(field.text);
      const companyAlias = aliases.find((alias) => containsTerm(normalizedText, alias));
      if (!companyAlias) continue;

      if (!sourceContainsCompany) {
        violations.push({
          code: "TARGET_COMPANY_NOT_IN_SOURCE",
          path: field.path,
          message: `Target-company alignment "${company.display_name}" is absent from the source resume and cannot be added as resume content.`,
        });
      }

      if (!establishedEmployer) {
        const affiliationClaim = AFFILIATION_CLAIMS.find((claim) =>
          containsPhrase(normalizedText, claim),
        );
        if (affiliationClaim) {
          violations.push({
            code: "TARGET_COMPANY_AFFILIATION_CLAIM",
            path: field.path,
            message: `Independent alignment with "${company.display_name}" cannot be described using affiliation phrase "${affiliationClaim}".`,
          });
        }
      }
    }
  }

  return deduplicate(violations);
}

export function assertHelixBoundaries(
  source: ResumeProfile,
  tailored: TailoredResume,
  helix: HelixEvidenceContext,
): void {
  const violations = inspectHelixBoundaries(source, tailored, helix);
  if (violations.length > 0) {
    throw new HelixBoundaryViolationError(violations);
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

function systemTerms(system: HelixSystemEvidence): string[] {
  const repositoryName = system.repository.split("/")[1] ?? "";
  return uniqueTerms([
    system.system_id,
    system.system_id.replaceAll("_", " "),
    system.system_id.replaceAll("-", " "),
    repositoryName,
    repositoryName.replaceAll("_", " "),
    repositoryName.replaceAll("-", " "),
  ]);
}

function companyAliases(companyId: string, displayName: string): string[] {
  return uniqueTerms([
    companyId,
    companyId.replaceAll("_", " "),
    displayName,
    ...displayName.split("/"),
    ...displayName.split("&"),
  ]).filter((term) => term.length >= 3);
}

function uniqueTerms(values: readonly string[]): string[] {
  return [...new Set(values.map(normalize).filter((term) => term.length >= 3))];
}

function containsTerm(corpus: string, term: string): boolean {
  if (!term) return false;
  return ` ${corpus} `.includes(` ${term} `);
}

function containsPhrase(corpus: string, phrase: string): boolean {
  return ` ${corpus} `.includes(` ${normalize(phrase)} `);
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.%$€£]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function deduplicate(
  violations: readonly HelixBoundaryViolation[],
): readonly HelixBoundaryViolation[] {
  const seen = new Set<string>();
  return violations.filter((violation) => {
    const key = `${violation.code}\u0000${violation.path}\u0000${violation.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
