#!/usr/bin/env python3
"""
questions.json 불량 문제 수정 스크립트

1단계: 텍스트 클리닝 (노이즈 제거, 서브섹션 코드 제거)
2단계: 줄바꿈 수정 (시오. 뒤 변수/한글, 소문항 구분 등)
3단계: 근본 불량 문제 식별 및 제거
"""

import json
import re
import sys
import os
import shutil

sys.stdout.reconfigure(encoding='utf-8')

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
INPUT_FILE = os.path.join(DATA_DIR, 'questions.backup.json')
OUTPUT_FILE = os.path.join(DATA_DIR, 'questions.json')

# 백업에서 로드 (원본 유지)
if not os.path.exists(INPUT_FILE):
    shutil.copy2(os.path.join(DATA_DIR, 'questions.json'), INPUT_FILE)

with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    questions = json.load(f)

total = len(questions)
print(f"Loaded {total} questions\n")


# ========================================
# STEP 1: 컨텐츠 노이즈 제거
# ========================================
print("=" * 60)
print("STEP 1: Content noise removal")
print("=" * 60)

# RPM 교과서 서브섹션 제목 + 코드 패턴
# 예: "곱셈 기호와 나눗셈 기호의 생략 05 - 2" → 제거
# 포괄적 패턴: 문제 텍스트 뒤에 붙은 "한글제목 XX-N" 코드
TRAILING_SECTION_CODE = re.compile(
    r'\s+'                              # 공백으로 분리
    r'[\uac00-\ud7a3]{2,15}'           # 한글 제목 (2~15자)
    r'(?:\s+[\uac00-\ud7a3]{1,8}){0,4}' # 추가 단어들 (옵션)
    r'\s+\$?\d{2}\s*-\s*\d\$?'         # 서브섹션 코드 (01-1, 05-2 등)
    r'\s*$'
)

# 노이즈 키워드 + 뒤따르는 모든 텍스트 (사이드바에서 유출된 개념 설명)
NOISE_AFTER_KEYWORD = [
    # 개념플러스 사이드바
    (re.compile(r'\s*개념플러스\s*.*', re.DOTALL), 20),
    (re.compile(r'\s*개념 plus\s*.*', re.DOTALL), 20),
    (re.compile(r'\s*비법 노트\s*.*', re.DOTALL), 20),
    # 사이드바 풀이 힌트
    (re.compile(r'\s*풀이\s+\$.*', re.DOTALL), 30),
]

# 날짜 코드 (191226 등) + 뒤따르는 개념 설명 텍스트
DATE_CODE_NOISE = re.compile(r'\s+\d{6}\s+[\uac00-\ud7a3].*', re.DOTALL)

# "XX-N" 형태의 트레일링 섹션 코드 (문제 끝에 붙은 것)
TRAILING_CODE_ONLY = re.compile(r'\s+\$\d{2}\s*-\s*\d\$\s*$')

# 개념 설명 누출 패턴 (문제 뒤에 개념 요약이 붙은 경우)
CONCEPT_LEAK_PATTERNS = [
    # "⑴ (X)=(Y)/(Z)" 형태의 공식 정의
    re.compile(r'\s+⑴\s*\(\s*[\uac00-\ud7a3]+\s*\)\s*=\s*\(\s*[\uac00-\ud7a3]+\s*\).*$', re.DOTALL),
    # "예 $2, 3, 5, 7" 형태의 예시 목록
    re.compile(r'\s+예\s*\$\d+\s*,\s*\d+\s*,\s*\d+.*$', re.DOTALL),
]

# 사이드바 개념 설명 키워드 (문제 본문 뒤에 붙으면 제거)
SIDEBAR_CONCEPT_KEYWORDS = [
    '소인수분해 ⑴',
    '약수의 개수가 주어질 때',
    '조건을 만족시키는 수의 대소 관계',
    '최대공약수와 최소공배수가 주어질 때',
    '바르게 계산한 답 구하기',
    '계수가 분수인 일차방정식',
    '공통부분이 있는 식을 전개',
    '공통부분이 있는 이차방정식',
    '정비례 관계 $y=',
    '반비례 관계 $y=',
    '정비례 관계의 활용',
    '반비례 관계의 활용',
    '식의 값의 활용',
    '밑면이 부채꼴인',
]

step1_fixed = 0

for q in questions:
    original = q['content']
    content = q['content']

    # 1. 트레일링 서브섹션 코드 제거
    content = TRAILING_SECTION_CODE.sub('', content)
    content = TRAILING_CODE_ONLY.sub('', content)

    # 2. 노이즈 키워드 + 뒤따르는 텍스트 제거
    for pat, min_before in NOISE_AFTER_KEYWORD:
        m = pat.search(content)
        if m and m.start() > min_before:
            content = content[:m.start()]

    # 3. 날짜 코드 + 개념 설명 제거
    m = DATE_CODE_NOISE.search(content)
    if m and m.start() > 30:
        content = content[:m.start()]

    # 4. 개념 설명 누출 제거
    for pat in CONCEPT_LEAK_PATTERNS:
        m = pat.search(content)
        if m and m.start() > 50:
            content = content[:m.start()]

    # 5. 사이드바 개념 설명 키워드 제거
    for kw in SIDEBAR_CONCEPT_KEYWORDS:
        idx = content.find(kw)
        if idx > 30:
            # 키워드 앞에 문제 텍스트가 충분히 있으면 잘라냄
            before = content[:idx].rstrip()
            # 마침표, $, 닫는 괄호 등으로 끝나면 문제 본문이 완결된 것
            if before and (before[-1] in '.?$)' or before.endswith('시오')):
                content = before

    # 6. 경미한 DN 아티팩트 제거 (1-2개)
    # "$DN$" → 제거, "\frac{DN}{DN}" → 제거
    content = re.sub(r'\$DN\$', '', content)
    content = re.sub(r'\$?\s*\\frac\{DN\}\{DN\}\s*\$?', '', content)
    content = re.sub(r'#\s+DN\$?', '', content)
    content = re.sub(r'\bDN\b(?!\w)', '', content)
    # 잔여 다중 공백 정리
    content = re.sub(r'  +', ' ', content)

    content = content.strip()

    if content != original:
        q['content'] = content
        step1_fixed += 1

print(f"  Fixed: {step1_fixed} questions")
print()


# ========================================
# STEP 2: 줄바꿈 수정
# ========================================
print("=" * 60)
print("STEP 2: Line break fixes")
print("=" * 60)

step2_fixed = 0

for q in questions:
    original = q['content']
    content = q['content']

    # --- 패턴 A: "시오." / "시오$." 뒤에 \n 없이 바로 내용이 오는 경우 ---
    # "구하시오.a = 6일 때" → "구하시오.\na = 6일 때"
    # "나타내시오. 영상 7°" → "나타내시오.\n영상 7°"
    # "써넣으시오. 모든 소수는" → "써넣으시오.\n모든 소수는"
    content = re.sub(
        r'(시오[\$]*\.)(?!\n)\s*',
        r'\1\n',
        content
    )

    # --- 패턴 B: "시오 " 뒤에 \n 없이 바로 (뒤에 마침표가 없는 경우) ---
    # "나타내 시오 432" 같은 케이스는 이미 step1에서 처리

    # --- 패턴 C: 보기 구분 ---
    # "보기 ㄱ." 앞에 줄바꿈 추가
    content = re.sub(r'(?<!\n)\s+(보기\s+ㄱ)', r'\n\1', content)

    # --- 패턴 D: 수식 블록 앞에 줄바꿈 ---
    # "구하시오\n$..." 은 이미 처리됨. "구하시오 풀이" 같은 건 step1에서 제거

    content = content.strip()

    if content != original:
        q['content'] = content
        step2_fixed += 1

print(f"  Fixed: {step2_fixed} questions")
print()

# 해설(explanation)에도 줄바꿈 정리
step2b_fixed = 0
for q in questions:
    if not q.get('explanation'):
        continue
    original = q['explanation']
    exp = q['explanation']

    # "따라서" 앞 줄바꿈
    exp = re.sub(r'(?<!\n)\s+(따라서)', r'\n\1', exp)
    # 선택지 번호 앞 줄바꿈 (② ③ ④ ⑤)
    exp = re.sub(r'(?<!\n)\s*([②③④⑤])', r'\n\1', exp)

    if exp != original:
        q['explanation'] = exp
        step2b_fixed += 1

print(f"  Explanation fixes: {step2b_fixed}")
print()


# ========================================
# STEP 3: 근본 불량 문제 식별 및 제거
# ========================================
print("=" * 60)
print("STEP 3: Identify fundamentally broken questions")
print("=" * 60)

remove_tags = set()

for q in questions:
    c = q['content']
    ans = q.get('answer', '').strip()

    # 1. 정답 없음 → 제거
    if not ans:
        remove_tags.add(q['sourceTag'])
        continue

    # 2. 콘텐츠 깨진 경우 (의미없는 숫자열로 시작)
    if re.match(r'^\$[\d\s/]+\$\s', c) and len(c) < 50:
        remove_tags.add(q['sourceTag'])
        continue

    # 3. 다른 문제번호가 혼입 ("0058 다음 중" → 다음 문제가 섞임)
    if re.match(r'^\$?\d{4}\$?\s', c):
        remove_tags.add(q['sourceTag'])
        continue

    # 4. 콘텐츠가 너무 짧고 의미 없음
    if len(c) < 5:
        remove_tags.add(q['sourceTag'])
        continue

    # 5. 다른 문제의 내용이 혼입된 경우 (4자리 문제번호가 content 중간에)
    import re as _re
    mid_qnum = _re.search(r'\s\d{4}\s+\$', c)
    if mid_qnum and mid_qnum.start() > 20:
        # 문제 번호 뒤에 수식이 오면 다른 문제가 혼입된 것
        remove_tags.add(q['sourceTag'])
        continue

    # 6. content에 "XX-N" 서브섹션 코드가 남아있고 개념 설명이 붙은 경우
    if _re.search(r'\$\d{2}\s*-\s*\d\$', c) and ('거듭제곱' in c or '개념' in c or '정의' in c):
        remove_tags.add(q['sourceTag'])
        continue

    # 7. DN(DisplayName) 이미지 아티팩트가 3개 이상 (도형 문제 깨짐)
    dn_count = len(_re.findall(r'\bDN\b', c)) + len(_re.findall(r'\bYDN\b', c)) + len(_re.findall(r'\bADN\b', c)) + len(_re.findall(r'\bZADN\b', c))
    if dn_count >= 3:
        remove_tags.add(q['sourceTag'])
        continue

    # 8. 깨진 분수: \frac{DN}{DN} 또는 \frac{) 패턴
    if _re.search(r'\\frac\{[)DN\s]+\}', c):
        remove_tags.add(q['sourceTag'])
        continue

print(f"  Removing {len(remove_tags)} unfixable questions:")
for tag in sorted(remove_tags):
    q = next((q for q in questions if q['sourceTag'] == tag), None)
    if q:
        print(f"    - {tag} | {q['content'][:60]}...")
print()

questions = [q for q in questions if q['sourceTag'] not in remove_tags]


# ========================================
# STEP 4: 최종 검증 및 통계
# ========================================
print("=" * 60)
print("FINAL STATS")
print("=" * 60)
print(f"  Original: {total}")
print(f"  After cleanup: {len(questions)}")
print(f"  Removed: {total - len(questions)}")
print(f"  Step 1 fixes (noise removal): {step1_fixed}")
print(f"  Step 2 fixes (line breaks): {step2_fixed}")
print(f"  Step 2b fixes (explanation): {step2b_fixed}")
print()

# 최종 검증
remaining = {'no_answer': 0, 'sidebar': 0, 'short': 0, 'noise_in_content': 0}
for q in questions:
    c = q['content']
    if not q.get('answer', '').strip():
        remaining['no_answer'] += 1
    if '개념플러스' in c or 'STEP' in c:
        remaining['sidebar'] += 1
    if len(c) < 10:
        remaining['short'] += 1
    # 서브섹션 코드가 아직 남아있는지
    if re.search(r'\d{2}\s*-\s*\d\s*$', c):
        remaining['noise_in_content'] += 1

print("Remaining issues:")
for issue, count in remaining.items():
    print(f"  {issue}: {count}")
print()

# 교재별 통계
by_book = {}
for q in questions:
    bc = q['bookCode']
    by_book.setdefault(bc, {'total': 0, 'with_answer': 0})
    by_book[bc]['total'] += 1
    if q.get('answer', '').strip():
        by_book[bc]['with_answer'] += 1

print("By book:")
for bc in sorted(by_book.keys()):
    info = by_book[bc]
    print(f"  중{bc}: {info['total']} questions ({info['with_answer']} with answer)")


# ========================================
# 저장
# ========================================
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(questions, f, ensure_ascii=False, indent=2)

print(f"\nSaved: {OUTPUT_FILE}")
print("Done!")
