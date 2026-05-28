import { z } from "zod";

// --- Resume Profile Schemas ---

export const ContactInfoSchema = z.object({
  name: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().optional().default(""),
  location: z.string().optional().default(""),
  website: z.string().optional().default(""),
});

export const ExperienceEntrySchema = z.object({
  company: z.string().default(""),
  title: z.string().default(""),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  bullets: z.array(z.string()).default([]),
});

export const ProjectEntrySchema = z.object({
  name: z.string().default(""),
  description: z.string().default(""),
  bullets: z.array(z.string()).default([]),
  technologies: z.array(z.string()).optional().default([]),
});

export const EducationEntrySchema = z.object({
  institution: z.string().default(""),
  degree: z.string().default(""),
  fieldOfStudy: z.string().optional().default(""),
  graduationDate: z.string().optional().default(""),
});

export const CertificationEntrySchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  date: z.string().optional().default(""),
});

export const ResumeProfileSchema = z.object({
  contact: ContactInfoSchema,
  summary: z.string().default(""),
  skills: z.array(z.string()).default([]),
  experience: z.array(ExperienceEntrySchema).default([]),
  projects: z.array(ProjectEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  certifications: z.array(CertificationEntrySchema).default([]),
});

// --- Job Description Profile Schemas ---

export const JobDescriptionProfileSchema = z.object({
  jobTitle: z.string().default(""),
  company: z.string().optional().default(""),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  qualifications: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  seniorityLevel: z.string().default("Mid-Level"),
  domainSignals: z.array(z.string()).default([]),
});

// --- Match Score Schemas ---

export const MatchScoreSchema = z.object({
  overallScore: z.number().min(0).max(100).default(0),
  skillCoverageScore: z.number().min(0).max(100).default(0),
  responsibilityAlignmentScore: z.number().min(0).max(100).default(0),
  keywordScore: z.number().min(0).max(100).default(0),
  seniorityScore: z.number().min(0).max(100).default(0),
  criticalMissingRequirements: z.array(z.string()).default([]),
  explanation: z.string().default(""),
});

// --- Tailoring & Bullet Rewriting Schemas ---

export const TailoredBulletSchema = z.object({
  original: z.string(),
  tailored: z.string(),
  changeReason: z.string(),
  keywordsAddressed: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  riskFlag: z.string().optional(),
});

export const TailoredExperienceEntrySchema = z.object({
  company: z.string(),
  title: z.string(),
  bullets: z.array(TailoredBulletSchema),
});

export const TailoredResumeSchema = z.object({
  tailoredSummary: z.string().default(""),
  tailoredSkills: z.array(z.string()).default([]),
  tailoredExperience: z.array(TailoredExperienceEntrySchema).default([]),
});

// --- Gap Analysis Schemas ---

export const ResumeGapSchema = z.object({
  name: z.string(),
  importance: z.enum(["high", "medium", "low"]).default("medium"),
  jdEvidence: z.string(),
  resumeEvidence: z.string(),
  suggestedAction: z.string(),
  canSafelyAdd: z.boolean().default(false),
});

export const GapAnalysisSchema = z.object({
  gaps: z.array(ResumeGapSchema).default([]),
});

// --- Tailoring Run Schema ---

export const TailoringRunSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  resume: ResumeProfileSchema,
  jobDescription: JobDescriptionProfileSchema,
  originalMatch: MatchScoreSchema,
  tailoredResume: TailoredResumeSchema.optional(),
  tailoredMatch: MatchScoreSchema.optional(),
  gapAnalysis: GapAnalysisSchema,
  status: z.enum(["draft", "analyzed", "tailored", "exported"]).default("draft"),
});

// --- TypeScript Interfaces ---

export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>;
export type ProjectEntry = z.infer<typeof ProjectEntrySchema>;
export type EducationEntry = z.infer<typeof EducationEntrySchema>;
export type CertificationEntry = z.infer<typeof CertificationEntrySchema>;
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;
export type JobDescriptionProfile = z.infer<typeof JobDescriptionProfileSchema>;
export type MatchScore = z.infer<typeof MatchScoreSchema>;
export type TailoredBullet = z.infer<typeof TailoredBulletSchema>;
export type TailoredExperienceEntry = z.infer<typeof TailoredExperienceEntrySchema>;
export type TailoredResume = z.infer<typeof TailoredResumeSchema>;
export type ResumeGap = z.infer<typeof ResumeGapSchema>;
export type GapAnalysis = z.infer<typeof GapAnalysisSchema>;
export type TailoringRun = z.infer<typeof TailoringRunSchema>;
