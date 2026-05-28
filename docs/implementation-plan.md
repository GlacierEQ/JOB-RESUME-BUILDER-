# Phase-Wise Implementation Plan: Resume Shapeshifter

This implementation plan outlines the roadmaps, specific tasks, and validation checklists to build the **Resume Shapeshifter** engine in structured phases. It aligns directly with `docs/architecture.md`.

---

## Folder & Repository Structure

We will adhere strictly to the following repository layout:
```
resume-shapeshifter/
├── app/
│   ├── page.tsx                  # Landing Screen
│   ├── tailor/
│   │   ├── page.tsx              # Stepped Workspace (Ingest, Analyze, Review, Export)
│   │   └── [runId]/
│   │       ├── analysis/page.tsx # Detailed analysis route (optional)
│   │       ├── review/page.tsx   # Side-by-side editing review route (optional)
│   │       └── export/page.tsx   # PDF export route (optional)
│   ├── api/
│   │   ├── parse/resume/route.ts
│   │   ├── parse/jd/route.ts
│   │   ├── analyze/route.ts
│   │   ├── tailor/route.ts
│   │   └── export/pdf/route.ts
│   ├── globals.css               # Global CSS, Theme Variables, and Core Resets
│   └── layout.tsx
├── components/
│   ├── ResumeInput.tsx           # Resume text and file uploader
│   ├── ResumeInput.module.css
│   ├── JDInput.tsx               # Job description text editor
│   ├── JDInput.module.css
│   ├── ScoreCard.tsx             # Score visualizations (gauge & subscores)
│   ├── ScoreCard.module.css
│   ├── GapAnalysis.tsx           # Sorted gap checklist
│   ├── GapAnalysis.module.css
│   ├── SideBySideDiff.tsx        # Column layout matching original/tailored bullets
│   ├── SideBySideDiff.module.css
│   └── PDFExportButton.tsx       # Export trigger with terms disclaimer modal
│   └── PDFExportButton.module.css
├── lib/
│   ├── schemas.ts                # Shared Zod Schemas & TypeScript interfaces
│   ├── orchestrator.ts           # State machine coordination logic
│   ├── scoring.ts                # Deterministic fuzzy & keyword score calculators
│   ├── guardrails.ts             # Safety checks & fabrication mitigations
│   └── pdf.ts                    # PDF HTML compilation adapters
├── services/
│   ├── resume-parser.ts
│   ├── jd-parser.ts
│   ├── match-engine.ts
│   ├── tailoring-engine.ts
│   ├── gap-engine.ts
│   └── pdf-generator.ts
├── prompts/
│   ├── jd-extraction.ts          # Prompt templates for extracting JD parameters
│   ├── resume-parser.ts          # Prompt templates for structuring resume text
│   ├── match-scoring.ts          # Prompt templates for calculating scores
│   ├── bullet-rewriter.ts        # Prompt templates for rewriting bullets
│   ├── gap-analysis.ts           # Prompt templates for finding gaps
│   └── final-assembly.ts
└── templates/
    └── comparison-pdf.html       # Print layout HTML for side-by-side export
```

---

## Phase 0: Project Setup & Core Schema Design

The objective is to establish the boilerplate Next.js application, configure global styles using CSS Variables per strict rules, and define the TypeScript/Zod models.

### Tasks
1.  **Project Initialization**: Set up Next.js app, configure `tsconfig.json`, and set up environment dependencies (`zod`, `pdf-parse`, `mammoth`, `playwright` or standard rendering tools).
2.  **Theme Config (`app/globals.css`)**: Set up modern, responsive CSS Resets. Define the `:root` variables:
    *   `--bg-primary`: `#0f172a` (deep charcoal)
    *   `--bg-secondary`: `#1e293b`
    *   `--accent-primary`: `#10b981` (emerald green)
    *   `--accent-hover`: `#059669`
    *   `--text-primary`: `#f8fafc`
    *   `--text-secondary`: `#94a3b8`
    *   `--border-color`: `#334155`
    *   `--warning-amber`: `#f59e0b`
    *   `--danger-red`: `#ef4444`
3.  **Domain Schemas (`lib/schemas.ts`)**: Implement strict Zod schemas corresponding to the data contracts:
    *   `ResumeProfileSchema`
    *   `JobDescriptionProfileSchema`
    *   `MatchScoreSchema`
    *   `TailoredResumeSchema`
    *   `GapAnalysisSchema`
    *   `TailoringRunSchema`
4.  **Folder Structure**: Create empty modules under `components/`, `services/`, `lib/`, `prompts/`, and `app/api/` as structured in the repository map.

### Phase 0 Deliverable
A compiling Next.js skeleton app containing validated domain schemas, global CSS style guides, and initial layouts.

---

## Phase 1: Interactive Static Prototype (No LLM)

The objective is to build the front-end layout with CSS Modules and mock server responses, establishing the entire happy-path user experience without consuming LLM API tokens.

### Tasks
1.  **Create Mock Data Fixtures**: Establish a static mock `ResumeProfile` and `JobDescriptionProfile` (e.g., a software developer resume and frontend engineer job posting). Create mock output payloads for `MatchScore`, `GapAnalysis`, and `TailoredResume`.
2.  **UI Component Coding (styled with separate `.module.css` files)**:
    *   `ResumeInput.tsx`: Custom text area and mock parsing state loader.
    *   `JDInput.tsx`: Job description text input area.
    *   `ScoreCard.tsx`: Display original score (e.g., 62) and tailored score (e.g., 85) using high-fidelity circle gauge charts built with CSS and HTML. Show score category indicators.
    *   `GapAnalysis.tsx`: A table listing gaps, importance tags, and suggested actions.
    *   `SideBySideDiff.tsx`: Side-by-side scrolling columns displaying original vs. tailored bullets. Highlight rewritten text, explain changes in hoverable cards, show bullet metadata (confidence, keywords addressed).
    *   `PDFExportButton.tsx`: Renders download options. Prompts a popup modal with truthfulness disclaimers requiring user checkbox acknowledgment.
3.  **Workspace Orchestration (`app/tailor/page.tsx`)**:
    *   Construct a stepped workspace:
        *   **Step 1: Ingest** (Upload resume and paste JD).
        *   **Step 2: Analysis** (Show extracted requirements, original match score, and gaps).
        *   **Step 3: Tailoring Review** (Side-by-side editing review dashboard, showing before/after scores, bullet-by-bullet adjustments, and interactive overrides).
        *   **Step 4: Export** (Preview and trigger PDF generation).
4.  **Mock API Handlers**: Implement API routes under `/api/parse/resume`, `/api/parse/jd`, `/api/analyze`, and `/api/tailor` returning corresponding static fixtures immediately to test the client-side state pipeline.

### Phase 1 Deliverable
An fully interactive, responsive single-page visual dashboard loaded with sample profiles that models the complete user tailoring experience.

---

## Phase 2: LLM Integration (Groq Cloud API)

The objective is to replace the mock API payloads with actual responses generated by Groq's high-speed cloud platform using `llama-3.3-70b-versatile`, backed by structured JSON formatting and schema validation.

### Tasks
1.  **Configure API Client**: Add `GROQ_API_KEY` to local environment configuration. Install the Groq SDK dependency `npm install @groq/groq-sdk` or standard API handler. Create client interface in `services/llm.ts`.
2.  **Implement Prompts**:
    *   `prompts/resume-parser.ts`: Parses raw messy text and formats into a structured `ResumeProfile` object.
    *   `prompts/jd-extraction.ts`: Extract metadata and structure Job Description requirements.
    *   `prompts/match-scoring.ts`: Compares resume elements vs. JD and scores them logically.
    *   `prompts/gap-analysis.ts`: Analyzes skills/experiences to compile the gaps array.
    *   `prompts/bullet-rewriter.ts`: Instructs the model to refine resume bullets to highlight experience aligned with JD requirements while preserving truthfulness.
3.  **Zod Schema Validator**: Build a validator function that queries the LLM under `response_format: { type: "json_object" }`. Parse LLM outputs with Zod, and trigger a self-correcting prompt retry on validation exception.
4.  **Connect Real Domain Services**:
    *   Write the real methods inside `services/resume-parser.ts`, `services/jd-parser.ts`, `services/match-engine.ts`, `services/gap-engine.ts`, and `services/tailoring-engine.ts`.
    *   Update the API orchestrator `/api/analyze` and `/api/tailor` to sequentially invoke the LLM services.

### Phase 2 Deliverable
A fully functional dynamic API backend parsing and tailoring arbitrary resumes and JDs using the ultra-fast Groq Llama-3.3-70B model.

---

## Phase 3: PDF Proof Generation & Polish

The objective is to produce high-fidelity PDF documents summarizing the tailored resume and the side-by-side comparison proof.

### Tasks
1.  **Design Comparison Proof HTML Template (`templates/comparison-pdf.html`)**: Write an HTML print template displaying:
    *   Run headers (Job title, Company, date).
    *   Original vs. tailored scores.
    *   JD summaries.
    *   Parallel tables of original and tailored resume bullets.
    *   High/Medium gaps table.
    *   A prominent footer containing the truthfulness disclaimer.
2.  **Integrate Playwright (or a browser-based Print layout helper)**:
    *   Write `/api/export/pdf` API handler.
    *   Compile the tailored data into the HTML template, invoke headless Playwright, and capture the render output as a PDF stream.
3.  **Tailored Resume PDF Generator**: Configure a clean single-column template styled for classic resume standards to export the standalone tailored resume.
4.  **UX Hardening**: Include visual feedback loaders (skeletons and progress bars) on the frontend for each process: Ingesting $\rightarrow$ Scoring original $\rightarrow$ Calculating gaps $\rightarrow$ Rewriting bullets $\rightarrow$ Compiling PDF.

### Phase 3 Deliverable
Fully downloadable and printable high-fidelity PDF proof artifacts matching the side-by-side browser preview.

---

## Phase 4: Truthfulness Guardrails & Active Safety

The objective is to reinforce the truthfulness policy by implementing post-processing semantic safety checkers and highlighting high-risk edits in the review interface.

### Tasks
1.  **Write Guardrail Checker (`lib/guardrails.ts`)**:
    *   Compare original `ResumeProfile` bullets and data fields against the LLM's suggested `TailoredResume`.
    *   *Deterministic checks*: Fail or auto-revert if new employer names, education certifications, or dates are introduced. If numbers or percentages are injected into bullets that had no original numbers, flag and isolate them.
    *   *LLM-assisted checks*: Call `guardrail-check` prompt to analyze whether rewritten bullets stretch truth or claim expertise beyond original experience.
2.  **Review Dashboard Indicators**:
    *   Display confidence level tags (`high`, `medium`, `low`) next to rewritten bullets.
    *   Add color-coded warning banners to highlights flagged by the Guardrail Checker.
    *   Allow users to manually overwrite or revert individual rewritten bullets back to their original text.

### Phase 4 Deliverable
An advanced safety verification engine protecting the application against hallucinatory modifications.

---

## Phase 5: Final Polish & Portfolio Quality

The objective is to polish animations, handle edge cases, and add a single-click demo experience.

### Tasks
1.  **Stepped Wizard Animations**: Implement clean micro-transitions (fade-ins, tab slides) to make the step progression feel premium.
2.  **Add Preload Demo Suite**: Provide clickable "Load Sample Software Engineer" and "Load Sample Product Manager" buttons on the landing page, pre-populating inputs immediately for a stunning first-time demo.
3.  **Comprehensive Error Handling**: Add React Error Boundaries, custom toast alerts for network issues or LLM timeouts, and a graceful fallback interface.
