"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelixApplicationIntelligenceSchema = exports.HelixResumeEvidenceSchema = exports.HelixCompanyEvidenceSchema = exports.HelixSystemEvidenceSchema = void 0;
exports.getHelixEvidenceContext = getHelixEvidenceContext;
const helix_resume_evidence_json_1 = __importDefault(require("../data/helix-resume-evidence.json"));
const helix_application_intelligence_json_1 = __importDefault(require("../data/helix-application-intelligence.json"));
const zod_1 = require("zod");
const Sha40Schema = zod_1.z.string().regex(/^[a-f0-9]{40}$/);
const Sha64Schema = zod_1.z.string().regex(/^[a-f0-9]{64}$/);
const RepositorySchema = zod_1.z.string().regex(/^GlacierEQ\/[A-Za-z0-9_.-]+$/);
const PublicStateSchema = zod_1.z.enum(["PROMOTED", "REFERENCE_ONLY"]);
const LevelSchema = zod_1.z.enum(["L1", "L2", "L3", "L4", "L5"]);
const CompanyStageSchema = zod_1.z.enum([
    "MAPPED_ONLY",
    "ROLE_VERIFIED",
    "PROBLEM_BOUNDED",
    "CODE_INSPECTED",
    "IMPLEMENTED",
    "PROOF_REPRODUCED",
    "CLAIM_PROMOTED",
]);
exports.HelixSystemEvidenceSchema = zod_1.z
    .object({
    system_id: zod_1.z.string().min(1),
    repository: RepositorySchema,
    level: LevelSchema,
    state: PublicStateSchema,
    role: zod_1.z.string().min(1),
    evidence: zod_1.z.string().min(1),
    next_gate: zod_1.z.string().min(1),
    resume_use: zod_1.z.enum(["PRIMARY_EVIDENCE", "SUPPORTING_EVIDENCE_WITH_BOUNDARY"]),
})
    .superRefine((system, context) => {
    if (system.state === "REFERENCE_ONLY" &&
        system.resume_use !== "SUPPORTING_EVIDENCE_WITH_BOUNDARY") {
        context.addIssue({
            code: "custom",
            path: ["resume_use"],
            message: "REFERENCE_ONLY systems require a supporting-evidence boundary.",
        });
    }
});
exports.HelixCompanyEvidenceSchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    display_name: zod_1.z.string().min(1),
    target_roles: zod_1.z.array(zod_1.z.string()),
    recruiter_thesis: zod_1.z.string(),
    gap_or_next_gate: zod_1.z.string(),
    public_repositories: zod_1.z.array(zod_1.z.object({
        repository: RepositorySchema,
        level: LevelSchema,
        promotion_state: PublicStateSchema,
    })),
    applicable_flagships: zod_1.z.array(zod_1.z.string()),
    non_affiliation: zod_1.z.string().min(1),
});
exports.HelixResumeEvidenceSchema = zod_1.z
    .object({
    schema: zod_1.z.literal("glaciereq.resume-evidence-projection.v1"),
    source: zod_1.z.object({
        authority: zod_1.z.object({
            repository: zod_1.z.literal("GlacierEQ/job-app-helix"),
            branch: zod_1.z.literal("main"),
            path: zod_1.z.string().min(1),
            raw_url: zod_1.z.string().url(),
        }),
        root_version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
        root_ref: Sha40Schema,
        source_digest: Sha64Schema,
        source_hashes: zod_1.z.record(zod_1.z.string().min(1), Sha64Schema),
    }),
    policy: zod_1.z.object({
        source_resume_remains_authoritative: zod_1.z.literal(true),
        helix_may_rank_but_not_invent: zod_1.z.literal(true),
        private_repository_names_allowed: zod_1.z.literal(false),
        allowed_public_states: zod_1.z.array(PublicStateSchema).min(1),
        blocked_states_are_context_only: zod_1.z.boolean(),
    }),
    systems: zod_1.z.array(exports.HelixSystemEvidenceSchema).min(1),
    companies: zod_1.z.array(exports.HelixCompanyEvidenceSchema).min(1),
    live_evidence_reference: zod_1.z.object({
        schema: zod_1.z.string().min(1),
        source_path: zod_1.z.string().min(1),
        content_sha256: Sha64Schema,
        boundary: zod_1.z
            .string()
            .includes("Repository-native current-SHA receipts remain authoritative"),
    }),
    invariants: zod_1.z.array(zod_1.z.string().min(1)).min(5),
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
const ApplicationIntelligenceCompanySchema = zod_1.z.object({
    company_id: zod_1.z.string().min(1),
    display_name: zod_1.z.string().min(1),
    target_roles: zod_1.z.array(zod_1.z.string()),
    observed_current_pressure: zod_1.z.string(),
    inferred_bottleneck: zod_1.z.string(),
    inferred_brick_wall: zod_1.z.string(),
    application_move: zod_1.z.string(),
    next_deep_dive: zod_1.z.string(),
    leverage: zod_1.z.object({
        impact_class: zod_1.z.string(),
        mechanism: zod_1.z.string(),
        expected_impact: zod_1.z.string(),
        glaciereq_systems: zod_1.z.array(zod_1.z.string()),
    }),
    second_depth: zod_1.z.object({
        stage: CompanyStageSchema,
        claim_ceiling: zod_1.z.string().min(1),
        blockers: zod_1.z.array(zod_1.z.string()),
        next_gate: zod_1.z.string(),
    }),
});
exports.HelixApplicationIntelligenceSchema = zod_1.z
    .object({
    schema: zod_1.z.literal("glaciereq.resume-application-intelligence.v1"),
    source: zod_1.z.object({
        root_ref: Sha40Schema,
        root_version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
        source_digest: Sha64Schema,
        source_hashes: zod_1.z.record(zod_1.z.string().min(1), Sha64Schema),
        external_research_as_of: zod_1.z.string().min(1),
        external_freshness_state: zod_1.z.string().min(1),
    }),
    boundary: zod_1.z.object({
        may_publish_private_records: zod_1.z.literal(false),
        inference_boundary: zod_1.z.string().min(1),
        source_resume_remains_authoritative: zod_1.z.literal(true),
        company_intelligence_may_rank_but_not_invent_experience: zod_1.z.literal(true),
    }),
    companies: zod_1.z.array(ApplicationIntelligenceCompanySchema).min(1),
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
const parsedEvidence = exports.HelixResumeEvidenceSchema.safeParse(helix_resume_evidence_json_1.default);
if (!parsedEvidence.success) {
    throw new Error(`Helix résumé evidence failed runtime validation: ${parsedEvidence.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`);
}
const parsedIntelligence = exports.HelixApplicationIntelligenceSchema.safeParse(helix_application_intelligence_json_1.default);
if (!parsedIntelligence.success) {
    throw new Error(`Helix application intelligence failed runtime validation: ${parsedIntelligence.error.issues
        .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
        .join("; ")}`);
}
const evidence = parsedEvidence.data;
const intelligence = parsedIntelligence.data;
function getHelixEvidenceContext() {
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
