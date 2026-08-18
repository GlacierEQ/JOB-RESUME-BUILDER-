import { compileApplicationEvidenceBrief } from "./application-evidence-brief";
import { materializeTailoredResume } from "./application-compiler";
import type {
  JobDescriptionProfile,
  ResumeProfile,
  TailoredResume,
} from "./schemas";

export type RequirementDeltaState =
  | "GAINED"
  | "RETAINED"
  | "UNCHANGED_UNSUPPORTED"
  | "REGRESSED";

export interface RequirementDelta {
  readonly requirement: string;
  readonly tier: "required" | "preferred" | "tool" | "keyword";
  readonly before: "SUPPORTED" | "PARTIAL" | "UNSUPPORTED";
  readonly after: "SUPPORTED" | "PARTIAL" | "UNSUPPORTED";
  readonly delta: RequirementDeltaState;
  readonly sourceBefore: string | null;
  readonly sourceAfter: string | null;
}

export interface ApplicationReadinessReport {
  readonly schema: "glaciereq.application-readiness.v1";
  readonly target: {
    readonly company: string;
    readonly jobTitle: string;
    readonly seniorityLevel: string;
  };
  readonly readiness: "EVIDENCE_STRONG" | "EVIDENCE_GAPPED" | "EVIDENCE_REGRESSED";
  readonly coverageDelta: {
    readonly required: number;
    readonly preferred: number;
    readonly tools: number;
    readonly keywords: number;
  };
  readonly gainedSupport: readonly RequirementDelta[];
  readonly retainedSupport: readonly RequirementDelta[];
  readonly unresolvedRequired: readonly RequirementDelta[];
  readonly regressions: readonly RequirementDelta[];
  readonly requirements: readonly RequirementDelta[];
  readonly boundary: {
    readonly evidenceComparisonOnly: true;
    readonly qualificationsInvented: false;
    readonly hiringOutcomePredicted: false;
    readonly humanReviewRequired: true;
  };
}

function classifyDelta(
  before: RequirementDelta["before"],
  after: RequirementDelta["after"],
): RequirementDeltaState {
  const rank = { UNSUPPORTED: 0, PARTIAL: 1, SUPPORTED: 2 } as const;
  if (rank[after] > rank[before]) return "GAINED";
  if (rank[after] < rank[before]) return "REGRESSED";
  if (after === "UNSUPPORTED") return "UNCHANGED_UNSUPPORTED";
  return "RETAINED";
}

function coverageDelta(before: number, after: number): number {
  return Number((after - before).toFixed(4));
}

export function compileApplicationReadiness(
  source: ResumeProfile,
  target: JobDescriptionProfile,
  tailored: TailoredResume,
): ApplicationReadinessReport {
  const compiled = materializeTailoredResume(source, tailored);
  const before = compileApplicationEvidenceBrief(source, target);
  const after = compileApplicationEvidenceBrief(compiled, target);

  const beforeByKey = new Map<string, (typeof before.requirements)[number]>(
    before.requirements.map((row) => [`${row.tier}\u0000${row.requirement}`, row]),
  );

  const requirements: RequirementDelta[] = after.requirements.map((row) => {
    const key = `${row.tier}\u0000${row.requirement}`;
    const previous = beforeByKey.get(key);
    if (!previous) {
      throw new Error(`Application readiness invariant failed: missing source requirement ${key}`);
    }
    return {
      requirement: row.requirement,
      tier: row.tier,
      before: previous.status,
      after: row.status,
      delta: classifyDelta(previous.status, row.status),
      sourceBefore: previous.bestEvidence?.source ?? null,
      sourceAfter: row.bestEvidence?.source ?? null,
    };
  });

  const regressions = requirements.filter((row) => row.delta === "REGRESSED");
  const unresolvedRequired = requirements.filter(
    (row) => row.tier === "required" && row.after !== "SUPPORTED",
  );
  const gainedSupport = requirements.filter((row) => row.delta === "GAINED");
  const retainedSupport = requirements.filter((row) => row.delta === "RETAINED");

  const readiness = regressions.length
    ? "EVIDENCE_REGRESSED"
    : unresolvedRequired.length
      ? "EVIDENCE_GAPPED"
      : "EVIDENCE_STRONG";

  return {
    schema: "glaciereq.application-readiness.v1",
    target: after.target,
    readiness,
    coverageDelta: {
      required: coverageDelta(before.coverage.required.ratio, after.coverage.required.ratio),
      preferred: coverageDelta(before.coverage.preferred.ratio, after.coverage.preferred.ratio),
      tools: coverageDelta(before.coverage.tools.ratio, after.coverage.tools.ratio),
      keywords: coverageDelta(before.coverage.keywords.ratio, after.coverage.keywords.ratio),
    },
    gainedSupport,
    retainedSupport,
    unresolvedRequired,
    regressions,
    requirements,
    boundary: {
      evidenceComparisonOnly: true,
      qualificationsInvented: false,
      hiringOutcomePredicted: false,
      humanReviewRequired: true,
    },
  };
}
