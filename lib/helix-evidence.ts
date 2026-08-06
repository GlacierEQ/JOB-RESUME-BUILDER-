import helixEvidence from "@/data/helix-resume-evidence.json";

interface HelixSystemEvidence {
  system_id: string;
  repository: string;
  level: string;
  state: "PROMOTED" | "REFERENCE_ONLY";
  role: string;
  evidence: string;
  next_gate: string;
  resume_use: "PRIMARY_EVIDENCE" | "SUPPORTING_EVIDENCE_WITH_BOUNDARY";
}

interface HelixCompanyEvidence {
  company_id: string;
  display_name: string;
  target_roles: string[];
  recruiter_thesis: string;
  gap_or_next_gate: string;
  public_repositories: Array<{
    repository: string;
    level: string;
    promotion_state: "PROMOTED" | "REFERENCE_ONLY";
  }>;
  applicable_flagships: string[];
  non_affiliation: string;
}

interface HelixResumeEvidence {
  schema: "glaciereq.resume-evidence-projection.v1";
  source: {
    authority: { repository: string };
    source_digest: string;
  };
  policy: {
    source_resume_remains_authoritative: boolean;
    helix_may_rank_but_not_invent: boolean;
    private_repository_names_allowed: boolean;
  };
  systems: HelixSystemEvidence[];
  companies: HelixCompanyEvidence[];
}

const evidence = helixEvidence as HelixResumeEvidence;

function assertEvidenceContract(): void {
  if (evidence.schema !== "glaciereq.resume-evidence-projection.v1") {
    throw new Error("Helix résumé evidence schema mismatch.");
  }
  if (evidence.source.authority.repository !== "GlacierEQ/job-app-helix") {
    throw new Error("Helix résumé evidence authority mismatch.");
  }
  if (!/^[a-f0-9]{64}$/.test(evidence.source.source_digest)) {
    throw new Error("Helix résumé evidence source digest is invalid.");
  }
  if (!evidence.policy.source_resume_remains_authoritative) {
    throw new Error("Source résumé authority must remain enabled.");
  }
  if (!evidence.policy.helix_may_rank_but_not_invent) {
    throw new Error("Helix rank-not-invent policy must remain enabled.");
  }
  if (evidence.policy.private_repository_names_allowed) {
    throw new Error("Private repository names are forbidden in résumé evidence.");
  }
}

export function getHelixEvidenceContext(): {
  sourceDigest: string;
  systems: HelixSystemEvidence[];
  companies: HelixCompanyEvidence[];
  instructions: string[];
} {
  assertEvidenceContract();
  return {
    sourceDigest: evidence.source.source_digest,
    systems: evidence.systems,
    companies: evidence.companies,
    instructions: [
      "The source résumé is authoritative for employers, titles, dates, metrics, and personal history.",
      "Helix evidence may rank or contextualize an existing claim; it may not add a fact absent from the source résumé.",
      "PROMOTED systems may be treated as primary portfolio evidence only when the source résumé already identifies the work.",
      "REFERENCE_ONLY systems require an explicit boundary and may not be described as deployed, production-proven, or employer-affiliated.",
      "Company alignment is independent work and never establishes affiliation, endorsement, employment, proprietary access, or production deployment.",
    ],
  };
}
