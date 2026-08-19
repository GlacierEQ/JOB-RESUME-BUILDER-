# APEX_BLUEPRINT_V1

lane: JOB_RESTORE
verified_executable_capability_delta: YES

## Current source
- owning_repo: GlacierEQ/JOB-RESUME-BUILDER-
- source_sha_after_merge: 361b3119e8dc35a5faf7f54f55a42e02e7e14fa8
- primary_runtime_blob: 32909d601b15d18c6ecbd9574b017ac67eddf22d
- source_file: scripts/sync-helix-application-intelligence.mjs
- runtime_context: lib/helix-evidence.ts
- proof_workflow: .github/workflows/verify.yml

## Donor SHAs / recovery lineage
- stranded branch: apex/reconnect-helix-application-intelligence-20260817
- donor sync blob: c8999f7345c7df800b831ebbef1deed170786077
- donor runtime-context blob: d941e2ae6263235b0c4012d0b17c6d4b17bc07ca
- Helix exact source revision proven in CI: 725e785453ab01350d7b273c94ddb4dac70501af
- prior main before restoration: 0e90c4000995d2e19144ffa87573e004bcc81ce8

## Selected priority
- tier: P2
- priority: Restore the stranded live Helix application-intelligence bridge so current company pressure, bounded GlacierEQ inference, application strategy, leverage, and second-depth claim ceilings enter the real resume-tailoring runtime from one exact immutable Helix revision.

## Blocked higher candidate
- P1 real xAI `ready_for_human_submission=true` remains blocked on explicit applicant-confirmed values for the unresolved live Greenhouse fields. No applicant-controlled value was inferred.

## Displaced capability
Current main retained exact-revision Helix resume evidence and the restored application compiler, but the richer cross-repo company application-intelligence synchronizer remained stranded on `apex/reconnect-helix-application-intelligence-20260817`. As a result, `tailorResume()` could consume portfolio evidence but not the stranded current company-pressure/application-strategy/second-depth intelligence plane.

## Implemented delta
- Restored `scripts/sync-helix-application-intelligence.mjs` into current main lineage.
- Restored runtime Zod validation and `applicationIntelligence` into `getHelixEvidenceContext()`.
- `services/tailoring-engine.ts` already injects the full Helix evidence context into the production tailoring prompt, so the recovered intelligence now reaches the existing executable path without replacing later compiler work.
- Build/test/dev preparation resolves one `HELIX_ROOT_SHA` and synchronizes resume evidence plus application intelligence from that same immutable revision.
- Added `sync:helix:application` as an explicit executable.
- CI now archives both exact-revision projections and receipts.
- Recovered sync validates projection identity, public/private boundary, required sources, schemas, duplicate company IDs, shard counts, second-depth overlays, and observation/inference separation.
- Refined a stranded donor defect: legacy atlas `shard_sha256` is a logical generator digest embedded in both shard and index, not a raw serialized-byte hash. The restored runtime now verifies index↔shard logical digest equality while independently SHA-256 hashing every transported source byte and binding all bytes to the immutable Git commit.

## Mechanisms compared
1. Blindly merge the stale branch: rejected because it was diverged and would risk displacing later compiler and boundary work.
2. Rebuild a new company-intelligence subsystem from scratch: rejected because the stranded mechanism already contained strong exact-source, fail-closed, second-depth, and inference-boundary logic.
3. Selected nonlinear composition: recover only the stranded sync/runtime-context mechanism into current main, preserve later compiler/routes/boundaries, then strengthen its integrity model for self-referential shard digests.

## Preserved gains
- Existing application compiler and artifact generation remain intact.
- Existing truthfulness and Helix boundary guards remain intact.
- Existing exact-revision resume evidence remains authoritative.
- Source resume remains authoritative for personal history and claims.
- No private estate records enter the resume projection.
- No stale fallback is permitted.
- External observations remain separated from GlacierEQ inferences.

## Tests / runtime proof
- PR #13 exact proven head: c632187e730eb9f36e9d2816d270d2b737741028.
- First run 32223195867 exposed missing application-intelligence generation plus a typed fixture dependency; fixed without weakening the runtime.
- Second run 32223311294 reached live Helix application sync and exposed the stranded donor's incorrect raw-byte interpretation of the self-referential shard digest.
- Refined exact-head run 32223483964: PASS.
- Job 95978403394: exact source resolve PASS; dual projection sync PASS; deterministic tests PASS; lint PASS; production Next build PASS; artifact upload PASS.
- Proof artifact 9354733171, SHA-256 `63e7b30cdaa07ffba95dcae6c63b1f11da04dc6d5974149e4cab7b189b7a99c6`.
- Squash merge: 361b3119e8dc35a5faf7f54f55a42e02e7e14fa8.
- Post-merge main readback confirmed runtime blob 32909d601b15d18c6ecbd9574b017ac67eddf22d.

## Exact target files / functions
- scripts/sync-helix-application-intelligence.mjs: `main`, `resolveHelixSha`, `publicSecondDepth`, source hashing and shard validation
- lib/helix-evidence.ts: `HelixApplicationIntelligenceSchema`, `getHelixEvidenceContext`
- services/tailoring-engine.ts: existing `tailorResume` prompt composition consumer

## Top 3 remaining priorities
1. P1: bind explicit applicant-confirmed xAI values through the semantic-answer bridge and produce `ready_for_human_submission=true` without external submission.
2. P2: recover the stranded `apex/application-evidence-package-20260817` application-readiness API/runtime onto current `JOB-RESUME-BUILDER-` while preserving the restored Helix intelligence and current compiler.
3. P2: recover/upgrade the strongest remaining readiness-dossier or evidence-projection mechanism only after exact diff and native-runtime proof show a real executable delta.

## Next sequence
1. Reconstruct explicit xAI applicant values if/when available; do not infer them.
2. Otherwise inspect `apex/application-evidence-package-20260817` against current main and recover only its application-readiness runtime/API/tests.
3. Run deterministic tests, lint, production build, target-native observation, exact-head PR merge, post-merge readback.

## Merge / deploy gate
- Executable gate passed: exact source resolution + live cross-repo sync + deterministic tests + lint + production build + artifact receipt + exact-head merge + post-merge readback.
- No external job submission occurred.

## Rollback
Revert merge `361b3119e8dc35a5faf7f54f55a42e02e7e14fa8` to remove the restored application-intelligence plane. The prior resume-evidence-only path remains independently recoverable from `0e90c4000995d2e19144ffa87573e004bcc81ce8`.

## No-loss invariants
- Never infer applicant-controlled values.
- Never allow application intelligence to come from a different Helix revision than resume evidence in the same preparation cycle.
- Never allow stale fallback.
- Never expose private estate identities through resume intelligence.
- Never convert GlacierEQ inference into employer-observed fact.
- Preserve current application compiler, truthfulness guard, Helix boundary guard, and human review boundary.
