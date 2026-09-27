#!/usr/bin/env python3
"""Create a private source inventory and a sanitized public snapshot.

The private output retains source names, paths, extracted text, and OCR. The public
output contains opaque source/unit identifiers, hashes, counts, and inspection status.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
DRAWING_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
NAMESPACES = {"w": WORD_NS, "r": REL_NS, "a": DRAWING_NS}
SOURCE_IDS = ("source-01", "source-02", "source-03", "source-04", "source-05", "source-06")


def digest_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def digest_json(value: Any) -> str:
    encoded = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    return digest_bytes(encoded)


def run(command: list[str]) -> str:
    return subprocess.run(command, check=True, capture_output=True, text=True).stdout


def text_of(element: ElementTree.Element) -> str:
    return "".join(node.text or "" for node in element.findall(".//w:t", NAMESPACES)).strip()


def style_of(paragraph: ElementTree.Element) -> str:
    style = paragraph.find("./w:pPr/w:pStyle", NAMESPACES)
    return "" if style is None else style.attrib.get(f"{{{WORD_NS}}}val", "")


def classify_paragraph(style: str, text: str) -> str:
    normalized = style.lower()
    if "heading" in normalized or normalized.startswith("title"):
        return "section"
    if "code" in normalized or re.search(r"^(const|let|type|function|class|import|export)\s", text):
        return "code"
    if re.search(r"\b(example|for example|e\.g\.)\b", text, re.IGNORECASE):
        return "example"
    return "paragraph"


def inspect_media(media_directory: Path, swift_script: Path) -> list[dict[str, Any]]:
    if not any(media_directory.iterdir()):
        return []
    output = media_directory.parent / "image-inspection.json"
    subprocess.run(["/usr/bin/swift", str(swift_script), str(media_directory), str(output)], check=True)
    return json.loads(output.read_text())


def inventory_docx(path: Path, private_directory: Path, swift_script: Path) -> dict[str, Any]:
    shutil.copy2(path, private_directory / "source.docx")
    source_directory = private_directory / "extracted"
    source_directory.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(path) as archive:
        document = ElementTree.fromstring(archive.read("word/document.xml"))
        relationships = ElementTree.fromstring(archive.read("word/_rels/document.xml.rels"))
        relationship_targets = {
            relationship.attrib["Id"]: Path(relationship.attrib["Target"]).name
            for relationship in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
            if "Id" in relationship.attrib and "Target" in relationship.attrib
        }
        media_names = sorted(name for name in archive.namelist() if name.startswith("word/media/") and not name.endswith("/"))
        media_directory = source_directory / "media"
        media_directory.mkdir(exist_ok=True)
        for name in media_names:
            (media_directory / Path(name).name).write_bytes(archive.read(name))

    units: list[dict[str, Any]] = []
    counts = {"section": 0, "paragraph": 0, "code": 0, "example": 0, "table": 0, "image": 0}
    body = document.find("w:body", NAMESPACES)
    if body is None:
        raise ValueError("DOCX body is missing")
    media_contexts: dict[str, list[dict[str, Any]]] = {}
    body_elements = list(body)
    for document_position, element in enumerate(body_elements):
        local_name = element.tag.rsplit("}", 1)[-1]
        if local_name == "p":
            text = text_of(element)
            preceding_text = ""
            following_text = ""
            for previous in reversed(body_elements[:document_position]):
                preceding_text = text_of(previous)
                if preceding_text:
                    break
            for following in body_elements[document_position + 1 :]:
                following_text = text_of(following)
                if following_text:
                    break
            for blip in element.findall(".//a:blip", NAMESPACES):
                relationship_id = blip.attrib.get(f"{{{REL_NS}}}embed")
                if relationship_id is None:
                    continue
                media_name = relationship_targets.get(relationship_id)
                if media_name is None:
                    continue
                media_contexts.setdefault(media_name, []).append({
                    "documentPosition": document_position,
                    "containingText": text,
                    "precedingText": preceding_text,
                    "followingText": following_text,
                })
            if not text:
                continue
            style = style_of(element)
            kind = classify_paragraph(style, text)
            counts[kind] += 1
            units.append({"kind": kind, "style": style, "text": text, "digest": digest_bytes(text.encode())})
        elif local_name == "tbl":
            rows = []
            for row in element.findall(".//w:tr", NAMESPACES):
                rows.append([text_of(cell) for cell in row.findall("./w:tc", NAMESPACES)])
            counts["table"] += 1
            units.append({"kind": "table", "rows": rows, "digest": digest_json(rows)})

    images = inspect_media(media_directory, swift_script)
    for image in images:
        counts["image"] += 1
        units.append({"kind": "image", "contexts": media_contexts.get(image["file"], []), **image})
    return {
        "path": str(path),
        "title": path.name,
        "format": "docx",
        "sourceDigest": digest_bytes(path.read_bytes()),
        "counts": counts,
        "units": units,
    }


def markdown_units(text: str) -> list[dict[str, Any]]:
    units: list[dict[str, Any]] = []
    in_code = False
    code_lines: list[str] = []
    paragraph_lines: list[str] = []

    def append_paragraph() -> None:
        value = "\n".join(paragraph_lines).strip()
        paragraph_lines.clear()
        if not value:
            return
        kind = "table" if all(line.strip().startswith("|") for line in value.splitlines()) else "paragraph"
        units.append({"kind": kind, "text": value, "digest": digest_bytes(value.encode())})

    for line in text.splitlines():
        if line.startswith("```"):
            if in_code:
                value = "\n".join(code_lines)
                units.append({"kind": "code", "text": value, "digest": digest_bytes(value.encode())})
                code_lines.clear()
            else:
                append_paragraph()
            in_code = not in_code
            continue
        if in_code:
            code_lines.append(line)
        elif line.startswith("#"):
            append_paragraph()
            value = line.lstrip("#").strip()
            units.append({"kind": "section", "text": value, "digest": digest_bytes(value.encode())})
        elif not line.strip():
            append_paragraph()
        else:
            paragraph_lines.append(line)
    append_paragraph()
    if code_lines:
        value = "\n".join(code_lines)
        units.append({"kind": "code", "text": value, "digest": digest_bytes(value.encode())})
    return units


def inventory_markdown_directory(path: Path) -> dict[str, Any]:
    files = sorted(file for file in path.rglob("*") if file.is_file() and file.suffix.lower() in {".md", ".txt"})
    units: list[dict[str, Any]] = []
    for file in files:
        relative = file.relative_to(path).as_posix()
        text = file.read_text(errors="replace")
        for unit in markdown_units(text):
            units.append({"file": relative, **unit})
    counts: dict[str, int] = {}
    for unit in units:
        counts[unit["kind"]] = counts.get(unit["kind"], 0) + 1
    source_digest = digest_json([{"file": file.relative_to(path).as_posix(), "digest": digest_bytes(file.read_bytes())} for file in files])
    return {
        "path": str(path),
        "title": path.name,
        "format": "markdown-directory",
        "sourceDigest": source_digest,
        "counts": counts,
        "units": units,
    }


def inventory_markdown_url(url: str, private_directory: Path) -> dict[str, Any]:
    with urllib.request.urlopen(url) as response:
        raw = response.read()
    (private_directory / "source.md").write_bytes(raw)
    text = raw.decode("utf-8", errors="replace")
    units = markdown_units(text)
    counts: dict[str, int] = {}
    for unit in units:
        counts[unit["kind"]] = counts.get(unit["kind"], 0) + 1
    return {
        "path": url,
        "title": "remote-markdown-source",
        "format": "markdown",
        "sourceDigest": digest_bytes(raw),
        "counts": counts,
        "units": units,
    }


def inventory_pdf(path: Path, private_directory: Path) -> dict[str, Any]:
    text_path = private_directory / "layout.txt"
    subprocess.run(["pdftotext", "-layout", str(path), str(text_path)], check=True)
    pages = text_path.read_text(errors="replace").split("\f")
    if pages and not pages[-1].strip():
        pages.pop()
    units: list[dict[str, Any]] = []
    for index, page in enumerate(pages, start=1):
        units.append({"kind": "page", "page": index, "text": page, "digest": digest_bytes(page.encode())})
    image_list = run(["pdfimages", "-list", str(path)])
    (private_directory / "image-list.txt").write_text(image_list)
    image_rows = [line for line in image_list.splitlines() if re.match(r"^\s*\d+\s+\d+\s+", line)]
    for index, row in enumerate(image_rows, start=1):
        units.append({"kind": "image-record", "index": index, "record": row, "digest": digest_bytes(row.encode())})
    return {
        "path": str(path),
        "title": path.name,
        "format": "pdf",
        "sourceDigest": digest_bytes(path.read_bytes()),
        "counts": {"page": len(pages), "image-record": len(image_rows)},
        "units": units,
    }


def sanitized_snapshot(inventories: list[dict[str, Any]]) -> dict[str, Any]:
    sources = []
    for source_id, inventory in zip(SOURCE_IDS, inventories, strict=True):
        public_units = []
        for index, unit in enumerate(inventory["units"], start=1):
            public_unit = {
                "id": f"{source_id}-unit-{index:04d}",
                "kind": unit["kind"],
                "digest": unit["digest"],
            }
            if unit["kind"] == "image":
                public_unit["inspection"] = unit["status"]
            if unit["kind"] == "page":
                public_unit["page"] = unit["page"]
            public_units.append(public_unit)
        sources.append({
            "id": source_id,
            "format": inventory["format"],
            "digest": inventory["sourceDigest"],
            "counts": inventory["counts"],
            "units": public_units,
        })
    snapshot_payload = {"schemaVersion": 1, "sources": sources}
    return {**snapshot_payload, "snapshotDigest": digest_json(snapshot_payload)}


def build_coverage(
    inventories: list[dict[str, Any]],
    snapshot: dict[str, Any],
    curation_path: Path,
    cards_path: Path,
) -> dict[str, Any]:
    curation = json.loads(curation_path.read_text())
    if curation.get("schemaVersion") != 1:
        raise ValueError("curation schemaVersion must be 1")
    if curation.get("sourceSnapshotDigest") != snapshot["snapshotDigest"]:
        raise ValueError("curation is bound to a different source snapshot")
    known_cards = {card["id"] for card in json.loads(cards_path.read_text())["cards"]}
    decisions: dict[str, dict[str, Any]] = {}
    private_units = {
        f"{source_id}-unit-{index:04d}": unit
        for source_id, inventory in zip(SOURCE_IDS, inventories, strict=True)
        for index, unit in enumerate(inventory["units"], start=1)
    }
    for decision in curation.get("decisions", []):
        source_id = decision["sourceId"]
        start = int(decision["start"])
        end = int(decision["end"])
        if source_id not in SOURCE_IDS or start < 1 or end < start:
            raise ValueError(f"invalid curation range: {decision}")
        if not str(decision.get("rationale", "")).strip():
            raise ValueError(f"curation decision lacks private rationale: {decision}")
        for card_id in decision.get("cardIds", []):
            if card_id not in known_cards:
                raise ValueError(f"curation references unknown card: {card_id}")
        for index in range(start, end + 1):
            unit_id = f"{source_id}-unit-{index:04d}"
            if unit_id in decisions:
                raise ValueError(f"overlapping curation decision: {unit_id}")
            if unit_id not in private_units:
                raise ValueError(f"curation references unknown source unit: {unit_id}")
            if private_units[unit_id]["kind"] == "image" and decision.get("visualReview") is not True:
                raise ValueError(f"image disposition lacks visual review evidence: {unit_id}")
            decisions[unit_id] = decision

    units = []
    for source in snapshot["sources"]:
        for public_unit in source["units"]:
            decision = decisions.get(public_unit["id"])
            if decision is None:
                units.append({
                    "unitId": public_unit["id"],
                    "disposition": "pending",
                    "cardIds": [],
                    "reasonCategory": "unclear-eligibility",
                })
                continue
            units.append({
                "unitId": public_unit["id"],
                "disposition": decision["disposition"],
                "cardIds": decision.get("cardIds", []),
                "reasonCategory": decision["reasonCategory"],
            })
    return {"schemaVersion": 1, "sourceSnapshotDigest": snapshot["snapshotDigest"], "units": units}


def build_release(cards_path: Path, topics_path: Path, coverage: dict[str, Any], snapshot: dict[str, Any]) -> dict[str, Any]:
    cards_file = json.loads(cards_path.read_text())
    cards_with_digests = []
    for card in cards_file["cards"]:
        card_payload = {"content": card["content"], "id": card["id"], "topics": card["topics"]}
        cards_with_digests.append({"digest": digest_json(card_payload), "id": card["id"]})
    topics = json.loads(topics_path.read_text())
    return {
        "schemaVersion": 1,
        "curatorId": "knowledge-curator-v1",
        "sourceSnapshotDigest": snapshot["snapshotDigest"],
        "cardSetDigest": digest_json(cards_with_digests),
        "coverageDigest": digest_json(coverage),
        "topicIndexDigest": digest_json(topics),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--private-root", type=Path, required=True)
    parser.add_argument("--public-output", type=Path, required=True)
    parser.add_argument("--docx", type=Path, action="append", required=True)
    parser.add_argument("--patterns", type=Path, required=True)
    parser.add_argument("--pdf", type=Path, required=True)
    parser.add_argument("--remote-markdown", required=True)
    parser.add_argument("--cards", type=Path)
    parser.add_argument("--topics", type=Path)
    parser.add_argument("--coverage-output", type=Path)
    parser.add_argument("--release-output", type=Path)
    parser.add_argument("--curation", type=Path)
    arguments = parser.parse_args()
    if len(arguments.docx) != 3:
        raise ValueError("exactly three --docx inputs are required")

    private_root = arguments.private_root.resolve()
    private_root.mkdir(parents=True, exist_ok=True)
    swift_script = Path(__file__).with_suffix(".swift")
    inventories = []
    for source_id, path in zip(SOURCE_IDS[:3], arguments.docx, strict=True):
        directory = private_root / source_id
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir()
        inventory = inventory_docx(path.resolve(), directory, swift_script)
        (directory / "inventory.json").write_text(json.dumps(inventory, ensure_ascii=False, indent=2, sort_keys=True))
        inventories.append(inventory)

    patterns_directory = private_root / SOURCE_IDS[3]
    patterns_directory.mkdir(exist_ok=True)
    raw_patterns = patterns_directory / "raw"
    if raw_patterns.exists():
        shutil.rmtree(raw_patterns)
    shutil.copytree(arguments.patterns.resolve(), raw_patterns)
    patterns = inventory_markdown_directory(arguments.patterns.resolve())
    (patterns_directory / "inventory.json").write_text(json.dumps(patterns, ensure_ascii=False, indent=2, sort_keys=True))
    inventories.append(patterns)

    pdf_directory = private_root / SOURCE_IDS[4]
    pdf_directory.mkdir(exist_ok=True)
    shutil.copy2(arguments.pdf.resolve(), pdf_directory / "source.pdf")
    pdf = inventory_pdf(arguments.pdf.resolve(), pdf_directory)
    (pdf_directory / "inventory.json").write_text(json.dumps(pdf, ensure_ascii=False, indent=2, sort_keys=True))
    inventories.append(pdf)

    remote_directory = private_root / SOURCE_IDS[5]
    remote_directory.mkdir(exist_ok=True)
    remote = inventory_markdown_url(arguments.remote_markdown, remote_directory)
    (remote_directory / "inventory.json").write_text(json.dumps(remote, ensure_ascii=False, indent=2, sort_keys=True))
    inventories.append(remote)

    private_manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": [{"id": source_id, **inventory} for source_id, inventory in zip(SOURCE_IDS, inventories, strict=True)],
    }
    (private_root / "manifest.json").write_text(json.dumps(private_manifest, ensure_ascii=False, indent=2, sort_keys=True))
    public = sanitized_snapshot(inventories)
    arguments.public_output.parent.mkdir(parents=True, exist_ok=True)
    arguments.public_output.write_text(json.dumps(public, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    release = None
    optional_outputs = (arguments.cards, arguments.topics, arguments.coverage_output, arguments.release_output, arguments.curation)
    if any(optional_outputs) and not all(optional_outputs):
        raise ValueError("--cards, --topics, --coverage-output, --release-output, and --curation must be supplied together")
    if all(optional_outputs):
        coverage = build_coverage(inventories, public, arguments.curation, arguments.cards)
        arguments.coverage_output.parent.mkdir(parents=True, exist_ok=True)
        arguments.coverage_output.write_text(json.dumps(coverage, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
        release = build_release(arguments.cards, arguments.topics, coverage, public)
        arguments.release_output.write_text(json.dumps(release, ensure_ascii=False, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "privateRoot": str(private_root),
        "snapshotDigest": public["snapshotDigest"],
        "sources": [{"id": source["id"], "counts": source["counts"]} for source in public["sources"]],
        "release": release,
    }, indent=2))


if __name__ == "__main__":
    main()
