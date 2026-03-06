"""Explore RPM student edition section structure."""
import fitz
import sys
import re

sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open('data/rpm/RPM 중학 1-1 학생용.pdf')
print(f'Total pages: {len(doc)}')
print()

# Scan all pages for section markers
for pg in range(len(doc)):
    text = doc[pg].get_text()
    if not text or len(text.strip()) < 20:
        continue

    first_200 = text[:300].replace('\n', ' | ')

    # Detect section type
    markers = []
    if '교과서문제 정복하기' in text or '교과서문제' in text:
        markers.append('교과서문제')
    if '유형' in text and ('대표' in text or '시험' in text):
        markers.append('유형/대표')
    if re.search(r'\b유형\b', text) and '유형' in text[:100]:
        markers.append('유형-header')
    if '실력' in text and ('서술형' in text or '주관식' in text):
        markers.append('실력+서술형')
    elif '실력' in text[:100]:
        markers.append('실력')
    if '서술형 주관식' in text:
        markers.append('서술형주관식')
    if '대표문제 다시 풀기' in text or '다시 풀기' in text:
        markers.append('다시풀기')
    if '개념원리' in text and '중학' in text[:100]:
        markers.append('개념참조')
    if re.search(r'Ⅰ|Ⅱ|Ⅲ|Ⅳ|Ⅴ|I\s*\.', text[:50]):
        markers.append('대단원')

    # Find question numbers
    q_nums = re.findall(r'(?:^|\n)\s*(0[0-9]{3}|[1-9][0-9]{3})\b', text)

    if markers or (pg < 12):
        marker_str = ', '.join(markers) if markers else '-'
        q_range = f'Q: {q_nums[0]}-{q_nums[-1]}' if q_nums else 'no Qs'
        print(f'P{pg+1:3d} [{marker_str:30s}] {q_range:20s} | {first_200[:100]}')

doc.close()
