# Resume Shapeshifter Production Roadmap

## Completed hardening

- Corrected the repository identity link.
- Replaced starter documentation with evidence-bound product documentation.
- Removed silent mock-success fallbacks from parsing, analysis, scoring, and tailoring.
- Added deterministic checks for employers, titles, source bullets, numeric claims, and supported skills.
- Added executable truthfulness tests.
- Removed hard-coded client score mutation.
- Removed false PDF/export completion claims.
- Replaced demo-specific phrase highlighting with generic keyword highlighting.
- Added a GitHub Actions verification workflow.

## Remaining production gates

- [ ] Confirm GitHub Actions passes `npm ci`, `npm test`, `npm run lint`, and `npm run build`.
- [ ] Add integration tests for `/api/analyze` and `/api/tailor`.
- [ ] Test missing model configuration, malformed model JSON, schema failure, and truthfulness rejection.
- [ ] Add request-size limits, rate limiting, audit logging, and privacy controls.
- [ ] Replace model-generated match percentages with a documented method, or label them qualitative.
- [ ] Implement real document generation and downloadable artifacts.
- [ ] Define privacy boundaries before adding persistent tailoring runs.
- [ ] Deploy a preview and complete an end-to-end browser verification pass.
- [ ] Rename the repository to `resume-shapeshifter` after planning redirects and portfolio-reference updates.
- [ ] Link the verified deployment and architecture diagram from `job-application/SHOWCASE.md`.

## Completion condition

A logged-out reviewer can open the repository and live demo, run tests, trace each major claim to code, complete the workflow without hidden mock output, and download a reviewed artifact whose contents remain source-grounded.
