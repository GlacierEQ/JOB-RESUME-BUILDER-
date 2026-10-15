import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { strengthenBullet, strengthenBullets } from "../lib/bullet-strength";
import { extractNumericClaims } from "../lib/truthfulness";

describe("strengthenBullet", () => {
  it("replaces a weak lead with a strong action verb", () => {
    const result = strengthenBullet("Responsible for developing ETL pipelines for claims intake.");
    assert.equal(result.tailored, "Developed ETL pipelines for claims intake.");
    assert.ok(result.appliedRules.includes("WEAK_LEAD"));
  });

  it("front-loads the quantified outcome into XYZ form", () => {
    const result = strengthenBullet(
      "Built ETL pipeline for claims intake, reducing load time by 40%.",
    );
    assert.equal(
      result.tailored,
      "Reduced load time by 40% by building ETL pipeline for claims intake.",
    );
    assert.ok(result.appliedRules.includes("XYZ_FRONTLOAD"));
    assert.equal(result.confidence, "high");
  });

  it("strips filler phrasing", () => {
    const result = strengthenBullet("Automated reports in order to save analyst time.");
    assert.ok(!result.tailored.includes("in order to"));
    assert.ok(result.appliedRules.includes("FILLER_STRIP"));
  });

  it("never introduces a numeric claim absent from the original", () => {
    const originals = [
      "Responsible for developing ETL pipelines for claims intake.",
      "Built ETL pipeline for claims intake, reducing load time by 40%.",
      "Worked on ticket triage automation in order to route 200+ tickets per day.",
      "Helped with onboarding documentation.",
    ];
    for (const original of originals) {
      const result = strengthenBullet(original);
      const before = extractNumericClaims(original);
      for (const claim of extractNumericClaims(result.tailored)) {
        assert.ok(
          before.has(claim),
          `new numeric claim "${claim}" in: ${result.tailored}`,
        );
      }
    }
  });

  it("mirrors JD terminology only when the JD uses the target term", () => {
    const withJd = strengthenBullet(
      "Built continuous integration pipelines for the monorepo.",
      ["CI/CD"],
    );
    assert.ok(withJd.tailored.includes("CI/CD"));
    assert.ok(withJd.appliedRules.includes("TERM_MIRROR"));

    const withoutJd = strengthenBullet("Built continuous integration pipelines for the monorepo.", []);
    assert.equal(withoutJd.tailored, "Built continuous integration pipelines for the monorepo.");
  });

  it("leaves strong bullets unchanged", () => {
    const bullet = "Reduced API latency by 40% by rewriting the auth layer in Go.";
    const result = strengthenBullet(bullet);
    assert.equal(result.tailored, bullet);
    assert.deepEqual(result.appliedRules, []);
  });

  it("keeps bullet order and count stable across a list", () => {
    const bullets = [
      "Responsible for developing ETL pipelines.",
      "Built dashboards, improving visibility.",
    ];
    const out = strengthenBullets(bullets, []);
    assert.equal(out.length, bullets.length);
    assert.equal(out[0]?.original, bullets[0]);
    assert.equal(out[1]?.original, bullets[1]);
  });
});
