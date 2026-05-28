
Problem Statement
Resume Shapeshifter — JD-to-Resume Tailoring Engine
1. Project Summary
Resume Shapeshifter is a JD-to-resume tailoring engine. A user provides a job description and
an existing resume, and the system generates a tailored version of the resume that better aligns
with the job listing while preserving truthfulness and the user's actual experience.
The product should rewrite resume bullets, score the resume-to-JD match, flag missing skills or
experience gaps, and generate a side-by-side PDF comparing the original resume with the
tailored resume for a real job listing.
The goal is not to fabricate experience. The system should help users express their existing
experience in language that better matches a target role.
2. Problem Statement
Job seekers often apply to many roles that require slightly different phrasing, skills, and
emphasis. Tailoring a resume manually for each job description is time-consuming, inconsistent,
and difficult to evaluate objectively.
Existing resume tools often provide generic suggestions, but they do not clearly show:
● How well the resume matches a specific job description.
● Which resume bullets should be rewritten.
● Which keywords, skills, or responsibilities are missing.
● Whether the tailored resume remains truthful to the original resume.
● A clean before-and-after comparison that can be reviewed and exported.
Resume Shapeshifter solves this by ingesting a resume and job description, then
producing a targeted resume rewrite with scoring, gap analysis, and a side-by-side proof
artifact.
3. Target Users
Primary Users
● Job seekers applying to multiple roles.
● Students and early-career professionals tailoring resumes for internships or entry-level
jobs.
● Mid-career professionals applying to role-specific openings.
Secondary Users
● Career coaches.
● Resume reviewers.
● Bootcamp placement teams.
● University career centers.
4. Core Value Proposition
Given a resume and a job description, the product should answer:
1. How well does this resume match the job?
2. What should be changed to improve the match?
3. Which bullets can be rewritten truthfully?
4. What gaps remain after tailoring?
5. What does the original vs tailored resume look like side by side?
5. MVP Scope
The MVP should support the following workflow:
1. User uploads or pastes an existing resume.
2. User pastes a job description or URL text for a real job listing.
3. System parses both documents.
4. System extracts relevant skills, responsibilities, keywords, seniority signals, and role
requirements from the JD.
5. System evaluates the current resume against the JD.
6. System rewrites resume bullets to better align with the JD.
7. System flags skills or requirements that are missing or weakly represented.
8. System generates a match score before and after tailoring.
9. System produces a side-by-side comparison: original resume vs tailored resume.
10. System exports the result as a PDF.
6. Non-Goals for MVP
The MVP should not attempt to:
● Apply to jobs automatically.
● Scrape job boards at scale.
● Fabricate work history, education, certifications, or metrics.
● Guarantee ATS ranking outcomes.
● Replace professional career advice.
● Support complex multi-column resume designs perfectly in version one.
● Create cover letters unless added later as an extension.
7. Key Product Requirements
7.1 Resume Input
Support at least one of the following in MVP:
● Plain text resume input.
● PDF resume upload.
● DOCX resume upload.
The parsed resume should preserve logical sections such as:
● Contact information.
● Summary.
● Skills.
● Work experience.
● Projects.
● Education.
● Certifications.
7.2 Job Description Input
Support pasted job description text in MVP.
Optional later enhancement:
● Accept a job posting URL and extract readable text.
7.3 JD Analysis
The system should extract:
● Job title.
● Company name, if present.
● Required skills.
● Preferred skills.
● Tools, technologies, and platforms.
● Responsibilities.
● Qualifications.
● Seniority level.
● Domain-specific keywords.
● Soft skills or behavioral signals.
7.4 Resume-to-JD Match Scoring
Generate an explainable match score from 0 to 100.
The score should consider:
● Required skill coverage.
● Preferred skill coverage.
● Relevant experience alignment.
● Keyword alignment.
● Responsibility alignment.
● Seniority alignment.
● Missing critical requirements.
The UI or output should include both:
● Original match score.
● Tailored match score.
The score should be accompanied by a short explanation, not just a number.
7.5 Bullet Rewriting
For each relevant resume bullet, the engine should:
● Preserve the user's actual meaning and experience.
● Improve alignment with the JD.
● Use stronger action verbs.
● Include JD-relevant terminology where truthful.
● Preserve or improve measurable impact when present.
● Avoid adding unsupported claims.
Each rewritten bullet should include metadata:
● Original bullet.
● Tailored bullet.
● Reason for change.
● JD keywords addressed.
● Confidence level.
● Risk flag if the rewrite may overstate experience.
7.6 Gap Analysis
The system should flag:
● Missing required skills.
● Weakly represented required skills.
● Missing tools or technologies.
● Missing domain experience.
● Missing seniority indicators.
● Unsupported JD requirements that should not be invented.
Each gap should include:
● Gap name.
● Importance: high, medium, or low.
● Evidence from the JD.
● Whether the resume mentions it.
● Suggested action.
Example suggested actions:
● Add if you have this experience.
● Leave out if not true.
● Mention in skills section if familiar.
● Add a project bullet if applicable.
● Prepare to address this in interview.
7.7 Truthfulness Guardrails
The product must explicitly avoid fabrication.
The system should not add:
● Employers the user did not work for.
● Degrees or certifications the user does not have.
● Technologies not present in the resume unless marked as a suggested gap.
● Metrics that were not provided.
● Leadership scope that was not implied by the original resume.
● Claims of expert-level proficiency without support.
When uncertain, the system should mark content as a suggestion requiring user confirmation.
7.8 Side-by-Side PDF Proof
The MVP should generate a PDF showing:
● Left side: original resume content.
● Right side: tailored resume content.
● Highlighted changed bullets.
● Match score before and after.
● Gap analysis summary.
● JD summary.
This PDF is the main proof artifact for the project.
8. Suggested User Flow
Step 1: Upload Resume
User uploads or pastes their resume.
Step 2: Add Job Description
User pastes a real job listing.
Step 3: Analyze
System parses both inputs and shows:
● JD summary.
● Extracted requirements.
● Original resume match score.
● Initial gaps.
Step 4: Generate Tailored Resume
System rewrites relevant bullets and optionally adjusts:
● Resume summary.
● Skills section ordering.
● Project emphasis.
● Experience bullet wording.
Step 5: Review Changes
User sees side-by-side comparison of original and tailored content.
Each rewritten bullet should have a clear explanation.
Step 6: Export
User exports:
● Tailored resume PDF.
● Side-by-side comparison PDF.
● Optional markdown or DOCX version.
9. Functional Requirements
Resume Parser
The parser should convert uploaded or pasted resume content into structured JSON.
Suggested structure:
{
 "contact": {},
 "summary": "",
 "skills": [],
 "experience": [
 {
 "company": "",
 "title": "",
 "startDate": "",
 "endDate": "",
 "bullets": []
 }
 ],
 "projects": [],
 "education": [],
 "certifications": []
}
JD Parser
The parser should convert the job description into structured JSON.
Suggested structure:
{
 "jobTitle": "",
 "company": "",
 "requiredSkills": [],
 "preferredSkills": [],
 "responsibilities": [],
 "qualifications": [],
 "tools": [],
 "keywords": [],
 "seniorityLevel": "",
 "domainSignals": []
}
Match Engine
The match engine should output:
{
 "overallScore": 0,
 "skillCoverageScore": 0,
 "responsibilityAlignmentScore": 0,
 "keywordScore": 0,
 "seniorityScore": 0,
 "criticalMissingRequirements": [],
 "explanation": ""
}
Tailoring Engine
The tailoring engine should output:
{
 "tailoredSummary": "",
 "tailoredSkills": [],
 "tailoredExperience": [
 {
 "company": "",
 "title": "",
 "bullets": [
 {
 "original": "",
 "tailored": "",
 "changeReason": "",
 "keywordsAddressed": [],
 "confidence": "high | medium | low",
 "riskFlag": ""
 }
 ]
 }
 ]
}
Gap Engine
The gap engine should output:
{
 "gaps": [
 {
 "name": "",
 "importance": "high | medium | low",
 "jdEvidence": "",
 "resumeEvidence": "",
 "suggestedAction": "",
 "canSafelyAdd": false
 }
 ]
}
PDF Generator
The PDF generator should create two documents:
1. Tailored resume PDF.
2. Side-by-side comparison PDF.
The comparison PDF should include:
● Header with job title and company.
● Original score vs tailored score.
● JD requirements summary.
● Original bullet column.
● Tailored bullet column.
● Highlighted differences.
● Gap analysis section.
● Disclaimer that the user must verify all content before use.
10. Suggested Architecture
Frontend
Recommended options:
● Next.js
● React
● Tailwind CSS
● Shadcn UI
Core screens:
● Landing page.
● Resume/JD input page.
● Analysis results page.
● Side-by-side editor.
● Export page.
Backend
Recommended options:
● Node.js API routes in Next.js.
● Python FastAPI service if document parsing and PDF generation are easier in Python.
Core services:
● Resume parsing service.
● JD parsing service.
● Scoring service.
● LLM tailoring service.
● Gap analysis service.
● PDF generation service.
Data Storage
For MVP, local/session-based storage is acceptable.
Optional persistent storage:
● PostgreSQL.
● Supabase.
● SQLite for local prototype.
Suggested entities:
● User.
● Resume.
● JobDescription.
● TailoringRun.
● MatchScore.
● GapAnalysis.
● ExportedDocument.
11. LLM Prompting Requirements
The system should use separate prompts for:
1. JD extraction.
2. Resume parsing cleanup.
3. Resume-JD scoring.
4. Bullet rewriting.
5. Gap analysis.
6. Final resume assembly.
Each LLM output should be requested as strict JSON where possible.
Important Prompt Rules
The LLM must be instructed to:
● Never invent experience.
● Use only evidence from the resume.
● Mark uncertain suggestions clearly.
● Keep bullet length resume-appropriate.
● Prefer concrete impact and measurable outcomes.
● Avoid keyword stuffing.
● Preserve the user's original career level.
● Explain every meaningful rewrite.
12. Example Acceptance Criteria
The project is complete when a user can:
1. Paste a resume.
2. Paste a real job description.
3. Click an analyze button.
4. See the original resume match score.
5. See extracted JD requirements.
6. See missing or weakly represented requirements.
7. Generate a tailored resume.
8. Review original vs tailored bullets side by side.
9. See a tailored match score.
10. Export a side-by-side PDF showing original vs tailored resume.
13. Demo Requirement
The final demo should use a real job listing and a real or realistic sample resume.
The demo should produce:
● Original resume text.
● Job description text.
● JD analysis.
● Original match score.
● Tailored resume.
● Tailored match score.
● Gap analysis.
● Side-by-side PDF comparison.
The proof artifact should clearly show that Resume Shapeshifter improves resume alignment
without fabricating experience.
14. Quality Bar
The generated tailored resume should be:
● Truthful.
● Concise.
● ATS-friendly.
● Specific to the job description.
● Easy to review.
● Exportable.
● Clearly different from the original where relevant.
● Not overloaded with unnatural keywords.
The gap analysis should be actionable and honest.
The scoring should be explainable rather than opaque.
15. Suggested Initial Implementation Plan
Phase 1: Static Prototype
● Build UI for resume and JD input.
● Use pasted text only.
● Mock parsing and scoring.
● Render side-by-side comparison in browser.
Phase 2: LLM Integration
● Add JD extraction prompt.
● Add resume parsing prompt.
● Add scoring prompt.
● Add bullet rewrite prompt.
● Add gap analysis prompt.
Phase 3: PDF Export
● Generate tailored resume PDF.
● Generate comparison PDF.
● Add highlighted changes.
Phase 4: Validation and Guardrails
● Add unsupported-claim detection.
● Add confidence labels.
● Add user confirmation flags.
● Add stricter JSON schema validation.
Phase 5: Polish
● Improve UI.
● Add sample resume and JD.
● Add download buttons.
● Add loading states and error handling.
16. Recommended Tech Stack
A practical Cursor-friendly stack:
● Frontend: Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
● Backend: Next.js API routes or FastAPI
● LLM: OpenAI API or another structured-output-capable LLM
● Validation: Zod
● PDF Generation: Playwright PDF, React PDF, or Puppeteer
● Document Parsing: pdf-parse, mammoth, or Python alternatives
● Storage: SQLite, Supabase, or local JSON for MVP
17. Risks and Edge Cases
Parsing Risks
● Multi-column resumes may parse poorly.
● PDF formatting may produce broken text order.
● Resume sections may have non-standard names.
LLM Risks
● The model may overstate experience.
● The model may add unsupported keywords.
● The model may produce inconsistent JSON.
● The score may appear more precise than it really is.
Product Risks
● Users may trust generated content without reviewing it.
● Users may expect guaranteed ATS performance.
● Job descriptions may be vague or overly broad.
Mitigations
● Add strong truthfulness instructions.
● Validate JSON responses.
● Show evidence for each rewrite.
● Include disclaimers.
● Require user review before export.
● Flag low-confidence changes.
18. Cursor Development Instructions
When implementing this project, prioritize a working vertical slice over broad feature coverage.
Start with:
1. A single-page app where the user pastes resume text and JD text.
2. A server route that calls the LLM and returns structured JSON.
3. A scoring section.
4. A rewritten bullets section.
5. A gap analysis section.
6. A side-by-side preview.
7. A PDF export button.
Use TypeScript types or Zod schemas for every major object:
● ResumeProfile
● JobDescriptionProfile
● MatchScore
● TailoredResume
● ResumeGap
● TailoringRun
Keep prompts in separate files, for example:
/prompts/jd-extraction.ts
/prompts/resume-parser.ts
/prompts/match-scoring.ts
/prompts/bullet-rewriter.ts
/prompts/gap-analysis.ts
Keep rendering components separate from business logic:
/components/ResumeInput.tsx
/components/JDInput.tsx
/components/ScoreCard.tsx
/components/GapAnalysis.tsx
/components/SideBySideDiff.tsx
/components/PDFExportButton.tsx
/lib/scoring.ts
/lib/prompts.ts
/lib/pdf.ts
/lib/schemas.ts
19. Definition of Done
The project is done when the app can generate a complete side-by-side PDF for a real job listing,
including:
● Original resume.
● Tailored resume.
● Original match score.
● Tailored match score.
● JD keyword and requirement summary.
● Bullet-level rewrite explanations.
● Gap analysis.
● Truthfulness disclaimer.
The output should be polished enough to share as a portfolio project or demo.
20. One-Line Product Description
Resume Shapeshifter turns any job description into a truthful, targeted resume rewrite with match
scoring, gap analysis, and a side-by-side PDF proof artifact.
Architecture
1. Architecture Goals
Goal Description
Truthfulness
first
No fabricated employers, degrees, skills, or metrics.
Rewrites must be traceable to source resume content.
Explainability Match scores, bullet changes, and gaps must include
human-readable evidence—not opaque numbers.
Structured I/O Parsers, engines, and LLM calls produce validated JSON
(Zod schemas) at every boundary.
Vertical slice MVP delivers end-to-end: paste resume + JD → analyze →
tailor → review → export PDF.
Separation of
concerns
UI renders state; services own parsing, scoring, tailoring,
gaps, and PDF; prompts live in isolated modules.
Portfolio quality Side-by-side comparison PDF is the primary proof
artifact—layout and disclaimers are first-class.
Non-Goals (MVP)
● Automated job applications, job-board scraping at scale, ATS guarantees,
cover letters, or perfect multi-column resume layout fidelity.
2. System Context
<<person>>Job SeekerUploads resume, pastes JD, reviews tailored
output<<person>>Coach / ReviewerOptional secondary user reviewing
exports<<system>>Resume ShapeshifterParses, scores, tailors, gaps, exports
PDF<<external_system>>LLM ProviderOpenAI or structured-output-capable
model<<external_system>>StorageSession / SQLite / Supabase
(optional)UsesReviews exportsStructured prompts & JSONPersists runs
(optional)System Context — Resume Shapeshifter
Primary actors: Job seekers (and optionally career coaches) who need a truthful,
JD-aligned resume rewrite with before/after scoring and a downloadable comparison
PDF.
External dependencies: LLM API for extraction, scoring, rewriting, and gap
analysis; optional object/file storage for uploads; PDF rendering (browser or
headless).
3. High-Level Architecture
The recommended MVP stack is a Next.js full-stack application with API routes
orchestrating specialized services. Document parsing may delegate to Node libraries
(pdf-parse, mammoth) or a thin Python FastAPI sidecar if parsing quality demands
it—keep the orchestration contract identical either way.
External
Domain Services
Next.js API Routes / Server Actions
Browser (Next.js App Router)
Landing
Input: Resume + JD
Analysis View
Side-by-Side Review
Export
Orchestrator
Resume Parser
JD Parser
Match Engine
Tailoring Engine
Gap Engine
PDF Generator
Schema Validator
Guardrail Checker
LLM API
SQLite / Supabase / Session
Request lifecycle (happy path)
1. Ingest — User provides resume (text / PDF / DOCX) and JD (pasted text).
2. Parse — Resume → ResumeProfile; JD → JobDescriptionProfile.
3. Analyze — Match engine scores original resume; gap engine lists
missing/weak requirements.
4. Tailor — Tailoring engine rewrites bullets (and optionally summary/skills
ordering) with metadata per bullet.
5. Re-score — Match engine scores tailored resume.
6. Review — UI shows side-by-side diff, explanations, confidence, risk flags.
7. Export — PDF generator produces tailored resume PDF and side-by-side
comparison PDF.
4. Core Domain Model
All major types should be defined once (TypeScript interfaces + Zod schemas) and
shared between client and server.
4.1 ResumeProfile
Logical sections preserved from parsing:
interface ResumeProfile {
 contact: ContactInfo;
 summary: string;
 skills: string[];
 experience: ExperienceEntry[];
 projects: ProjectEntry[];
 education: EducationEntry[];
 certifications: CertificationEntry[];
}
interface ExperienceEntry {
 company: string;
 title: string;
 startDate?: string;
 endDate?: string;
 bullets: string[];
}
4.2 JobDescriptionProfile
interface JobDescriptionProfile {
 jobTitle: string;
 company?: string;
 requiredSkills: string[];
 preferredSkills: string[];
 responsibilities: string[];
 qualifications: string[];
 tools: string[];
 keywords: string[];
 seniorityLevel: string;
 domainSignals: string[];
}
4.3 MatchScore
Explainable sub-scores roll up to overallScore (0–100):
interface MatchScore {
 overallScore: number;
 skillCoverageScore: number;
 responsibilityAlignmentScore: number;
 keywordScore: number;
 seniorityScore: number;
 criticalMissingRequirements: string[];
 explanation: string;
}
4.4 TailoredResume & BulletMetadata
interface TailoredBullet {
 original: string;
 tailored: string;
 changeReason: string;
 keywordsAddressed: string[];
 confidence: "high" | "medium" | "low";
 riskFlag?: string;
}
interface TailoredResume {
 tailoredSummary: string;
 tailoredSkills: string[];
 tailoredExperience: Array<{
 company: string;
 title: string;
 bullets: TailoredBullet[];
 }>;
}
4.5 GapAnalysis
interface ResumeGap {
 name: string;
 importance: "high" | "medium" | "low";
 jdEvidence: string;
 resumeEvidence: string;
 suggestedAction: string;
 canSafelyAdd: boolean;
}
interface GapAnalysis {
 gaps: ResumeGap[];
}
4.6 TailoringRun (aggregate)
A single user session/run ties artifacts together for replay and export:
interface TailoringRun {
 id: string;
 createdAt: string;
 resume: ResumeProfile;
 jobDescription: JobDescriptionProfile;
 originalMatch: MatchScore;
 tailoredResume: TailoredResume;
 tailoredMatch: MatchScore;
 gapAnalysis: GapAnalysis;
 status: "draft" | "analyzed" | "tailored" | "exported";
}
5. Service Layer
Each service is a cohesive module with a narrow public API. The orchestrator
coordinates order, passes context between steps, and handles partial failure.
Servi
ce
Responsibility Primary inputs Primary outputs
Resu
me
Parse
r
Normalize
uploads/text into
ResumeProfile
Raw text, PDF, DOCX ResumeProfile
JD
Parse
r
Extract
structured
requirements
from JD text
JD plain text JobDescriptionPr
ofile
Matc
h
Engin
e
Compute
explainable
0–100
alignment
ResumeProfile,
JobDescriptionProfile
MatchScore
Tailor
ing
Engin
e
Rewrite
bullets/summary
/skills truthfully
Resume + JD + optional gaps TailoredResume
Gap
Engin
e
Flag
missing/weak
requirements
Resume + JD GapAnalysis
Guar
drail
Chec
ker
Post-LLM
validation for
fabrication/over
statement
Original resume + tailored
output
Warnings,
blocked fields,
confidence
downgrades
PDF
Gene
rator
Render proof
artifacts
TailoringRun PDF buffers /
download URLs
Sche
ma
Valid
ator
Zod parse/retry
on LLM JSON
Raw LLM string Typed objects
5.1 Resume Parser
Pipeline:
1. Extract raw text — Plain text passthrough; PDF via pdf-parse; DOCX via
mammoth.
2. Heuristic sectioning — Regex/line-based detection for Contact, Summary,
Experience, etc. (best-effort for MVP).
3. LLM cleanup (optional Phase 2+) — resume-parser prompt maps messy text
→ strict ResumeProfile JSON.
4. Validate — Zod schema; surface parse warnings in UI (e.g., “Experience
section unclear”).
Design note: Keep raw extracted text alongside structured profile for audit and
guardrail diffing.
5.2 JD Parser
Pipeline:
1. Accept pasted JD text only in MVP.
2. LLM extraction — jd-extraction prompt → JobDescriptionProfile.
3. Validate & normalize — Dedupe skills, normalize seniority enum, strip empty
arrays.
Future: URL fetch + readability extraction behind a separate adapter without
changing JobDescriptionProfile.
5.3 Match Engine
Hybrid approach recommended for MVP:
Signal Weight
(suggested)
Method
Required skill
coverage
High Set overlap + fuzzy match (resume
skills + bullet text)
Preferred skill
coverage
Medium Same as required, lower weight
Keyword alignment Medium JD keywords vs resume corpus
Responsibility
alignment
Medium Embedding or LLM semantic match
Seniority alignment Low–medium Title/years heuristics + LLM
Critical missing Penalty Required items with zero evidence
LLM role: match-scoring prompt produces sub-scores + explanation +
criticalMissingRequirements. Deterministic pre-checks (skill token match) can seed
the prompt for consistency.
Run twice per run: original and tailored profiles (tailored uses rewritten bullets as
the resume corpus).
5.4 Tailoring Engine
Scope for MVP:
● Rewrite experience bullets (required).
● Optionally adjust summary, skills order, project emphasis (same truthfulness
rules).
Per-bullet contract: Every output bullet must reference original, include
changeReason, keywordsAddressed, confidence, and optional riskFlag.
Batching: Process by employer/role to keep prompts within context limits; merge
into TailoredResume.
5.5 Gap Engine
Compares JobDescriptionProfile requirements against resume evidence:
● Missing — Not mentioned anywhere.
● Weak — Mentioned but not demonstrated in bullets.
● Unsupported — JD asks for something that must not be invented
(canSafelyAdd: false).
Each gap includes jdEvidence, resumeEvidence, importance, and suggestedAction
(e.g., “Add if you have this experience”, “Prepare for interview”).
5.6 Orchestrator
Central workflow (pseudocode):
parseResume() → parseJD()
originalMatch = score(resume, jd)
gaps = analyzeGaps(resume, jd)
tailored = tailor(resume, jd, gaps)
guardrailCheck(resume, tailored)
tailoredMatch = score(applyTailored(resume, tailored), jd)
return TailoringRun
Idempotency: Re-running tailor on the same run should replace tailoredResume and
tailoredMatch while preserving originals.
6. LLM Pipeline
Use separate prompts per task (stored under /prompts/), each requesting strict
JSON matching Zod schemas.
LLM ProviderOrchestratorLLM ProviderOrchestratorjd-extraction(JD
text)JobDescriptionProfile JSONresume-parser-cleanup(raw resume)
[optional]ResumeProfile JSONmatch-scoring(resume, JD)MatchScore
JSONgap-analysis(resume, JD)GapAnalysis JSONbullet-rewriter(bullets, JD,
gaps)Tailored bullets JSONfinal-assembly(summary, skills) [optional]TailoredResume
fragments
Prompt inventory
File Purpose
prompts/jd-extraction.ts JD → JobDescriptionProfile
prompts/resume-parser.ts Messy text → ResumeProfile
prompts/match-scoring.ts Pair → MatchScore
prompts/bullet-rewriter.ts Bullets → TailoredBullet[]
prompts/gap-analysis.ts Pair → GapAnalysis
prompts/final-assembly.ts Summary/skills polish
(optional)
Prompt rules (enforced in system messages)
● Never invent experience, employers, education, certifications, tools, or
metrics.
● Use only evidence from the provided resume.
● Mark uncertain suggestions; prefer confidence: low and riskFlag when
stretching terminology.
● Keep bullets concise and resume-appropriate; avoid keyword stuffing.
● Preserve career level and seniority implied by the original resume.
● Explain every meaningful rewrite in changeReason.
Reliability patterns
● JSON mode / response_format where supported.
● Zod validation on every response; on failure: single structured retry with
validation errors.
● Temperature — Lower (0–0.3) for parsing/scoring; moderate for rewriting if
creativity needed.
● Token budgeting — Truncate JD to requirements sections; send only
relevant experience blocks per rewrite batch.
7. Truthfulness & Guardrails
Guardrails span prompts, post-processing, and UI—not a single layer.
LLM Prompt Rules
JSON Schema Validation
Guardrail Checker
UI: Confidence & Risk Flags
Export Disclaimer + User Ack
7.1 Guardrail Checker (deterministic + LLM-assisted)
Check Action
New employer/title not in source resume Block or strip
New degree/certification Block or strip
New numeric metrics not in original bullet Flag or revert metric
Technology not in resume + not in gaps as “add if
true”
Flag riskFlag
Expertise inflation (e.g., “architect” → “led
org-wide platform”)
Downgrade confidence,
add risk
Keyword density spike vs original Warn in UI
7.2 User confirmation (MVP+)
● Low-confidence bullets highlighted; export may require checkbox: “I have
verified all content.”
● Suggestions for gaps never auto-merge into resume without explicit user
action (future enhancement).
7.3 Disclaimers
Comparison PDF and export flow include: generated content must be verified; no
ATS guarantee; do not submit unreviewed output.
8. API Design
REST-style routes under /api (or Server Actions for simpler MVP). All responses use
typed JSON; errors return { error, code, details? }.
Metho
d
Route Description
POST /api/parse/resume Upload or body text → ResumeProfile
POST /api/parse/jd JD text → JobDescriptionProfile
POST /api/analyze Full analyze: parse both if needed, original
score, gaps
POST /api/tailor Run tailoring + tailored score + guardrails
GET /api/runs/:id Fetch TailoringRun (if persisted)
POST /api/export/pdf Body: runId or full run payload → PDF URLs
or binary
Example: analyze response
{
 "runId": "uuid",
 "jobDescription": { },
 "resume": { },
 "originalMatch": { "overallScore": 62, "explanation": "..." },
 "gapAnalysis": { "gaps": [ ] }
}
Example: tailor response
{
 "runId": "uuid",
 "tailoredResume": { },
 "tailoredMatch": { "overallScore": 78, "explanation": "..." },
 "warnings": [ ]
}
Authentication (MVP): None required; rate-limit by IP or API key on server. Add
auth when moving to multi-user persistence.
9. Frontend Architecture
Stack: Next.js (App Router), React, TypeScript, Tailwind CSS, Shadcn UI.
9.1 Screens / routes
Route Purpose
/ Landing — value prop, CTA to start
/tailor Combined input: resume + JD, analyze
CTA
/tailor/[runId]/analysis JD summary, requirements, original score,
gaps
/tailor/[runId]/review Side-by-side bullets, diff highlights,
confidence
/tailor/[runId]/export Scores, download tailored PDF,
comparison PDF
For earliest vertical slice, a single page with stepped sections is acceptable before
route split.
9.2 State management
Approach Use case
React state + URL
runId
MVP session flow
TanStack Query Server mutations (analyze, tailor, export), caching,
loading/error
Zustand (optional) Multi-step wizard state if single page grows
Persist TailoringRun to sessionStorage for refresh resilience when DB is not
enabled.
9.3 Key components
Component Role
ResumeInput Textarea + file upload (PDF/DOCX)
JDInput Pasted JD text
ScoreCard Original vs tailored scores with explanation
JDRequirementsSummar
y
Extracted skills, tools, seniority
GapAnalysis Sortable/filterable gap list
SideBySideDiff Original vs tailored columns, highlight changes
BulletChangeCard Per-bullet metadata (reason, keywords,
confidence, risk)
PDFExportButton Triggers export, shows disclaimer modal
Rule: Components are presentational; hooks (useTailoringRun) call API routes; no
LLM calls from the browser (API keys server-only).
9.4 UX states
● Loading skeletons per section (parse, score, tailor, PDF).
● Inline parse warnings (non-fatal).
● Error boundaries with retry for LLM/validation failures.
● Sample resume + sample JD buttons for demo mode.
10. PDF Generation
Two artifacts per export:
1. Tailored resume PDF — Clean, ATS-friendly single-column layout.
2. Side-by-side comparison PDF — Primary proof artifact.
10.1 Comparison PDF contents
Section Content
Header Job title, company, run date
Scores Original vs tailored match (numeric + short
explanation)
JD
summary
Top requirements, skills, keywords
Main body Two columns: original bullets
Gap
summary
High/medium gaps table
Footer Truthfulness disclaimer, user verification notice
10.2 Implementation options
Option Pros Cons
@react-pdf/rend
erer
React components → PDF, good
for structured layout
Complex diff
highlighting
Playwright /
Puppeteer
HTML template → PDF, easy CSS
highlighting
Heavier dep, server
runtime
pdf-lib Low-level control More manual layout
work
Recommendation: HTML template + Playwright (or Puppeteer) on API route for
comparison PDF; React PDF or same HTML pipeline for tailored-only resume.
Highlight changed bullets via <mark> or background color in the HTML template
driven by TailoredBullet metadata.
11. Data & Persistence
11.1 MVP (acceptable)
● Ephemeral: In-memory or sessionStorage on client; optional runId in server
memory map for demo.
● No PII retention policy beyond session unless product requirements change.
11.2 Optional persistence
Entity Fields (summary)
User id, email (future)
Resume id, userId, profile JSON, rawText, createdAt
JobDescription id, userId, profile JSON, rawText
TailoringRun id, resumeId, jdId, originalMatch, tailoredResume,
tailoredMatch, gapAnalysis, status
ExportedDocument id, runId, type (tailored | comparison), storageUrl,
createdAt
SQLite for local prototype; Supabase/PostgreSQL for hosted MVP with row-level
security when auth is added.
11.3 File storage
Uploaded PDFs/DOCX: store temporarily on disk or S3-compatible bucket; delete
after parse or TTL (24h). Never log full resume content in production logs.
12. Cross-Cutting Concerns
12.1 Validation
● Zod schemas mirror TypeScript types in lib/schemas.ts.
● API handlers: parse → validate → execute → validate output.
12.2 Observability
● Structured logs per pipeline stage: parse.resume, llm.jd-extraction,
match.score, duration, token usage.
● Do not log full resume/JD in production; use run IDs and hashes.
12.3 Security
● API keys only on server (OPENAI_API_KEY in env).
● File upload size limits, MIME validation, virus scan (future).
● Rate limiting on /api/tailor and /api/export/pdf.
● CSP on frontend; sanitize any user-rendered HTML in previews.
12.4 Configuration
OPENAI_API_KEY=
LLM_MODEL=gpt-4o-mini
MAX_UPLOAD_MB=5
PDF_RENDERER=playwright
DATABASE_URL= # optional
13. Deployment Topology
Optional services
Vercel / Node host
Next.js app + API routes
FastAPI parser sidecar
Supabase
User Browser
LLM API
Headless Chromium for PDF
● MVP: Single Next.js deployment on Vercel; serverless functions for API;
Playwright may require dedicated Node runtime or external PDF microservice.
● Alternative: Frontend on Vercel + FastAPI on Railway/Fly for parsing/PDF
only.
14. Implementation Phases
Aligned with problemStatement.md §15:
Phase Deliverable Architecture focus
1 — Static
prototype
Paste-only UI, mocked JSON,
in-browser side-by-side
Component tree, types,
mock orchestrator
2 — LLM
integration
Real parsers, scoring, rewrite,
gaps
Prompt modules, Zod
validation, API routes
3 — PDF
export
Tailored + comparison PDFs HTML templates, export
route
4 —
Guardrails
Risk flags, claim detection,
confirmation
Guardrail checker service
5 — Polish Samples, loading, errors,
downloads
UX hardening,
observability
First vertical slice (minimum): One page → POST /api/analyze + POST /api/tailor
→ side-by-side UI → POST /api/export/pdf.
15. Repository Layout
resume-shapeshifter/
├── app/
│ ├── page.tsx # Landing
│ ├── tailor/
│ │ ├── page.tsx # Input wizard
│ │ └── [runId]/
│ │ ├── analysis/page.tsx
│ │ ├── review/page.tsx
│ │ └── export/page.tsx
│ └── api/
│ ├── parse/resume/route.ts
│ ├── parse/jd/route.ts
│ ├── analyze/route.ts
│ ├── tailor/route.ts
│ └── export/pdf/route.ts
├── components/
│ ├── ResumeInput.tsx
│ ├── JDInput.tsx
│ ├── ScoreCard.tsx
│ ├── GapAnalysis.tsx
│ ├── SideBySideDiff.tsx
│ └── PDFExportButton.tsx
├── lib/
│ ├── schemas.ts # Zod + shared types
│ ├── orchestrator.ts
│ ├── scoring.ts # Deterministic helpers
│ ├── guardrails.ts
│ └── pdf.ts
├── services/
│ ├── resume-parser.ts
│ ├── jd-parser.ts
│ ├── match-engine.ts
│ ├── tailoring-engine.ts
│ ├── gap-engine.ts
│ └── pdf-generator.ts
├── prompts/
│ ├── jd-extraction.ts
│ ├── resume-parser.ts
│ ├── match-scoring.ts
│ ├── bullet-rewriter.ts
│ ├── gap-analysis.ts
│ └── final-assembly.ts
├── templates/
│ └── comparison-pdf.html
└── tests/
 ├── schemas.test.ts
 ├── guardrails.test.ts
 └── fixtures/ # Sample resume + JD
16. Risks & Mitigations
Risk Impact Mitigation
Poor PDF/DOCX
parse order
Wrong bullets, bad
tailoring
Raw text retention; LLM cleanup;
UI warnings
LLM fabrication Trust/legal harm Prompt rules + guardrail checker +
risk flags
Inconsistent JSON Broken pipeline Zod + retry; json_schema mode
Scores feel falsely
precise
User over-relies
on number
Sub-scores + explanation; show
confidence bands in UI
Multi-column
resumes
Garbled text MVP disclaimer; text paste fallback
Serverless PDF
limits
Export fails Dedicated PDF worker or external
service
Cost / latency Poor UX Batch bullets; cache JD extraction
per run
Appendix A: End-to-End Sequence (Analyze + Tailor + Export)
LLMServicesAPI OrchestratorFrontendLLMServicesAPI
OrchestratorFrontendUserPaste resume + JDPOST /api/analyzeparse resume &
JDjd-extraction, optional resume cleanupstructured JSONmatch (original),
gapsscores, gaps, JD summaryGenerate tailored resumePOST
/api/tailorbullet-rewriter (+ assembly)TailoredResumeguardrails, match
(tailored)tailored content, new scoreExport PDFPOST /api/export/pdfPDF
generatorPDF filesUser
Appendix B: Definition of Done (Architecture Checklist)
● [ ] Typed domain model (ResumeProfile, JobDescriptionProfile, MatchScore,
TailoredResume, GapAnalysis, TailoringRun) with Zod validation
● [ ] Isolated prompts per LLM task with truthfulness system instructions
● [ ] Orchestrated pipeline: parse → score → gap → tailor → re-score →
guardrails
● [ ] UI: input, analysis, side-by-side review with bullet metadata
● [ ] Export: tailored PDF + side-by-side comparison PDF with scores, gaps,
disclaimer
● [ ] Demo path: real JD + sample resume produces portfolio-ready proof artifact
This architecture document should be updated when implementation choices diverge
(e.g., FastAPI sidecar adopted, auth added, or persistence enabled).