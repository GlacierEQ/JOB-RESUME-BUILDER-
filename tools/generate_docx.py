#!/usr/bin/env python3
"""Generate a clean, ATS-safe DOCX resume from a dynamic compilation manifest.

Reads the JSON manifest produced by compileDynamicApplication (or the plain
application-compilation manifest) and writes a single-column .docx with
standard headings, no tables, no text boxes, no graphics.

Python standard library only. Never uploads anything. Never submits anything.

Usage:
    python3 tools/generate_docx.py --manifest out/<slug>-resume-dynamic.json \
        --out out/<slug>-resume.docx
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
CT = "http://schemas.openxmlformats.org/package/2006/content-types"

CONTENT_TYPES = f"""<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="{CT}">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"""

RELS = f"""<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"""

DOC_RELS = f"""<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"""

STYLES = f"""<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="{W}">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr><w:sz w:val="48"/><w:szCs w:val="48"/><w:b/><w:color w:val="0F766E"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="Heading 1"/>
    <w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:b/><w:color w:val="0F766E"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="Heading 2"/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/><w:b/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
</w:styles>
"""


def run(text: str, bold: bool = False, size: int | None = None, color: str | None = None) -> str:
    rpr = ""
    if bold or size or color:
        parts = []
        if bold:
            parts.append("<w:b/>")
        if size:
            parts.append(f"<w:sz w:val=\"{size}\"/><w:szCs w:val=\"{size}\"/>")
        if color:
            parts.append(f"<w:color w:val=\"{color}\"/>")
        rpr = f"<w:rPr>{''.join(parts)}</w:rPr>"
    return f"<w:r>{rpr}<w:t xml:space=\"preserve\">{escape(text)}</w:t></w:r>"


def para(style: str, runs: list[str]) -> str:
    ppr = f"<w:pPr><w:pStyle w:val=\"{style}\"/></w:pPr>" if style != "Normal" else ""
    return f"<w:p>{ppr}{''.join(runs)}</w:p>"


def bullet(text: str) -> str:
    return para("Normal", [run("•  " + text)])


def build_document(manifest: dict) -> bytes:
    resume = manifest.get("compiledResume") or manifest.get("resume") or {}
    target = manifest.get("target") or {}
    contact = resume.get("contact") or {}

    paragraphs: list[str] = []
    name = (contact.get("name") or "").strip()
    if name:
        paragraphs.append(para("Title", [run(name)]))
    job_title = (target.get("jobTitle") or "").strip()
    if job_title:
        paragraphs.append(para("Normal", [run(job_title, bold=True, color="0F766E")]))
    contact_line = " · ".join(
        part for part in [
            contact.get("email"), contact.get("phone"),
            contact.get("location"), contact.get("website"),
        ] if part
    )
    if contact_line:
        paragraphs.append(para("Normal", [run(contact_line, size=18)]))

    def section(title: str) -> None:
        paragraphs.append(para("Heading1", [run(title.upper(), bold=True, color="0F766E")]))

    summary = (resume.get("summary") or "").strip()
    if summary:
        section("Summary")
        paragraphs.append(para("Normal", [run(summary)]))

    skills = resume.get("skills") or []
    if skills:
        section("Skills")
        paragraphs.append(para("Normal", [run(" · ".join(skills))]))

    experience = resume.get("experience") or []
    if experience:
        section("Experience")
        for entry in experience:
            title = entry.get("title") or ""
            company = entry.get("company") or ""
            head = " · ".join(part for part in [title, company] if part)
            if head:
                paragraphs.append(para("Heading2", [run(head, bold=True)]))
            dates = " – ".join(part for part in [entry.get("startDate"), entry.get("endDate")] if part)
            if dates:
                paragraphs.append(para("Normal", [run(dates, size=18)]))
            for b in entry.get("bullets") or []:
                paragraphs.append(bullet(b))

    projects = resume.get("projects") or []
    if projects:
        section("Projects")
        for project in projects:
            if project.get("name"):
                paragraphs.append(para("Heading2", [run(project["name"], bold=True)]))
            if project.get("description"):
                paragraphs.append(para("Normal", [run(project["description"])]))
            for b in project.get("bullets") or []:
                paragraphs.append(bullet(b))
            techs = project.get("technologies") or []
            if techs:
                paragraphs.append(para("Normal", [run("Technologies: " + " · ".join(techs), size=18)]))

    education = resume.get("education") or []
    if education:
        section("Education")
        for entry in education:
            head = " · ".join(
                part for part in [entry.get("degree"), entry.get("fieldOfStudy"), entry.get("institution")] if part
            )
            if head:
                paragraphs.append(para("Normal", [run(head, bold=True)]))
            if entry.get("graduationDate"):
                paragraphs.append(para("Normal", [run(entry["graduationDate"], size=18)]))

    certifications = resume.get("certifications") or []
    if certifications:
        section("Certifications")
        for entry in certifications:
            line = " · ".join(
                part for part in [entry.get("name"), entry.get("issuer"), entry.get("date")] if part
            )
            if line:
                paragraphs.append(bullet(line))

    document_xml = (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<w:document xmlns:w="{W}" xmlns:r="{R}">'
        f"<w:body>{''.join(paragraphs)}"
        f'<w:sectPr><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>'
        f'<w:pgSz w:w="12240" w:h="15840"/></w:sectPr>'
        f"</w:body></w:document>"
    )

    import io

    buffer = io.BytesIO()
    with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:
        archive.writestr("[Content_Types].xml", CONTENT_TYPES)
        archive.writestr("_rels/.rels", RELS)
        archive.writestr("word/_rels/document.xml.rels", DOC_RELS)
        archive.writestr("word/document.xml", document_xml)
        archive.writestr("word/styles.xml", STYLES)
    return buffer.getvalue()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Generate an ATS-safe DOCX resume from a compilation manifest.")
    parser.add_argument("--manifest", required=True, help="Path to the JSON compilation manifest.")
    parser.add_argument("--out", required=True, help="Destination .docx path.")
    args = parser.parse_args(argv)

    manifest_path = Path(args.manifest)
    if not manifest_path.is_file():
        print(f"error: manifest not found: {manifest_path}", file=sys.stderr)
        return 2
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"error: cannot read manifest: {exc}", file=sys.stderr)
        return 2

    data = build_document(manifest)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(data)
    print(f"wrote {out_path} ({len(data)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
