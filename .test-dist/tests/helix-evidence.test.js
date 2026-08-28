"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const helix_evidence_1 = require("../lib/helix-evidence");
(0, node_test_1.default)("Helix evidence remains public, bounded, and source-authoritative", () => {
    const context = (0, helix_evidence_1.getHelixEvidenceContext)();
    strict_1.default.match(context.sourceCommit, /^[a-f0-9]{40}$/);
    strict_1.default.match(context.sourceDigest, /^[a-f0-9]{64}$/);
    strict_1.default.ok(context.systems.length > 0);
    strict_1.default.ok(context.companies.length > 0);
    strict_1.default.equal(new Set(context.systems.map((system) => system.system_id)).size, context.systems.length);
    strict_1.default.equal(new Set(context.companies.map((company) => company.company_id)).size, context.companies.length);
    for (const system of context.systems) {
        strict_1.default.ok(["PROMOTED", "REFERENCE_ONLY"].includes(system.state));
        strict_1.default.match(system.repository, /^GlacierEQ\/[A-Za-z0-9_.-]+$/);
        strict_1.default.ok(["PRIMARY_EVIDENCE", "SUPPORTING_EVIDENCE_WITH_BOUNDARY"].includes(system.resume_use));
        if (system.state === "REFERENCE_ONLY") {
            strict_1.default.equal(system.resume_use, "SUPPORTING_EVIDENCE_WITH_BOUNDARY");
        }
    }
    for (const company of context.companies) {
        strict_1.default.ok(company.non_affiliation.length > 0);
        for (const repository of company.public_repositories) {
            strict_1.default.ok(["PROMOTED", "REFERENCE_ONLY"].includes(repository.promotion_state));
            strict_1.default.match(repository.repository, /^GlacierEQ\/[A-Za-z0-9_.-]+$/);
        }
    }
    strict_1.default.ok(context.instructions.some((instruction) => instruction.includes("source résumé is authoritative")));
    strict_1.default.ok(context.instructions.some((instruction) => instruction.includes("may not add a fact absent")));
    strict_1.default.ok(context.instructions.some((instruction) => instruction.includes("never establishes affiliation")));
});
