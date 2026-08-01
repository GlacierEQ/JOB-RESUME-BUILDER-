# Resume Shapeshifter — Truth-Constrained Résumé Tailoring

> Improves résumé relevance against a job description while rejecting unsupported employers, titles, skills, metrics, experience structure, and model output.

**Role:** `PRODUCT_FLAGSHIP`  
**Visibility:** `PUBLIC`  
**Canonical branch:** `main`  
**Release:** `0.1.0`  
**Status:** `PARTIALLY_VERIFIED` — deterministic truthfulness tests, lint, and production build passed in GitHub Actions on the July 31, 2026 evidence-contract change; production deployment, end-to-end browser behavior, score calibration, document export, persistence, privacy operations, observability, rate limiting, and semantic completeness remain unverified.

## For recruiters and non-technical reviewers

Resume Shapeshifter demonstrates product engineering under a strict honesty constraint. It compares a résumé with a job description, identifies gaps, proposes targeted rewrites, and keeps the original material visible for human review.

The central product decision is simple: **model output is untrusted input**. A polished rewrite is not returned merely because a model produced valid-looking JSON. It must first pass schema validation and deterministic source-grounding rules.

### What the product does

1. **Understand the source.** Parse the résumé and job description into structured information.
2. **Assess relevance.** Identify matches and gaps without treating a score as a hiring probability.
3. **Propose changes.** Generate targeted rewrite candidates through an external model boundary.
4. **Reject fabrication.** Block changed employers or titles, missing source bullets, unsupported skills, altered experience structure, and new numeric claims.
5. **Preserve human authority.** Show original and proposed material side by side rather than silently replacing the source.

### Proof in 60 seconds

| Open or run | What it proves | Current state |
|---|---|---|
| [`lib/truthfulness.ts`](lib/truthfulness.ts) | The deterministic source-grounding boundary | Implemented |
| [`tests/truthfulness.test.ts`](tests/truthfulness.test.ts) | Faithful and adversarial rewrite cases | Verified in prior CI |
| [`app/api/analyze/route.ts`](app/api/analyze/route.ts) | Analysis request boundary | Implemented |
| [`app/api/tailor/route.ts`](app/api/tailor/route.ts) | Tailoring, schema validation, and truthfulness enforcement | Implemented |
| [`services/groq.ts`](services/groq.ts) | Explicit failure when model configuration or responses are unavailable or invalid | Implemented |
| [`.github/workflows/verify.yml`](.github/workflows/verify.yml) | `npm ci`, tests, lint, and build verification | Prior run succeeded |

### Capability boundary

| Capability | State | Evidence or gap |
|---|---|---|
| Résumé and job-description parsing | Implemented | `services/resume-parser.ts`, `services/jd-parser.ts` |
| Match and gap analysis | Implemented | `services/match-engine.ts`, `services/gap-engine.ts` |
| Tailored rewrite generation | Implemented | `services/tailoring-engine.ts` |
| Schema-validated model output | Implemented | `lib/schemas.ts` |
| Deterministic truthfulness guard | Implemented and tested | `lib/truthfulness.ts`, `tests/truthfulness.test.ts` |
| Side-by-side human review | Implemented | `components/SideBySideDiff.tsx` |
| Automated test, lint, and build workflow | Implemented and previously successful | `.github/workflows/verify.yml` |
| Downloadable document or PDF export | Not implemented | product gap |
| Persistent accounts and saved runs | Not implemented | product gap |
| Verified production deployment | Not verified | no provider receipt |
| Empirically calibrated match score | Not verified | no documented evaluation dataset or method |

### Claim boundary

This repository does **not** claim:

- that a generated score predicts applicant-tracking, interview, or hiring outcomes;
- that a model prompt alone prevents unsupported claims;
- that deterministic checks detect every semantically unsupported paraphrase;
- that a successful build proves production deployment;
- that document export, persistence, authentication, privacy operations, rate limiting, observability, or abuse protection are complete;
- that user résumé data is currently governed by a production retention and deletion policy;
- that the configured external model service will always be available or valid.

## For senior engineers and domain experts

### System boundary

**This repository owns**

- résumé and job-description parsing;
- source match and gap analysis;
- generation of proposed rewrites;
- structured model-output validation;
- deterministic truthfulness checks represented by the current schema;
- side-by-side review UI;
- explicit model-service failure behavior;
- repository-native test, lint, and build verification.

**This repository does not own**

- external model availability or policy;
- hiring-outcome prediction;
- applicant-tracking-system behavior;
- production identity, persistence, retention, deletion, or access control;
- document generation and export;
- the public multi-project recruiter portal;
- the private application-state ledger.

### Request and trust flow

```text
résumé + job description
          │
          ▼
      /api/analyze
      ├── parse résumé
      ├── parse job description
      ├── assess source match
      └── identify gaps
          │
          ▼
     human gap review
          │
          ▼
       /api/tailor
      ├── request proposed rewrites
      ├── parse model response
      ├── validate schema with Zod
      ├── enforce deterministic truthfulness
      └── recompute tailored profile
          │
          ▼
  side-by-side human review
```

The model service can propose. It cannot establish truth.

### Deterministic truthfulness contract

The current validator rejects:

- employers absent from the source résumé;
- changed job titles;
- missing or mismatched original bullets;
- altered experience or bullet counts;
- numeric claims absent from the original source bullet;
- skills unsupported anywhere in the source résumé;
- model output that does not satisfy the expected schema.

The validator establishes an executable boundary around high-impact fabrication modes. It does not prove semantic equivalence, detect every misleading implication, or replace human review.

### Core engineering decisions

| Decision | Value | Cost or limitation |
|---|---|---|
| Treat model output as untrusted | prevents malformed or unsupported output from becoming product success | increases rejection rate and implementation complexity |
| Combine schema and deterministic validation | separates structural validity from source truth | represented rules are narrower than full semantic truth |
| Preserve source bullets and counts | makes experience mutation reviewable | limits aggressive résumé restructuring |
| Recompute the tailored profile after validation | prevents an invalid model-provided score from becoming authoritative | score remains an uncalibrated assessment |
| Surface model-service failures | avoids canned or fake success states | users receive an explicit failure instead of partial output |
| Keep human side-by-side review | preserves user authority | final quality depends on careful review |

### Correctness and failure behavior

| Condition | Required behavior | Evidence |
|---|---|---|
| missing `GROQ_API_KEY` | explicit model-service unavailable error | `services/groq.ts` |
| upstream request fails | surface explicit failure | model-service boundary |
| response is empty or malformed | reject before product response | service and route handling |
| model output violates schema | reject before truthfulness evaluation completes | `lib/schemas.ts` |
| employer or title changes | reject tailored result | truthfulness tests |
| source bullet disappears or changes identity | reject tailored result | truthfulness tests |
| unsupported skill or number appears | reject tailored result | truthfulness tests |
| score is uncalibrated | present as assessment, not hiring probability | documented product boundary |
| export requested | report product gap; do not fake completion | no export implementation |

### Security and privacy boundary

Résumé content and job descriptions can contain sensitive personal and employment information.

- **Untrusted inputs:** uploaded résumé text, job descriptions, external model responses, and user-provided filenames or content.
- **Secret entry:** `GROQ_API_KEY` belongs in runtime environment configuration and must not be committed.
- **External disclosure:** live tailoring sends selected content to the configured external model service; production use requires explicit privacy disclosure and provider review.
- **Current gaps:** authentication, authorization, request-size limits, rate limiting, audit logging, data retention, deletion, encryption policy, observability, and abuse protection are not implemented as a production system.
- **Human authority:** a validated rewrite is still a proposal. The user owns the final truth and submission decision.
- **Public evidence:** repository source and tests reveal implementation behavior; they do not prove production data handling.

### Verification

Requirements:

- Node.js 22 or a compatible runtime for Next.js 16;
- npm with the checked-in `package-lock.json`;
- `GROQ_API_KEY` only for live model-backed requests.

```bash
npm ci
npm test
npm run lint
npm run build
```

Development:

```bash
GROQ_API_KEY="..." npm run dev
```

Open `http://localhost:3000`.

Prior evidence-contract verification:

- PR head: `5d645a10b4a46c7f82b47198ab6b940ddba91204`
- Workflow: `verify`
- Run ID: `30655561724`
- Conclusion: `success`
- Merged as: `e40ddcf35bf7f21bb3eb99ff99b1990dcfe93033`

The new README architecture change must pass the same workflow before its verification scope is promoted.

### Claim ledger

| Claim | Evidence | Command or receipt | State |
|---|---|---|---|
| Deterministic truthfulness checks reject represented fabrication modes | `lib/truthfulness.ts`, `tests/truthfulness.test.ts` | `npm test` | VERIFIED at prior PR head |
| Repository passes lint | source and lint configuration | `npm run lint` | VERIFIED at prior PR head |
| Production build completes | Next.js source and build configuration | `npm run build` | VERIFIED at prior PR head |
| Model failures are surfaced rather than replaced with canned success | `services/groq.ts`, API routes | source review and prior CI | PARTIALLY_VERIFIED |
| Browser workflow works end to end | browser receipt | none | UNVERIFIED |
| Match score predicts hiring outcome | calibrated evaluation | none | UNVERIFIED and not claimed |
| Production deployment exists | provider receipt | none | UNVERIFIED |

### Production gates

1. Add integration tests across both API routes and all model-service failure paths.
2. Add browser-level end-to-end verification and a reproducible receipt.
3. Add request-size controls, rate limiting, audit logging, observability, and abuse protection.
4. Define privacy, retention, deletion, and external-model disclosure policies before production use.
5. Implement document generation and downloadable artifacts without fabricating an export-complete state.
6. Add persistence only with explicit identity, access-control, and lifecycle rules.
7. Calibrate or remove match-score claims through a documented evaluation method.
8. Deploy a preview and publish provider and release receipts.
9. Rename the repository without breaking public portal and Helix references.

### Exact contribution and provenance

- **Original:** product architecture, request flow, parsing and analysis services, truthfulness boundary, side-by-side review, tests, and repository hardening represented here.
- **Adapted:** Next.js, React, TypeScript, Zod, npm, and Node testing conventions.
- **Generated:** external model output is generated and treated as untrusted; documentation or implementation may include AI assistance subject to human and automated review.
- **External:** Groq model service and runtime, npm packages, browser environment, and GitHub Actions.
- **Unresolved:** complete authorship provenance for every file, production security controls, semantic-completeness evaluation, and deployed operating evidence.

### Repository map

```text
.
├── README.md                       product, evidence, and machine contract
├── app/
│   ├── api/analyze/route.ts        source analysis boundary
│   ├── api/tailor/route.ts         generation, schema, and truthfulness boundary
│   ├── tailor/page.tsx             tailoring workflow
│   └── page.tsx                    product entrypoint
├── components/                     input, scoring, gap, and review UI
├── services/
│   ├── groq.ts                     external model boundary
│   ├── resume-parser.ts            résumé parsing
│   ├── jd-parser.ts                job-description parsing
│   ├── match-engine.ts             source match assessment
│   ├── gap-engine.ts               gap identification
│   └── tailoring-engine.ts         proposed rewrite orchestration
├── lib/
│   ├── schemas.ts                  structured output contract
│   └── truthfulness.ts             deterministic source-grounding rules
├── tests/truthfulness.test.ts       nominal and adversarial checks
└── .github/workflows/verify.yml     clean install, test, lint, and build gate
```

## For AI systems and toolchains

```yaml
schema: glaciereq.readme.v1
profile: glaciereq.readme-impact.v2.1
repository: GlacierEQ/JOB-RESUME-BUILDER-
canonical_branch: main
role: PRODUCT_FLAGSHIP
visibility: PUBLIC
product_name: Resume Shapeshifter
package:
  name: resume-shapeshifter
  version: 0.1.0
purpose: >-
  Analyze a source résumé against a job description, generate targeted rewrite
  proposals through an external model boundary, reject represented unsupported
  claims deterministically, and preserve human review authority.
status:
  state: PARTIALLY_VERIFIED
  verified_at: 2026-07-31
  verified_release: 5d645a10b4a46c7f82b47198ab6b940ddba91204
  verified_scope:
    - deterministic truthfulness tests
    - repository lint
    - production build
    - schema and explicit model-failure source boundaries
  blocked_scope: []
  unverified_scope:
    - production deployment
    - end-to-end browser behavior
    - applicant-tracking and hiring-outcome prediction
    - semantic completeness of unsupported-claim detection
    - document export and persistence
    - production privacy, identity, rate limiting, observability, and abuse controls
interfaces:
  inputs:
    - source résumé text
    - job description text
    - external model response
  outputs:
    - structured match and gap analysis
    - source-grounded rewrite proposals
    - explicit validation or model-service failures
    - side-by-side human review surface
  commands:
    install: npm ci
    test: npm test
    lint: npm run lint
    build: npm run build
    develop: npm run dev
evidence:
  source:
    - app/api/analyze/route.ts
    - app/api/tailor/route.ts
    - services/tailoring-engine.ts
    - services/groq.ts
    - lib/schemas.ts
    - lib/truthfulness.ts
  tests:
    - tests/truthfulness.test.ts
  workflows:
    - .github/workflows/verify.yml
  receipts:
    - github-actions://GlacierEQ/JOB-RESUME-BUILDER-/30655561724
provenance:
  original:
    - product flow, truthfulness boundary, tests, and repository-specific implementation
  adapted:
    - Next.js, React, TypeScript, Zod, npm, and Node conventions
  generated:
    - model rewrite proposals treated as untrusted input
  external:
    - Groq model service, npm ecosystem, browser runtime, and GitHub Actions
relationships:
  - target: GlacierEQ/job-app-helix
    relation: GOVERNED_BY
    combined_value: Helix supplies the inventory, evidence ladder, README contract, rollout policy, and proof-promotion boundary for the flagship product.
adjacent_links:
  - target: GlacierEQ/job-application
    human_relation: PRESENTED_BY
    purpose: The public recruiter portal presents this repository as the lead product flagship without inheriting its unresolved production claims.
  - target: GlacierEQ/job-app
    human_relation: USED_BY_PRIVATE_OPERATIONS
    purpose: The private application workspace may use the product while retaining human approval and application-state authority.
limits:
  - model output remains untrusted until schema, deterministic, and human review complete
  - a match score is not a validated hiring probability
  - build evidence is not deployment evidence
  - current truthfulness rules are not semantically complete
  - production handling of personal résumé data is not established
```

## Portfolio integration

- **Public recruiter portal:** [`GlacierEQ/job-application`](https://github.com/GlacierEQ/job-application)
- **Evidence and rollout authority:** [`GlacierEQ/job-app-helix`](https://github.com/GlacierEQ/job-app-helix)
- **Private application operations:** `GlacierEQ/job-app` — intentionally outside the public recruiter inventory

Maintained by [GlacierEQ](https://github.com/GlacierEQ).
