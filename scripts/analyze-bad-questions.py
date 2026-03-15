#!/usr/bin/env python3
"""questions.json 불량 문제 분석 스크립트"""

import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('data/questions.json', 'r', encoding='utf-8') as f:
    questions = json.load(f)

total = len(questions)
print(f"Total questions: {total}\n")

# ===== 1. 줄바꿈 누락 분석 =====
# "시오." 뒤에 바로 변수/숫자가 오는 경우
newline_pattern = re.compile(r'시오[.$]\s*\$?[a-zA-Z0-9]')
no_newline = [q for q in questions if newline_pattern.search(q['content'])]
print(f"=== 1. Missing newline after instruction (시오. + var): {len(no_newline)} ===")
for q in no_newline[:8]:
    m = newline_pattern.search(q['content'])
    if m:
        start = max(0, m.start() - 10)
        end = min(len(q['content']), m.end() + 20)
        snippet = q['content'][start:end]
        print(f"  [{q['sourceTag']}] ...{snippet}...")
print()

# ===== 2. 콘텐츠 내 사이드바/헤더 텍스트 혼입 =====
noise_keywords = ['개념플러스', '비법 노트', '개념 plus', 'STEP']
sidebar_mixed = [q for q in questions if any(kw in q['content'] for kw in noise_keywords)]
print(f"=== 2. Sidebar/header text mixed: {len(sidebar_mixed)} ===")
for q in sidebar_mixed[:5]:
    print(f"  [{q['sourceTag']}] {q['content'][:100]}")
print()

# ===== 3. 정답 없는 문제 =====
no_answer = [q for q in questions if not q.get('answer', '').strip()]
print(f"=== 3. No answer: {len(no_answer)} ===")
for q in no_answer:
    print(f"  [{q['sourceTag']}] {q['content'][:80]}")
print()

# ===== 4. 콘텐츠에 섹션 코드 남아있음 (05-2, 06-3 등) =====
sec_code_pattern = re.compile(r'\d{2}\s*-\s*\d\s*$')
trailing_sec = [q for q in questions if sec_code_pattern.search(q['content'])]
print(f"=== 4. Trailing section code: {len(trailing_sec)} ===")
for q in trailing_sec[:5]:
    print(f"  [{q['sourceTag']}] ...{q['content'][-40:]}")
print()

# ===== 5. 컨텐츠 내 교과서 서브섹션 제목 혼입 =====
subsec_titles = [
    '곱셈 기호와 나눗셈 기호의 생략',
    '식의 값',
    '등식의 성질',
    '이항',
    '일차식의 계산',
    '정비례 관계',
    '반비례 관계',
    '정비례 관계의 활용',
    '반비례 관계의 활용',
]
subsec_mixed = []
for q in questions:
    c = q['content']
    for title in subsec_titles:
        # 문제 텍스트 중간에 서브섹션 제목이 나타나는 경우
        idx = c.find(title)
        if idx > 20:  # 앞에 다른 내용이 있고
            before = c[idx-5:idx].strip()
            if before and not before.endswith('의') and not before.endswith(','):
                subsec_mixed.append((q, title))
                break
print(f"=== 5. Subsection title mixed in content: {len(subsec_mixed)} ===")
for q, title in subsec_mixed[:5]:
    idx = q['content'].find(title)
    start = max(0, idx - 20)
    end = min(len(q['content']), idx + len(title) + 10)
    print(f"  [{q['sourceTag']}] ...{q['content'][start:end]}...")
print()

# ===== 6. 개념 설명 텍스트 누출 (긴 설명문) =====
concept_leak_patterns = [
    r'⑴\s*\(.{2,15}\)\s*=\s*\(.{2,15}\)',  # (속력)=(거리)/(시간)
    r'예\s*\$\d+\s*,\s*\d+\s*,',            # 예 2, 3, 5, ...
]
concept_leaks = []
for q in questions:
    c = q['content']
    if len(c) > 250:
        for pat in concept_leak_patterns:
            if re.search(pat, c):
                concept_leaks.append(q)
                break
print(f"=== 6. Concept explanation leaked: {len(concept_leaks)} ===")
for q in concept_leaks[:5]:
    print(f"  [{q['sourceTag']}] len={len(q['content'])} {q['content'][:120]}...")
print()

# ===== 7. 짧은 콘텐츠 (선택지 포함 객관식 제외) =====
short = [q for q in questions if len(q['content']) < 15]
print(f"=== 7. Very short content (<15 chars): {len(short)} ===")
for q in short[:10]:
    has_choices = 'yes' if q.get('choices') else 'no'
    print(f"  [{q['sourceTag']}] type={q['type']} choices={has_choices} content=\"{q['content']}\" answer=\"{q.get('answer', '')[:20]}\"")
print()

# ===== 8. 선택지 없는 객관식 =====
mc_no_choices = [q for q in questions if q['type'] == 'MULTIPLE_CHOICE' and not q.get('choices')]
print(f"=== 8. Multiple choice without choices: {len(mc_no_choices)} ===")
for q in mc_no_choices[:5]:
    print(f"  [{q['sourceTag']}] {q['content'][:80]}")
print()

# ===== 9. 컨텐츠에 다른 문제 텍스트가 혼입된 경우 =====
# 길이가 비정상적으로 긴 문제 (같은 페이지 평균의 3배 이상)
by_page = {}
for q in questions:
    key = (q['bookCode'], q['pageNum'])
    by_page.setdefault(key, []).append(q)

overly_long = []
for key, qs in by_page.items():
    if len(qs) < 2:
        continue
    lengths = [len(q['content']) for q in qs]
    avg = sum(lengths) / len(lengths)
    for q in qs:
        if len(q['content']) > max(avg * 3, 300):
            overly_long.append(q)
print(f"=== 9. Overly long content (3x page average): {len(overly_long)} ===")
for q in overly_long[:5]:
    print(f"  [{q['sourceTag']}] len={len(q['content'])} {q['content'][:100]}...")
print()

# ===== SUMMARY =====
all_bad_tags = set()
all_bad_tags.update(q['sourceTag'] for q in no_answer)
all_bad_tags.update(q['sourceTag'] for q in sidebar_mixed)
all_bad_tags.update(q[0]['sourceTag'] for q in subsec_mixed)
all_bad_tags.update(q['sourceTag'] for q in concept_leaks)
all_bad_tags.update(q['sourceTag'] for q in overly_long)
all_bad_tags.update(q['sourceTag'] for q in trailing_sec)

fixable_tags = set()
fixable_tags.update(q['sourceTag'] for q in no_newline)

print("=" * 60)
print(f"SUMMARY:")
print(f"  Total questions: {total}")
print(f"  Bad (need re-extraction): {len(all_bad_tags)}")
print(f"  Fixable (newline fix): {len(fixable_tags)}")
print(f"  Overlap: {len(all_bad_tags & fixable_tags)}")
print(f"  Total affected: {len(all_bad_tags | fixable_tags)}")
