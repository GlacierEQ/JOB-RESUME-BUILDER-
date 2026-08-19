import assert from "node:assert/strict";
import test from "node:test";

import {
  HelixApplicationIntelligenceSchema,
  getHelixEvidenceContext,
} from "../lib/helix-evidence";
import applicationIntelligence from "../data/helix-application-intelligence.json";

test("application intelligence is runtime validated and exact-revision bound", () => {
  const parsed = HelixApplicationIntelligenceSchema.parse(applicationIntelligence);
  const context = getHelixEvidenceContext();

  assert.equal(parsed.source.root_ref, context.sourceCommit);
  assert.equal(context.applicationIntelligence.sourceCommit, context.sourceCommit);
  assert.match(context.applicationIntelligence.sourceDigest, /^[a-f0-9]{64}$/);
  assert.ok(context.applicationIntelligence.companies.length > 0);
});

test("company intelligence preserves second-depth and application-strategy boundaries", () => {
  const context = getHelixEvidenceContext();

  for (const company of context.applicationIntelligence.companies) {
    assert.ok(company.company_id.length > 0);
    assert.ok(company.second_depth.stage.length > 0);
    assert.ok(company.second_depth.claim_ceiling.length > 0);
    assert.equal(Array.isArray(company.second_depth.blockers), true);
  }

  assert.ok(
    context.instructions.some((instruction) =>
      instruction.includes("second-depth stage and claim ceiling"),
    ),
  );
  assert.ok(
    context.instructions.some((instruction) =>
      instruction.includes("GlacierEQ inferences"),
    ),
  );
});

test("application intelligence cannot drift away from the resume evidence revision", () => {
  const context = getHelixEvidenceContext();

  assert.equal(context.applicationIntelligence.sourceCommit, context.sourceCommit);
  assert.notEqual(context.applicationIntelligence.sourceDigest, context.sourceDigest);
  assert.ok(context.applicationIntelligence.externalResearchAsOf.length > 0);
  assert.ok(context.applicationIntelligence.externalFreshnessState.length > 0);
  assert.ok(context.applicationIntelligence.inferenceBoundary.length > 0);
});
