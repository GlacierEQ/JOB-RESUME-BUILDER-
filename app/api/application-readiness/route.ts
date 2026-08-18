import { NextResponse } from "next/server";
import { compileApplicationReadiness } from "@/lib/application-readiness";
import { readBoundedRequestJson, requestBoundaryStatus } from "@/lib/request-guards";
import {
  JobDescriptionProfileSchema,
  ResumeProfileSchema,
  TailoredResumeSchema,
} from "@/lib/schemas";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function POST(request: Request) {
  try {
    const body = await readBoundedRequestJson(request);
    const source = ResumeProfileSchema.parse(body.source);
    const target = JobDescriptionProfileSchema.parse(body.target);
    const tailored = TailoredResumeSchema.parse(body.tailored);
    const report = compileApplicationReadiness(source, target, tailored);

    return NextResponse.json({
      report,
      status: "compiled",
      boundary: report.boundary,
    });
  } catch (error: unknown) {
    const status = requestBoundaryStatus(error);
    const resolvedStatus = status >= 500 && error && typeof error === "object" && "issues" in error ? 400 : status;
    if (resolvedStatus >= 500) console.error("Application readiness handler failed:", error);
    return NextResponse.json(
      {
        error:
          resolvedStatus >= 500
            ? "An unexpected error occurred while compiling application readiness."
            : errorMessage(error, "The application readiness request is invalid."),
      },
      { status: resolvedStatus },
    );
  }
}
