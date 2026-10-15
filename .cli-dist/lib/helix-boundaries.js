"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HelixBoundaryViolationError = void 0;
exports.inspectHelixBoundaries = inspectHelixBoundaries;
exports.assertHelixBoundaries = assertHelixBoundaries;
class HelixBoundaryViolationError extends Error {
    violations;
    constructor(violations) {
        super(`Tailored resume failed deterministic Helix boundary validation with ${violations.length} violation${violations.length === 1 ? "" : "s"}.`);
        this.name = "HelixBoundaryViolationError";
        this.violations = violations;
    }
}
exports.HelixBoundaryViolationError = HelixBoundaryViolationError;
const PRODUCTION_CLAIMS = [
    "deployed",
    "deployed at",
    "deployed for",
    "deployed to",
    "in production",
    "production grade",
    "production proven",
    "production ready",
    "operating at scale",
    "running at scale",
    "used at scale",
    "used by customers",
    "customer deployed",
    "enterprise deployed",
    "adopted by",
    "live customer",
    "live production",
];
const AFFILIATION_CLAIMS = [
    "worked at",
    "worked for",
    "employed by",
    "employee of",
    "built for",
    "deployed at",
    "deployed for",
    "partnered with",
    "in partnership with",
    "customer of",
    "used by",
    "adopted by",
    "proprietary access",
    "internal access",
    "production at",
];
const ACCEPTABLE_REFERENCE_FLAGS = [
    "reference",
    "supporting evidence",
    "boundary",
    "not production",
    "verify",
    "verification",
    "limited evidence",
];
function inspectHelixBoundaries(source, tailored, helix) {
    const violations = [];
    const sourceCorpus = buildSourceCorpus(source);
    const sourceSummary = normalize(source.summary);
    const outputSummary = normalize(tailored.tailoredSummary);
    const sourceExperienceCompanies = new Set(source.experience.map((entry) => normalize(entry.company)).filter(Boolean));
    const finalTextFields = [
        { path: "tailoredSummary", text: tailored.tailoredSummary },
        ...tailored.tailoredSkills.map((skill, index) => ({
            path: `tailoredSkills[${index}]`,
            text: skill,
        })),
        ...tailored.tailoredExperience.flatMap((entry, experienceIndex) => entry.bullets.map((bullet, bulletIndex) => ({
            path: `tailoredExperience[${experienceIndex}].bullets[${bulletIndex}].tailored`,
            text: bullet.tailored,
        }))),
    ];
    for (const system of helix.systems) {
        const terms = systemTerms(system);
        const sourceContainsSystem = terms.some((term) => containsTerm(sourceCorpus, term));
        const outputFields = finalTextFields.filter((field) => terms.some((term) => containsTerm(normalize(field.text), term)));
        if (outputFields.length > 0 && !sourceContainsSystem) {
            for (const field of outputFields) {
                violations.push({
                    code: "HELIX_SYSTEM_NOT_IN_SOURCE",
                    path: field.path,
                    message: `Helix system "${system.system_id}" is not identified in the source resume and cannot be introduced by tailoring.`,
                });
            }
            continue;
        }
        if (system.state !== "REFERENCE_ONLY" || outputFields.length === 0) {
            continue;
        }
        const summaryContainsSystem = terms.some((term) => containsTerm(outputSummary, term));
        const sourceSummaryContainsSystem = terms.some((term) => containsTerm(sourceSummary, term));
        if (summaryContainsSystem && !sourceSummaryContainsSystem) {
            violations.push({
                code: "REFERENCE_ONLY_SUMMARY_PROMOTION",
                path: "tailoredSummary",
                message: `REFERENCE_ONLY system "${system.system_id}" cannot be newly promoted into the resume summary.`,
            });
        }
        for (const field of outputFields) {
            const normalizedText = normalize(field.text);
            const productionClaim = PRODUCTION_CLAIMS.find((claim) => containsPhrase(normalizedText, claim));
            if (productionClaim) {
                violations.push({
                    code: "REFERENCE_ONLY_PRODUCTION_CLAIM",
                    path: field.path,
                    message: `REFERENCE_ONLY system "${system.system_id}" cannot be paired with "${productionClaim}".`,
                });
            }
        }
        tailored.tailoredExperience.forEach((entry, experienceIndex) => {
            entry.bullets.forEach((bullet, bulletIndex) => {
                const tailoredContainsSystem = terms.some((term) => containsTerm(normalize(bullet.tailored), term));
                const originalContainsSystem = terms.some((term) => containsTerm(normalize(bullet.original), term));
                if (!tailoredContainsSystem || originalContainsSystem)
                    return;
                const normalizedFlag = normalize(bullet.riskFlag ?? "");
                if (!normalizedFlag ||
                    !ACCEPTABLE_REFERENCE_FLAGS.some((flag) => containsPhrase(normalizedFlag, flag))) {
                    violations.push({
                        code: "REFERENCE_ONLY_RISK_FLAG_REQUIRED",
                        path: `tailoredExperience[${experienceIndex}].bullets[${bulletIndex}].riskFlag`,
                        message: `New emphasis on REFERENCE_ONLY system "${system.system_id}" requires an explicit evidence-boundary risk flag.`,
                    });
                }
            });
        });
    }
    for (const company of helix.companies) {
        const aliases = companyAliases(company.company_id, company.display_name);
        const establishedEmployer = [...sourceExperienceCompanies].some((sourceCompany) => aliases.some((alias) => containsTerm(sourceCompany, alias)));
        const sourceContainsCompany = aliases.some((alias) => containsTerm(sourceCorpus, alias));
        for (const field of finalTextFields) {
            const normalizedText = normalize(field.text);
            const companyAlias = aliases.find((alias) => containsTerm(normalizedText, alias));
            if (!companyAlias)
                continue;
            if (!sourceContainsCompany) {
                violations.push({
                    code: "TARGET_COMPANY_NOT_IN_SOURCE",
                    path: field.path,
                    message: `Target-company alignment "${company.display_name}" is absent from the source resume and cannot be added as resume content.`,
                });
            }
            if (!establishedEmployer) {
                const affiliationClaim = findAffiliationClaim(normalizedText, aliases);
                if (affiliationClaim) {
                    violations.push({
                        code: "TARGET_COMPANY_AFFILIATION_CLAIM",
                        path: field.path,
                        message: `Independent alignment with "${company.display_name}" cannot be described using affiliation relationship "${affiliationClaim}".`,
                    });
                }
            }
        }
    }
    return deduplicate(violations);
}
function assertHelixBoundaries(source, tailored, helix) {
    const violations = inspectHelixBoundaries(source, tailored, helix);
    if (violations.length > 0) {
        throw new HelixBoundaryViolationError(violations);
    }
}
function buildSourceCorpus(source) {
    return normalize([
        source.summary,
        ...source.skills,
        ...source.experience.flatMap((entry) => [entry.company, entry.title, ...entry.bullets]),
        ...source.projects.flatMap((project) => [
            project.name,
            project.description,
            ...project.bullets,
            ...project.technologies,
        ]),
        ...source.education.flatMap((entry) => [
            entry.institution,
            entry.degree,
            entry.fieldOfStudy,
            entry.graduationDate,
        ]),
        ...source.certifications.flatMap((entry) => [entry.name, entry.issuer, entry.date]),
    ]
        .filter(Boolean)
        .join(" "));
}
function systemTerms(system) {
    const repositoryName = system.repository.split("/")[1] ?? "";
    return uniqueTerms([
        system.system_id,
        system.system_id.replaceAll("_", " "),
        system.system_id.replaceAll("-", " "),
        repositoryName,
        repositoryName.replaceAll("_", " "),
        repositoryName.replaceAll("-", " "),
    ]);
}
function companyAliases(companyId, displayName) {
    return uniqueTerms([
        companyId,
        companyId.replaceAll("_", " "),
        displayName,
        ...displayName.split("/"),
        ...displayName.split("&"),
    ]).filter((term) => term.length >= 3);
}
function uniqueTerms(values) {
    return [...new Set(values.map(normalize).filter((term) => term.length >= 3))];
}
function containsTerm(corpus, term) {
    if (!term)
        return false;
    return ` ${corpus} `.includes(` ${term} `);
}
function containsPhrase(corpus, phrase) {
    return ` ${corpus} `.includes(` ${normalize(phrase)} `);
}
function findAffiliationClaim(corpus, aliases) {
    const exactClaim = AFFILIATION_CLAIMS.find((claim) => containsPhrase(corpus, claim));
    if (exactClaim)
        return exactClaim;
    for (const alias of aliases) {
        const company = escapeRegExp(alias).replaceAll("\\ ", "\\s+");
        const boundedPatterns = [
            [
                "work or employment relationship",
                new RegExp(`\\b(?:worked|employed|employee)\\b(?:\\s+[a-z0-9+#]+){0,5}\\s+(?:at|for|by|of)\\s+${company}\\b`),
            ],
            [
                "built, delivered, or deployed for company",
                new RegExp(`\\b(?:built|developed|created|designed|engineered|implemented|delivered|deployed)\\b(?:\\s+[a-z0-9+#]+){0,10}\\s+(?:for|at|with)\\s+${company}\\b`),
            ],
            [
                "partnership or collaboration relationship",
                new RegExp(`\\b(?:partnered|collaborated)\\b(?:\\s+[a-z0-9+#]+){0,6}\\s+with\\s+${company}\\b`),
            ],
            [
                "company adoption or use",
                new RegExp(`\\b(?:used|adopted|deployed)\\b(?:\\s+[a-z0-9+#]+){0,6}\\s+by\\s+${company}\\b`),
            ],
            [
                "proprietary or internal access",
                new RegExp(`\\b(?:proprietary|internal)\\s+access\\b(?:\\s+[a-z0-9+#]+){0,4}\\s+(?:to|at|for)\\s+${company}\\b`),
            ],
            [
                "production relationship",
                new RegExp(`\\bproduction\\b(?:\\s+[a-z0-9+#]+){0,5}\\s+(?:at|for|with)\\s+${company}\\b`),
            ],
        ];
        const match = boundedPatterns.find(([, pattern]) => pattern.test(corpus));
        if (match)
            return match[0];
    }
    return undefined;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function normalize(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9+#]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}
function deduplicate(violations) {
    const seen = new Set();
    return violations.filter((violation) => {
        const key = `${violation.code}\u0000${violation.path}\u0000${violation.message}`;
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
