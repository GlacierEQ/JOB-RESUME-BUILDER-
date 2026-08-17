import { NextResponse } from "next/server";
import { compileApplicationEvidenceBrief } from "@/lib/application-evidence-brief";
import { readBoundedRequestJson, requestBoundaryStatus } from "@/lib/request-guards";
import { JobDescriptionProfileSchema, ResumeProfileSchema } from "@/lib/schemas";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedRequestJson(request);
    const resume = ResumeProfileSchema.parse(body.resume);
    const jobDescription = JobDescriptionProfileSchema.parse(body.jobDescription);
    const brief = compileApplicationEvidenceBrief(resume, jobDescription);

    return NextResponse.json({
      brief,
      status: "compiled",
      boundary: brief.boundary,
    });
  } catch (error: unknown) {
    const status = requestBoundaryStatus(error);
    const resolvedStatus = status >= 500 && error && typeof error === "object" && "issues" in error ? 400 : status;
    if (resolvedStatus >= 500) console.error("Application brief handler failed:", error);
    return NextResponse.json(
      {
        error:
          resolvedStatus >= 500
            ? "An unexpected error occurred while compiling the application brief."
            : errorMessage(error, "The application brief request is invalid."),
      },
      { status: resolvedStatus },
    );
  }
}
