"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TailoringRunSchema = exports.GapAnalysisSchema = exports.ResumeGapSchema = exports.TailoredResumeSchema = exports.TailoredExperienceEntrySchema = exports.TailoredBulletSchema = exports.MatchScoreSchema = exports.JobDescriptionProfileSchema = exports.ResumeProfileSchema = exports.CertificationEntrySchema = exports.EducationEntrySchema = exports.ProjectEntrySchema = exports.ExperienceEntrySchema = exports.ContactInfoSchema = void 0;
const zod_1 = require("zod");
// --- Resume Profile Schemas ---
exports.ContactInfoSchema = zod_1.z.object({
    name: zod_1.z.string().default(""),
    email: zod_1.z.string().default(""),
    phone: zod_1.z.string().optional().default(""),
    location: zod_1.z.string().optional().default(""),
    website: zod_1.z.string().optional().default(""),
});
exports.ExperienceEntrySchema = zod_1.z.object({
    company: zod_1.z.string().default(""),
    title: zod_1.z.string().default(""),
    startDate: zod_1.z.string().optional().default(""),
    endDate: zod_1.z.string().optional().default(""),
    bullets: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.ProjectEntrySchema = zod_1.z.object({
    name: zod_1.z.string().default(""),
    description: zod_1.z.string().default(""),
    bullets: zod_1.z.array(zod_1.z.string()).default([]),
    technologies: zod_1.z.array(zod_1.z.string()).optional().default([]),
});
exports.EducationEntrySchema = zod_1.z.object({
    institution: zod_1.z.string().default(""),
    degree: zod_1.z.string().default(""),
    fieldOfStudy: zod_1.z.string().optional().default(""),
    graduationDate: zod_1.z.string().optional().default(""),
});
exports.CertificationEntrySchema = zod_1.z.object({
    name: zod_1.z.string().default(""),
    issuer: zod_1.z.string().default(""),
    date: zod_1.z.string().optional().default(""),
});
exports.ResumeProfileSchema = zod_1.z.object({
    contact: exports.ContactInfoSchema,
    summary: zod_1.z.string().default(""),
    skills: zod_1.z.array(zod_1.z.string()).default([]),
    experience: zod_1.z.array(exports.ExperienceEntrySchema).default([]),
    projects: zod_1.z.array(exports.ProjectEntrySchema).default([]),
    education: zod_1.z.array(exports.EducationEntrySchema).default([]),
    certifications: zod_1.z.array(exports.CertificationEntrySchema).default([]),
});
// --- Job Description Profile Schemas ---
exports.JobDescriptionProfileSchema = zod_1.z.object({
    jobTitle: zod_1.z.string().default(""),
    company: zod_1.z.string().optional().default(""),
    requiredSkills: zod_1.z.array(zod_1.z.string()).default([]),
    preferredSkills: zod_1.z.array(zod_1.z.string()).default([]),
    responsibilities: zod_1.z.array(zod_1.z.string()).default([]),
    qualifications: zod_1.z.array(zod_1.z.string()).default([]),
    tools: zod_1.z.array(zod_1.z.string()).default([]),
    keywords: zod_1.z.array(zod_1.z.string()).default([]),
    seniorityLevel: zod_1.z.string().default("Mid-Level"),
    domainSignals: zod_1.z.array(zod_1.z.string()).default([]),
});
// --- Match Score Schemas ---
exports.MatchScoreSchema = zod_1.z.object({
    overallScore: zod_1.z.number().min(0).max(100).default(0),
    skillCoverageScore: zod_1.z.number().min(0).max(100).default(0),
    responsibilityAlignmentScore: zod_1.z.number().min(0).max(100).default(0),
    keywordScore: zod_1.z.number().min(0).max(100).default(0),
    seniorityScore: zod_1.z.number().min(0).max(100).default(0),
    criticalMissingRequirements: zod_1.z.array(zod_1.z.string()).default([]),
    explanation: zod_1.z.string().default(""),
});
// --- Tailoring & Bullet Rewriting Schemas ---
exports.TailoredBulletSchema = zod_1.z.object({
    original: zod_1.z.string(),
    tailored: zod_1.z.string(),
    changeReason: zod_1.z.string(),
    keywordsAddressed: zod_1.z.array(zod_1.z.string()).default([]),
    confidence: zod_1.z.enum(["high", "medium", "low"]).default("medium"),
    riskFlag: zod_1.z.string().optional(),
});
exports.TailoredExperienceEntrySchema = zod_1.z.object({
    company: zod_1.z.string(),
    title: zod_1.z.string(),
    bullets: zod_1.z.array(exports.TailoredBulletSchema),
});
exports.TailoredResumeSchema = zod_1.z.object({
    tailoredSummary: zod_1.z.string().default(""),
    tailoredSkills: zod_1.z.array(zod_1.z.string()).default([]),
    tailoredExperience: zod_1.z.array(exports.TailoredExperienceEntrySchema).default([]),
});
// --- Gap Analysis Schemas ---
exports.ResumeGapSchema = zod_1.z.object({
    name: zod_1.z.string(),
    importance: zod_1.z.enum(["high", "medium", "low"]).default("medium"),
    jdEvidence: zod_1.z.string(),
    resumeEvidence: zod_1.z.string(),
    suggestedAction: zod_1.z.string(),
    canSafelyAdd: zod_1.z.boolean().default(false),
});
exports.GapAnalysisSchema = zod_1.z.object({
    gaps: zod_1.z.array(exports.ResumeGapSchema).default([]),
});
// --- Tailoring Run Schema ---
exports.TailoringRunSchema = zod_1.z.object({
    id: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    resume: exports.ResumeProfileSchema,
    jobDescription: exports.JobDescriptionProfileSchema,
    originalMatch: exports.MatchScoreSchema,
    tailoredResume: exports.TailoredResumeSchema.optional(),
    tailoredMatch: exports.MatchScoreSchema.optional(),
    gapAnalysis: exports.GapAnalysisSchema,
    status: zod_1.z.enum(["draft", "analyzed", "tailored", "exported"]).default("draft"),
});
