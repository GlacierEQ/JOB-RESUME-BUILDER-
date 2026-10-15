# Resume Effectiveness Research — 2026 Hiring Market

Evidence-backed notes driving the dynamic generation engine
(`lib/`, `services/dynamic-generator.ts`). Researched October 2026.

## 1. The two filters

Every resume passes two gates before a human reads it in full:

1. **ATS parse + keyword match.** ~75% of resumes are rejected by the ATS
   before a human sees them, most often for unparseable design (multi-column
   layouts, tables, text boxes, graphics) or missing JD keywords.
2. **The 6-second human scan.** Recruiters spend 6–30 seconds on first pass;
   ~80% of attention lands on the **top third** of the page. The scan hits
   three zones: job title + company names (right tier?), most recent role
   bullets (relevant work at scale?), education + skills (stack check).

Sources: stylingcv.com SWE resume guide 2026; LinkedIn recruiter playbook
(Wilson); MentorCruise SWE resume guide; jobsprout.ai visual guide 2026.

## 2. Quantified outcomes beat duties — by a lot

- Quantified achievements boost shortlist chances ~40% vs plain duty
  descriptions (CareerEnlightenment, 2026).
- **XYZ formula** (Google): "Accomplished [X] as measured by [Y] by doing
  [Z]." Order can flex — lead with whatever is most impressive.
- **Action + Scale + Outcome** for infrastructure/internal work with no
  revenue number: every engineering bullet has at least two of the three.
- STAR condensed to 1–2 lines for complex accomplishments.
- Strong action verbs; metrics in the first two lines of the most recent
  role's bullets.

Sources: Harvard/Google XYZ via dabydat/resume-builder-skill;
atalvarez1/job-search-agent SKILL.md; ma-serra/claude-superskills;
MentorCruise.

## 3. Tailoring: what actually moves callbacks

- 15–20 minutes of tailoring per application → ~**3x more callbacks** than
  generic versions (CareerEnlightenment, 2026).
- **Keyword placement rule:** a keyword is strongest **twice** — once in
  Skills (searchable) and once in a bullet (believable). Reorder Skills so
  the JD's must-haves come first; don't delete the rest.
- **Mirror the JD's vocabulary where it is genuinely accurate** — write
  "CI/CD" if that's their term; mirror once, then stop. Warning signs of
  stuffing: 40-item skills lists, the same term in every bullet, tools
  you've only read about, a section that reads like a tag cloud.
- **The 30-minute tailoring pass** (Jobgether/LinkedIn): read the posting
  twice (scope signals, then what it repeats — repetition is how a hiring
  team tells you what it's worried about); rewrite the summary; reorder the
  top 3–5 bullets; mirror vocabulary; **cut one bullet for every one you
  promote** — a tailored resume that keeps growing buries its evidence.
- Rough keyword-match bands (RewiredPathways): <50% major gaps · 50–70%
  competitive · 70–85% strong · 85%+ excellent.

Sources: dev.to keyword workflows (akshay_js); LinkedIn Jobgether
tailoring guide; Medium RewiredPathways; Preplink.ai.

## 4. The top third

- Open with a 3–4 line professional summary: value, not aspirations.
  "Seeking a new challenge" is dead. Proof beats adjectives; no clichés
  ("hard-working", "team player", "passionate").
- Role-aligned headline: one line stating exactly who you are
  ("Operations Manager | Workflow Automation | ...").
- Summary should sell the skills for *this* job, especially for career
  pivoters — "oh, this person can do this job" in six seconds.
- Objective statements and "References available upon request" are gone.

Sources: LinkedIn recruiter playbook; people.com (Dewan);
theresumewriters.com.au 2026 guide.

## 5. Visual hierarchy that survives both filters

- Single column; standard headings ("Work Experience", "Skills"); clean
  sans-serif 10–12pt; strategic whitespace (cognitive load is the enemy).
- Name, title, contact dominate the top third; skills summary high.
- Job titles dominate the Experience section; achievements emphasized.
- Subtle accent color is acceptable in 2026; still no photos, no graphics,
  no tables. Design must never break the parser.
- Intentional design signals attention to detail; studies cited report
  materially higher callback rates for polished-but-parseable resumes.

Sources: skyryedesign.com; jobsprout.ai; staging.hyatts.com research
roundups (treat vendor claims as directional, not gospel).

## 6. The 2026 differentiator

Most resumes are now AI-polished and indistinguishable. The bar is a resume
that looks unmistakably like a real person describing real work: specific
numbers, specific tools, specific scale. 2026 is about **proof, not
promises** — soft-skill claims ("communication", "work ethic") mean nothing
when 250 applicants all make them.

## How the engine encodes this

| Research finding | Engine implementation |
|---|---|
| Two filters (ATS + 6s scan) | ATS text artifact; single-column semantic HTML; standard headings |
| XYZ / Action-Scale-Outcome | `lib/bullet-strength.ts`: WEAK_LEAD, XYZ_FRONTLOAD, FILLER_STRIP |
| Keyword twice (skills + bullet) | `lib/keyword-align.ts`: coverage scoring, JD-priority skill reorder |
| Mirror JD vocabulary, once | `lib/bullet-strength.ts`: TERM_MIRROR (conservative alias table) |
| Top third: headline + summary | `lib/summary-composer.ts`: role-title mirror, proof-led 3–4 lines |
| Cut-one-per-promote | Documented boundary: bullet/role counts stay fixed (truthfulness guard); emphasis via reorder + strengthening, never deletion |
| Match bands | `coverageBandFor`: major-gaps / competitive / strong / excellent |
| Proof not promises | Truthfulness guard: no new numeric claims, ever; missing terms reported, never invented |
