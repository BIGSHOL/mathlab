"""
MathLab Elementary Question Bank - OCR-based PDF Parser
큐브수학 개념 6-1 PDF에서 Tesseract OCR로 문제를 추출한다.

기존 parse-elementary-pdf.py의 텍스트 추출 방식은 큐브수학 PDF의
커스텀 폰트 인코딩(제어문자)으로 인해 숫자/수학기호가 깨지는 문제가 있다.
OCR 기반으로 이미지에서 직접 텍스트를 인식하여 품질을 개선한다.

Usage:
  pip install pytesseract pymupdf Pillow
  python scripts/parse-elementary-ocr.py

Output:
  data/questions-elementary-ocr-6-1.json
"""

import fitz
import json
import re
import os
import sys
from PIL import Image, ImageEnhance
import pytesseract
import io
import numpy as np

sys.stdout.reconfigure(encoding='utf-8')

# -- Configuration --
TESSERACT_CMD = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
PDF_PATH = os.path.join(DATA_DIR, '큐브수학 개념', '진도북', '큐브수학 개념 6-1_진도북.pdf')
ANSWER_PDF_PATH = os.path.join(DATA_DIR, '큐브수학 개념', '매칭북', '큐브수학 개념 6-1_매칭북.pdf')
OUTPUT_FILE = os.path.join(DATA_DIR, 'questions-elementary-ocr-6-1.json')

BOOK_CODE = "6-1"
SERIES = "큐브수학 개념"

# 6-1 단원 목록
CHAPTERS = [
    "분수의 나눗셈", "각기둥과 각뿔", "소수의 나눗셈",
    "비와 비율", "여러 가지 그래프", "직육면체의 부피와 겉넓이",
]

# 섹션 → 난이도 매핑
SECTION_KEYWORDS = [
    ("학업 성취도 평가", "학업 성취도"),
    ("서술형 잡기", "서술형 잡기"),
    ("단원 마무리", "단원 마무리"),
    ("수학 익힘 문제 잡기", "익힘 문제"),
    ("개념 한 번 더 잡기", "한 번 더"),
    ("기초력 학습지", "기초력"),
    ("교과서 개념 잡기", "개념 잡기"),
]

SECTION_DIFFICULTY = {
    "교과서 개념 잡기": "BASIC",
    "개념 한 번 더 잡기": "BASIC",
    "수학 익힘 문제 잡기": "MEDIUM",
    "기초력 학습지": "BASIC",
    "서술형 잡기": "HIGH",
    "단원 마무리": "MEDIUM",
    "학업 성취도 평가": "HIGHEST",
}

# OCR 이미지 렌더링 DPI
RENDER_DPI = 300

# 2단 레이아웃 감지 기준 (페이지 중앙에 수직 여백이 있으면 2단)
TWO_COLUMN_THRESHOLD = 0.48  # 페이지 너비의 48% 지점


def detect_chapter(text):
    """텍스트에서 현재 단원 감지"""
    for ch in CHAPTERS:
        if ch in text:
            return ch
    return None


def detect_section(text):
    """섹션 유형 감지"""
    for section_name, keyword in SECTION_KEYWORDS:
        if keyword in text:
            diff = SECTION_DIFFICULTY.get(section_name, "MEDIUM")
            return section_name, diff
    return None, None


def detect_question_type(content):
    """문제 유형 분류"""
    if re.search(r'[①②③④⑤]', content):
        return "MULTIPLE_CHOICE"
    if any(kw in content for kw in ['풀이 과정을 쓰', '과정을 쓰고', '설명하세요', '풀이 과정', '서술형']):
        return "ESSAY"
    return "SHORT_ANSWER"


def extract_choices(content):
    """객관식 선택지 추출"""
    choices = re.findall(r'([①②③④⑤][^①②③④⑤\n]*)', content)
    if len(choices) >= 2:
        return [c.strip() for c in choices]
    return None


def is_valid_question(content):
    """추출된 내용이 실제 문제인지 검증"""
    if not content or len(content) < 12:
        return False

    if re.match(r'^[\d\s\.\,]+$', content.strip()):
        return False

    # 짧은 숫자/코드
    first_line = content.strip().split('\n')[0].strip()
    if re.match(r'^\d{3,6}$', first_line):
        return False

    # 목차/학습계획
    if re.search(r'월\s*일\s*\n.*쪽', content[:80]):
        return False

    # 정답/매칭북 참조만
    if re.match(r'^정답\s+\d+쪽|^매칭북\s+\d+쪽', content.strip()):
        return False

    # 개념 설명 키워드
    junk_kw = ['예제', 'KEY', '외우자', '학습 계획표',
               '개념 한 번 더 잡기\n월', '교과서 개념 잡기\n월',
               '수학 익힘 문제 잡기\n월', '서술형 잡기\n월',
               '유형 STEP', 'STEP 실력', '확인 유형 강화']
    if any(kw in content[:80] for kw in junk_kw):
        return False

    # 내용이 대부분 공백/기호
    cleaned = re.sub(r'[×÷+\-=\s\n⑴⑵⑶()\d]', '', content)
    if len(cleaned) < 6:
        return False

    # 문제다운 패턴
    question_patterns = [
        r'구하|구해|풀어|풀이',
        r'나타내|쓰시오|써 보|쓰세요|써넣',
        r'얼마|몇|무엇|어느|어떤|바르게|옳은|맞는',
        r'계산|빈칸|빈 칸|□|㉠|㉡',
        r'것은|것을|값은|값을',
        r'[①②③④⑤]',
        r'⑴|⑵|⑶|\(1\)|\(2\)',
        r'다음|아래|위의',
        r'비교|크기|순서|이유',
        r'\?|하시오|하세요|하여라|해 보',
        r'안에|알맞은|보세요',
    ]
    has_pattern = any(re.search(p, content) for p in question_patterns)
    if not has_pattern and len(content) < 40:
        return False

    return True


def is_question_page(text):
    """문제가 있는 페이지인지 판별"""
    question_markers = [
        '개념 잡기', '한 번 더', '익힘 문제', '서술형 잡기',
        '단원 마무리', '학업 성취도', '기초력',
        '보세요', '구하세요', '써넣으세요', '나타내',
    ]
    return any(marker in text for marker in question_markers)


def is_concept_only_page(text):
    """개념 설명만 있는 페이지인지 판별"""
    concept_markers = ['개념원리', '핵심쏙', '한눈에', '약속이다', '알아봅시다']
    question_markers = ['보세요', '구하세요', '써넣', '계산해', '나타내어']
    has_concept = any(m in text for m in concept_markers)
    has_question = any(m in text for m in question_markers)
    return has_concept and not has_question


def render_page_to_image(page, dpi=RENDER_DPI):
    """PDF 페이지를 PIL Image로 렌더링"""
    pix = page.get_pixmap(dpi=dpi)
    return Image.open(io.BytesIO(pix.tobytes('png')))


def preprocess_image(img):
    """OCR 전처리: 어두운 텍스트만 추출 (색상 배경/사이드바 제거)
    RGB 각 채널이 모두 100 이하인 어두운 픽셀만 남김.
    이 방식이 그레이스케일+이진화보다 한국어+숫자 인식 품질이 훨씬 우수함.
    """
    arr = np.array(img.convert('RGB'))
    # 어두운 텍스트만 남김 (R,G,B 모두 150 이하)
    # threshold=150이 한국어+숫자 인식의 최적 균형점
    dark_mask = np.all(arr < 150, axis=2)
    result = np.full(arr.shape[:2], 255, dtype=np.uint8)  # 흰 배경
    result[dark_mask] = 0  # 어두운 텍스트는 검정
    return Image.fromarray(result)


def detect_two_columns(img):
    """2단 레이아웃인지 감지
    페이지 중앙 부근에 수직 여백(흰 줄)이 있으면 2단으로 판별
    """
    gray = img.convert('L')
    w, h = gray.size

    # 페이지 중앙 20% 영역에서 세로 방향 밝기 프로파일 확인
    center_start = int(w * 0.40)
    center_end = int(w * 0.60)

    # 상단/하단 20% 제외 (헤더/푸터)
    y_start = int(h * 0.15)
    y_end = int(h * 0.85)

    # 각 x 좌표에서 평균 밝기 계산
    max_brightness = 0
    for x in range(center_start, center_end):
        total = 0
        count = 0
        for y in range(y_start, y_end, 5):  # 5px 간격 샘플링
            total += gray.getpixel((x, y))
            count += 1
        avg = total / count if count > 0 else 0
        max_brightness = max(max_brightness, avg)

    # 중앙에 밝은 줄(여백)이 있으면 2단
    return max_brightness > 240


def ocr_page(img, is_two_col=False):
    """이미지에서 OCR 텍스트 추출"""
    if is_two_col:
        w, h = img.size
        # 왼쪽 컬럼
        left = img.crop((0, 0, int(w * 0.50), h))
        left_processed = preprocess_image(left)
        text_left = pytesseract.image_to_string(
            left_processed, lang='kor+eng', config='--psm 6 --oem 3'
        )
        # 오른쪽 컬럼
        right = img.crop((int(w * 0.50), 0, w, h))
        right_processed = preprocess_image(right)
        text_right = pytesseract.image_to_string(
            right_processed, lang='kor+eng', config='--psm 6 --oem 3'
        )
        return text_left + '\n' + text_right
    else:
        processed = preprocess_image(img)
        return pytesseract.image_to_string(
            processed, lang='kor+eng', config='--psm 3 --oem 3'
        )


def clean_ocr_text(text):
    """OCR 결과 텍스트 정리"""
    # OCR 노이즈 패턴 제거
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # 과도한 공백 정리
    text = re.sub(r'[ \t]{3,}', '  ', text)
    # 과도한 줄바꿈 정리
    text = re.sub(r'\n{3,}', '\n\n', text)
    # 페이지 하단 푸터 제거
    text = re.sub(r'\n\d{3}\n.*$', '', text, flags=re.MULTILINE)
    # 단원 번호 + 이름 + 페이지번호 (예: "1.분수의 나눗셈 011")
    text = re.sub(r'\d+\.\s*(?:분수의|각기둥|소수의|비와|여러|직육면체).*\d{3}\s*$', '', text, flags=re.MULTILINE)
    return text.strip()


def extract_questions_from_text(text, page_num, chapter, section, difficulty):
    """OCR 텍스트에서 개별 문제 추출"""
    questions = []

    # 문제 번호 패턴: "01 ", "02 ", "1 ", "2 " 등 (줄 시작)
    # OCR에서는 숫자 뒤에 공백이 여러 개 올 수 있음
    pattern = r'(?:^|\n)\s*(0[1-9]|[1-9][0-9]?)\s{1,6}((?:(?!(?:^|\n)\s*(?:0[1-9]|[1-9][0-9]?)\s{1,6}).)+)'
    matches = re.finditer(pattern, text, re.DOTALL)

    for m in matches:
        try:
            q_num = int(m.group(1))
            q_content = m.group(2).strip()
        except (ValueError, IndexError):
            continue

        # 내용 정리
        q_content = re.sub(r'\n{3,}', '\n\n', q_content)
        q_content = re.sub(r'[ \t]+', ' ', q_content)
        q_content = q_content.strip()

        # 검증
        if not is_valid_question(q_content):
            continue

        q_type = detect_question_type(q_content)
        choices = None
        if q_type == "MULTIPLE_CHOICE":
            choices = extract_choices(q_content)
            if choices:
                first_choice_pos = q_content.find(choices[0])
                if first_choice_pos > 0:
                    q_content = q_content[:first_choice_pos].strip()

        questions.append({
            "bookCode": f"E{BOOK_CODE}",
            "chapter": chapter,
            "section": section,
            "questionNum": q_num,
            "pageNum": page_num + 1,
            "difficulty": difficulty,
            "type": q_type,
            "content": q_content,
            "choices": choices,
            "answer": "",
            "explanation": None,
            "sourceTag": f"{SERIES} 초{BOOK_CODE} #{q_num:02d}",
        })

    return questions


def decode_math_chars(text):
    """PDF 수학 기호 제어문자를 실제 문자로 디코딩 (기존 파서에서 가져옴)"""
    MATH_CHAR_MAP = {
        '\x11': '0', '\x12': '1', '\x13': '2', '\x14': '3', '\x15': '4',
        '\x16': '5', '\x17': '6', '\x18': '7', '\x19': '8', '\x1a': '9',
        '\x0c': '+', '\x0e': '-', '\x1e': '=',
        '\x1d': '<', '\x1f': '>',
        '\x96': '÷',
        '@': '×',
        '\x03': '', '\x0f': '', '\x10': '',
        '\x1b': '', '\x1c': '',
    }
    return ''.join(MATH_CHAR_MAP.get(ch, ch) for ch in text)


def parse_textbook():
    """하이브리드 파싱: 메타데이터는 텍스트 추출, 문제 내용은 OCR"""
    if not os.path.exists(PDF_PATH):
        print(f"[ERROR] PDF not found: {PDF_PATH}")
        return []

    doc = fitz.open(PDF_PATH)
    all_questions = []
    current_chapter = None
    current_section = None
    current_difficulty = "MEDIUM"

    total_pages = len(doc)
    print(f"  Total pages: {total_pages}", flush=True)

    # TEST_MODE: 환경변수 TEST_PAGES로 페이지 범위 제한 (예: "10-30")
    start_page = 4
    end_page = total_pages
    test_pages = os.environ.get('TEST_PAGES', '')
    if test_pages:
        parts = test_pages.split('-')
        start_page = max(4, int(parts[0]) - 1)
        end_page = min(total_pages, int(parts[1])) if len(parts) > 1 else start_page + 1
        print(f"  TEST MODE: pages {start_page + 1}~{end_page}", flush=True)

    for page_num in range(start_page, end_page):
        page = doc[page_num]

        # 진행률 표시
        print(f"  Processing page {page_num + 1}/{total_pages}...", flush=True)

        # ===== 하이브리드 접근 =====
        # 1. 텍스트 추출 (한국어 완벽, 숫자 깨짐) → 메타데이터용
        raw_text = decode_math_chars(page.get_text())

        # 2. 단원/섹션 감지 (텍스트 추출 기반 — 한국어 정확)
        detected_ch = detect_chapter(raw_text)
        if detected_ch:
            current_chapter = detected_ch

        detected_sec, detected_diff = detect_section(raw_text)
        if detected_sec:
            current_section = detected_sec
            current_difficulty = detected_diff

        if not current_chapter:
            continue

        # 3. 개념 전용/비문제 페이지 스킵 (텍스트 추출 기반)
        if is_concept_only_page(raw_text):
            continue
        if not is_question_page(raw_text) and not current_section:
            continue

        # 4. OCR 실행 (숫자/수학기호 정확) → 문제 내용 추출용
        img = render_page_to_image(page)
        is_two_col = detect_two_columns(img)
        ocr_text = ocr_page(img, is_two_col)
        ocr_text = clean_ocr_text(ocr_text)

        if not ocr_text or len(ocr_text) < 30:
            continue

        # 5. 문제 추출 (OCR 텍스트에서)
        page_questions = extract_questions_from_text(
            ocr_text, page_num,
            current_chapter, current_section, current_difficulty
        )
        all_questions.extend(page_questions)

    doc.close()
    print(f"  Processing complete.{' ' * 30}", flush=True)
    return all_questions


def parse_answer_pdf():
    """정답 PDF OCR 파싱"""
    if not os.path.exists(ANSWER_PDF_PATH):
        print(f"  [SKIP] Answer PDF not found: {ANSWER_PDF_PATH}")
        return {}

    doc = fitz.open(ANSWER_PDF_PATH)
    answer_map = {}
    current_chapter = None
    current_section = None
    total_pages = len(doc)

    print(f"  Answer PDF pages: {total_pages}", flush=True)

    for page_num in range(len(doc)):
        page = doc[page_num]

        if page_num % 5 == 0:
            print(f"  Parsing answers page {page_num + 1}/{total_pages}...", flush=True)

        img = render_page_to_image(page)
        is_two_col = detect_two_columns(img)
        ocr_text = ocr_page(img, is_two_col)
        ocr_text = clean_ocr_text(ocr_text)

        if not ocr_text:
            continue

        detected_ch = detect_chapter(ocr_text)
        if detected_ch:
            current_chapter = detected_ch

        detected_sec, _ = detect_section(ocr_text)
        if detected_sec:
            current_section = detected_sec

        if not current_chapter:
            continue

        # 정답 항목 추출
        pattern = r'(?:^|\n)\s*(0[1-9]|[1-9][0-9]?)\s+((?:(?!(?:^|\n)\s*(?:0[1-9]|[1-9][0-9]?)\s).)+)'
        matches = re.finditer(pattern, ocr_text, re.DOTALL)

        for m in matches:
            try:
                q_num = int(m.group(1))
                answer_text = m.group(2).strip()
            except (ValueError, IndexError):
                continue

            if answer_text:
                key3 = (current_chapter, current_section or "", q_num)
                if key3 not in answer_map or len(answer_text) > len(answer_map[key3]):
                    answer_map[key3] = answer_text

    doc.close()
    print(f"  Answer parsing complete.{' ' * 30}")
    return answer_map


def match_answers(questions, answer_map):
    """문제에 정답 매칭"""
    matched = 0
    for q in questions:
        # 1차: 정확 매칭
        key3 = (q["chapter"], q["section"] or "", q["questionNum"])
        if key3 in answer_map:
            _apply_answer(q, answer_map[key3])
            if q["answer"]:
                matched += 1
            continue

        # 2차: section 없이
        key_nosec = (q["chapter"], "", q["questionNum"])
        if key_nosec in answer_map:
            _apply_answer(q, answer_map[key_nosec])
            if q["answer"]:
                matched += 1
            continue

        # 3차: chapter+num 아무 section
        for (ch, sec, num), ans in answer_map.items():
            if ch == q["chapter"] and num == q["questionNum"]:
                _apply_answer(q, ans)
                if q["answer"]:
                    matched += 1
                break

    return matched


def _apply_answer(q, answer_text):
    """정답 텍스트 적용"""
    lines = answer_text.split('\n')
    q["answer"] = lines[0].strip()
    if len(lines) > 1:
        q["explanation"] = '\n'.join(lines[1:]).strip()


def deduplicate(questions):
    """중복 제거"""
    seen = set()
    unique = []
    for q in questions:
        key = (q["bookCode"], q["chapter"], q["questionNum"], q["section"] or "")
        if key not in seen:
            seen.add(key)
            unique.append(q)
    return unique


def compare_with_existing():
    """기존 텍스트 추출 결과와 비교"""
    existing_file = os.path.join(DATA_DIR, 'questions-elementary.json')
    if not os.path.exists(existing_file):
        return

    with open(existing_file, 'r', encoding='utf-8') as f:
        all_existing = json.load(f)

    existing = [q for q in all_existing if q['bookCode'] == 'E6-1']

    with open(OUTPUT_FILE, 'r', encoding='utf-8') as f:
        ocr_questions = json.load(f)

    print(f"\n{'=' * 60}")
    print("품질 비교: 기존 텍스트 추출 vs OCR")
    print(f"{'=' * 60}")

    print(f"\n  기존 텍스트 추출:")
    print(f"    총 문제 수: {len(existing)}")
    existing_with_ans = sum(1 for q in existing if q.get('answer', '').strip())
    print(f"    정답 매칭: {existing_with_ans}/{len(existing)} ({existing_with_ans/len(existing)*100:.1f}%)")

    # 깨진 텍스트 비율 (제어문자 포함)
    broken_existing = sum(1 for q in existing
                          if any(ord(c) < 0x20 and c not in '\n\t\r' for c in q['content']))
    print(f"    깨진 텍스트: {broken_existing}/{len(existing)} ({broken_existing/len(existing)*100:.1f}%)")

    print(f"\n  OCR 파싱:")
    print(f"    총 문제 수: {len(ocr_questions)}")
    ocr_with_ans = sum(1 for q in ocr_questions if q.get('answer', '').strip())
    ans_pct = ocr_with_ans / len(ocr_questions) * 100 if ocr_questions else 0
    print(f"    정답 매칭: {ocr_with_ans}/{len(ocr_questions)} ({ans_pct:.1f}%)")

    broken_ocr = sum(1 for q in ocr_questions
                     if any(ord(c) < 0x20 and c not in '\n\t\r' for c in q['content']))
    broken_pct = broken_ocr / len(ocr_questions) * 100 if ocr_questions else 0
    print(f"    깨진 텍스트: {broken_ocr}/{len(ocr_questions)} ({broken_pct:.1f}%)")

    # 샘플 비교
    print(f"\n  샘플 비교 (처음 5문제):")
    for i, q in enumerate(ocr_questions[:5]):
        print(f"\n    OCR Q{q['questionNum']:02d} (p{q['pageNum']}, {q['section']}):")
        print(f"      {q['content'][:120]}")
        print(f"      answer: {q.get('answer', '')[:50]}")


def main():
    print(f"\n{'=' * 60}")
    print(f"큐브수학 개념 6-1 OCR 파싱")
    print(f"{'=' * 60}")

    # 1. 교재 OCR 파싱
    print(f"\n[1/3] 교재 PDF OCR 파싱...")
    questions = parse_textbook()
    print(f"  추출된 문제: {len(questions)}")

    # 2. 정답 OCR 파싱 + 매칭
    print(f"\n[2/3] 정답 PDF OCR 파싱...")
    answer_map = parse_answer_pdf()
    print(f"  정답 항목: {len(answer_map)}")
    matched = match_answers(questions, answer_map)
    print(f"  매칭된 정답: {matched}/{len(questions)}")

    # 3. 중복 제거 + 저장
    questions = deduplicate(questions)
    print(f"\n  최종 문제 수 (중복 제거 후): {len(questions)}")

    # 통계
    by_ch = {}
    for q in questions:
        by_ch[q["chapter"]] = by_ch.get(q["chapter"], 0) + 1
    print(f"\n  단원별:")
    for ch, cnt in sorted(by_ch.items(), key=lambda x: -x[1]):
        print(f"    {ch}: {cnt}")

    by_diff = {}
    for q in questions:
        by_diff[q["difficulty"]] = by_diff.get(q["difficulty"], 0) + 1
    print(f"\n  난이도별: {by_diff}")

    by_type = {}
    for q in questions:
        by_type[q["type"]] = by_type.get(q["type"], 0) + 1
    print(f"  유형별: {by_type}")

    # JSON 저장
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)
    print(f"\n  저장: {OUTPUT_FILE}")

    # 4. 기존 결과와 비교
    print(f"\n[3/3] 품질 비교...")
    compare_with_existing()

    print(f"\n{'=' * 60}")
    print("Done!")


if __name__ == "__main__":
    main()
