"""Analyze PDF encoding patterns to build character mapping."""
import fitz
import sys
import re
from collections import Counter

sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open('data/rpm/RPM 중학 1-1 교사용.pdf')

all_text = ''
for pg in range(2, 60):
    if pg < len(doc):
        all_text += doc[pg].get_text() + '\n'

# Find all fraction-like patterns ;...;
fraction_patterns = re.findall(r';[^;\n]{1,10};', all_text)
frac_counts = Counter(fraction_patterns)
print('=== Fraction-like patterns (;...;) ===')
for p, c in frac_counts.most_common(50):
    print(f'  {repr(p):20s} count={c}')

print()

# Find superscript patterns (high-byte char + backtick)
sup_patterns = re.findall(r'[\x80-\xff]`', all_text)
sup_counts = Counter(sup_patterns)
print('=== Superscript patterns (char + backtick) ===')
for p, c in sup_counts.most_common(20):
    print(f'  {repr(p):15s} char_code=0x{ord(p[0]):02X} count={c}')

print()

# Find all non-ASCII chars used
non_ascii = set()
for ch in all_text:
    if ord(ch) > 127 and not ('\uAC00' <= ch <= '\uD7A3'):  # exclude Korean
        non_ascii.add(ch)

print('=== Non-ASCII non-Korean characters ===')
for ch in sorted(non_ascii, key=ord):
    count = all_text.count(ch)
    if count > 5:
        # Get context
        idx = all_text.index(ch)
        ctx = all_text[max(0,idx-10):idx+15].replace('\n', ' ')
        print(f'  U+{ord(ch):04X} {repr(ch)} count={count:5d}  context: {ctx}')

print()

# Known expression contexts
print('=== Known expression analysis ===')
# 12 = 2^2 * 3
for expr in ['2\u00db', '3\u00dc', '5\u00dd', '2\u00de', '2\u00a1']:
    if expr in all_text:
        idx = all_text.index(expr)
        ctx = all_text[max(0,idx-15):idx+25].replace('\n', ' ')
        print(f'  {repr(expr)} -> context: {ctx}')

# Underscore usage (multiplication?)
underscore_ctx = []
for m in re.finditer(r'(\S{1,5})_(\S{1,5})', all_text):
    underscore_ctx.append(m.group(0))
print(f'\nUnderscore patterns (first 30):')
for p in underscore_ctx[:30]:
    print(f'  {p}')

doc.close()
