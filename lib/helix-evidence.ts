import helixEvidence from "../data/helix-resume-evidence.json";
import applicationIntelligence from "../data/helix-application-intelligence.json";
import { z } from "zod";

const Sha40Schema = z.string().regex(/^[a-f0-9]{40}$/);
const Sha64Schema = z.string().regex(/^[a-f0-9]{64}$/);
const RepositorySchema = z.string().regex(/^GlacierEQ\/[A-Za-z0-9_.-]+$/);
const PublicStateSchema = z.enum(["PROMOTED", "REFERENCE_ONLY"]);
const LevelSchema = z.enum(["L1", "L2", "L3", "L4", "L5"]);
const CompanyStageSchema = z.enum([
  "MAPPED_ONLY",
  "ROLE_VERIFIED",
  "PROBLEM_BOUNDED",
  "CODE_INSPECTED",
  "IMPLEMENTED",
  "PROOF_REPRODUCED",
  "CLAIM_PROMOTED",
]);

export const HelixSystemEvidenceSchema = z
  .object({
    system_id: z.string().min(1),
    repository: RepositorySchema,
    level: LevelSchema,
    state: PublicStateSchema,
    role: z.string().min(1),
    evidence: z.string().min(1),
    next_gate: z.string().min(1),
    resume_use: z.enum(["PRIMARY_EVIDENCE", "SUPPORTING_EVIDENCE_WITH_BOUNDARY"]),
  })
  .superRefine((system, context) => {
    if (
      system.state === "REFERENCE_ONLY" &&
      system.resume_use !== "SUPPORTING_EVIDENCE_WITH_BOUNDARY"
    ) {
      context.addIssue({
        code: "custom",
        path: ["resume_use"],
        message: "REFERENCE_ONLY systems require a supporting-evidence boundary.",
      });
    }
  });

export const HelixCompanyEvidenceSchema = z.object({
  company_id: z.string().min(1),
  display_name: z.string().min(1),
  target_roles: z.array(z.string()),
  recruiter_thesis: z.string(),
  gap_or_next_gate: z.string(),
  public_repositories: z.array(
    z.object({
      repository: RepositorySchema,
      level: LevelSchema,
      promotion_state: PublicStateSchema,
    }),
  ),
  applicable_flagships: z.array(z.string()),
  non_affiliation: z.string().min(1),
});

export const HelixResumeEvidenceSchema = z
  .object({
    schema: z.literal("glaciereq.resume-evidence-projection.v1"),
    source: z.object({
      authority: z.object({
        repository: z.literal("GlacierEQ/job-app-helix"),
        branch: z.literal("main"),
        path: z.string().min(1),
        raw_url: z.string().url(),
      }),
      root_version: z.string().regex(/^\d+\.\d+\.\d+$/),
      root_ref: Sha40Schema,
      source_digest: Sha64Schema,
      source_hashes: z.record(z.string().min(1), Sha64Schema),
    }),
    policy: z.object({
      source_resume_remains_authoritative: z.literal(true),
      helix_may_rank_but_not_invent: z.literal(true),
      private_repository_names_allowed: z.literal(false),
      allowed_public_states: z.array(PublicStateSchema).min(1),
      blocked_states_are_context_only: z.boolean(),
    }),
    systems: z.array(HelixSystemEvidenceSchema).min(1),
    companies: z.array(HelixCompanyEvidenceSchema).min(1),
    live_evidence_reference: z.object({
      schema: z.string().min(1),
      source_path: z.string().min(1),
      content_sha256: Sha64Schema,
      boundary: z
        .string()
        .includes("Repository-native current-SHA receipts remain authoritative"),
    }),
    invariants: z.array(z.string().min(1)).min(5),
  })
  .strict()
  .superRefine((evidence, context) => {
    const systemIds = evidence.systems.map((system) => system.system_id);
    if (new Set(systemIds).size !== systemIds.length) {
      context.addIssue({
        code: "custom",
        path: ["systems"],
        message: "Helix evidence contains duplicate system IDs.",
      });
    }

    const companyIds = evidence.companies.map((company) => company.company_id);
    if (new Set(companyIds).size !== companyIds.length) {
      context.addIssue({
        code: "custom",
        path: ["companies"],
        message: "Helix evidence contains duplicate company IDs.",
      });
    }

    const allowedStates = new Set(evidence.policy.allowed_public_states);
    if (allowedStates.size !== evidence.policy.allowed_public_states.length) {
      context.addIssue({
        code: "custom",
        path: ["policy", "allowed_public_states"],
        message: "Allowed public states must be unique.",
      });
    }
  });

const ApplicationIntelligenceCompanySchema = z.object({
  company_id: z.string().min(1),
  display_name: z.string().min(1),
  target_roles: z.array(z.string()),
  observed_current_pressure: z.string(),
  inferred_bottleneck: z.string(),
  inferred_brick_wall: z.string(),
  application_move: z.string(),
  next_deep_dive: z.string(),
  leverage: z.object({
    impact_class: z.string(),
    mechanism: z.string(),
    expected_impact: z.string(),
    glaciereq_systems: z.array(z.string()),
  }),
  second_depth: z.object({
    stage: CompanyStageSchema,
    claim_ceiling: z.string().min(1),
    blockers: z.array(z.string()),
    next_gate: z.string(),
  }),
});

export const HelixApplicationIntelligenceSchema = z
  .object({
    schema: z.literal("glaciereq.resume-application-intelligence.v1"),
    source: z.object({
      root_ref: Sha40Schema,
      root_version: z.string().regex(/^\d+\.\d+\.\d+$/),
      source_digest: Sha64Schema,
      source_hashes: z.record(z.string().min(1), Sha64Schema),
      external_research_as_of: z.string().min(1),
      external_freshness_state: z.string().min(1),
    }),
    boundary: z.object({
      may_publish_private_records: z.literal(false),
      inference_boundary: z.string().min(1),
      source_resume_remains_authoritative: z.literal(true),
      company_intelligence_may_rank_but_not_invent_experience: z.literal(true),
    }),
    companies: z.array(ApplicationIntelligenceCompanySchema).min(1),
  })
  .strict()
  .superRefine((intelligence, context) => {
    const companyIds = intelligence.companies.map((company) => company.company_id);
    if (new Set(companyIds).size !== companyIds.length) {
      context.addIssue({
        code: "custom",
        path: ["companies"],
        message: "Application intelligence contains duplicate company IDs.",
      });
    }
  });

export type HelixSystemEvidence = z.infer<typeof HelixSystemEvidenceSchema>;
export type HelixCompanyEvidence = z.infer<typeof HelixCompanyEvidenceSchema>;
export type HelixResumeEvidence = z.infer<typeof HelixResumeEvidenceSchema>;
export type HelixApplicationIntelligence = z.infer<typeof HelixApplicationIntelligenceSchema>;

export interface HelixEvidenceContext {
  readonly sourceCommit: string;
  readonly sourceDigest: string;
  readonly systems: readonly HelixSystemEvidence[];
  readonly companies: readonly HelixCompanyEvidence[];
  readonly applicationIntelligence: {
    readonly sourceCommit: string;
    readonly sourceDigest: string;
    readonly externalResearchAsOf: string;
    readonly externalFreshnessState: string;
    readonly inferenceBoundary: string;
    readonly companies: readonly HelixApplicationIntelligence["companies"][number][];
  };
  readonly instructions: readonly string[];
}

const parsedEvidence = HelixResumeEvidenceSchema.safeParse(helixEvidence);
if (!parsedEvidence.success) {
  throw new Error(
    `Helix résumé evidence failed runtime validation: ${parsedEvidence.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ")}`,
  );
}

const parsedIntelligence = HelixApplicationIntelligenceSchema.safeParse(applicationIntelligence);
if (!parsedIntelligence.success) {
  throw new Error(
    `Helix application intelligence failed runtime validation: ${parsedIntelligence.error.issues
      .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
      .join("; ")}`,
  );
}

const evidence = parsedEvidence.data;
const intelligence = parsedIntelligence.data;

export function getHelixEvidenceContext(): HelixEvidenceContext {
  return {
    sourceCommit: evidence.source.root_ref,
    sourceDigest: evidence.source.source_digest,
    systems: evidence.systems,
    companies: evidence.companies,
    applicationIntelligence: {
      sourceCommit: intelligence.source.root_ref,
      sourceDigest: intelligence.source.source_digest,
      externalResearchAsOf: intelligence.source.external_research_as_of,
      externalFreshnessState: intelligence.source.external_freshness_state,
      inferenceBoundary: intelligence.boundary.inference_boundary,
      companies: intelligence.companies,
    },
    instructions: [
      "The source résumé is authoritative for employers, titles, dates, metrics, and personal history.",
      "Helix evidence may rank or contextualize an existing claim; it may not add a fact absent from the source résumé.",
      "PROMOTED systems may be treated as primary portfolio evidence only when the source résumé already identifies the work.",
      "REFERENCE_ONLY systems require an explicit boundary and may not be described as deployed, production-proven, or employer-affiliated.",
      "Company alignment is independent work and never establishes affiliation, endorsement, employment, proprietary access, or production deployment.",
      "Use company second-depth stage and claim ceiling to control the strength of company-specific framing; do not skip unmet stages.",
      "Observed company pressure comes from the dated external-source snapshot. Bottlenecks, brick walls, leverage, impact, and application moves are GlacierEQ inferences, not employer-confirmed internal facts.",
      "When external intelligence is marked stale, use it only as historical ranking context until refreshed; never describe it as a current opening or current employer condition.",
    ],
  };
}
