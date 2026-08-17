import assert from "node:assert/strict";
import test from "node:test";

import {
  HelixApplicationIntelligenceSchema,
  getHelixEvidenceContext,
} from "../lib/helix-evidence";
import applicationIntelligence from "../data/helix-application-intelligence.json";


test("application intelligence is runtime validated and bound to the same Helix revision", () => {
  const parsed = HelixApplicationIntelligenceSchema.parse(applicationIntelligence);
  const context = getHelixEvidenceContext();

  assert.equal(parsed.source.root_ref, context.sourceCommit);
  assert.equal(context.applicationIntelligence.sourceCommit, context.sourceCommit);
  assert.match(context.applicationIntelligence.sourceDigest, /^[a-f0-9]{64}$/);
  assert.ok(context.applicationIntelligence.companies.length >= 40);
});


test("company intelligence exposes second-depth constraints and application strategy", () => {
  const context = getHelixEvidenceContext();
  const lockheed = context.applicationIntelligence.companies.find(
    (company) => company.company_id === "lockheed_martin",
  );

  assert.ok(lockheed);
  assert.equal(lockheed.second_depth.stage, "CLAIM_PROMOTED");
  assert.equal(lockheed.second_depth.claim_ceiling, "proof_bound_company_specific");
  assert.ok(lockheed.application_move.length > 0);
  assert.ok(lockheed.observed_current_pressure.length > 0);
  assert.ok(lockheed.leverage.glaciereq_systems.length > 0);
});


test("historical external intelligence remains explicitly bounded in prompt context", () => {
  const context = getHelixEvidenceContext();

  assert.match(
    context.applicationIntelligence.externalFreshnessState,
    /REQUIRES_REFRESH_BEFORE_LIVE_APPLICATION/,
  );
  assert.match(
    context.applicationIntelligence.inferenceBoundary,
    /GlacierEQ inferences/,
  );
  assert.ok(
    context.instructions.some((instruction) =>
      instruction.includes("second-depth stage and claim ceiling"),
    ),
  );
});
