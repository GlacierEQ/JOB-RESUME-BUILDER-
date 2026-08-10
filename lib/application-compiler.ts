import type {
  JobDescriptionProfile,
  ResumeProfile,
  TailoredExperienceEntry,
  TailoredResume,
} from "./schemas";

export interface CompiledArtifact {
  readonly kind: "ats" | "json" | "html";
  readonly filename: string;
  readonly mimeType: string;
  readonly content: string;
}

export interface ChangeSummary {
  readonly summaryChanged: boolean;
  readonly skillsAdded: readonly string[];
  readonly skillsRemoved: readonly string[];
  readonly experienceBulletsChanged: readonly {
    readonly company: string;
    readonly title: string;
    readonly index: number;
    readonly before: string;
    readonly after: string;
  }[];
}

export interface ApplicationCompilation {
  readonly schema: "glaciereq.application-compilation.v1";
  readonly compiledAt: string;
  readonly source: ResumeProfile;
  readonly target: JobDescriptionProfile;
  readonly resume: ResumeProfile;
  readonly changes: ChangeSummary;
  readonly artifacts: readonly CompiledArtifact[];
  readonly boundary: {
    readonly humanReviewRequired: true;
    readonly hiringOutcomePrediction: false;
    readonly pdfGenerated: false;
    readonly externalSubmissionPerformed: false;
  };
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function sameText(left: string, right: string): boolean {
  return normalize(left).toLowerCase() === normalize(right).toLowerCase();
}

function safeFilename(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return normalized || "target-role";
}

function proposalMatchesSource(
  source: ResumeProfile["experience"][number],
  proposal: TailoredExperienceEntry,
): boolean {
  if (!sameText(source.company, proposal.company) || !sameText(source.title, proposal.title)) {
    return false;
  }
  if (source.bullets.length !== proposal.bullets.length) return false;
  return source.bullets.every((bullet, index) => {
    const candidate = proposal.bullets[index];
    return candidate !== undefined && sameText(candidate.original, bullet);
  });
}

export function materializeTailoredResume(
  source: ResumeProfile,
  tailored: TailoredResume,
): ResumeProfile {
  const usedProposalIndexes = new Set<number>();

  const findProposal = (
    experience: ResumeProfile["experience"][number],
    sourceIndex: number,
  ): TailoredExperienceEntry | undefined => {
    const samePosition = tailored.tailoredExperience[sourceIndex];
    if (
      samePosition &&
      !usedProposalIndexes.has(sourceIndex) &&
      proposalMatchesSource(experience, samePosition)
    ) {
      usedProposalIndexes.add(sourceIndex);
      return samePosition;
    }

    const matches = tailored.tailoredExperience
      .map((proposal, index) => ({ proposal, index }))
      .filter(
        ({ proposal, index }) =>
          !usedProposalIndexes.has(index) && proposalMatchesSource(experience, proposal),
      );

    if (matches.length !== 1) return undefined;
    usedProposalIndexes.add(matches[0]!.index);
    return matches[0]!.proposal;
  };

  return {
    ...source,
    summary: normalize(tailored.tailoredSummary),
    skills: tailored.tailoredSkills.map(normalize).filter(Boolean),
    experience: source.experience.map((experience, sourceIndex) => {
      const candidate = findProposal(experience, sourceIndex);
      if (!candidate) return experience;
      return {
        ...experience,
        bullets: experience.bullets.map((bullet, index) => {
          const proposal = candidate.bullets[index];
          return proposal ? normalize(proposal.tailored) : bullet;
        }),
      };
    }),
  };
}

export function summarizeChanges(
  source: ResumeProfile,
  compiled: ResumeProfile,
): ChangeSummary {
  const sourceSkills = new Set(source.skills.map((value) => normalize(value).toLowerCase()));
  const compiledSkills = new Set(compiled.skills.map((value) => normalize(value).toLowerCase()));
  const skillsAdded = compiled.skills.filter(
    (value) => !sourceSkills.has(normalize(value).toLowerCase()),
  );
  const skillsRemoved = source.skills.filter(
    (value) => !compiledSkills.has(normalize(value).toLowerCase()),
  );
  const experienceBulletsChanged: ChangeSummary["experienceBulletsChanged"][number][] = [];

  source.experience.forEach((entry, entryIndex) => {
    const after = compiled.experience[entryIndex];
    if (!after) return;
    entry.bullets.forEach((before, index) => {
      const next = after.bullets[index];
      if (next !== undefined && normalize(before) !== normalize(next)) {
        experienceBulletsChanged.push({
          company: entry.company,
          title: entry.title,
          index,
          before,
          after: next,
        });
      }
    });
  });

  return {
    summaryChanged: normalize(source.summary) !== normalize(compiled.summary),
    skillsAdded,
    skillsRemoved,
    experienceBulletsChanged,
  };
}

export function renderAtsText(resume: ResumeProfile): string {
  const lines: string[] = [];
  const contact = resume.contact;
  lines.push(normalize(contact.name));
  lines.push(
    [contact.email, contact.phone, contact.location, contact.website]
      .map((value) => normalize(value || ""))
      .filter(Boolean)
      .join(" | "),
  );

  if (resume.summary) lines.push("", "SUMMARY", normalize(resume.summary));
  if (resume.skills.length) lines.push("", "SKILLS", resume.skills.map(normalize).join(", "));

  if (resume.experience.length) {
    lines.push("", "EXPERIENCE");
    for (const entry of resume.experience) {
      lines.push(
        [normalize(entry.title), normalize(entry.company)].filter(Boolean).join(" — "),
      );
      const dates = [entry.startDate, entry.endDate]
        .map((value) => normalize(value || ""))
        .filter(Boolean);
      if (dates.length) lines.push(dates.join(" – "));
      for (const bullet of entry.bullets) lines.push(`- ${normalize(bullet)}`);
    }
  }

  if (resume.projects.length) {
    lines.push("", "PROJECTS");
    for (const project of resume.projects) {
      lines.push(normalize(project.name));
      if (project.description) lines.push(normalize(project.description));
      for (const bullet of project.bullets) lines.push(`- ${normalize(bullet)}`);
      if (project.technologies.length) {
        lines.push(`Technologies: ${project.technologies.map(normalize).join(", ")}`);
      }
    }
  }

  if (resume.education.length) {
    lines.push("", "EDUCATION");
    for (const entry of resume.education) {
      lines.push(
        [entry.degree, entry.fieldOfStudy, entry.institution]
          .map((value) => normalize(value || ""))
          .filter(Boolean)
          .join(" — "),
      );
      if (entry.graduationDate) lines.push(normalize(entry.graduationDate));
    }
  }

  if (resume.certifications.length) {
    lines.push("", "CERTIFICATIONS");
    for (const entry of resume.certifications) {
      lines.push(
        [entry.name, entry.issuer, entry.date]
          .map((value) => normalize(value || ""))
          .filter(Boolean)
          .join(" — "),
      );
    }
  }

  return `${lines
    .filter((line, index) => line !== "" || lines[index - 1] !== "")
    .join("\n")
    .trim()}\n`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderPrintableHtml(resume: ResumeProfile): string {
  const section = (title: string, body: string) =>
    body ? `<section><h2>${escapeHtml(title)}</h2>${body}</section>` : "";

  const experience = resume.experience
    .map(
      (entry) => `<article><h3>${escapeHtml(entry.title)} · ${escapeHtml(
        entry.company,
      )}</h3><p>${escapeHtml(
        [entry.startDate, entry.endDate].filter(Boolean).join(" – "),
      )}</p><ul>${entry.bullets
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("")}</ul></article>`,
    )
    .join("");

  const projects = resume.projects
    .map((entry) => {
      const technologies = entry.technologies.length
        ? `<p><strong>Technologies:</strong> ${entry.technologies.map(escapeHtml).join(" · ")}</p>`
        : "";
      return `<article><h3>${escapeHtml(entry.name)}</h3>${
        entry.description ? `<p>${escapeHtml(entry.description)}</p>` : ""
      }<ul>${entry.bullets
        .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
        .join("")}</ul>${technologies}</article>`;
    })
    .join("");

  const education = resume.education
    .map(
      (entry) => `<article><h3>${escapeHtml(entry.institution)}</h3><p>${escapeHtml(
        [entry.degree, entry.fieldOfStudy].filter(Boolean).join(" · "),
      )}</p>${entry.graduationDate ? `<p>${escapeHtml(entry.graduationDate)}</p>` : ""}</article>`,
    )
    .join("");

  const certifications = resume.certifications.length
    ? `<ul>${resume.certifications
        .map(
          (entry) => `<li>${escapeHtml(
            [entry.name, entry.issuer, entry.date].filter(Boolean).join(" · "),
          )}</li>`,
        )
        .join("")}</ul>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(
    resume.contact.name || "Tailored Resume",
  )}</title><style>@page{margin:.6in}body{font:11pt/1.35 system-ui,sans-serif;max-width:8.5in;margin:auto;color:#111}h1{font-size:22pt;margin-bottom:4px}h2{font-size:12pt;border-bottom:1px solid #777;padding-bottom:2px;margin-top:18px}h3{font-size:11pt;margin:10px 0 2px}p{margin:3px 0}ul{margin:4px 0 8px;padding-left:18px}.contact{font-size:9.5pt}</style></head><body><header><h1>${escapeHtml(
    resume.contact.name,
  )}</h1><p class="contact">${escapeHtml(
    [resume.contact.email, resume.contact.phone, resume.contact.location, resume.contact.website]
      .filter(Boolean)
      .join(" · "),
  )}</p></header>${section("Summary", `<p>${escapeHtml(resume.summary)}</p>`)}${section(
    "Skills",
    resume.skills.length ? `<p>${resume.skills.map(escapeHtml).join(" · ")}</p>` : "",
  )}${section("Experience", experience)}${section("Projects", projects)}${section(
    "Education",
    education,
  )}${section("Certifications", certifications)}</body></html>\n`;
}

export function compileApplicationArtifacts(
  source: ResumeProfile,
  target: JobDescriptionProfile,
  tailored: TailoredResume,
  compiledAt = new Date().toISOString(),
): ApplicationCompilation {
  const resume = materializeTailoredResume(source, tailored);
  const changes = summarizeChanges(source, resume);
  const slug = safeFilename(`${target.company}-${target.jobTitle}`);
  const manifest = {
    schema: "glaciereq.tailored-resume.v1",
    compiledAt,
    target: {
      company: target.company,
      jobTitle: target.jobTitle,
    },
    sourceResume: source,
    compiledResume: resume,
    changes,
    boundary: {
      humanReviewRequired: true,
      hiringOutcomePrediction: false,
      pdfGenerated: false,
      externalSubmissionPerformed: false,
    },
  };

  return {
    schema: "glaciereq.application-compilation.v1",
    compiledAt,
    source,
    target,
    resume,
    changes,
    artifacts: [
      {
        kind: "ats",
        filename: `${slug}-resume.txt`,
        mimeType: "text/plain;charset=utf-8",
        content: renderAtsText(resume),
      },
      {
        kind: "json",
        filename: `${slug}-resume.json`,
        mimeType: "application/json;charset=utf-8",
        content: `${JSON.stringify(manifest, null, 2)}\n`,
      },
      {
        kind: "html",
        filename: `${slug}-resume.html`,
        mimeType: "text/html;charset=utf-8",
        content: renderPrintableHtml(resume),
      },
    ],
    boundary: {
      humanReviewRequired: true,
      hiringOutcomePrediction: false,
      pdfGenerated: false,
      externalSubmissionPerformed: false,
    },
  };
}
