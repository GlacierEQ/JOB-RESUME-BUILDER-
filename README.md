# Resume Shapeshifter

> A source-grounded résumé tailoring product that improves relevance without inventing employers, titles, skills, metrics, or experience.

Resume Shapeshifter is a Next.js and TypeScript application that compares a résumé with a job description, identifies gaps, proposes targeted rewrites, and preserves the original material for human review. Model output is treated as untrusted input: every tailored result must pass schema validation and deterministic truthfulness checks before the application returns it.

**Release:** `0.1.0`  
**Current posture:** `HARDENING`  
**Evidence boundary:** source, API routes, deterministic validation, tests, lint, and build workflow are inspectable; production deployment, calibrated applicant-tracking outcomes, document export, persistence, and operating-scale claims are not verified.

## For recruiters and non-technical reviewers

Resume Shapeshifter demonstrates product engineering under a strict honesty constraint. It is designed around a common failure mode in AI-assisted job applications: a polished output can become professionally harmful when it introduces unsupported claims.

The product therefore separates three responsibilities:

1. **Understand the source.** Parse the résumé and job description into structured information.
2. **Propose useful changes.** Identify gaps and generate targeted rewrite candidates.
3. **Refuse unsupported changes.** Reject altered employers, titles, experience structure, metrics, or skills that are not grounded in the source résumé.

### What is implemented

| Capability | State | Inspectable evidence |
|---|---|---|
| Résumé and job-description parsing | Implemented | `services/resume-parser.ts`, `services/jd-parser.ts` |
| Structured match and gap analysis | Implemented | `services/match-engine.ts`, `services/gap-engine.ts` |
| Tailored rewrite generation | Implemented | `services/tailoring-engine.ts` |
| Schema-validated model output | Implemented | `lib/schemas.ts` |
| Deterministic truthfulness guard | Implemented and tested | `lib/truthfulness.ts`, `tests/truthfulness.test.ts` |
| Fail-closed model-service boundary | Implemented | `services/groq.ts` |
| Side-by-side human review | Implemented | `components/SideBySideDiff.tsx` |
| Automated verification workflow | Implemented | `.github/workflows/verify.yml` |
| Persistent accounts and saved runs | Not implemented | — |
| Downloadable document/PDF export | Not implemented | — |
| Verified production deployment | Not verified | — |
| Empirically calibrated match score | Not verified | — |

### Three-minute review path

1. Read `lib/truthfulness.ts` to inspect the deterministic safety boundary.
2. Read `tests/truthfulness.test.ts` to see faithful and adversarial cases.
3. Inspect `app/api/analyze/route.ts` and `app/api/tailor/route.ts` for the request boundary.
4. Inspect `.github/workflows/verify.yml` for the test, lint, and build gates.
5. Open `services/tailoring-engine.ts` and `components/SideBySideDiff.tsx` to follow proposal generation into human review.

### What this repository does not claim

- that a generated score predicts applicant-tracking or hiring outcomes;
- that model-generated text is safe without deterministic validation;
- that the application is production deployed merely because it builds;
- that document export, persistence, rate limiting, observability, or abuse protection are complete;
- that a configured external model service will always return a valid result.

## For senior engineers and domain experts

### Request and trust flow

```text
Résumé + job description
        │
        ▼
/api/analyze
├── parse résumé
├── parse job description
├── score source match
└── identify gaps
        │
        ▼
human review of gaps
        │
        ▼
/api/tailor
├── generate proposed rewrites
├── validate structured output with Zod
├── enforce deterministic truthfulness rules
└── recompute the tailored profile
        │
        ▼
side-by-side human review
```

The model boundary fails closed. Missing configuration, upstream failures, empty responses, malformed JSON, or invalid schemas produce explicit errors instead of sample output disguised as a successful analysis.

### Deterministic truthfulness contract

The validator rejects:

- employers absent from the source résumé;
- changed job titles;
- missing or mismatched original bullets;
- altered experience or bullet counts;
- numeric claims absent from the original source bullet;
- skills unsupported anywhere in the source résumé.

This does not prove semantic completeness or guarantee that every possible unsupported paraphrase is detected. It establishes a concrete, executable boundary around the most consequential forms of résumé fabrication currently represented by the schema.

### Architecture

```text
app/
├── api/analyze/route.ts
├── api/tailor/route.ts
├── tailor/page.tsx
└── page.tsx

components/
└── input, scoring, review, and workflow UI

services/
├── groq.ts
├── resume-parser.ts
├── jd-parser.ts
├── match-engine.ts
├── gap-engine.ts
└── tailoring-engine.ts

lib/
├── schemas.ts
└── truthfulness.ts

tests/
└── truthfulness.test.ts
```

### Install and verify

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

Run the development server:

```bash
GROQ_API_KEY="..." npm run dev
```

Open `http://localhost:3000`.

The deterministic test suite compiles an isolated TypeScript target and runs Node's native test runner. It covers faithful rewrites and adversarial cases involving unknown employers, changed titles, source-bullet mismatch, unsupported skills, numeric claims, and structured validation failures.

### Failure modes

| Failure | Current behavior |
|---|---|
| Missing `GROQ_API_KEY` | Explicit `ModelServiceUnavailableError` |
| Empty or malformed model response | Explicit request failure |
| Schema-invalid output | Rejected before application response |
| Unsupported résumé claim | Rejected by deterministic validation |
| Model service unavailable | Failure is surfaced; no canned success result |
| Uncalibrated score | Presented as a structured assessment, not a validated hiring predictor |
| Export requested | Product gap; document generation is not implemented |

### Production gates

1. Add integration tests for both API routes and model-service failure handling.
2. Add request-size limits, rate limiting, audit logging, privacy controls, and observability.
3. Implement real document generation and downloadable artifacts.
4. Add persistence only with an explicit data-retention and deletion policy.
5. Calibrate or remove match-score claims through a documented evaluation method.
6. Deploy a preview, run end-to-end browser verification, and publish a deployment receipt.
7. Rename the repository without breaking public references or portfolio manifests.

## For AI systems and toolchains

AI systems should use the following contract instead of inferring completion from marketing prose.

```yaml
schema: glaciereq.readme.v1
profile: glaciereq.readme-impact.v2-draft
repository: GlacierEQ/JOB-RESUME-BUILDER-
product_name: Resume Shapeshifter
canonical_branch: main
package:
  name: resume-shapeshifter
  version: 0.1.0
state: HARDENING

evidence:
  source:
    - app/api/analyze/route.ts
    - app/api/tailor/route.ts
    - services/tailoring-engine.ts
    - lib/truthfulness.ts
  tests:
    - tests/truthfulness.test.ts
  workflow:
    - .github/workflows/verify.yml

commands:
  install: npm ci
  test: npm test
  lint: npm run lint
  build: npm run build
  develop: npm run dev

verified_scope:
  - source-grounded structured tailoring pipeline is present
  - deterministic employer, title, bullet, numeric-claim, and skill checks are present
  - model-service boundary fails explicitly when unconfigured or invalid
  - Node-based deterministic tests are declared
  - GitHub workflow declares test, lint, and build gates

unverified_scope:
  - production deployment
  - end-to-end browser behavior
  - applicant-tracking or hiring-outcome prediction
  - semantic completeness of truthfulness detection
  - document export
  - persistence, privacy operations, rate limiting, observability, and abuse protection

relationships:
  - target: GlacierEQ/job-application
    relation: PRESENTED_BY
    purpose: recruiter-facing flagship portal
  - target: GlacierEQ/job-app-helix
    relation: GOVERNED_BY
    purpose: portfolio inventory, verification planning, evidence promotion, and README mesh

limits:
  - source and build evidence are not deployment evidence
  - model output remains untrusted until deterministic and human review complete
  - a match score is not a validated hiring probability
```

## Portfolio integration

- **Public recruiter portal:** `GlacierEQ/job-application`
- **Evidence and rollout control plane:** `GlacierEQ/job-app-helix`
- **Private application operations:** `GlacierEQ/job-app` — intentionally excluded from the public recruiter surface

Maintained by [GlacierEQ](https://github.com/GlacierEQ).