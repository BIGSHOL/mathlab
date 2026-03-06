"""
큐브수학 실력 매칭북 문제 추출기
- 페이지별 문제 번호 위치 감지 (2단 레이아웃)
- 문제별 이미지 크롭 + 텍스트 추출
- 정답 PDF에서 답안 매칭
"""

import fitz
import json
import re
import os
import sys

# ===== 제어문자 → 수학기호 디코딩 =====
MATH_CHAR_MAP = {
    '\x11': '0', '\x12': '1', '\x13': '2', '\x14': '3', '\x15': '4',
    '\x16': '5', '\x17': '6', '\x18': '7', '\x19': '8', '\x1a': '9',
    '\x0c': '+', '\x0e': '-', '\x1e': '=',
    '\x1d': '<', '\x1f': '>',
    '\x96': '÷', '@': '×',
    '\x03': '', '\x0f': '', '\x10': '',
    '\x1b': '', '\x1c': '',
}

def decode(text):
    return ''.join(MATH_CHAR_MAP.get(ch, ch) for ch in text)

# ===== 단원 목록 =====
CHAPTERS = {
    "3-1": ["덧셈과 뺄셈", "평면도형", "나눗셈", "곱셈", "길이와 시간", "분수와 소수"],
    "3-2": ["곱셈", "나눗셈", "원", "분수", "들이와 무게", "자료의 정리"],
    "4-1": ["큰 수", "각도", "곱셈과 나눗셈", "평면도형의 이동", "막대그래프", "규칙 찾기"],
    "4-2": ["분수의 덧셈과 뺄셈", "삼각형", "소수의 덧셈과 뺄셈", "사각형", "꺾은선그래프", "다각형"],
    "5-1": ["자연수의 혼합 계산", "약수와 배수", "규칙과 대응", "약분과 통분", "분수의 덧셈과 뺄셈", "다각형의 둘레와 넓이"],
    "5-2": ["수의 범위와 어림", "분수의 곱셈", "합동과 대칭", "소수의 곱셈", "직육면체", "평균과 가능성"],
    "6-1": ["분수의 나눗셈", "각기둥과 각뿔", "소수의 나눗셈", "비와 비율", "여러 가지 그래프", "직육면체의 부피와 겉넓이"],
    "6-2": ["분수의 나눗셈", "소수의 나눗셈", "공간과 입체", "비례식과 비례배분", "원의 넓이", "원기둥 원뿔 구"],
}

SECTION_DIFFICULTY = {
    "개념 완성하기": "BASIC",
    "개념 완성": "BASIC",
    "실력 다지기": "MEDIUM",
    "서술형 해결하기": "HIGH",
    "서술형 학습": "HIGH",
    "단원 마무리": "MEDIUM",
    "단원 평가": "MEDIUM",
}

# ===== 문제 번호 위치 감지 =====
# 폰트별 최소 크기: (font_key, min_size)
QUESTION_FONTS = [
    ("Bauhaus", 18),      # STEP 1 개념 완성하기
    ("RixHead", 15),      # STEP 2 실력 다지기
    ("DIN", 18),           # STEP 3 서술형 해결하기
    ("VAGRounded", 18),    # 단원 마무리
]

def find_question_positions(page):
    """페이지에서 문제 번호 위치를 찾아 반환.
    Returns: [(qnum, x, y), ...]
    """
    blocks = page.get_text("dict")["blocks"]

    # 폰트별로 숫자 span 수집
    spans_by_font = {}
    for block in blocks:
        if "lines" not in block:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                t = span["text"].strip()
                if not re.match(r"^\d{1,2}$", t):
                    continue
                font = span.get("font", "")
                size = span["size"]
                for font_key, min_size in QUESTION_FONTS:
                    if font_key in font and size >= min_size:
                        if font_key not in spans_by_font:
                            spans_by_font[font_key] = []
                        spans_by_font[font_key].append({
                            "text": t,
                            "x": span["bbox"][0],
                            "y": span["bbox"][1],
                        })
                        break

    if not spans_by_font:
        return []

    # 우선순위: Bauhaus > DIN > VAGRounded > RixHead
    for font_key in ["Bauhaus", "DIN", "VAGRounded", "RixHead"]:
        if font_key in spans_by_font:
            raw_spans = spans_by_font[font_key]
            break
    else:
        return []

    # 인접 span 합치기 (같은 y, x 차이 < 15) → 2자리 문제번호 복원
    raw_spans.sort(key=lambda s: (round(s["y"]), s["x"]))
    merged = []
    i = 0
    while i < len(raw_spans):
        s = raw_spans[i]
        if (i + 1 < len(raw_spans)
            and abs(raw_spans[i+1]["y"] - s["y"]) < 5
            and 0 < raw_spans[i+1]["x"] - s["x"] < 15):
            num_str = s["text"] + raw_spans[i+1]["text"]
            merged.append((int(num_str), s["x"], s["y"]))
            i += 2
        else:
            merged.append((int(s["text"]), s["x"], s["y"]))
            i += 1

    return merged


def detect_page_meta(text, grade_semester):
    """페이지 메타데이터(단원, 섹션, 정답페이지) 감지"""
    chapter = None
    section = None
    answer_page = None

    chapters = CHAPTERS.get(grade_semester, [])
    for ch in chapters:
        if ch in text:
            chapter = ch
            break

    for sec_name in SECTION_DIFFICULTY:
        if sec_name in text:
            section = sec_name
            break

    m = re.search(r'정답\s*(\d+)쪽', text)
    if m:
        answer_page = int(m.group(1))

    return chapter, section, answer_page


def crop_questions(page, q_positions, output_dir, book_code, page_idx):
    """페이지에서 각 문제를 이미지로 크롭"""
    pw, ph = page.rect.width, page.rect.height
    mat = fitz.Matrix(2.5, 2.5)  # 2.5x 해상도

    # 헤더 영역: 첫 문제 번호 위의 ~15px
    header_end = min(y for _, _, y in q_positions) - 15
    footer_start = ph - 55  # 페이지 하단 푸터(단원명+페이지번호) 제외

    # 좌/우 컬럼 분리
    left = sorted([(q, x, y) for q, x, y in q_positions if x < pw / 2], key=lambda t: t[2])
    right = sorted([(q, x, y) for q, x, y in q_positions if x >= pw / 2], key=lambda t: t[2])

    results = []
    for col_name, col in [("left", left), ("right", right)]:
        x0 = 0 if col_name == "left" else pw / 2 - 5
        x1 = pw / 2 + 5 if col_name == "left" else pw

        for i, (qnum, qx, qy) in enumerate(col):
            y_start = qy - 12
            if i + 1 < len(col):
                y_end = col[i + 1][2] - 12
            else:
                y_end = footer_start

            clip = fitz.Rect(x0, y_start, x1, y_end)
            crop_pix = page.get_pixmap(matrix=mat, clip=clip)

            fname = f"{book_code}_p{page_idx+1:02d}_q{qnum:02d}.png"
            fpath = os.path.join(output_dir, fname)
            crop_pix.save(fpath)

            # 해당 영역의 텍스트 추출
            text_in_rect = decode(page.get_text("text", clip=clip))
            text_in_rect = re.sub(r'[\x00-\x08\x0b\x7f]', '', text_in_rect).strip()

            results.append({
                "questionNum": qnum,
                "imagePath": f"questions/{fname}",
                "textContent": text_in_rect,
                "pageNum": page_idx + 1,
            })

    return results


def parse_answer_pdf(filepath, grade_semester):
    """정답 PDF 파싱 (위치 기반).
    Returns: {(matching_book_page, qnum): answer_text}
    매칭북 페이지 참조(예: '01쪽', '02~04쪽')를 이용해 정확히 매핑.
    """
    if not os.path.exists(filepath):
        print(f"  [SKIP] Answer PDF not found: {filepath}")
        return {}

    doc = fitz.open(filepath)
    answer_map = {}  # (matching_book_page, qnum) → answer
    chapters = CHAPTERS.get(grade_semester, [])

    in_matching = False
    current_chapter = None

    for pg_idx in range(len(doc)):
        page = doc[pg_idx]
        raw_text = decode(page.get_text())

        if '매칭북' in raw_text:
            in_matching = True
        if not in_matching:
            continue

        # 단원 감지
        for ch in chapters:
            if ch in raw_text:
                current_chapter = ch
                break
        if not current_chapter:
            continue

        # 위치 기반 텍스트 추출
        blocks = page.get_text("dict")["blocks"]
        positioned_lines = []  # [{x, y, text}, ...]

        for block in blocks:
            if "lines" not in block:
                continue
            for line in block["lines"]:
                parts = []
                for span in line["spans"]:
                    t = decode(span["text"])
                    t = re.sub(r'[\x00-\x08\x0b\x7f]', '', t)
                    parts.append(t)
                full = ''.join(parts).strip()
                if full:
                    positioned_lines.append({
                        "x": line["bbox"][0],
                        "y": line["bbox"][1],
                        "text": full,
                    })

        # STEP/섹션 헤더 감지 + 매칭북 페이지 참조 추출
        # 같은 y 근처(±10px)의 라인들을 합쳐서 감지
        sections = []  # [(y, section_name, page_range_set), ...]

        # STEP 라인 찾기
        step_lines = [l for l in positioned_lines if 'STEP' in l["text"]]
        for step_line in step_lines:
            # 같은 높이의 모든 텍스트 합치기
            nearby_text = ' '.join(
                l["text"] for l in positioned_lines
                if abs(l["y"] - step_line["y"]) < 10
            )

            section_name = None
            if '개념' in nearby_text:
                section_name = "개념 완성하기"
            elif '실력' in nearby_text:
                section_name = "실력 다지기"
            elif '서술형' in nearby_text:
                section_name = "서술형 해결하기"

            if not section_name:
                continue

            # 페이지 참조 추출
            page_range = set()
            for other in positioned_lines:
                if abs(other["y"] - step_line["y"]) < 10:
                    m = re.search(r'(\d+)~(\d+)쪽', other["text"])
                    if m:
                        for p in range(int(m.group(1)), int(m.group(2)) + 1):
                            page_range.add(p)
                    else:
                        m = re.search(r'(\d+)쪽', other["text"])
                        if m:
                            page_range.add(int(m.group(1)))

            if page_range:
                sections.append((step_line["y"], section_name, page_range))

        if not sections:
            # 단원 평가 페이지: "N. 단원이름" + "NN~MM쪽" 형태
            for line in positioned_lines:
                text = line["text"]
                # "1. 덧셈과 뺄셈" 같은 단원 헤더 감지
                if re.match(r'^\d+\.\s', text):
                    for ch in chapters:
                        if ch in text:
                            current_chapter = ch
                            # 근처에서 페이지 참조 찾기
                            page_range = set()
                            for other in positioned_lines:
                                if abs(other["y"] - line["y"]) < 10:
                                    m = re.search(r'(\d+)~(\d+)쪽', other["text"])
                                    if m:
                                        for p in range(int(m.group(1)), int(m.group(2)) + 1):
                                            page_range.add(p)
                                    else:
                                        m = re.search(r'(\d+)쪽', other["text"])
                                        if m:
                                            page_range.add(int(m.group(1)))
                            if page_range:
                                sections.append((line["y"], "단원 평가", page_range))
                            break

        # 왼쪽 컬럼만 (x < 300), y 순서로 정렬
        left_lines = sorted(
            [l for l in positioned_lines if l["x"] < 300],
            key=lambda l: l["y"]
        )

        # 각 라인이 어느 섹션에 속하는지 결정
        sections.sort(key=lambda s: s[0])

        for line in left_lines:
            y = line["y"]
            x = line["x"]
            text = line["text"]

            # 이 라인의 섹션 결정
            current_section = None
            current_pages = None
            for sy, sname, spages in reversed(sections):
                if y >= sy:
                    current_section = sname
                    current_pages = spages
                    break

            if not current_section or not current_pages:
                continue

            # 정답 추출
            if current_section == "개념 완성하기" and x >= 65:
                # STEP 1 압축 형식: "N answer" 또는 "N ans1 N ans2"
                # 단일 숫자 문제번호 (1-8)
                matches = re.findall(r'(\d)\s+(.+?)(?=\s\d\s|$)', text)
                for qnum_str, ans in matches:
                    qnum = int(qnum_str)
                    ans = ans.strip()
                    if qnum > 0 and ans:
                        for mp in current_pages:
                            key = (mp, qnum)
                            if key not in answer_map:
                                answer_map[key] = ans
            else:
                # STEP 2/3, 단원 평가: "NN answer" 또는 "NNanswer"
                m = re.match(r'^(\d{2})\s*(.*)', text)
                if m:
                    qnum = int(m.group(1))
                    ans = m.group(2).strip()
                    # 서술형 "/ 최종답" 처리: 첫줄에 있으면 추출
                    if not ans:
                        continue
                    # "예⃝" 제거
                    ans = re.sub(r'^예⃝\s*', '', ans)
                    # "❶" 등 채점기호 제거
                    ans = re.sub(r'^[❶❷❸]\s*', '', ans)
                    if qnum > 0 and ans:
                        for mp in current_pages:
                            key = (mp, qnum)
                            if key not in answer_map:
                                answer_map[key] = ans

    doc.close()
    return answer_map


def extract_book(matching_pdf, answer_pdf, grade_semester, output_dir):
    """한 권의 매칭북 전체 처리"""
    book_code = f"E{grade_semester}"  # e.g., E3-1

    os.makedirs(output_dir, exist_ok=True)

    doc = fitz.open(matching_pdf)
    all_questions = []
    current_chapter = None
    current_section = None
    current_answer_page = None

    print(f"\n{'='*60}")
    print(f"큐브수학 실력 {grade_semester} 매칭북")
    print(f"{'='*60}")

    for pg_idx in range(len(doc)):
        page = doc[pg_idx]
        text = decode(page.get_text())

        # 메타데이터 감지
        ch, sec, ans_pg = detect_page_meta(text, grade_semester)
        if ch:
            current_chapter = ch
        if sec:
            current_section = sec
        if ans_pg:
            current_answer_page = ans_pg

        # 문제 번호 위치 감지
        q_positions = find_question_positions(page)
        if not q_positions:
            continue

        if not current_chapter:
            continue

        difficulty = SECTION_DIFFICULTY.get(current_section, "MEDIUM")

        # 이미지 크롭 + 텍스트 추출
        page_questions = crop_questions(page, q_positions, output_dir, book_code, pg_idx)

        for pq in page_questions:
            pq["bookCode"] = book_code
            pq["chapter"] = current_chapter
            pq["section"] = current_section
            pq["difficulty"] = difficulty
            pq["answerPage"] = current_answer_page
            pq["answer"] = ""
            pq["explanation"] = None

        all_questions.extend(page_questions)
        print(f"  P{pg_idx+1:2d}: {current_chapter:15s} | {current_section or '':15s} | {len(page_questions)} questions")

    doc.close()

    # 정답 매칭 — answer_map 키: (matching_book_page, qnum)
    print(f"\nParsing answer PDF...")
    answer_map = parse_answer_pdf(answer_pdf, grade_semester)
    print(f"  Found {len(answer_map)} answers")

    matched = 0
    for q in all_questions:
        key = (q["pageNum"], q["questionNum"])
        if key in answer_map:
            q["answer"] = answer_map[key]
            matched += 1

    print(f"  Matched: {matched}/{len(all_questions)} answers")

    return all_questions


def main():
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
    OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'questions')

    # 큐브수학 실력 3-1만 처리
    gs = "3-1"
    matching_pdf = os.path.join(DATA_DIR, f"큐브수학 실력/{gs} 큐브실력/큐브수학 실력 {gs}_매칭북.pdf")
    answer_pdf = os.path.join(DATA_DIR, f"큐브수학 실력/{gs} 큐브실력/큐브수학실력{gs}정답(01~64).pdf")

    questions = extract_book(matching_pdf, answer_pdf, gs, OUTPUT_DIR)

    # JSON 저장
    json_path = os.path.join(DATA_DIR, f"questions-실력-{gs}.json")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*60}")
    print(f"Total: {len(questions)} questions")
    print(f"Images saved to: {OUTPUT_DIR}")
    print(f"JSON saved to: {json_path}")

    # 통계
    by_ch = {}
    for q in questions:
        by_ch[q["chapter"]] = by_ch.get(q["chapter"], 0) + 1
    print("\nBy chapter:")
    for ch, cnt in by_ch.items():
        print(f"  {ch}: {cnt}")

    with_answer = sum(1 for q in questions if q["answer"])
    print(f"\nWith answers: {with_answer}/{len(questions)}")


if __name__ == "__main__":
    main()
