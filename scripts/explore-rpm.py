"""Explore RPM student edition PDF structure."""
import fitz
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Student edition
doc = fitz.open('data/rpm/RPM 중학 1-1 학생용.pdf')
print(f'Student edition: {len(doc)} pages')
print()

for pg in [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 15, 20, 30, 50]:
    if pg < len(doc):
        text = doc[pg].get_text()
        print(f'=== Page {pg+1} (len={len(text)}) ===')
        print(text[:500])
        print('---')
        print()
doc.close()

print('\n' + '='*80)
print('ANSWER PDF')
print('='*80 + '\n')

# Answer edition
doc2 = fitz.open('data/rpm/RPM 중학 1-1 정답.pdf')
print(f'Answer edition: {len(doc2)} pages')
print()

for pg in [0, 1, 2, 3, 4, 10, 20, 30]:
    if pg < len(doc2):
        text = doc2[pg].get_text()
        print(f'=== Page {pg+1} (len={len(text)}) ===')
        print(text[:500])
        print('---')
        print()
doc2.close()
