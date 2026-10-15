#!/usr/bin/env python3
"""Fail-closed DOCX source-inheritance verification for résumé variants.

Textual body-paragraph preservation (including tables), NOT formatting fidelity,
factual approval of additions, or an external application/submission receipt.
Uses only Python standard library. Never uploads candidate documents.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import BadZipFile, ZipFile

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
MAX_DOCUMENT_XML_BYTES = 12_000_000


def extract_paragraphs(raw: bytes) -> list[str]:
    try:
        with ZipFile(BytesIO(raw)) as archive:
            info = archive.getinfo("word/document.xml")
            if info.file_size > MAX_DOCUMENT_XML_BYTES:
                raise ValueError("DOCX document.xml exceeds inspection limit")
            xml = archive.read(info)
    except (BadZipFile, KeyError, RuntimeError, OSError) as exc:
        raise ValueError("DOCX lacks a readable word/document.xml") from exc
    try:
        root = ET.fromstring(xml)
    except ET.ParseError as exc:
        raise ValueError("DOCX contains malformed document XML") from exc
    body = root.find(f"{W}body")
    if body is None:
        raise ValueError("DOCX is missing its document body")
    paragraphs = []
    for para in body.iter(f"{W}p"):
        content = []
        for node in para.iter():
            if node.tag == f"{W}t":
                content.append(node.text or "")
            elif node.tag == f"{W}tab":
                content.append("\t")
            elif node.tag in (f"{W}br", f"{W}cr"):
                content.append("\n")
        paragraphs.append("".join(content))
    return paragraphs


def check_inheritance(source: bytes, derived: bytes) -> dict[str, object]:
    originals = extract_paragraphs(source)
    outputs = extract_paragraphs(derived)
    if not originals:
        raise ValueError("source DOCX has no paragraphs; cannot verify inheritance")
    matched = 0
    for paragraph in outputs:
        if matched < len(originals) and originals[matched] == paragraph:
            matched += 1
    passed = matched == len(originals)
    return {
        "schema": "glaciereq.docx-text-inheritance.v1",
        "passed": passed,
        "source_sha256": hashlib.sha256(source).hexdigest(),
        "derived_sha256": hashlib.sha256(derived).hexdigest(),
        "source_paragraph_count": len(originals),
        "derived_paragraph_count": len(outputs),
        "preserved_source_paragraph_count": matched,
        "added_paragraph_count": len(outputs) - len(originals) if passed else None,
        "first_missing_source_index": None if passed else matched,
        "boundaries": [
            "Exact body-paragraph text and order only; formatting and full OOXML fidelity are not assessed.",
            "Additional claims are not source-proven by this check.",
            "No approval, application submission, or external provider receipt is inferred.",
        ],
    }


def check_inheritance_paths(
    source_path: str | Path,
    derived_path: str | Path,
    *,
    expected_source_sha256: str | None = None,
) -> dict[str, object]:
    source = Path(source_path).read_bytes()
    derived = Path(derived_path).read_bytes()
    result = check_inheritance(source, derived)
    if expected_source_sha256 is not None:
        if not re.fullmatch(r"[0-9a-f]{64}", expected_source_sha256):
            raise ValueError("expected source SHA-256 must be 64 lowercase hex characters")
        digest_matches = result["source_sha256"] == expected_source_sha256
        result["source_digest_matches_expected"] = digest_matches
        result["passed"] = bool(result["passed"] and digest_matches)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source_docx")
    parser.add_argument("derived_docx")
    parser.add_argument("--source-sha256", help="expected immutable source bytes SHA-256")
    parser.add_argument("--receipt", help="optional private destination for JSON receipt")
    args = parser.parse_args(argv)
    try:
        result = check_inheritance_paths(
            args.source_docx, args.derived_docx,
            expected_source_sha256=args.source_sha256,
        )
    except (OSError, ValueError) as exc:
        print(json.dumps({
            "schema": "glaciereq.docx-text-inheritance.v1",
            "passed": False, "error": str(exc),
        }, sort_keys=True))
        return 2
    serialized = json.dumps(result, sort_keys=True, indent=2) + "\n"
    if args.receipt:
        Path(args.receipt).write_text(serialized, encoding="utf-8")
    print(serialized, end="")
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
