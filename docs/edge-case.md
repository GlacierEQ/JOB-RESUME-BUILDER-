# Edge-Case Reference Manual: Resume Shapeshifter

This manual outlines critical edge cases, structural failure points, user-input variants, and LLM behaviors organized by implementation phases. Refer to this document during active development to ensure the engine remains robust and professional.

---

## Phase 0: Project Setup & Schema Design

### 1. Extraneous/Empty Sections in Resume Profile
*   **Edge Case**: The user's resume contains non-standard sections (e.g., "Volunteering", "Interests", "Publications") or lacks standard sections completely (e.g., has no certifications, projects, or professional summary).
*   **Resolution**: Zod schemas must mark optional sections and internal properties as optional or nullable.
    *   Initialize optional arrays as empty arrays (`[]`) and optional strings as empty strings (`""`) to prevent `undefined` key failures on the client side.
*   **Zod Mitigations**:
    ```typescript
    export const ResumeProfileSchema = z.object({
      contact: ContactInfoSchema,
      summary: z.string().default(""),
      skills: z.array(z.string()).default([]),
      experience: z.array(ExperienceEntrySchema).default([]),
      projects: z.array(ProjectEntrySchema).default([]),
      education: z.array(EducationEntrySchema).default([]),
      certifications: z.array(CertificationEntrySchema).default([]),
    });
    ```

### 2. Missing Key Contact Data
*   **Edge Case**: The parsed resume does not contain an email or phone number.
*   **Resolution**: Set contact values as optional in the Zod schema, with fallback default placeholders (`"Not Provided"`) in the visual UI layout, preventing render breaks.

---

## Phase 1: Static Prototype UI & Flow

### 1. Extremely Long Bullet Text
*   **Edge Case**: The user inputs a resume containing bullets that are very long paragraphs, which distorts the height and alignment of the side-by-side view.
*   **Resolution**: 
    *   In `SideBySideDiff.module.css`, use flexbox or CSS grid with `align-items: stretch` so original and tailored bullet rows align perfectly vertically.
    *   Set max-height limits on bullet change cards, adding high-contrast visual overflow scrollbars.

### 2. Paste Ingestion Limits
*   **Edge Case**: A user pastes a massive copy-pasted document (e.g., a 100-page portfolio) into the resume or job description field.
*   **Resolution**: 
    *   Implement character counts and maximum string length limits in the inputs (`maxlength={100000}`).
    *   In the UI, show a high-contrast warning banner if the input character length exceeds a reasonable threshold.

### 3. Wizard Route Navigation State Loss
*   **Edge Case**: The user progresses to the tailoring review step and refreshes the browser, losing their parsed resume and job description.
*   **Resolution**: 
    *   Store `TailoringRun` data inside `sessionStorage` whenever there is a state transition in `/app/tailor/page.tsx`.
    *   On page mount, attempt to rehydrate the state from `sessionStorage` before showing the ingest screen.

---

## Phase 2: LLM Integration (OpenAI API)

### 1. Non-JSON LLM Output
*   **Edge Case**: The LLM outputs markdown formatting wrapper blocks (e.g., ` ```json ... ``` `) or adds conversational text before or after the JSON payload.
*   **Resolution**:
    *   Clean the response text using regex helpers to extract content enclosed inside the outermost `{` and `}` curly braces before passing it to `JSON.parse`.
    *   Use `json_object` response format option if supported by the LLM adapter.

### 2. Schema Validation Failure
*   **Edge Case**: The LLM response parses as valid JSON but fails Zod validation due to missing fields, wrong data types, or empty values.
*   **Resolution**:
    *   Capture Zod validation errors.
    *   Implement an automated single-retry system. Send the malformed JSON and the Zod error message back to the LLM, instructing it to fix the structure specifically.
    *   Fallback: If the retry fails, parse the original resume bullets and present them to the user with a warning banner indicating that tailoring failed for those specific items.

### 3. Broad or Vague JDs
*   **Edge Case**: A user inputs a JD consisting of only one line (e.g., "Looking for a cool React Dev").
*   **Resolution**:
    *   The JD Parser service should check for critical fields (e.g., `requiredSkills` array length).
    *   If the JD is too vague, the Match Engine should penalize keyword alignment scores and prompt the user in the UI: *"This Job Description seems very brief. Add more detail for optimal tailoring."*

---

## Phase 3: PDF Proof Generation & Layout

### 1. Inconsistent Multi-Page Heights
*   **Edge Case**: The side-by-side table rows break awkwardly across pages in the exported PDF, splitting text in half or rendering headers on empty pages.
*   **Resolution**:
    *   Utilize CSS print-break properties inside `templates/comparison-pdf.html`.
    *   Apply `page-break-inside: avoid;` on individual table rows and bullet container items.
    *   Ensure the disclaimer footer has `page-break-before: auto;` and a fixed margin.

### 2. PDF Engine Timeouts
*   **Edge Case**: Playwright/Puppeteer rendering takes longer than the serverless execution limit (e.g., Vercel's 10-second serverless timeout).
*   **Resolution**:
    *   Streamline the HTML template (avoid external asset loads, compile styles inline).
    *   Utilize optimized page layout scripts.
    *   Fallback: Offer an in-browser printable window option (`window.print()`) that formats the review screen into a high-quality print layout, removing server-side browser dependencies completely.

---

## Phase 4: Truthfulness Guardrails & Active Safety

### 1. Metric Halucination
*   **Edge Case**: The original resume bullet says *"Improved database query speeds"* and the LLM rewrites it to *"Improved database query speeds by 40%"*.
*   **Resolution**:
    *   The `lib/guardrails.ts` deterministic checker extracts numeric tokens (percentages, currency, integers) from the original bullet and the tailored bullet.
    *   If a numeric token exists in the tailored bullet but has no matching or similar number in the original, the guardrail service will flag this bullet with high risk (`riskFlag: "Hallucinated metric detected"`), downgrade confidence to `low`, and highlight it in the review dashboard.

### 2. Job Title & Authority Inflation
*   **Edge Case**: The original title is *"Junior Developer"* and the LLM attempts to rephrase experience to sound like a *"Lead Architect"*.
*   **Resolution**:
    *   Deterministic check: Ensure the original company names and job titles in `TailoredResume` match the original `ResumeProfile` exactly. Do not allow the LLM to rewrite structural fields.
    *   LLM Guardrail Prompt: A validation pass that reads: *"Compare this original bullet with this rewritten bullet. Does the rewrite claim leadership, system architectural control, or budgeting authority not explicitly mentioned in the original? If yes, flag it."*

---

## Phase 5: Polish & Operational Resilience

### 1. API Rate Limiting
*   **Edge Case**: Multiple users spam the `/api/tailor` endpoint, causing OpenAI API rate limits (TPM/RPM) to trigger.
*   **Resolution**:
    *   Implement memory-based rate limiting per IP address on the API endpoints using simple token buckets.
    *   Limit inputs: truncate inputs to 15,000 characters maximum before sending to the LLM.

### 2. UI Blank Screen
*   **Edge Case**: An unexpected runtime error occurs inside the complex side-by-side component.
*   **Resolution**:
    *   Wrap major dashboard elements in a React **Error Boundary** component.
    *   Provide a clean error fallback container that allows the user to download a backup JSON export of their pasted inputs so they don't lose their work, along with a "Start Over" button.
