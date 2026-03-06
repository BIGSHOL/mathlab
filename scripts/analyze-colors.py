"""Analyze text color structure in RPM teacher's PDF to separate Q from A."""
import fitz
import sys
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open('data/rpm/RPM 중학 1-1 교사용.pdf')

# Analyze pages 9-12 (교과서 문제유형 + 유형 pages)
for pg_idx in [8, 9, 10, 11, 15, 20]:
    if pg_idx >= len(doc):
        continue
    page = doc[pg_idx]
    blocks = page.get_text("dict")["blocks"]

    print(f"\n{'='*70}")
    print(f"=== Page {pg_idx+1} ===")
    print(f"{'='*70}")

    color_counts = Counter()

    for block in blocks:
        if block["type"] != 0:  # text blocks only
            continue
        for line in block["lines"]:
            line_text = ""
            line_colors = []
            for span in line["spans"]:
                text = span["text"]
                color = span["color"]  # integer RGB
                font = span["font"]
                size = span["size"]

                # Convert color int to RGB hex
                r = (color >> 16) & 0xFF
                g = (color >> 8) & 0xFF
                b = color & 0xFF
                hex_color = f"#{r:02X}{g:02X}{b:02X}"

                color_counts[hex_color] += len(text.strip())

                if text.strip():
                    line_text += text
                    line_colors.append((hex_color, font, size, text))

            if line_text.strip():
                # Show colored text with annotations
                parts = []
                for hc, fn, sz, tx in line_colors:
                    if tx.strip():
                        if hc == "#000000":
                            parts.append(tx.strip())
                        else:
                            parts.append(f"[{hc}]{tx.strip()}")
                if parts:
                    print(" ".join(parts))

    print(f"\n--- Color distribution (by char count) ---")
    for color, count in color_counts.most_common(15):
        print(f"  {color}: {count} chars")

doc.close()
