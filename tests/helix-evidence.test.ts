import assert from "node:assert/strict";
import test from "node:test";

import { getHelixEvidenceContext } from "../lib/helix-evidence";


test("Helix evidence remains public, bounded, and source-authoritative", () => {
  const context = getHelixEvidenceContext();
  assert.match(context.sourceCommit, /^[a-f0-9]{40}$/);
  assert.match(context.sourceDigest, /^[a-f0-9]{64}$/);
  assert.ok(context.systems.length > 0);
  assert.ok(context.companies.length > 0);
  assert.equal(new Set(context.systems.map((system) => system.system_id)).size, context.systems.length);
  assert.equal(new Set(context.companies.map((company) => company.company_id)).size, context.companies.length);

  for (const system of context.systems) {
    assert.ok(["PROMOTED", "REFERENCE_ONLY"].includes(system.state));
    assert.match(system.repository, /^GlacierEQ\/[A-Za-z0-9_.-]+$/);
    assert.ok(["PRIMARY_EVIDENCE", "SUPPORTING_EVIDENCE_WITH_BOUNDARY"].includes(system.resume_use));
    if (system.state === "REFERENCE_ONLY") {
      assert.equal(system.resume_use, "SUPPORTING_EVIDENCE_WITH_BOUNDARY");
    }
  }

  for (const company of context.companies) {
    assert.ok(company.non_affiliation.length > 0);
    for (const repository of company.public_repositories) {
      assert.ok(["PROMOTED", "REFERENCE_ONLY"].includes(repository.promotion_state));
      assert.match(repository.repository, /^GlacierEQ\/[A-Za-z0-9_.-]+$/);
    }
  }

  assert.ok(context.instructions.some((instruction) => instruction.includes("source résumé is authoritative")));
  assert.ok(context.instructions.some((instruction) => instruction.includes("may not add a fact absent")));
  assert.ok(context.instructions.some((instruction) => instruction.includes("never establishes affiliation")));
});
