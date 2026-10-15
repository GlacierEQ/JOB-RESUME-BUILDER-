"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const bullet_strength_1 = require("../lib/bullet-strength");
const truthfulness_1 = require("../lib/truthfulness");
(0, node_test_1.describe)("strengthenBullet", () => {
    (0, node_test_1.it)("replaces a weak lead with a strong action verb", () => {
        const result = (0, bullet_strength_1.strengthenBullet)("Responsible for developing ETL pipelines for claims intake.");
        strict_1.default.equal(result.tailored, "Developed ETL pipelines for claims intake.");
        strict_1.default.ok(result.appliedRules.includes("WEAK_LEAD"));
    });
    (0, node_test_1.it)("front-loads the quantified outcome into XYZ form", () => {
        const result = (0, bullet_strength_1.strengthenBullet)("Built ETL pipeline for claims intake, reducing load time by 40%.");
        strict_1.default.equal(result.tailored, "Reduced load time by 40% by building ETL pipeline for claims intake.");
        strict_1.default.ok(result.appliedRules.includes("XYZ_FRONTLOAD"));
        strict_1.default.equal(result.confidence, "high");
    });
    (0, node_test_1.it)("strips filler phrasing", () => {
        const result = (0, bullet_strength_1.strengthenBullet)("Automated reports in order to save analyst time.");
        strict_1.default.ok(!result.tailored.includes("in order to"));
        strict_1.default.ok(result.appliedRules.includes("FILLER_STRIP"));
    });
    (0, node_test_1.it)("never introduces a numeric claim absent from the original", () => {
        const originals = [
            "Responsible for developing ETL pipelines for claims intake.",
            "Built ETL pipeline for claims intake, reducing load time by 40%.",
            "Worked on ticket triage automation in order to route 200+ tickets per day.",
            "Helped with onboarding documentation.",
        ];
        for (const original of originals) {
            const result = (0, bullet_strength_1.strengthenBullet)(original);
            const before = (0, truthfulness_1.extractNumericClaims)(original);
            for (const claim of (0, truthfulness_1.extractNumericClaims)(result.tailored)) {
                strict_1.default.ok(before.has(claim), `new numeric claim "${claim}" in: ${result.tailored}`);
            }
        }
    });
    (0, node_test_1.it)("mirrors JD terminology only when the JD uses the target term", () => {
        const withJd = (0, bullet_strength_1.strengthenBullet)("Built continuous integration pipelines for the monorepo.", ["CI/CD"]);
        strict_1.default.ok(withJd.tailored.includes("CI/CD"));
        strict_1.default.ok(withJd.appliedRules.includes("TERM_MIRROR"));
        const withoutJd = (0, bullet_strength_1.strengthenBullet)("Built continuous integration pipelines for the monorepo.", []);
        strict_1.default.equal(withoutJd.tailored, "Built continuous integration pipelines for the monorepo.");
    });
    (0, node_test_1.it)("leaves strong bullets unchanged", () => {
        const bullet = "Reduced API latency by 40% by rewriting the auth layer in Go.";
        const result = (0, bullet_strength_1.strengthenBullet)(bullet);
        strict_1.default.equal(result.tailored, bullet);
        strict_1.default.deepEqual(result.appliedRules, []);
    });
    (0, node_test_1.it)("keeps bullet order and count stable across a list", () => {
        const bullets = [
            "Responsible for developing ETL pipelines.",
            "Built dashboards, improving visibility.",
        ];
        const out = (0, bullet_strength_1.strengthenBullets)(bullets, []);
        strict_1.default.equal(out.length, bullets.length);
        strict_1.default.equal(out[0]?.original, bullets[0]);
        strict_1.default.equal(out[1]?.original, bullets[1]);
    });
});
