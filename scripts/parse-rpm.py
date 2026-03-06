#!/usr/bin/env python3
"""
RPM Question Bank PDF Parser

RPM 중학수학 학생용 PDF에서 문제를 추출하고 (유형 익히기 이후),
정답 PDF에서 답/해설을 매칭하여 JSON으로 출력한다.

Usage:
  pip install pymupdf
  python scripts/parse-rpm.py

Output:
  data/questions.json
"""

import fitz  # pymupdf
import json
import re
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')

# ── Configuration ────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
RPM_DIR = os.path.join(DATA_DIR, 'rpm')
OUTPUT_FILE = os.path.join(DATA_DIR, 'questions.json')

BOOKS = [
    {"code": "1-1", "student": "RPM 중학 1-1 학생용.pdf", "answers": "RPM 중학 1-1 정답.pdf"},
    {"code": "1-2", "student": "RPM 중학 1-2 학생용.pdf", "answers": "RPM 중학 1-2 정답.pdf"},
    {"code": "2-1", "student": "RPM 중학 2-1 학생용.pdf", "answers": "RPM 중학 2-1 정답.pdf"},
    {"code": "2-2", "student": "RPM 중학 2-2 학생용.pdf", "answers": "RPM 중학 2-2 정답.pdf"},
    {"code": "3-1", "student": "RPM 중학 3-1 학생용.pdf", "answers": "RPM 중학 3-1 정답.pdf"},
    {"code": "3-2", "student": "RPM 중학 3-2 학생용.pdf", "answers": "RPM 중학 3-2 정답.pdf"},
]

# RPM 중단원 이름 (단원 감지용)
CHAPTERS = {
    "1-1": [
        "소인수분해", "최대공약수와 최소공배수",
        "정수와 유리수", "정수와 유리수의 계산",
        "문자의 사용과 식의 계산",
        "일차방정식의 풀이", "일차방정식의 활용",
        "좌표와 그래프", "정비례와 반비례",
    ],
    "1-2": [
        "기본 도형", "위치 관계", "작도와 합동",
        "다각형", "원과 부채꼴",
        "다면체와 회전체", "입체도형의 겉넓이와 부피",
        "자료의 정리와 해석",
    ],
    "2-1": [
        "유리수와 순환소수",
        "단항식의 계산", "다항식의 계산",
        "일차부등식", "연립일차방정식",
        "일차함수와 그래프",
    ],
    "2-2": [
        "삼각형의 성질", "사각형의 성질",
        "도형의 닮음", "피타고라스 정리",
        "확률",
    ],
    "3-1": [
        "제곱근과 실수", "근호를 포함한 식의 계산",
        "다항식의 곱셈과 인수분해",
        "이차방정식", "이차함수",
    ],
    "3-2": [
        "삼각비", "원의 성질",
        "통계",
    ],
}

# 섹션별 난이도
SECTION_DIFFICULTY = {
    'type': 'MEDIUM',
    'skill': 'HIGH',
    'essay': 'HIGHEST',
}

SECTION_LABELS = {
    'type': '유형 익히기',
    'skill': '실력',
    'essay': '서술형 주관식',
}


# ── Encoding Conversion ─────────────────────────────────

SUPERSCRIPT_MAP = {
    '\u00db`': '²', '\u00dc`': '³', '\u00dd`': '⁴',
    '\u00de`': '⁵', '\u00df`': '⁶', '\u00e0`': '⁷',
    '\u00a1`': '⁸', '\u00ba`': '⁹',
}

# 분수 분자코드 (Shift+숫자 키보드 매핑, 1자리 분모용)
FRAC_NUM = {
    '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
    '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
}

# 분수 분자코드 (2자리+ 분모용, 특수문자 매핑)
FRAC_NUM_MULTI = {
    '\u00c1': '1',  # Á
    '\u00aa': '2',  # ª
    '\u00a3': '3',  # £
    '\u00a2': '4',  # ¢
    '\u00b0': '5',  # °
    '\u00a4': '6',  # ¤
    '\u00a6': '7',  # ¦
    '\u00a5': '8',  # ¥
    '\u00bb': '9',  # »
    '\u00bc': '0',  # ¼
}

# 변수 코드 (대문자 → 소문자 변수)
FRAC_VAR = {
    'A': 'a', 'B': 'b', 'C': 'c', 'D': 'd',
    '{': 'x', '}': 'y',
}

# 분자 코드만 (분모에 사용되는 소문자/숫자 제외)
NUMER_CODES = {}
NUMER_CODES.update(FRAC_NUM)
NUMER_CODES.update(FRAC_NUM_MULTI)
NUMER_CODES.update(FRAC_VAR)


def _to_latex(expr):
    """Unicode 수학기호를 LaTeX 명령어로 변환 ($...$ 내부용)."""
    expr = expr.replace('²', '^{2}')
    expr = expr.replace('³', '^{3}')
    expr = expr.replace('⁴', '^{4}')
    expr = expr.replace('⁵', '^{5}')
    expr = expr.replace('⁶', '^{6}')
    expr = expr.replace('⁷', '^{7}')
    expr = expr.replace('⁸', '^{8}')
    expr = expr.replace('⁹', '^{9}')
    expr = expr.replace('×', '\\times ')
    expr = expr.replace('÷', '\\div ')
    expr = expr.replace('≤', '\\leq ')
    expr = expr.replace('≥', '\\geq ')
    return expr


def _decode_fraction(inner):
    """분수 인코딩 ';...;' 또는 ':...:' 내부 문자열을 LaTeX 분수로 변환."""
    denom_parts = []  # 분모 (숫자 + 소문자 변수)
    numer_parts = []  # 분자 (코드 → 변환)

    for ch in inner:
        if ch.isdigit():
            denom_parts.append(ch)
        elif ch.islower() or ch == '[':
            # 소문자/[ → 분모 변수 (a, b, k, x 등; [ = x as denom)
            denom_parts.append('x' if ch == '[' else ch)
        elif ch in NUMER_CODES:
            numer_parts.append(NUMER_CODES[ch])
        else:
            return None  # 알 수 없는 문자 → 변환 실패

    if not denom_parts or not numer_parts:
        return None

    denom = _to_latex(''.join(denom_parts))
    numer = _to_latex(''.join(numer_parts))
    return f'$\\frac{{{numer}}}{{{denom}}}$'


def fix_math(text):
    """PDF 폰트 인코딩 → 유니코드 수학 기호 변환."""
    if not text:
        return text

    # 거듭제곱: Û` → ², Ü` → ³, ...
    for old, new in SUPERSCRIPT_MAP.items():
        text = text.replace(old, new)

    # 잔여 백틱 제거 (거듭제곱 인코딩 잔여물)
    text = text.replace('`', '')

    # 나눗셈: Ö → ÷
    text = text.replace('\u00d6', '÷')

    # 분수: ;{...}; 또는 :{...}: → 분자/분모
    def _frac(m):
        result = _decode_fraction(m.group(1))
        return result if result else m.group(0)

    # 분수 패턴 문자: 숫자 + 분자코드 + 변수코드만 허용 (연산자/구두점 제외)
    _FC = r'[0-9!@#$%^&*()A-Da-z{}\[\u00c1\u00aa\u00a3\u00a2\u00b0\u00a4\u00a6\u00a5\u00bb\u00bc]'
    # 이중 세미콜론 제거 (;;→;) - PDF 분수 렌더링 아티팩트
    text = text.replace(';;', ';')
    text = re.sub(rf';({_FC}{{2,6}});', _frac, text)
    text = re.sub(rf':({_FC}{{2,6}}):', _frac, text)
    # 잔여 세미콜론 내 분수도 LaTeX 변환
    def _frac_residual(m):
        parts = m.group(1).split('/')
        if len(parts) == 2:
            numer = _to_latex(parts[0].strip())
            denom = _to_latex(parts[1].strip())
            return f'$\\frac{{{numer}}}{{{denom}}}$'
        return m.group(1)
    text = re.sub(r';(\d+/[\da-z]+);', _frac_residual, text)

    # PDF 인코딩에서 { } → ( ) 변환 (LaTeX $\frac{}{}$ 보호)
    parts = re.split(r'(\$\\frac\{[^}]*\}\{[^}]*\}\$)', text)
    text = ''.join(
        p.replace('{', '(').replace('}', ')') if i % 2 == 0 else p
        for i, p in enumerate(parts)
    )

    # ≤ 기호
    text = text.replace('\u00c9', '≤')
    # ≥ 기호
    text = text.replace('\u00be', '≥')

    # PDF 폰트 PUA(Private Use Area) 문자 → 유니코드 변환 (곱셈 변환 전에 실행)
    PUA_MAP = {
        '\ue22d': '□',   # 빈칸 (□ 안에 알맞은 수)
        '\ue284': '□',   # 빈칸 (자릿수 위치)
        '\ue286': 'β',   # 이차함수 근 변수
        '\ue287': '○',   # 정답 표시 (맞히면 ○)
        '\ue289': 'α',   # 이차함수 근 변수 / 도형 변수
        '\ue34c': '',    # 채점 마커 (제거)
        '\ue47e': '∥',   # 평행 기호
    }
    for old, new in PUA_MAP.items():
        text = text.replace(old, new)
    # 나머지 PUA 문자 제거
    text = re.sub(r'[\ue000-\uf8ff]', '', text)

    # 곱셈: _ → × (수학 맥락에서, 공백 허용, LaTeX $...$ 뒤/앞 포함)
    text = re.sub(
        r'(?<=[\d²³⁴⁵⁶⁷⁸⁹a-zA-Z\)\$□α]) *_ *(?=[\d²³⁴⁵⁶⁷⁸⁹a-zA-Z\(\$□α])',
        '×', text
    )

    # 채점 마커 제거: ◀60%
    text = re.sub(r'◀\d+%', '', text)
    text = re.sub(r'…\s*\d단계', '', text)

    # 유니코드 공백 → 일반 공백
    text = re.sub(r'[\u2002\u2003\u2005\u2006\u2009\u200a]', ' ', text)
    text = text.replace('\u200c', '')

    # 제어 문자 제거
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)

    # 다중 공백/줄바꿈 정리
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


# ── Column-Aware Text Extraction ────────────────────────

def get_column_sorted_text(page):
    """2단 레이아웃 인식 텍스트 추출.

    PyMuPDF get_text()는 2단 레이아웃에서 좌-우 열을 번갈아 읽어
    문항번호와 내용이 뒤섞인다. get_text("blocks")로 블록 좌표를 얻어
    왼쪽 열 전체 → 오른쪽 열 전체 순서로 정렬하여 이 문제를 해결한다.
    """
    blocks = page.get_text("blocks")
    text_blocks = [b for b in blocks if b[6] == 0 and b[4].strip()]

    if not text_blocks:
        return ""

    # 사이드바 블록 필터 (좁은 블록에 단일 문자만 있는 경우)
    filtered = []
    for b in text_blocks:
        block_width = b[2] - b[0]
        block_text = b[4].strip()
        if block_width < 25:
            lines = [l.strip() for l in block_text.split('\n') if l.strip()]
            if lines and all(len(l) <= 1 for l in lines):
                continue  # 사이드바 세로 라벨 스킵
        filtered.append(b)
    text_blocks = filtered

    page_width = page.rect.width
    mid_x = page_width / 2

    left = []
    right = []

    for b in text_blocks:
        x0, x1 = b[0], b[2]
        center_x = (x0 + x1) / 2
        block_width = x1 - x0

        # 전폭 블록 (페이지 폭의 55% 이상) → 왼쪽에 포함 (헤더/풋터)
        if block_width > page_width * 0.55:
            left.append(b)
        elif center_x < mid_x:
            left.append(b)
        else:
            right.append(b)

    # 각 열 내에서 y좌표 → x좌표 순으로 정렬
    left.sort(key=lambda b: (b[1], b[0]))
    right.sort(key=lambda b: (b[1], b[0]))

    # 왼쪽 열 전체 → 오른쪽 열 전체
    ordered = left + right
    return "\n".join(b[4].strip() for b in ordered)


# ── Chapter Detection ────────────────────────────────────

def auto_detect_chapters(doc):
    """TOC 페이지에서 단원명 자동 추출."""
    for pg in range(3, min(8, len(doc))):
        text = get_column_sorted_text(doc[pg])
        matches = re.findall(r'(?:^|\n)\s*0\d\s+(.+?)\s{2,}\d+', text)
        if len(matches) >= 3:
            cleaned = []
            for m in matches:
                m = m.strip()
                # 후행 특수문자/공백/점 제거
                m = re.sub(r'[\s·\u2003\u2002\u2009\u00b7]+$', '', m)
                m = re.sub(r'\s{2,}', ' ', m)
                m = m.strip()
                if m:
                    cleaned.append(m)
            return cleaned
    return []


def detect_chapter(text, chapters):
    """페이지 텍스트에서 현재 단원 감지 (긴 이름 우선)."""
    if not chapters:
        return None
    header = text[:400]
    sorted_chs = sorted(chapters, key=len, reverse=True)
    for ch in sorted_chs:
        if ch in header:
            return ch
    return None


# ── Page Classification ──────────────────────────────────

def classify_page(text, prev_section):
    """페이지를 분류: skip / textbook / type / skill / essay / appendix."""
    if len(text.strip()) < 60:
        return 'skip'

    header = text[:500]

    # 유형 개요 페이지 (유형의 완성은 RPM) → 반드시 skip
    if '유형의 완성은 RPM' in text[:200]:
        return 'overview'

    # 교과서문제 개요 페이지 (정답참조 + 01-1 패턴) → skip
    if re.search(r'정답\s*(및\s*풀이|참조)', text[:200]):
        if re.search(r'(?:^|\n)\s*\d{2}\s*-\s*\d\s*\n', text[:400]):
            return 'overview'

    # 부록 (다시 풀기)
    if '다시 풀기' in header or '부록' in header:
        return 'appendix'

    # 실력 + 서술형 주관식 (RPM에서 하나의 결합 섹션)
    if '실력' in text[:150]:
        return 'skill'
    if re.search(r'STEP\s*3', header):
        return 'skill'

    # 서술형 주관식 (단독으로 나올 때)
    if '서술형 주관식' in header or '서술형주관식' in header:
        return 'essay'

    # STEP 2 → type (medium)
    if re.search(r'STEP\s*2', header):
        return 'type'

    # 유형 익히기 (패턴: "XX\n유형" 또는 "유형" 키워드)
    if re.search(r'\d{1,2}\s*\n\s*유형', header) or '유형' in text[:200]:
        return 'type'

    # STEP 1 → textbook level (skip)
    if re.search(r'STEP\s*1', header):
        return 'textbook'

    # 교과서문제 정복하기 (서브섹션 마커: 01-1, 02-3 등)
    if re.search(r'(?:^|\n)\s*\d{2}\s*-\s*\d\s*\n', text[:300]):
        if '유형' not in text[:300]:
            return 'textbook'

    # 개념 요약 페이지 (⑴, ⑵ + 문제번호 없음)
    if re.search(r'[⑴⑵⑶]', text[:200]) and not re.search(r'(?:^|\n)\s*\d{4}\s*\n', text):
        return 'concept'

    # 문제번호가 있으면 이전 섹션 유지 (연속 페이지)
    if re.search(r'(?:^|\n)\s*\d{4}\s*\n', text):
        if prev_section in ('type', 'skill', 'essay'):
            return prev_section

    # 이전 섹션이 추출 가능 섹션이면 유지
    if prev_section in ('type', 'skill', 'essay'):
        return prev_section

    return 'skip'


# ── Visual Fraction Joining ─────────────────────────────

def _is_frac_part(s):
    """분수의 분자/분모가 될 수 있는 짧은 수학 표현인지 판별."""
    s = s.strip()
    if not s or len(s) > 20:
        return False
    if any('\uac00' <= c <= '\ud7a3' for c in s):
        return False
    if not any(c.isalnum() for c in s):
        return False
    allowed = set('0123456789abcdefghijklmnopqrstuvwxyz'
                  'ABCDEFGHIJKLMNOPQRSTUVWXYZ+-×÷.()²³⁴⁵⁶⁷⁸⁹/ ')
    return all(c in allowed for c in s)


def _needs_frac_parens(expr):
    """수식에 최상위 레벨 +/- 연산자가 있어서 괄호가 필요한지 판별."""
    depth = 0
    for i, c in enumerate(expr):
        if c == '(':
            depth += 1
        elif c == ')':
            depth -= 1
        elif c in ('+', '-') and depth == 0 and i > 0:
            return True
    return False


def _format_fraction(numer, denom):
    """LaTeX 분수 생성. $\\frac{numer}{denom}$ 형식."""
    numer = _to_latex(numer.strip())
    denom = _to_latex(denom.strip())
    return f'$\\frac{{{numer}}}{{{denom}}}$'


def _latexify_math(text):
    """수식 부분을 $...$ LaTeX 인라인 수식으로 감싸서 KaTeX 폰트 통일.

    기존 $\\frac{}{}$ 와 인접한 연산자/수식을 하나의 $...$ 로 합치고,
    독립적인 수식(×, ÷, =, 거듭제곱 등)도 $...$ 로 감싼다.
    """
    if not text:
        return text

    # Step 1: 기존 인접 $...$ 합치기 ($a$ op $b$ → $a op b$)
    prev = None
    while text != prev:
        prev = text
        def _merge(m):
            left = m.group(1)
            mid = m.group(2).strip()
            right = m.group(3)
            mid_l = _to_latex(mid) if mid else ''
            return f'${left} {mid_l} {right}$' if mid_l else f'${left} {right}$'
        text = re.sub(
            r'\$([^$]+)\$([×÷=+\-<>≤≥() .,]*)\$([^$]+)\$',
            _merge, text, count=1
        )

    # 독립 -/+ 를 뒤따르는 $...$ 에 흡수 (-$\frac{1}{2}$ → $-\frac{1}{2}$)
    text = re.sub(r'(?<![a-zA-Z0-9\$])-\$([^$]+)\$', r'$-\1$', text)

    # Step 2: 기존 $...$ 보호 (PUA 문자로 치환, 정규식 매칭 방지)
    # U+F800+ 사용 (PDF 폰트 PUA 영역 U+E000~E4FF 와 충돌 방지)
    _ph = {}
    def _protect(m):
        key = chr(0xF800 + len(_ph))
        _ph[key] = m.group(0)
        return key
    text = re.sub(r'\$[^$]+\$', _protect, text)

    # Step 2.5: 단위를 \mathrm{} 로만체 + \, 얇은 공백으로 분리
    # 다중문자 단위 (항상 감지, 모호성 없음)
    _UNITS_MULTI = ['mL', 'dL', 'kL', 'km', 'cm', 'mm', 'kg', 'mg']
    # 단일문자 단위 (소문자 변수/숫자 뒤에만 감지)
    _UNITS_SINGLE = ['L', 'g', 'm']

    _multi_alt = '|'.join(re.escape(u) for u in
                          sorted(_UNITS_MULTI, key=len, reverse=True))
    _single_alt = '|'.join(re.escape(u) for u in _UNITS_SINGLE)

    def _unit_to_roman(m):
        unit = m.group(1)
        key = chr(0xF800 + len(_ph))
        _ph[key] = f'$\\,\\mathrm{{{unit}}}$'
        return key

    # 다중문자 단위 (모호성 없으므로 항상 치환)
    text = re.sub(rf'({_multi_alt})', _unit_to_roman, text)
    # 단일문자 단위 (소문자/숫자/공백/괄호닫기/플레이스홀더 뒤에만)
    text = re.sub(
        rf'(?<=[a-z0-9 )\uf800-\uf8ff])({_single_alt})(?![a-zA-Z])',
        _unit_to_roman, text
    )

    # Step 3: 수식, 변수, 숫자를 $...$ 로 감싸기 (KaTeX 폰트 통일)
    UNITS = {'cm', 'mm', 'km', 'kg', 'ml', 'kl', 'dl', 'mg'}
    def _do_wrap(m):
        expr = m.group(0)
        stripped = expr.strip()
        if not stripped:
            return expr
        if not re.search(r'[a-zA-Z0-9]', stripped):
            return expr

        lead = len(expr) - len(expr.lstrip())
        trail = len(expr) - len(expr.rstrip())
        pre = expr[:lead] if lead else ''
        suf = expr[len(expr) - trail:] if trail else ''

        # 연산자/거듭제곱 포함 → 감싸기
        has_op = bool(re.search(r'[×÷=<>≤≥²³⁴⁵⁶⁷⁸⁹]', stripped))
        has_pm = bool(re.search(
            r'(?<=[a-zA-Z0-9)²³⁴⁵⁶⁷⁸⁹])\s*[+\-]\s*(?=[a-zA-Z0-9(])',
            stripped
        ))
        if has_op or has_pm:
            if re.match(r'^[\d.,\s]+$', stripped):
                return expr
            latex = _to_latex(stripped)
            return f'{pre}${latex}${suf}'

        # 순수 숫자 → 감싸기
        if re.match(r'^\d+$', stripped):
            return f'{pre}${stripped}${suf}'
        # 쉼표 포함 숫자 (3,000) → 스킵
        if re.match(r'^[\d.,\s]+$', stripped):
            return expr
        # 단위 (cm, kg 등) → \mathrm{} 로만체
        if stripped.lower() in UNITS:
            return f'{pre}$\\mathrm{{{stripped}}}${suf}'
        # 3자 이상 순수 영문 → 영단어, 스킵
        if re.match(r'^[a-zA-Z]{3,}$', stripped):
            return expr
        # 나머지 (변수, 숫자+변수 등) → 감싸기
        latex = _to_latex(stripped)
        return f'{pre}${latex}${suf}'

    text = re.sub(
        r'[0-9a-zA-Z+\-×÷=<>≤≥().²³⁴⁵⁶⁷⁸⁹\[\]| ]+',
        _do_wrap, text
    )

    # Step 4: 보호된 $...$ 복원
    for key, value in _ph.items():
        text = text.replace(key, value)

    # Step 5: 새로 생긴 인접 $...$ 최종 합치기
    prev = None
    while text != prev:
        prev = text
        def _merge2(m):
            left = m.group(1)
            mid = m.group(2).strip()
            right = m.group(3)
            mid_l = _to_latex(mid) if mid else ''
            return f'${left} {mid_l} {right}$' if mid_l else f'${left} {right}$'
        text = re.sub(
            r'\$([^$]+)\$([×÷=+\-<>≤≥() .,]*)\$([^$]+)\$',
            _merge2, text, count=1
        )

    # Step 6: 괄호 흡수 ($...$) → $...()$ 등)
    text = re.sub(r'\$([^$]+)\$\)', r'$\1)$', text)
    text = re.sub(r'\(\$([^$]+)\$', r'$(\1$', text)
    # 이중 $ 정리
    text = text.replace('$$', '')

    # Step 7: \mathrm{} 앞뒤 얇은 공백 정리
    # 표현식 맨 앞 불필요한 \, 제거: $\,\mathrm{...} → $\mathrm{...}
    text = re.sub(r'\$\\,\\mathrm', r'$\\mathrm', text)
    # 표현식 맨 뒤 불필요한 \, 제거 (있을 경우)
    text = re.sub(r'\\,\$', '$', text)

    return text


def _collapse_visual_fractions(text):
    """텍스트 내 시각적 분수(줄바꿈으로 분리된 분자/분모)를 인라인 분수로 변환.

    PDF에서 시각적 분수는 다음과 같이 추출된다:
        ...텍스트...
        a+b        ← 분자
        2          ← 분모
        ...텍스트...
    이를 (a+b)/2 형태로 변환한다.
    """
    if '\n' not in text:
        return text

    lines = text.split('\n')
    result = []
    i = 0

    while i < len(lines):
        cur = lines[i].strip()
        if not cur:
            i += 1
            continue

        # Case 1: 문맥줄 + 분자(다음줄) + 분모(그다음줄)
        if i + 2 < len(lines):
            nxt = lines[i + 1].strip()
            nxt2 = lines[i + 2].strip()
            if (_is_frac_part(nxt) and _is_frac_part(nxt2)
                    and len(nxt) <= 15 and len(nxt2) <= 15):
                frac = _format_fraction(nxt, nxt2)
                result.append(cur + ' ' + frac)
                i += 3
                continue

        # Case 2: 현재줄 끝 분자 + 다음줄 분모
        if i + 1 < len(lines):
            nxt = lines[i + 1].strip()

            # 2a: 다음 줄이 순수 짧은 수학식 → 분모
            if _is_frac_part(nxt) and len(nxt) <= 10:
                m = re.search(r'([0-9a-zA-Z\(\)\+\-×÷\.]+)\s*$', cur)
                if m and _is_frac_part(m.group(1)):
                    numer = m.group(1)
                    context = cur[:m.start()]
                    frac = _format_fraction(numer, nxt)
                    result.append(context + frac)
                    i += 2
                    continue

            # 2b: 현재 줄이 분자, 다음 줄이 숫자분모+접미사 (예: "6 cm이다.")
            if _is_frac_part(cur) and len(cur) <= 15:
                dm = re.match(r'^(\d+)\s*(.*)', nxt)
                if dm and not _is_frac_part(nxt):
                    denom = dm.group(1)
                    suffix = dm.group(2).strip()
                    frac = _format_fraction(cur, denom)
                    result.append(frac + (' ' + suffix if suffix else ''))
                    i += 2
                    continue

        result.append(cur)
        i += 1

    return ' '.join(result)


# ── Question Extraction ──────────────────────────────────

def detect_qtype(content):
    """문제 유형 분류."""
    if re.search(r'[①②③④⑤]', content):
        return "MULTIPLE_CHOICE"
    if any(kw in content for kw in ['풀이 과정', '서술하시오', '과정을 쓰', '과정을 서술']):
        return "ESSAY"
    return "SHORT_ANSWER"


def extract_choices(content):
    """객관식 선택지 추출."""
    choices = re.findall(r'([①②③④⑤][^①②③④⑤]*)', content)
    if len(choices) >= 2:
        cleaned = [c.strip() for c in choices]
        # 마지막 선택지에서 다음 문제 내용 누출 제거
        if len(cleaned) >= 2:
            avg_len = sum(len(c) for c in cleaned[:-1]) / len(cleaned[:-1])
            last = cleaned[-1]
            if len(last) > avg_len * 3 and '\n' in last:
                first_line = last.split('\n')[0].strip()
                if len(first_line) >= 3:
                    cleaned[-1] = first_line
        # 시각적 분수 인라인 변환 + 줄바꿈 제거
        cleaned = [_collapse_visual_fractions(c) for c in cleaned]
        return cleaned
    return None


def clean_question_content(text):
    """문제 내용에서 불필요한 텍스트 제거."""
    # 페이지 헤더 제거: "12 I . 소인수분해", "78 III . 문자와 식"
    text = re.sub(r'(?:^|\n)\s*\d+\s+[IⅠⅡⅢⅣⅤVl]+\s*[.．]\s*[^\n]+', '', text)
    # 정답 페이지 참조 제거
    text = re.sub(r'정답\s*및\s*풀이\s*\d+\s*쪽\s*', '', text)
    # 개념원리 교과서 참조 제거
    text = re.sub(r'개념원리\s*중학\s*수학\s*\d\s*-\s*\d\s*\d+\s*쪽\s*', '', text)
    # RPM 교재 참조 제거
    text = re.sub(r'RPM\s*중학\s*수학\s*\d\s*-\s*\d\s*', '', text)
    # 유형 헤더 제거
    text = re.sub(r'(?:^|\n)\s*\d{1,2}\s*\n\s*유형\s*\n', '\n', text)
    # 섹션 라벨 제거
    text = re.sub(r'(?:^|\n)\s*(?:실력|서술형 주관식)\s*(?:\n|$)', '\n', text)
    # 단원 번호 라벨 제거 (01 소인수분해13, 09 정비례와 반비례149 등)
    text = re.sub(r'(?:^|\n)\s*\d{2}\s+\S+\d+\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\d{2}\s+[\uac00-\ud7a3]+(?:\s+[\uac00-\ud7a3]+)*\s*\d{2,3}\s*$', '', text, flags=re.MULTILINE)
    # 날짜 코드 제거 (191226 등)
    text = re.sub(r'\n\d{6}\s*$', '', text)
    # 연속 단일 한글 문자 줄 제거 (사이드바 세로 라벨: 문\n자\n의 등)
    lines = text.split('\n')
    cleaned_lines = []
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if len(line) == 1 and ('\uac00' <= line <= '\ud7a3' or line.isalpha()):
            j = i
            while j < len(lines) and len(lines[j].strip()) == 1:
                j += 1
            if j - i >= 2:  # 2줄 이상 연속이면 사이드바 → 스킵
                i = j
                continue
        cleaned_lines.append(lines[i])
        i += 1
    text = '\n'.join(cleaned_lines)
    # 괄호 번호 앞 줄바꿈 (⑴⑵⑶⑷⑸ 소문항 구분)
    text = re.sub(r'\s*([⑵⑶⑷⑸])', r'\n\1', text)
    # 정리
    text = re.sub(r'\n{2,}', '\n', text)
    return text.strip()


def extract_questions_from_page(text, page_num, book_code, chapter, section, difficulty):
    """한 페이지에서 4자리 문항번호 기반 문제 추출."""
    questions = []

    # 1. 그룹 지시문 파싱: [0007~0010] 다음 설명이...
    group_map = {}
    for gm in re.finditer(r'\[(\d{4})[~～](\d{4})\]\s*([^\n]+(?:\n(?!\d{4}\s*\n)[^\n]+)*)', text):
        s, e = int(gm.group(1)), int(gm.group(2))
        instruction = gm.group(3).strip()
        for n in range(s, e + 1):
            group_map[n] = instruction

    # 그룹 지시문 텍스트 제거 (문제 내용에서 중복 방지)
    clean_text = re.sub(r'\[\d{4}[~～]\d{4}\]\s*[^\n]+(?:\n(?!\d{4}\s*\n)[^\n]+)*', '', text)

    # 2. 문항번호 찾기 (4자리, 독립 행)
    pattern = r'(?:^|\n)\s*(\d{4})\s*\n'
    matches = list(re.finditer(pattern, clean_text))

    if not matches:
        return []

    for i, m in enumerate(matches):
        q_num = int(m.group(1))
        if q_num < 1 or q_num > 9999:
            continue

        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(clean_text)
        content = clean_text[start:end].strip()

        # 내용 정리
        content = fix_math(content)
        content = clean_question_content(content)

        if not content or len(content) < 8:
            continue

        # 그룹 지시문 붙이기
        if q_num in group_map:
            instruction = fix_math(group_map[q_num])
            content = instruction + '\n' + content

        # 유형 및 선택지
        q_type = detect_qtype(content)
        choices = None
        if q_type == "MULTIPLE_CHOICE":
            choices = extract_choices(content)
            if choices:
                # ① 마커로 선택지 시작 위치 찾기 (분수 변환 후 원본 매칭 불가하므로)
                idx = content.find('①')
                if idx > 0:
                    content = content[:idx].strip()

        # 시각적 분수 인라인 변환 (content)
        content = _collapse_visual_fractions(content)

        # 실력 섹션 내 서술형 문제는 HIGHEST
        q_difficulty = difficulty
        if section == '실력' and q_type == 'ESSAY':
            q_difficulty = 'HIGHEST'

        questions.append({
            "bookCode": book_code,
            "chapter": chapter or "미분류",
            "section": section,
            "questionNum": q_num,
            "pageNum": page_num + 1,
            "difficulty": q_difficulty,
            "type": q_type,
            "content": content,
            "choices": choices,
            "answer": "",
            "explanation": None,
            "sourceTag": f"RPM 중{book_code} #{q_num:04d}",
        })

    return questions


# ── Answer PDF Parsing ───────────────────────────────────

def parse_answer_pdf(pdf_path):
    """정답 PDF 파싱: 문항번호 → (정답, 해설) 매핑."""
    if not os.path.exists(pdf_path):
        print(f"  [SKIP] 정답 파일 없음: {pdf_path}")
        return {}

    doc = fitz.open(pdf_path)
    full_text = ""
    for page in doc:
        full_text += get_column_sorted_text(page) + "\n"
    doc.close()

    full_text = fix_math(full_text)

    # 문항번호 위치 찾기
    pattern = r'(?:^|\n)\s*(\d{4})\s{1,4}'
    matches = list(re.finditer(pattern, full_text))

    answers = {}
    for i, m in enumerate(matches):
        q_num = int(m.group(1))
        if q_num < 1 or q_num > 9999:
            continue

        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(full_text)
        block = full_text[start:end].strip()

        # "답" 키워드로 정답 추출
        answer_match = re.search(r'(?:^|\n)\s*답\s+(.+?)(?:\n|$)', block)

        if answer_match:
            answer = answer_match.group(1).strip()
            explanation = block[:answer_match.start()].strip()
            # 채점표 등 제거
            explanation = re.sub(r'단계\n채점 요소\n비율[\s\S]*', '', explanation).strip()
            explanation = re.sub(r'비법 노트[\s\S]*', '', explanation).strip()
        else:
            lines = block.split('\n')
            answer = lines[0].strip() if lines else ""
            explanation = '\n'.join(lines[1:]).strip() if len(lines) > 1 else ""

        if not explanation:
            explanation = None

        answers[q_num] = {"answer": answer, "explanation": explanation}

    return answers


# ── Main Pipeline ────────────────────────────────────────

def parse_student_pdf(book_config):
    """학생용 PDF에서 문제 추출 (유형 익히기 이후)."""
    student_path = os.path.join(RPM_DIR, book_config["student"])
    if not os.path.exists(student_path):
        print(f"  [SKIP] 파일 없음: {student_path}")
        return []

    doc = fitz.open(student_path)

    # 단원명 자동 감지 (TOC 파싱) → 실패 시 하드코딩 사용
    auto_chs = auto_detect_chapters(doc)
    chapters = auto_chs if auto_chs else CHAPTERS.get(book_config["code"], [])
    if auto_chs:
        print(f"  Auto-detected chapters: {auto_chs}")
    else:
        print(f"  Using hardcoded chapters: {chapters}")

    questions = []
    current_chapter = None
    current_section = 'skip'

    for pg in range(len(doc)):
        page = doc[pg]
        text = get_column_sorted_text(page)
        if not text or not text.strip():
            continue

        # 단원 감지
        ch = detect_chapter(text, chapters)
        if ch:
            current_chapter = ch

        # 페이지 분류
        section = classify_page(text, current_section)
        current_section = section

        # 추출 가능 섹션만 처리
        if section not in ('type', 'skill', 'essay'):
            continue

        difficulty = SECTION_DIFFICULTY.get(section, 'MEDIUM')
        section_label = SECTION_LABELS.get(section, section)

        page_qs = extract_questions_from_page(
            text, pg, book_config["code"],
            current_chapter, section_label, difficulty
        )
        questions.extend(page_qs)

    doc.close()
    return questions


def clean_explanation(text):
    """해설 텍스트에서 사이드바 라벨 등 불필요 문자 제거."""
    if not text:
        return text
    # 시각적 분수 인라인 변환
    text = _collapse_visual_fractions(text)
    lines = text.split('\n')
    cleaned = []
    # 연속 단일 한글/영문 문자 줄 제거 (사이드바 세로 라벨)
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if len(line) == 1 and (line.isalpha() or '\uac00' <= line <= '\ud7a3'):
            # 연속 단일 문자 줄 스킵
            j = i
            while j < len(lines) and len(lines[j].strip()) == 1:
                j += 1
            if j - i >= 2:  # 2줄 이상 연속이면 사이드바
                i = j
                continue
        cleaned.append(lines[i])
        i += 1
    text = '\n'.join(cleaned).strip()
    # 선택지 번호 앞 줄바꿈 추가 (①②③④⑤ 해설 구분)
    text = re.sub(r'\s*([②③④⑤])', r'\n\1', text)
    # 괄호 번호 앞 줄바꿈 (⑴⑵⑶⑷⑸ 소문항)
    text = re.sub(r'\s*([⑵⑶⑷⑸])', r'\n\1', text)
    # '따라서' 앞 줄바꿈 추가
    text = re.sub(r'\s+(따라서)', r'\n\1', text)
    return text.strip()


def match_answers(questions, answer_map):
    """문제에 정답/해설 매칭."""
    matched = 0
    for q in questions:
        if q["answer"]:
            matched += 1
            continue

        q_num = q["questionNum"]
        if q_num in answer_map:
            q["answer"] = answer_map[q_num]["answer"]
            q["explanation"] = clean_explanation(answer_map[q_num]["explanation"])
            if q["answer"]:
                matched += 1

    return matched


def main():
    all_questions = []

    for book in BOOKS:
        print(f"\n{'='*60}")
        print(f"Processing: {book['student']}")
        print(f"{'='*60}")

        questions = parse_student_pdf(book)
        print(f"  추출된 문제: {len(questions)}개")

        print(f"  정답 파싱: {book['answers']}")
        answer_map = parse_answer_pdf(os.path.join(RPM_DIR, book["answers"]))
        print(f"  정답 항목: {len(answer_map)}개")

        matched = match_answers(questions, answer_map)
        print(f"  정답 매칭: {matched}/{len(questions)}")

        # 통계
        chs = sorted(set(q["chapter"] for q in questions))
        print(f"  단원: {', '.join(chs)}")

        by_sec = {}
        for q in questions:
            s = q["section"] or "-"
            by_sec[s] = by_sec.get(s, 0) + 1
        print(f"  섹션별: {by_sec}")

        by_type = {}
        for q in questions:
            by_type[q["type"]] = by_type.get(q["type"], 0) + 1
        print(f"  유형별: {by_type}")

        all_questions.extend(questions)

    # 중복 제거 (나중 페이지 우선 - 실제 문제 페이지가 개요 페이지보다 뒤에 나옴)
    seen = {}
    for q in all_questions:
        key = (q["bookCode"], q["questionNum"])
        if key not in seen or q["pageNum"] > seen[key]["pageNum"]:
            seen[key] = q
    all_questions = list(seen.values())

    # 최종 통계
    print(f"\n{'='*60}")
    print(f"총 문제 수: {len(all_questions)}")
    with_ans = sum(1 for q in all_questions if q["answer"])
    print(f"정답 있음: {with_ans}")
    print(f"정답 없음: {len(all_questions) - with_ans}")

    print(f"\n교재별:")
    by_book = {}
    for q in all_questions:
        by_book[q["bookCode"]] = by_book.get(q["bookCode"], 0) + 1
    for code in sorted(by_book.keys()):
        print(f"  중{code}: {by_book[code]}문제")

    print(f"\n난이도별:")
    by_diff = {}
    for q in all_questions:
        by_diff[q["difficulty"]] = by_diff.get(q["difficulty"], 0) + 1
    for d in ["MEDIUM", "HIGH", "HIGHEST"]:
        print(f"  {d}: {by_diff.get(d, 0)}")

    # 후처리: 줄바꿈 + LaTeX 수식 통일
    print("\nLaTeX 수식 변환 중...")
    for q in all_questions:
        # 소문항 줄바꿈 (⑵⑶⑷⑸) - _collapse_visual_fractions 이후 재적용
        q["content"] = re.sub(r'\s*([⑵⑶⑷⑸])', r'\n\1', q["content"])
        q["content"] = _latexify_math(q["content"])
        if q.get("choices"):
            q["choices"] = [_latexify_math(c) for c in q["choices"]]
        if q.get("answer"):
            q["answer"] = _latexify_math(q["answer"])
        if q.get("explanation"):
            q["explanation"] = _latexify_math(q["explanation"])

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\n저장: {OUTPUT_FILE}")
    print("완료!")


if __name__ == "__main__":
    main()
