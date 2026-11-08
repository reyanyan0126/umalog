"""Build the iPhone-importable Scripting ZIP from the public schedule and sources."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]


def build(destination):
    source = ROOT / "widget" / "scripting"
    files = [source / name for name in ("script.json", "index.tsx", "widget.tsx", "app_intents.tsx", "calendar.js", "header.js")]
    files.append(ROOT / "widget" / "graded-races.json")
    with ZipFile(destination, "w") as archive:
        for path in files:
            entry = ZipInfo(path.name, date_time=(2020, 1, 1, 0, 0, 0))
            archive.writestr(entry, path.read_bytes(), compress_type=ZIP_DEFLATED)
        assert archive.testzip() is None


if __name__ == "__main__":
    import sys
    build(sys.argv[1])
