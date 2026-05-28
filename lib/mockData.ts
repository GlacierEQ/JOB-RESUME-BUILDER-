import { ResumeProfile, JobDescriptionProfile, MatchScore, GapAnalysis, TailoredResume } from "./schemas";

export const mockResume: ResumeProfile = {
  contact: {
    name: "Alex Mercer",
    email: "alex.mercer@email.com",
    phone: "+1 (555) 019-2834",
    location: "San Francisco, CA",
    website: "github.com/alexmercer",
  },
  summary: "Results-driven Software Engineer with 4 years of experience specializing in building responsive, accessible web applications. Experienced in React, JavaScript, Node.js, and standard web technologies. Passionate about optimization and clean, readable code architectures.",
  skills: [
    "React",
    "JavaScript",
    "TypeScript",
    "Node.js",
    "Express",
    "HTML5/CSS3",
    "Git",
    "RESTful APIs",
    "SQL (PostgreSQL)",
  ],
  experience: [
    {
      company: "TechNova Solutions",
      title: "Software Engineer",
      startDate: "Oct 2022",
      endDate: "Present",
      bullets: [
        "Led the frontend overhaul of a customer analytics dashboard using React, resulting in a 25% page speed load improvement.",
        "Collaborated with backend engineers to integrate third-party REST APIs, ensuring seamless transactional user data flows.",
        "Refactored legacy vanilla CSS files into modular structures, improving developer onboarding velocity by 15%.",
        "Wrote unit tests for key application routes, increasing core codebase test coverage from 45% to 75%."
      ],
    },
    {
      company: "PixelCraft Agency",
      title: "Junior Developer",
      startDate: "Jun 2020",
      endDate: "Sep 2022",
      bullets: [
        "Assisted in building responsive landing pages and client promotional sites using HTML, CSS, and basic JavaScript.",
        "Identified and resolved cross-browser rendering bugs, improving customer engagement metrics on client portals.",
        "Contributed to database optimization scripts for an internal SQL reporting tool, reducing report compilation latency by 10%."
      ],
    }
  ],
  projects: [
    {
      name: "TaskFlow Manager",
      description: "A collaborative Kanban-style dashboard for project managers built with React and Express.",
      bullets: [
        "Implemented real-time visual UI state sync using WebSocket, facilitating instantaneous updates for team members.",
        "Designed accessible form flows conforming to WCAG 2.1 AA specifications."
      ],
      technologies: ["React", "Express", "CSS Modules", "WebSocket"],
    }
  ],
  education: [
    {
      institution: "State University",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      graduationDate: "May 2020",
    }
  ],
  certifications: [
    {
      name: "AWS Certified Cloud Practitioner",
      issuer: "Amazon Web Services",
      date: "Jan 2024",
    }
  ],
};

export const mockJobDescriptionText = `
Position: Senior Frontend Engineer
Company: CloudSphere Global
Location: Remote / San Francisco, CA

Job Summary:
We are seeking a Senior Frontend Engineer to drive the next generation of our cloud management platforms. You will focus on building accessible, high-performance dashboards, optimizing performance, and structuring scalable frontend components using React and TypeScript.

Required Skills:
- Professional experience with React and TypeScript
- Strong knowledge of modern styling (Vanilla CSS, CSS Modules, or Tailwind)
- Passion for performance tuning, profiling, and web optimization
- Understanding of web accessibility standard guidelines (WCAG 2.1 AA)
- Experience writing core testing suites (Jest, testing-library)

Responsibilities:
- Rewrite and optimize core dashboard layouts for extreme loading speeds
- Design reusable, state-of-the-art visual components
- Mentor junior engineers and collaborate on standard architectural designs
- Integrate secure REST and GraphQL endpoints
`;

export const mockJobDescription: JobDescriptionProfile = {
  jobTitle: "Senior Frontend Engineer",
  company: "CloudSphere Global",
  requiredSkills: [
    "React",
    "TypeScript",
    "Vanilla CSS",
    "CSS Modules",
    "WCAG 2.1 AA (Accessibility)",
    "Jest / testing-library",
    "Performance Optimization",
  ],
  preferredSkills: [
    "GraphQL",
    "Next.js",
    "Tailwind CSS",
  ],
  responsibilities: [
    "Rewrite and optimize core dashboard layouts for extreme loading speeds",
    "Design reusable, state-of-the-art visual components",
    "Mentor junior engineers and collaborate on standard architectural designs",
    "Integrate secure REST and GraphQL endpoints",
  ],
  qualifications: [
    "Professional experience with React and TypeScript",
    "Solid understanding of modern styling and layouts",
    "Familiarity with writing testing suites",
  ],
  tools: [
    "Git",
    "VS Code",
    "Playwright",
  ],
  keywords: [
    "accessible",
    "high-performance",
    "dashboards",
    "optimizing",
    "reusable",
    "REST",
    "architectural",
  ],
  seniorityLevel: "Senior",
  domainSignals: [
    "Cloud management platform",
    "Dashboard optimization",
  ],
};

export const mockOriginalScore: MatchScore = {
  overallScore: 62,
  skillCoverageScore: 57,
  responsibilityAlignmentScore: 65,
  keywordScore: 60,
  seniorityScore: 70,
  criticalMissingRequirements: [
    "TypeScript (Weak representation)",
    "WCAG 2.1 AA (Accessibility) (Missing)",
    "Jest / testing-library (Missing)",
    "GraphQL (Missing)",
  ],
  explanation: "The candidate possesses a solid React and frontend baseline. However, there are significant skill gaps in accessibility standards (WCAG), testing frameworks (Jest), and TypeScript. While the candidate has done frontend optimization, the experience does not yet strongly demonstrate seniority indicators or mentoring capabilities.",
};

export const mockGapAnalysis: GapAnalysis = {
  gaps: [
    {
      name: "WCAG 2.1 AA (Accessibility)",
      importance: "high",
      jdEvidence: "Seeking a Senior Frontend Engineer to focus on building accessible... dashboards... Understanding of WCAG 2.1 AA specifications.",
      resumeEvidence: "Briefly mentions designing accessible forms in a project, but has no mention of WCAG standards in core experience.",
      suggestedAction: "Mention familiarity in the skills list, and explain WCAG implementation details in the TaskFlow Manager project description if you actually did WCAG testing.",
      canSafelyAdd: false,
    },
    {
      name: "TypeScript",
      importance: "high",
      jdEvidence: "Seeking professional experience with React and TypeScript.",
      resumeEvidence: "Lists TypeScript in skills, but none of the core experience bullet points mention TypeScript usage, reducing ATS keyword weight.",
      suggestedAction: "Add TypeScript references to your TechNova experience bullets to prove active day-to-day usage.",
      canSafelyAdd: true,
    },
    {
      name: "Jest / testing-library",
      importance: "medium",
      jdEvidence: "Experience writing core testing suites (Jest, testing-library).",
      resumeEvidence: "Lists general unit testing in experience, but does not explicitly name Jest or testing-library.",
      suggestedAction: "Modify the TechNova testing bullet to specify Jest and React Testing Library instead of general testing.",
      canSafelyAdd: true,
    },
    {
      name: "GraphQL",
      importance: "low",
      jdEvidence: "Integrate secure REST and GraphQL endpoints.",
      resumeEvidence: "Only mentions RESTful APIs and PostgreSQL databases.",
      suggestedAction: "Do not invent GraphQL experience if you have not worked with it. However, prepare to mention familiarity in interviews.",
      canSafelyAdd: false,
    },
  ],
};

export const mockTailoredResume: TailoredResume = {
  tailoredSummary: "Results-driven Software Engineer with 4 years of experience specializing in building responsive, highly accessible web applications. Proficient in React, TypeScript, and modern styling methods. Experienced in optimizing client-side performance, WCAG standards, and implementing robust testing suites.",
  tailoredSkills: [
    "React",
    "TypeScript",
    "JavaScript",
    "Vanilla CSS / CSS Modules",
    "WCAG 2.1 AA",
    "Node.js",
    "Express",
    "RESTful APIs",
    "SQL (PostgreSQL)",
    "Jest / React Testing Library",
  ],
  tailoredExperience: [
    {
      company: "TechNova Solutions",
      title: "Software Engineer",
      bullets: [
        {
          original: "Led the frontend overhaul of a customer analytics dashboard using React, resulting in a 25% page speed load improvement.",
          tailored: "Led the frontend overhaul of a React and TypeScript analytics dashboard, optimizing bundle size and resulting in a 25% page speed load improvement.",
          changeReason: "Aligned with JD required skills (TypeScript, performance tuning) by explicitly noting the core technology stack and optimization effort.",
          keywordsAddressed: ["TypeScript", "optimizing", "dashboards"],
          confidence: "high",
        },
        {
          original: "Collaborated with backend engineers to integrate third-party REST APIs, ensuring seamless transactional user data flows.",
          tailored: "Collaborated with backend engineers to integrate secure REST endpoints, ensuring seamless transactional user data flows.",
          changeReason: "Adjusted phrasing to match the JD responsibility for secure API integration.",
          keywordsAddressed: ["REST", "secure"],
          confidence: "high",
        },
        {
          original: "Refactored legacy vanilla CSS files into modular structures, improving developer onboarding velocity by 15%.",
          tailored: "Refactored legacy layout files into modern CSS Modules, resolving cross-browser bugs and improving developer onboarding velocity by 15%.",
          changeReason: "Aligned with styling requirements in the JD (CSS Modules) and cross-browser references.",
          keywordsAddressed: ["CSS Modules", "modern styling"],
          confidence: "high",
        },
        {
          original: "Wrote unit tests for key application routes, increasing core codebase test coverage from 45% to 75%.",
          tailored: "Wrote core unit tests using Jest and testing-library for dashboard routes, increasing test coverage from 45% to 75% to ensure layout resilience.",
          changeReason: "Addressed explicit testing tool requirements from the JD.",
          keywordsAddressed: ["Jest", "testing-library", "core testing"],
          confidence: "high",
        }
      ],
    },
    {
      company: "PixelCraft Agency",
      title: "Junior Developer",
      bullets: [
        {
          original: "Assisted in building responsive landing pages and client promotional sites using HTML, CSS, and basic JavaScript.",
          tailored: "Assisted in building responsive, accessible landing pages and client websites using HTML, modern CSS, and JavaScript.",
          changeReason: "Highlighted accessibility keywords naturally, matching early career parameters.",
          keywordsAddressed: ["accessible", "modern CSS"],
          confidence: "medium",
        },
        {
          original: "Identified and resolved cross-browser rendering bugs, improving customer engagement metrics on client portals.",
          tailored: "Identified and resolved cross-browser layout issues, improving layout responsiveness and customer engagement on client portals.",
          changeReason: "Preserved original experience while aligning with terminology in the JD.",
          keywordsAddressed: ["layout"],
          confidence: "medium",
        },
        {
          original: "Contributed to database optimization scripts for an internal SQL reporting tool, reducing report compilation latency by 10%.",
          tailored: "Contributed to database optimization scripts for an internal SQL reporting tool, reducing report compilation latency by 10%.",
          changeReason: "No modification needed; preserved as is to keep absolute truthfulness.",
          keywordsAddressed: ["optimizing"],
          confidence: "high",
        }
      ],
    }
  ],
};

export const mockTailoredScore: MatchScore = {
  overallScore: 88,
  skillCoverageScore: 85,
  responsibilityAlignmentScore: 90,
  keywordScore: 88,
  seniorityScore: 85,
  criticalMissingRequirements: [
    "GraphQL (Missing - preserved to maintain truthfulness)",
  ],
  explanation: "By explicitly highlighting TypeScript integration, WCAG standards, and Jest testing usage in your prior roles, your match profile improved from 62 to 88. You present a highly competitive, truthful frontend alignment while appropriately omitting unheld GraphQL experience.",
};
