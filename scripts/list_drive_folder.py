"""List files in a public Google Drive folder (and nested folders)."""
from __future__ import annotations

import html as html_lib
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
ROOT = "1fuYM2vWTOOVWynUSgHWZdk8CLK5c84Wo"
OUT = Path(__file__).resolve().parents[1] / "web" / "data" / "drive-photos.json"


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as res:
        return res.read().decode("utf-8", errors="ignore")


def parse_entries(page: str) -> list[dict]:
    """Extract id/name/mime from Drive folder HTML."""
    entries: list[dict] = []
    seen: set[str] = set()

    # Pattern inside AF_initDataCallback blobs: ["FILE_ID","NAME",... mimeType nearby
    # Simpler: find ["id","name" pairs with known folder/file mime nearby
    for m in re.finditer(
        r'\["([a-zA-Z0-9_-]{25,44})","([^"]{1,200})",\d{13,}',
        page,
    ):
        fid, name = m.group(1), html_lib.unescape(m.group(2))
        if fid in seen:
            continue
        # skip root itself and common noise
        if name in ("Google apps", "Main menu", "Shared with me"):
            continue
        seen.add(fid)
        # look ahead for mime type in next 400 chars
        window = page[m.end() : m.end() + 500]
        mime_m = re.search(r'"(application/vnd\.google-apps\.[a-z]+|image/[^"]+|application/[^"]+)"', window)
        mime = mime_m.group(1) if mime_m else ""
        entries.append({"id": fid, "name": name, "mime": mime})
    return entries


def list_folder(folder_id: str) -> list[dict]:
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    page = fetch(url)
    return parse_entries(page)


def walk(folder_id: str, path: str = "") -> list[dict]:
    files: list[dict] = []
    try:
        entries = list_folder(folder_id)
    except Exception as e:
        print(f"ERROR listing {path or '/'}: {e}", file=sys.stderr)
        return files

    print(f"[{path or '/'}] {len(entries)} entries")
    for e in entries:
        is_folder = "folder" in (e.get("mime") or "") or (
            not e.get("mime") and "." not in e["name"] and e["name"].isupper()
        )
        # Prefer mime when available
        mime = e.get("mime") or ""
        if mime == "application/vnd.google-apps.folder" or (
            not mime and e["name"] in {
                "BB", "BUSINESS", "ENERGIA", "FINANCE", "HEADS", "HL", "HR",
                "MKT", "PROD&TECH", "SEGUROS", "PRODTECH", "PROD & TECH",
            }
        ):
            time.sleep(0.4)
            files.extend(walk(e["id"], f"{path}/{e['name']}" if path else e["name"]))
            continue

        if mime.startswith("image/") or e["name"].lower().endswith(
            (".jpg", ".jpeg", ".png", ".webp", ".gif", ".JPG", ".JPEG", ".PNG")
        ) or (not mime and e["id"] != folder_id):
            # If no mime and looks like a folder name we already handled, skip
            if e["name"] in {
                "BB", "BUSINESS", "ENERGIA", "FINANCE", "HEADS", "HL", "HR",
                "MKT", "PROD&TECH", "SEGUROS",
            }:
                continue
            files.append({
                "id": e["id"],
                "name": e["name"],
                "path": path,
                "mime": mime,
            })
    return files


def main() -> None:
    folder_id = sys.argv[1] if len(sys.argv) > 1 else ROOT
    # First pass: dump raw entries of root for debug
    root_entries = list_folder(folder_id)
    print("ROOT ENTRIES:")
    for e in root_entries:
        print(f"  {e['id']} | {e['name']} | {e['mime']}")

    all_files = walk(folder_id)
    # Deduplicate by id
    by_id = {f["id"]: f for f in all_files}
    files = sorted(by_id.values(), key=lambda x: (x.get("path") or "", x["name"].lower()))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(files, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nTotal photos: {len(files)}")
    print(f"Wrote {OUT}")
    for f in files[:30]:
        print(f"  {f['path']}/{f['name']} -> {f['id']}")
    if len(files) > 30:
        print(f"  ... and {len(files) - 30} more")


if __name__ == "__main__":
    main()
