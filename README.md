# Resume Shapeshifter

A source-grounded résumé tailoring prototype built with Next.js, TypeScript, Zod, and Groq.

The product analyzes a résumé against a job description, identifies gaps, proposes rewrites, and keeps original bullets visible for human review. It is designed to improve relevance **without inventing employers, titles, skills, or metrics**.

## Current status

`hardening` — the core model-backed workflow exists, but this repository is not yet presented as a production-ready deployed service.

| Capability | Status | Evidence |
|---|---|---|
| Résumé and job-description parsing | Implemented | `services/resume-parser.ts`, `services/jd-parser.ts` |
| Structured match and gap analysis | Implemented | `services/match-engine.ts`, `services/gap-engine.ts` |
| Tailored rewrite generation | Implemented | `services/tailoring-engine.ts` |
| Schema validation | Implemented | `lib/schemas.ts` |
| Deterministic truthfulness guard | Implemented and tested | `lib/truthfulness.ts`, `tests/truthfulness.test.ts` |
| Fail-closed model boundary | Implemented | `services/groq.ts` |
| Side-by-side review UI | Implemented | `components/SideBySideDiff.tsx` |
| Persistent user accounts and saved runs | Not implemented | — |
| Document/PDF generation | Not implemented | — |
| Verified production deployment | Not verified | — |
| Empirically calibrated match score | Not verified | — |

## Truthfulness boundary

Model prompts are not treated as sufficient protection. Every tailored result passes a deterministic validator before it is returned.

The validator rejects:

- employers absent from the source résumé,
- changed job titles,
- missing or mismatched original bullets,
- altered experience or bullet counts,
- numeric claims absent from the original source bullet,
- skills unsupported anywhere in the source résumé.

Invalid model output, missing model configuration, and schema failures produce explicit errors. They do **not** return canned sample data as though a real analysis succeeded.

## Request flow

```text
Resume + job description
        │
        ▼
/api/analyze
├── parse resume
├── parse job description
├── score source match
└── identify gaps
        │
        ▼
Human review of gaps
        │
        ▼
/api/tailor
├── generate proposed rewrites
├── validate structured output
├── enforce deterministic truthfulness rules
└── score the tailored profile
        │
        ▼
Side-by-side human review
```

## Run locally

Requirements:

- Node.js compatible with the installed Next.js version
- a Groq API key configured in the runtime environment as `GROQ_API_KEY`

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:3000`.

## Tests

```bash
npm test
```

The current suite compiles an isolated TypeScript test target and runs Node's native test runner. It covers faithful rewrites and adversarial cases involving unknown employers, changed titles, source-bullet mismatch, unsupported skills, and structured validation errors.

## Architecture

```text
app/
├── api/analyze/route.ts
├── api/tailor/route.ts
├── tailor/page.tsx
└── page.tsx

components/
└── review, input, scoring, and workflow UI

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

## Known limitations

- Match scores are model-generated structured assessments, not validated predictors of applicant-tracking outcomes.
- The UI does not currently create downloadable PDFs or documents.
- Tailoring requires a configured external model service.
- There is no authentication, persistence, rate limiting, observability, or abuse protection yet.
- Production deployment and end-to-end browser behavior have not been independently verified.
- The repository name is temporary; the intended product name is **Resume Shapeshifter**.

## Next production gates

1. Add integration tests for both API routes and model-service failure handling.
2. Replace reactive score adjustments in the client with server-recomputed analysis.
3. Implement real document generation and downloadable artifacts.
4. Add rate limiting, request-size limits, audit logging, and privacy controls.
5. Deploy a preview, run an end-to-end verification pass, and publish only verified behavior.

## Repository

Maintained by [GlacierEQ](https://github.com/GlacierEQ).
