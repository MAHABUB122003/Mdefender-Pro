"""Build the distributable mdefender-pro WordPress plugin zip.

Zips the plugin source (excluding dev artifacts) into backend/downloads/
so the website can serve it for download.

Usage:
    python scripts/build_plugin_zip.py            # defaults below
    python scripts/build_plugin_zip.py <src_dir>  # override plugin source
"""

import os
import sys
import zipfile
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(ROOT)
PROJECT_DIR = os.path.dirname(BACKEND_DIR)
DEFAULT_SRC = os.path.join(PROJECT_DIR, "temp_extracted", "mdefender-pro")
XAMPP_SRC = r"C:\xampp\htdocs\mahabub\wp-content\plugins\mdefender-pro"
OUT_DIR = os.path.join(BACKEND_DIR, "downloads")
OUT_FILE = os.path.join(OUT_DIR, "mdefender-pro.zip")

EXCLUDED_NAMES = {
    "changelog.md",
    "docker-compose.yml",
    "PROPOSAL.md",
    "PUBLISHING-GUIDE.md",
    ".git",
    "__pycache__",
    ".venv",
    "node_modules",
}

PLUGIN_ROOT = "mdefender-pro"


def _should_skip(name: str) -> bool:
    if name in EXCLUDED_NAMES:
        return True
    if name.startswith("."):
        return True
    return False


def build(src_dir: str | None = None) -> str:
    src_dir = src_dir or DEFAULT_SRC
    if not os.path.isdir(src_dir):
        raise SystemExit(f"Plugin source not found: {src_dir}")
    if not os.path.isfile(os.path.join(src_dir, "waf-firewall.php")):
        raise SystemExit(f"Not a plugin folder (waf-firewall.php missing): {src_dir}")

    # Sync to XAMPP
    if os.path.isdir(os.path.dirname(XAMPP_SRC)):
        import shutil
        print(f"Syncing to {XAMPP_SRC}...")
        if os.path.exists(XAMPP_SRC):
            shutil.rmtree(XAMPP_SRC)
        shutil.copytree(src_dir, XAMPP_SRC, ignore=shutil.ignore_patterns(*EXCLUDED_NAMES))

    os.makedirs(OUT_DIR, exist_ok=True)
    if os.path.exists(OUT_FILE):
        os.remove(OUT_FILE)

    count = 0
    with zipfile.ZipFile(OUT_FILE, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if not _should_skip(d)]
            for fname in files:
                if _should_skip(fname):
                    continue
                full = os.path.join(root, fname)
                rel = os.path.relpath(full, src_dir)
                arc = os.path.join(PLUGIN_ROOT, rel).replace("\\", "/")
                zf.write(full, arc)
                count += 1

    size = os.path.getsize(OUT_FILE)
    footer = (
        f"mdefender-pro plugin bundle (v4.1.0)\n"
        f"Built: {datetime.now().isoformat(timespec='seconds')}\n"
        f"Files: {count}\n"
    )
    zf_marker = zipfile.ZipFile(OUT_FILE, "a")
    zf_marker.writestr(f"{PLUGIN_ROOT}/.build-info.txt", footer)
    zf_marker.close()

    print(f"Built {OUT_FILE} ({count} files, {size:,} bytes)")
    return OUT_FILE


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else None)