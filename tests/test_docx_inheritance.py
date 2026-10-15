"""Regression tests for source-pinned private DOCX inheritance checks."""
import io
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path
from zipfile import ZipFile

from tools.docx_inheritance_gate import (
    check_inheritance, check_inheritance_paths, extract_paragraphs,
)

NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def docx(*paragraphs):
    body = "".join(
        f"<w:p><w:r><w:t>{value}</w:t></w:r></w:p>"
        for value in paragraphs
    )
    xml = f'<w:document xmlns:w="{NS}"><w:body>{body}</w:body></w:document>'
    output = io.BytesIO()
    with ZipFile(output, "w") as archive:
        archive.writestr("word/document.xml", xml)
    return output.getvalue()


class InheritanceGateTests(unittest.TestCase):
    def test_insertions_preserve_original_order_and_duplicates(self):
        result = check_inheritance(docx("A", "B", "A"), docx("A", "extra", "B", "A"))
        self.assertTrue(result["passed"])
        self.assertEqual(result["source_paragraph_count"], 3)
        self.assertEqual(result["added_paragraph_count"], 1)

    def test_missing_or_reordered_original_fails(self):
        self.assertFalse(check_inheritance(docx("A", "B", "C"), docx("A", "C"))["passed"])
        self.assertFalse(check_inheritance(docx("A", "B", "C"), docx("B", "A", "C"))["passed"])

    def test_changed_metric_fails_with_original_index(self):
        result = check_inheritance(
            docx("Role title", "42 verified tests"),
            docx("Role title", "420 verified tests"),
        )
        self.assertFalse(result["passed"])
        self.assertEqual(result["first_missing_source_index"], 1)

    def test_empty_source_and_invalid_docx_fail_closed(self):
        with self.assertRaises(ValueError):
            check_inheritance(docx(), docx("New"))
        with self.assertRaises(ValueError):
            extract_paragraphs(b"not a DOCX")

    def test_exact_source_digest_pin(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.docx"
            derived = Path(directory) / "derived.docx"
            source.write_bytes(docx("A"))
            derived.write_bytes(docx("A", "B"))
            expected = sha256(source.read_bytes()).hexdigest()
            good = check_inheritance_paths(
                source, derived, expected_source_sha256=expected,
            )
            self.assertTrue(good["passed"])
            bad = check_inheritance_paths(
                source, derived, expected_source_sha256="0" * 64,
            )
            self.assertFalse(bad["passed"])
            self.assertFalse(bad["source_digest_matches_expected"])

    def test_paragraph_extraction(self):
        self.assertEqual(extract_paragraphs(docx("A")), ["A"])


if __name__ == "__main__":
    unittest.main()
