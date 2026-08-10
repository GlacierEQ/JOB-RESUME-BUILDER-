# Resume Shapeshifter — Truth-Constrained Application Compiler

> Analyze a source résumé against a target role, generate source-grounded rewrite proposals, require human review, preserve private runs locally, and compile real application artifacts without inventing qualifications or pretending an export was a submission.

**Role:** `PRODUCT_FLAGSHIP`  
**Visibility:** `PUBLIC`  
**Canonical branch:** `main`  
**Release:** `0.1.0`  
**Current posture:** `PARTIALLY_VERIFIED`

The application-compiler vertical slice passed the repository-native `verify` workflow on exact PR head `42976352c3df73acc2f3411eae3bacbef53e0a9d` in workflow run `31348052822`, including deterministic tests, lint, Helix evidence compilation/validation, and the Next.js production build. It was squash-merged as `0e71023a9d3144df6eb18988e4a87ac0d9ceb08a`.

Production deployment, browser-level end-to-end execution, match-score calibration, production identity/access control, server-side retention, rate limiting, observability, abuse protection, and semantic completeness remain unverified.

## Better Fit Without a Better Lie

*Recruiter layer · what the product actually does now*

Resume Shapeshifter is no longer only a rewrite prototype. It now owns a full private application-compilation path:

```text
source résumé + target job description
                ↓
       structured analysis
                ↓
       gap / fit assessment
                ↓
  model-generated proposals
                ↓
 schema + deterministic truth checks
                ↓
       human side-by-side review
                ↓
 deterministic application compiler
        ├── ATS text
        ├── auditable JSON
        └── printable HTML
                ↓
 browser-local versioned run history
```

The central rule remains: **model output is untrusted input**. The system may propose changes; it does not establish truth, submit an application, predict a hiring outcome, or silently mutate source identity.

### What is implemented

| Capability | Current state | Primary evidence |
|---|---|---|
| Résumé + job-description parsing | Implemented | `services/resume-parser.ts`, `services/jd-parser.ts` |
| Match and gap analysis | Implemented | `services/match-engine.ts`, `services/gap-engine.ts` |
| Model-backed rewrite proposals | Implemented | `services/tailoring-engine.ts`, `services/groq.ts` |
| Schema validation | Implemented | `lib/schemas.ts`, API routes |
| Deterministic truthfulness guard | Implemented + tested | `lib/truthfulness.ts`, `tests/truthfulness.test.ts` |
| Bounded API bodies and input sizes | Implemented + tested | `lib/request-guards.ts`, `tests/request-guards.test.ts` |
| Human side-by-side review | Implemented | `components/SideBySideDiff.tsx` |
| Deterministic reviewed résumé materialization | Implemented + tested | `lib/application-compiler.ts` |
| ATS text export | Implemented + tested | `renderAtsText` |
| Auditable JSON export | Implemented + tested | `compileApplicationArtifacts` |
| Printable complete HTML export | Implemented + tested | `renderPrintableHtml` |
| Browser-local saved runs | Implemented | `lib/run-store.ts` |
| Revision / stale-write protection | Implemented | `IndexedDbRunStore.put`, serialized UI persistence |
| Restore / delete / clear / expiry | Implemented | `PrivateRunHistory`, `run-store.ts` |
| Production deployment | Unverified | no provider deployment receipt |
| Browser E2E | Unverified | no browser receipt yet |
| Hiring-outcome score calibration | Unverified and not claimed | no evaluation corpus |

### Current artifact boundary

After human review, the compiler emits three real files:

1. **ATS text** — deterministic linear résumé representation.
2. **JSON** — source résumé, compiled résumé, target identity, change summary, and explicit truth boundaries.
3. **Printable HTML** — complete résumé content including experience, projects, technologies, education, and certifications; can be printed to PDF by the user.

The product does **not** claim it has generated a PDF when it has generated printable HTML. It does **not** mark an artifact download as an application submission.

## Where the Model Meets the Guardrail

*Master layer · architecture, trust boundaries, failure semantics*

### Trust flow

```text
UNTRUSTED INPUT
résumé text + job description
        │
        ▼
/api/analyze
  bounded streaming body read
  per-field byte limits
  parse source + target
  compute match + gaps
        │
        ▼
/api/tailor
  bounded JSON body
  Zod input schemas
  external model proposal
  output schema validation
  deterministic truthfulness checks
        │
        ▼
SOURCE-IDENTITY MATERIALIZATION
  company + title + original bullets
  ambiguous/unmatched proposal → preserve source
        │
        ▼
HUMAN REVIEW
        │
        ▼
APPLICATION COMPILER
  ATS + JSON + printable HTML
        │
        ▼
LOCAL PRIVATE RUN STORE
  IndexedDB
  revision checks
  seven-day default retention
  restore/delete/clear
```

### Truthfulness contract

The represented deterministic validator rejects or refuses promotion for high-impact fabrication modes including:

- employers absent from the source résumé;
- changed job titles;
- missing or mismatched original bullets;
- altered experience/bullet structure outside the represented contract;
- numeric claims unsupported by the corresponding source bullet;
- unsupported skills;
- malformed model output.

The application compiler adds another fail-closed boundary: tailored experience is applied only when it can be matched back to source identity. Multiple roles at one employer are kept distinct; an ambiguous or incompatible proposal preserves the source entry instead of guessing.

### Private run lifecycle

Browser-local runs use:

```text
ANALYZED → TAILORED → REVIEWED → EXPORTED
```

Each run carries a revision, creation/update time, bounded expiry, source and target text, parsed structures, analysis, and optional tailored/review/export state.

Persistence semantics:

- IndexedDB only; the persistence layer does not upload run history;
- seven-day default retention, maximum configurable retention of thirty days in the current contract;
- stale expected revisions are rejected;
- writes are serialized by the UI;
- read/compare/write stays inside the active IndexedDB transaction;
- restore returns a run to an actionable stage rather than an empty terminal screen;
- deletion/clear failures surface to the user rather than becoming unhandled rejections.

This is **local workflow persistence**, not a claim of production account storage, server-side retention governance, encryption policy, identity, or cross-device synchronization.

### Request and error boundary

The API does not blindly call `request.json()` on unbounded bodies. It reads request streams incrementally and fails with `413` once the encoded body crosses the configured maximum.

Expected malformed or schema-invalid client input returns bounded `400/413` responses. Unexpected server errors are logged server-side and return generic client text rather than arbitrary internal exception messages.

### Failure behavior

| Condition | Required behavior |
|---|---|
| empty/malformed request | reject with client error |
| oversized request | stop streaming and return `413` |
| invalid schema | reject before product execution |
| model unavailable | explicit model-service failure |
| model output malformed | reject |
| truthfulness invariant violated | reject tailored result |
| proposal cannot map unambiguously to source experience | preserve source entry |
| local run revision stale | refuse overwrite |
| IndexedDB unavailable | keep workflow usable; report persistence unavailable |
| restored run lacks required tailored data | return to actionable analysis/review stage |
| artifact download occurs | mark local run `EXPORTED`; do not infer submission |

### What the repository does not claim

- a match score predicts ATS, interview, or hiring outcomes;
- deterministic checks capture every semantic implication;
- a passing build proves a production deployment;
- browser-local persistence constitutes production identity/storage governance;
- a printable HTML artifact is an automatically generated PDF;
- an exported artifact was sent or submitted;
- the configured external model is always available;
- rate limiting, audit logging, observability, abuse controls, or production retention/deletion are complete.

## Machine Layer

### Repository map

```text
app/
  api/analyze/route.ts             bounded source/target analysis API
  api/tailor/route.ts              schema + model + truthfulness tailoring API
  tailor/page.tsx                  stateful private compiler workspace
components/
  SideBySideDiff.tsx               human review surface
  PrivateRunHistory.tsx            restore/delete/clear local runs
lib/
  application-compiler.ts          deterministic materialization + ATS/JSON/HTML
  request-guards.ts                streaming byte/request boundaries
  run-store.ts                     versioned IndexedDB persistence
  schemas.ts                       typed input/model contracts
  truthfulness.ts                  deterministic source-grounding rules
services/
  resume-parser.ts                 résumé parser
  jd-parser.ts                     target-role parser
  match-engine.ts                  bounded match assessment
  gap-engine.ts                    gap analysis
  tailoring-engine.ts              proposal orchestration
  groq.ts                          external model boundary
tests/
  application-compiler.test.ts     source identity + export fidelity
  request-guards.test.ts           malformed/oversized request cases
  run-store.test.ts                revision/retention lifecycle
  truthfulness.test.ts             nominal/adversarial truth checks
.github/workflows/verify.yml        clean install + test + lint + build + Helix evidence gate
```

### Verification

```bash
npm ci
npm test
npm run lint
npm run build
```

Current application-compiler evidence:

```yaml
verified_pr_head: 42976352c3df73acc2f3411eae3bacbef53e0a9d
workflow_run: 31348052822
workflow: verify
conclusion: success
merge_commit: 0e71023a9d3144df6eb18988e4a87ac0d9ceb08a
verified_scope:
  - deterministic TypeScript tests
  - truthfulness and Helix evidence tests
  - request-boundary tests
  - application-compiler tests
  - run-lifecycle tests
  - repository lint
  - Helix evidence resolution / validation
  - Next.js production build
unverified_scope:
  - production deployment
  - browser-level E2E
  - live model/provider reliability
  - cross-device persistence
  - production identity/access control
  - production retention/deletion/encryption policy
  - rate limiting / abuse protection / observability
  - match-score calibration
```

### Public claim ceiling

A defensible current claim is:

> Built a truth-constrained résumé application compiler that treats model output as untrusted, binds tailored experience back to source identity, requires human review, emits ATS/JSON/printable artifacts, bounds API input, and preserves versioned private runs locally with explicit retention and stale-write controls.

It is **not** a production-scale hiring platform claim.

## Mesh / Evolution

### What changed at the application-compiler promotion

The former product gap statements “document export not implemented,” “persistence not implemented,” and “request-size limits not implemented” are retired for the implemented bounded scopes above.

They are replaced by narrower remaining gates:

1. **Browser E2E** — exercise upload/input → analyze → tailor → review → compile → download → restore under a browser runner.
2. **Production deployment** — provider receipt + live readback against the deployed exact source.
3. **Privacy operations** — explicit provider disclosure, retention/deletion policy, and production data-boundary tests.
4. **Identity / access control** — only if server-side or cross-device persistence is introduced.
5. **Rate limiting / abuse protection / observability** — production request controls and measurable telemetry.
6. **Evaluation science** — calibrate or remove score semantics using a documented dataset/method.
7. **Semantic truth evaluation** — adversarial corpus beyond represented deterministic fabrication modes.
8. **Product integration** — consume/emit explicit machine contracts with the private `GlacierEQ/job-app` application-operations engine without crossing the human external-action boundary.

### Portfolio relationships

- **Evidence / portfolio authority:** `GlacierEQ/job-app-helix`
- **Public presentation:** `GlacierEQ/job-application`
- **Private application execution:** `GlacierEQ/job-app`

The product may generate and export reviewed application artifacts. `job-app` owns later private operational state and external-action receipts. Neither repository may infer that a draft or download was submitted.

Maintained by [GlacierEQ](https://github.com/GlacierEQ).
