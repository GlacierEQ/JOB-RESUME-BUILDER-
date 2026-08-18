import {
  compileApplicationArtifacts,
  type ApplicationCompilation,
  type CompiledArtifact,
} from "./application-compiler";
import {
  compileApplicationEvidenceBrief,
  type ApplicationEvidenceBrief,
} from "./application-evidence-brief";
import type {
  JobDescriptionProfile,
  ResumeProfile,
  TailoredResume,
} from "./schemas";

export interface ApplicationPackageCompilation extends ApplicationCompilation {
  readonly evidenceBrief: ApplicationEvidenceBrief;
}

function safeFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "target-role";
}

function renderEvidenceArtifact(
  brief: ApplicationEvidenceBrief,
  target: JobDescriptionProfile,
): CompiledArtifact {
  const slug = safeFilename(`${target.company}-${target.jobTitle}`);
  return {
    kind: "evidence",
    filename: `${slug}-evidence-brief.json`,
    mimeType: "application/json;charset=utf-8",
    content: `${JSON.stringify(brief, null, 2)}\n`,
  };
}

/**
 * Compile the reviewed resume package plus an explicit requirement-to-evidence dossier.
 *
 * The evidence brief is generated from the final materialized resume, not the pre-tailoring
 * source, so the package shows exactly what the downloadable resume can and cannot support.
 * Unsupported required skills remain explicit; this layer never invents qualifications.
 */
export function compileApplicationPackage(
  source: ResumeProfile,
  target: JobDescriptionProfile,
  tailored: TailoredResume,
  compiledAt = new Date().toISOString(),
): ApplicationPackageCompilation {
  const base = compileApplicationArtifacts(source, target, tailored, compiledAt);
  const evidenceBrief = compileApplicationEvidenceBrief(base.resume, target);
  const evidenceArtifact = renderEvidenceArtifact(evidenceBrief, target);

  return {
    ...base,
    evidenceBrief,
    artifacts: [...base.artifacts, evidenceArtifact],
  };
}
