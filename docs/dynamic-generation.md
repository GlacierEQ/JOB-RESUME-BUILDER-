# Dynamic Resume Generation

JD in → tailored resume artifacts out. Deterministic, truth-constrained,
no model key required.

## Pipeline

```text
JD text + source ResumeProfile (authoritative)
        │
        ▼
lib/jd-keywords.ts          deterministic JD term extraction
  job title · required/preferred/general tiers from the JD's own cues
        │
        ▼
lib/keyword-align.ts        coverage scoring + JD-priority skill order
  coverage % + band (major-gaps/competitive/strong/excellent)
  skills reordered: JD must-haves first — same set, new order, nothing added
        │
        ▼
lib/bullet-strength.ts      deterministic XYZ restructuring
  WEAK_LEAD      "Responsible for developing X" -> "Developed X"
  XYZ_FRONTLOAD  "Built X, reducing Y by 40%" -> "Reduced Y by 40% by building X"
  FILLER_STRIP   "in order to" -> "to"
  TERM_MIRROR    JD's term for the identical concept ("CI/CD"), mirrored once
  Backstop: any transform introducing a numeric claim absent from the
  original is discarded; the bullet is kept as written.
        │
        ▼
lib/summary-composer.ts     JD-aware 3-4 line summary from evidence
  role-title mirror + quantified proof points + core stack line
  no cliches; every number traced to the source corpus
        │
        ▼
services/dynamic-generator.ts   orchestration -> TailoredResume
  (the exact schema the model-backed path emits)
        │
        ▼
lib/truthfulness.ts         assertTruthfulTailoring (unchanged)
lib/helix-boundaries.ts     assertHelixBoundaries (unchanged)
  If the composed summary trips a Helix boundary, the source summary is
  kept instead of weakening the guard.
        │
        ▼
lib/dynamic-compiler.ts     compileDynamicApplication
  base artifacts byte-identical (ATS text, auditable JSON, printable HTML)
  + impressive HTML (top-third optimized, metric-emphasized, ATS-safe)
  + dynamic manifest JSON (embeds the generation report)
        │
        ▼
tools/generate-resume.ts    CLI: writes artifacts to --out
tools/generate_docx.py      stdlib-only DOCX from the manifest
        │
        ▼
HUMAN REVIEW (REVIEW_REQUIRED.txt) — drafts only, never submitted
```

## CLI

```bash
npm run generate:resume -- \
  --jd path/to/jd.txt \
  --resume-profile path/to/resume-profile.json \
  --out ./out \
  [--formats ats,json,html,impressive,docx,report]
```

- `--resume-profile` must validate against `ResumeProfileSchema`. The source
  resume is authoritative for employers, titles, dates, metrics, history.
- Output: ATS `.txt`, printable `.html`, impressive `.html`, `.docx`,
  dynamic manifest `.json`, generation report `.json`, `REVIEW_REQUIRED.txt`.
- Exit codes: `0` ok · `2` usage/validation · `1` runtime or guard failure.

## Truth boundaries (unchanged from the base pipeline)

- Model output is untrusted input; here there is no model at all.
- Never invent qualifications, employers, dates, or metrics. Missing JD
  terms are **reported** (`missingRequiredTerms`), never added.
- Bullet and experience counts/positions are preserved so the
  deterministic truthfulness guard keeps its full power.
- Helix evidence may rank/contextualize; it may not add facts.
- `humanReviewRequired: true` on every manifest. Nothing submits anything.

## Deliberate non-goals

- **No bullet deletion.** The research says "cut one bullet for every one
  you promote", but the truthfulness guard requires stable bullet counts and
  positions. Emphasis is achieved by reordering skills, strengthening
  bullets in place, and composing the summary — never by dropping evidence.
- **No model calls in this path.** `services/tailoring-engine.ts` remains
  the model-backed route and fail-closes with `ModelServiceUnavailableError`
  when `GROQ_API_KEY` is unset (see `services/groq.ts`). The dynamic CLI
  never calls it; deterministic output is identical with or without a key.
- **No hiring-outcome prediction.** The report scores keyword coverage, not
  interview probability.

## Tests

`npm test` runs the full deterministic suite (currently 55 tests), including:

- `tests/jd-keywords.test.ts`, `tests/keyword-align.test.ts`,
  `tests/bullet-strength.test.ts`, `tests/summary-composer.test.ts`
- `tests/dynamic-generator.test.ts` (end-to-end incl. guard pass +
  determinism), `tests/dynamic-compiler.test.ts` (base artifacts
  byte-identical, dynamic artifacts appended)

Python: `python3 -m unittest tests.test_generate_docx` (stdlib only).
