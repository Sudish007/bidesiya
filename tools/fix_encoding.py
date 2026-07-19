"""Repair double-encoded UTF-8 mojibake anywhere in the bidesiya-web tree.

USAGE:
    python bidesiya-web/tools/fix_encoding.py

WHAT IT DOES:
    Some files got UTF-8 text saved as if they were CP1252, then re-saved as
    UTF-8. That double-hop turns "🎉" into "ðŸŽ‰" and "₹" into "â‚¹" and "©"
    into "Â©". This tool undoes it in a bulletproof way:

    1. For every text file (.html, .js, .css, .svg, .md, .json), read as UTF-8
    2. Detect mojibake by scanning for known signature bigrams (Ã¢, Ã°, ðŸ, â€, Â©, ...)
    3. On any file with mojibake, try the round-trip:
           bytes = text.encode('cp1252')
           new_text = bytes.decode('utf-8')
       If new_text has FEWER mojibake markers than the original, keep it.
    4. Apply a targeted table for common leftovers.

KEEP THIS FILE. Re-run any time editing tools re-introduce mojibake.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Any of these strings appearing in a file means it's mojibaked.
MOJIBAKE_MARKERS = [
    "Ã¢",     # em-dash, ellipsis, curly-quote, bullet (start byte)
    "Ã°",     # emoji (4-byte UTF-8 starting with 0xF0) mangled
    "ðŸ",     # emoji already double-encoded, hex F0 9F ... printed as latin1
    "â€",     # em-dash / ellipsis / curly quote (post-round-trip variant)
    "Â©",     # copyright
    "Â·",     # middle dot
    "Ã‚Â",    # any Â-prefixed leftover
    "à¤",     # Devanagari mangled
    "à¥",     # Devanagari mangled  (matra range)
    "â‚¹",    # ₹ mangled
    "â˜",    # ☀ mangled prefix
]

# Fixes to apply after the round-trip catches most stuff.
CLEANUPS = [
    # Left-over stragglers
    ("Ã¢â‚¬â€", "\u2014"),  # em-dash
    ("Ã¢â‚¬Å“", "\u201C"),
    ("Ã¢â‚¬Â\u009D", "\u201D"),
    ("Ã¢â‚¬Â¦", "\u2026"),  # ellipsis
    ("Ã¢â‚¬Â¢", "\u2022"),  # bullet
    ("â€”", "\u2014"),
    ("â€¦", "\u2026"),
    ("â€œ", "\u201C"),
    ("â€\u009D", "\u201D"),
    ("â€˜", "\u2018"),
    ("â€™", "\u2019"),
    ("Ã‚Â©", "\u00A9"),
    ("Ã‚Â·", "\u00B7"),
    ("Â©", "\u00A9"),
    ("Â·", "\u00B7"),
    ("Â®", "\u00AE"),
    ("â‚¹", "\u20B9"),  # rupee
]


def count_mojibake(s: str) -> int:
    total = 0
    for m in MOJIBAKE_MARKERS:
        total += s.count(m)
    return total


def try_round_trip(text: str) -> str | None:
    """Return re-decoded text if it's valid UTF-8 after cp1252 encode.
    Returns None on any failure."""
    try:
        return text.encode("cp1252", errors="strict").decode("utf-8", errors="strict")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None


def fix_content(content: str) -> tuple[str, int]:
    """Attempt whole-file round-trip. If that fails, try line-by-line.
    Returns (new_content, num_mojibake_before_fix)."""
    before = count_mojibake(content)
    if before == 0:
        return content, 0

    # First try whole-file
    whole = try_round_trip(content)
    if whole is not None and count_mojibake(whole) < before:
        content = whole

    # Then targeted string replacements for any residuals
    for bad, good in CLEANUPS:
        content = content.replace(bad, good)

    # Retry line-by-line if some markers remain
    if count_mojibake(content) > 0:
        fixed_lines = []
        for line in content.split("\n"):
            if count_mojibake(line) == 0:
                fixed_lines.append(line)
                continue
            attempt = try_round_trip(line)
            if attempt is not None and count_mojibake(attempt) < count_mojibake(line):
                fixed_lines.append(attempt)
            else:
                fixed_lines.append(line)
        content = "\n".join(fixed_lines)
        for bad, good in CLEANUPS:
            content = content.replace(bad, good)

    return content, before


def main() -> None:
    root = Path(__file__).resolve().parent.parent  # bidesiya-web/
    extensions = {".html", ".js", ".css", ".svg", ".md", ".json"}

    total = 0
    fixed = 0
    remaining_files = []

    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in extensions:
            continue
        # Skip node_modules etc if any
        parts = set(path.parts)
        if parts & {"node_modules", ".git", "__pycache__"}:
            continue

        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            # File is not utf-8 at all — attempt cp1252 read then re-encode
            original = path.read_bytes().decode("cp1252", errors="replace")

        new, before = fix_content(original)
        total += 1
        if new != original:
            path.write_text(new, encoding="utf-8", newline="\n")
            after = count_mojibake(new)
            rel = path.relative_to(root)
            print(f"  fixed {rel}   ({before} -> {after} markers)")
            fixed += 1
            if after > 0:
                remaining_files.append((str(rel), after))

    print(f"\nScanned {total} files, fixed {fixed}.")
    if remaining_files:
        print("\nSTILL HAS MOJIBAKE (may need manual review):")
        for rel, n in remaining_files:
            print(f"  {rel}   ({n} markers)")


if __name__ == "__main__":
    main()
