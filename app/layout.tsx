import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume Shapeshifter — JD-to-Resume Tailoring Engine",
  description: "Transform your resume truthfully to match any job description. Generate structural match scores, gap analysis, and professional side-by-side comparison proofs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
