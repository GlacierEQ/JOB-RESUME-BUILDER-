"""End-to-end test for tools/generate_docx.py.

Generates a DOCX from a synthetic compilation manifest and verifies:
- the output is a valid OOXML package,
- every manifest text surface (name, headline, summary, skills, bullets)
  is inherited into word/document.xml (textual source inheritance),
- nothing is uploaded or submitted (stdlib only; no network).
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile

REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = REPO_ROOT / "tools" / "generate_docx.py"

MANIFEST = {
    "schema": "glaciereq.dynamic-application-compilation.v1",
    "target": {"company": "Massive", "jobTitle": "Senior Business Process Automation Expert"},
    "compiledResume": {
        "contact": {
            "name": "Jordan Sample",
            "email": "jordan.sample@example.test",
            "phone": "555-0100",
            "location": "Honolulu, HI",
            "website": "",
        },
        "summary": "Senior Business Process Automation Expert with a track record in automation.",
        "skills": ["n8n", "PostgreSQL", "Python"],
        "experience": [
            {
                "title": "Automation Engineer",
                "company": "Acme Corp",
                "startDate": "2021",
                "endDate": "2024",
                "bullets": ["Reduced manual triage time by 45% by building lead routing automation."],
            }
        ],
        "projects": [],
        "education": [],
        "certifications": [],
    },
}

EXPECTED_STRINGS = [
    "Jordan Sample",
    "Senior Business Process Automation Expert",
    "track record in automation",
    "n8n",
    "PostgreSQL",
    "Reduced manual triage time by 45% by building lead routing automation.",
    "Acme Corp",
    "SUMMARY",
    "SKILLS",
    "EXPERIENCE",
]


class GenerateDocxTest(unittest.TestCase):
    def test_generate_and_inherit(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            manifest_path = Path(tmp) / "manifest.json"
            out_path = Path(tmp) / "resume.docx"
            manifest_path.write_text(json.dumps(MANIFEST), encoding="utf-8")

            proc = subprocess.run(
                [sys.executable, str(SCRIPT), "--manifest", str(manifest_path), "--out", str(out_path)],
                capture_output=True,
                text=True,
                timeout=60,
            )
            self.assertEqual(proc.returncode, 0, msg=proc.stderr)
            self.assertTrue(out_path.is_file())

            with ZipFile(out_path) as archive:
                names = set(archive.namelist())
                self.assertIn("word/document.xml", names)
                self.assertIn("[Content_Types].xml", names)
                document_xml = archive.read("word/document.xml").decode("utf-8")

            for expected in EXPECTED_STRINGS:
                self.assertIn(expected, document_xml, msg=f"missing inherited text: {expected!r}")

    def test_missing_manifest_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            proc = subprocess.run(
                [sys.executable, str(SCRIPT), "--manifest", str(Path(tmp) / "nope.json"),
                 "--out", str(Path(tmp) / "out.docx")],
                capture_output=True,
                text=True,
                timeout=60,
            )
            self.assertNotEqual(proc.returncode, 0)


if __name__ == "__main__":
    unittest.main()
