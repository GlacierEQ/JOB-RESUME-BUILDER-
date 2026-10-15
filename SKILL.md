# Dynamic Resume Generation Skill

Generate an impressive, personalized, truth-constrained tailored resume from a
target job description — deterministically, without a model key.

## When to use

The user pastes or points at a job description / role spec and wants a
tailored resume for it: "tailor my resume for this role", "generate a resume
for this JD", "make my resume match this posting", "build the application
for this job".

## The rule

**Tailor from evidence, never from templates.** Every bullet must trace to
the user's actual work (source resume + Helix estate). The engine
restructures and emphasizes; it never invents qualifications, employers,
dates, or metrics. Missing JD terms are reported, never added.

## How to run it

You need two inputs:

1. **The JD as text** — save to a file, e.g. `/tmp/role/jd.txt`.
2. **The source resume profile** — a `ResumeProfile` JSON file
   (`lib/schemas.ts: ResumeProfileSchema`). This is the authoritative
   source: employers, titles, dates, bullets, skills, projects, education.

Then:

```bash
cd ~/workspace/repos/JOB-RESUME-BUILDER-
npm run generate:resume -- \
  --jd /tmp/role/jd.txt \
  --resume-profile /tmp/role/resume-profile.json \
  --out /tmp/role/out
```

Output in `--out`:

| File | What it is |
|---|---|
| `*-resume.txt` | ATS text — the parse-safe linear resume |
| `*-resume.html` | Printable HTML (existing base render) |
| `*-resume-impressive.html` | Top-third optimized render: JD headline, value-led summary, metric-emphasized bullets, subtle accent — still single-column, ATS-safe |
| `*-resume.docx` | Clean single-column DOCX (stdlib-generated) |
| `*-resume-dynamic.json` | Auditable manifest: source, compiled resume, changes, generation report, truth boundaries |
| `*-dynamic-report.json` | Keyword coverage %, band, rules applied, missing required terms |
| `REVIEW_REQUIRED.txt` | Human-review gate notice |

## What the engine does (research-backed)

From `docs/resume-research-2026.md`:

- **XYZ bullets** — "Accomplished [X] as measured by [Y] by doing [Z]";
  weak leads ("Responsible for…") replaced with strong verbs; quantified
  outcomes front-loaded.
- **Keyword twice** — JD terms in Skills (searchable) and in bullets
  (believable); skills reordered so JD must-haves come first.
- **Top third** — role-title mirror headline, 3–4 line proof-led summary,
  no clichés, no objectives.
- **Coverage bands** — major-gaps <50% · competitive 50–70% · strong
  70–85% · excellent 85%+.

## Boundaries — say these out loud

- Artifacts are **drafts for human review**, never submissions. Nothing in
  this repo applies anywhere.
- If coverage is `major-gaps`, say so plainly and name the missing terms —
  do not pad the resume to hide it.
- The model-backed tailoring route (`/tailor` UI) needs `GROQ_API_KEY`;
  without it, it fail-closes loudly. The CLI path never needs a key.
- Never present the DOCX or HTML as a filed/submitted application.

## Verify

```bash
npm test          # full deterministic suite (unit + guards + compilers)
python3 -m unittest tests.test_generate_docx
```
