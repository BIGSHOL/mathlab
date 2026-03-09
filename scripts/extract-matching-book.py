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

SECTION_TYPE = {
    "개념 완성하기": "SHORT_ANSWER",
    "개념 완성": "SHORT_ANSWER",
    "실력 다지기": "SHORT_ANSWER",
    "서술형 해결하기": "ESSAY",
    "서술형 학습": "ESSAY",
    "단원 마무리": "SHORT_ANSWER",
    "단원 평가": "SHORT_ANSWER",
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

    # 섹션명 감지 실패 시 STEP 번호로 결정
    if not section:
        text_no_space = text.replace(' ', '')
        if 'STEP1' in text_no_space:
            section = "개념 완성하기"
        elif 'STEP2' in text_no_space:
            section = "실력 다지기"
        elif 'STEP3' in text_no_space:
            section = "서술형 해결하기"

    # NanumGothicExtraBold 깨진 폰트 매핑 (5-2, 6-2 등)
    if not section:
        GARBLED_SECTION_MAP = {
            'ѐ֛\x01৮ࢿೞӝ': "개념 완성하기",
            'प۱\x01\u05ee\u0ad1ӝ': "실력 다지기",
            'ࢲࣿഋ\x01೧Ѿೞӝ': "서술형 해결하기",
            'ױਗ\x01ಣо': "단원 평가",
        }
        for garbled, sec_name in GARBLED_SECTION_MAP.items():
            if garbled in text:
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


def _extract_page_range(lines, ref_line, col_split=300):
    """STEP/섹션 헤더 근처에서 페이지 참조 추출"""
    ref_col = 0 if ref_line["x"] < col_split else 1
    page_range = set()
    for other in lines:
        other_col = 0 if other["x"] < col_split else 1
        if other_col != ref_col:
            continue
        if abs(other["y"] - ref_line["y"]) < 20:
            m = re.search(r'(\d+)~(\d+)쪽', other["text"])
            if m:
                for p in range(int(m.group(1)), int(m.group(2)) + 1):
                    page_range.add(p)
            else:
                m = re.search(r'(\d+)쪽', other["text"])
                if m:
                    page_range.add(int(m.group(1)))
    return page_range


def _clean_answer(full_ans):
    """정답 텍스트 정리"""
    # "/ 답" 형태에서 최종 답 추출
    slash_match = re.search(r'/\s*(.+)$', full_ans)
    if slash_match:
        final = slash_match.group(1).strip()
        final = re.sub(r'\d점\s*$', '', final).strip()
        if final:
            return final
    full_ans = re.sub(r'^예⃝\s*', '', full_ans)
    full_ans = re.sub(r'\d점\s*$', '', full_ans).strip()
    return full_ans


def _get_positioned_lines(page):
    """PDF 페이지에서 위치 기반 텍스트 라인 추출"""
    blocks = page.get_text("dict")["blocks"]
    positioned_lines = []
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
                    "y2": line["bbox"][3],
                    "text": full,
                })
    return positioned_lines


def _detect_answer_sections(positioned_lines, chapters, col_split=300):
    """답지 페이지에서 섹션 감지. Returns: [(reading_key, section_name, page_range)]"""
    def rk(line):
        return (0 if line["x"] < col_split else 1, line["y"])

    page_sections = []
    step_lines = [l for l in positioned_lines if 'STEP' in l["text"]]
    for step_line in step_lines:
        step_col = 0 if step_line["x"] < col_split else 1
        nearby = [
            l for l in positioned_lines
            if abs(l["y"] - step_line["y"]) < 10
            and (0 if l["x"] < col_split else 1) == step_col
        ]
        nearby_text = ' '.join(l["text"] for l in nearby)

        section_name = None
        if '개념' in nearby_text:
            section_name = "개념 완성하기"
        elif '실력' in nearby_text:
            section_name = "실력 다지기"
        elif '서술형' in nearby_text:
            section_name = "서술형 해결하기"

        if not section_name:
            step_text = step_line["text"].replace(' ', '')
            if 'STEP1' in step_text:
                section_name = "개념 완성하기"
            elif 'STEP2' in step_text:
                section_name = "실력 다지기"
            elif 'STEP3' in step_text:
                section_name = "서술형 해결하기"

        if not section_name:
            continue

        page_range = _extract_page_range(positioned_lines, step_line, col_split)
        if page_range:
            page_sections.append((rk(step_line), section_name, page_range))

    # 단원 평가 fallback
    if not page_sections:
        found = False
        for line in positioned_lines:
            if re.match(r'^\d+\.\s', line["text"]):
                for ch in chapters:
                    if ch in line["text"]:
                        page_range = _extract_page_range(positioned_lines, line, col_split)
                        if page_range:
                            page_sections.append((rk(line), "단원 평가", page_range))
                            found = True
                        break
        if not found:
            for line in positioned_lines:
                if line["y"] < 150:
                    m = re.search(r'(\d+)~(\d+)쪽', line["text"])
                    if m and '매칭북' not in line["text"]:
                        page_range = set(range(int(m.group(1)), int(m.group(2)) + 1))
                        page_sections.append((rk(line), "단원 평가", page_range))
                        break

    page_sections.sort()
    return page_sections


def parse_answer_pdf(filepath, grade_semester):
    """정답 PDF 파싱 (위치 기반, 읽기 순서: 왼쪽→오른쪽 컬럼).
    Returns: {(matching_book_page, qnum): answer_text}
    """
    if not os.path.exists(filepath):
        print(f"  [SKIP] Answer PDF not found: {filepath}")
        return {}

    doc = fitz.open(filepath)
    answer_map = {}
    chapters = CHAPTERS.get(grade_semester, [])

    in_matching = False
    current_chapter = None
    COL_SPLIT = 300

    # 섹션 상태 (페이지 간 유지)
    carry_section = None   # (section_name, page_range_set)

    skip_keywords = {'STEP', '개념', '실력', '서술형', '단원'}

    for pg_idx in range(len(doc)):
        page = doc[pg_idx]
        raw_text = decode(page.get_text())

        if '매칭북' in raw_text:
            in_matching = True
        if not in_matching:
            continue

        for ch in chapters:
            if ch in raw_text:
                current_chapter = ch
                break
        if not current_chapter:
            continue

        positioned_lines = _get_positioned_lines(page)

        def rk(line):
            return (0 if line["x"] < COL_SPLIT else 1, line["y"])

        page_sections = _detect_answer_sections(positioned_lines, chapters, COL_SPLIT)

        # 읽기 순서로 모든 라인 정렬
        ordered_lines = sorted(positioned_lines, key=rk)

        # 컬럼별 라인 (다중행 답 수집용)
        left_lines = sorted([l for l in positioned_lines if l["x"] < COL_SPLIT], key=lambda l: l["y"])
        right_lines = sorted([l for l in positioned_lines if l["x"] >= COL_SPLIT], key=lambda l: l["y"])

        # 현재 섹션 (이전 페이지에서 이월)
        cur_name = carry_section[0] if carry_section else None
        cur_pages = carry_section[1] if carry_section else None
        sec_idx = 0

        for line in ordered_lines:
            line_rk = rk(line)
            text = line["text"]

            # 섹션 헤더 갱신
            while sec_idx < len(page_sections) and page_sections[sec_idx][0] <= line_rk:
                _, cur_name, cur_pages = page_sections[sec_idx]
                sec_idx += 1

            if not cur_name or not cur_pages:
                continue

            # 섹션 헤더/키워드 스킵
            if any(kw in text for kw in skip_keywords):
                continue
            if re.search(r'\d+쪽$', text):
                continue

            # 같은 컬럼의 라인 목록 (다중행 수집용)
            col_lines = left_lines if line["x"] < COL_SPLIT else right_lines

            if cur_name == "개념 완성하기":
                # STEP 1 압축 형식: "N answer N answer ..."
                matches = re.findall(r'(\d)\s+(.+?)(?=\s\d\s|$)', text)
                for qnum_str, ans in matches:
                    qnum = int(qnum_str)
                    ans = ans.strip()
                    if qnum > 0 and ans:
                        for mp in cur_pages:
                            key = (mp, qnum)
                            if key not in answer_map:
                                answer_map[key] = ans
            else:
                # STEP 2/3, 단원 평가: "NN..." 형식
                # 한 줄에 여러 답이 있는 경우 처리: "01 ans1 02 ans2"
                compact = re.findall(r'(\d{2})\s+(.+?)(?=\s\d{2}\s|$)', text)
                if len(compact) >= 2:
                    for qnum_str, ans in compact:
                        qnum = int(qnum_str)
                        ans = ans.strip()
                        if qnum > 0 and ans:
                            for mp in cur_pages:
                                key = (mp, qnum)
                                if key not in answer_map:
                                    answer_map[key] = ans
                    continue

                m = re.match(r'^(\d{2})\s*(.*)', text)
                if not m:
                    continue
                qnum = int(m.group(1))
                ans = m.group(2).strip()
                if qnum <= 0:
                    continue

                # 같은 컬럼 내 다음 문제번호까지 텍스트 수집
                y = line["y"]
                answer_lines = [ans] if ans else []
                for next_line in col_lines:
                    if next_line["y"] <= y:
                        continue
                    nt = next_line["text"]
                    # 다음 문제번호면 중단 (숫자 뒤 공백 or 줄끝만 매칭)
                    if re.match(r'^\d{2}($|\s)', nt):
                        break
                    # STEP 헤더면 중단
                    if any(kw in nt for kw in skip_keywords):
                        break
                    # 채점기준/점수 스킵
                    if '채점' in nt or '기준' in nt:
                        continue
                    if re.match(r'^[❶❷❸❹❺]', nt):
                        continue
                    if re.match(r'^\d점$', nt):
                        continue
                    answer_lines.append(nt.strip())

                full_ans = _clean_answer(' '.join(answer_lines).strip())
                if full_ans:
                    for mp in cur_pages:
                        key = (mp, qnum)
                        if key not in answer_map:
                            answer_map[key] = full_ans

        # 페이지 끝: 마지막 활성 섹션 이월
        if page_sections:
            _, last_name, last_pages = page_sections[-1]
            carry_section = (last_name, last_pages)
        elif cur_name:
            carry_section = (cur_name, cur_pages)

    doc.close()
    return answer_map


def crop_answer_images(filepath, grade_semester, output_dir, book_code):
    """답지 PDF에서 문제별 정답 이미지 크롭.
    Returns: {(matching_book_page, qnum): image_relpath}
    """
    if not os.path.exists(filepath):
        return {}

    doc = fitz.open(filepath)
    chapters = CHAPTERS.get(grade_semester, [])
    answer_img_map = {}

    in_matching = False
    current_chapter = None
    COL_SPLIT = 300
    carry_section = None
    skip_keywords = {'STEP', '개념', '실력', '서술형', '단원'}

    for pg_idx in range(len(doc)):
        page = doc[pg_idx]
        pw, ph = page.rect.width, page.rect.height
        raw_text = decode(page.get_text())

        if '매칭북' in raw_text:
            in_matching = True
        if not in_matching:
            continue

        for ch in chapters:
            if ch in raw_text:
                current_chapter = ch
                break
        if not current_chapter:
            continue

        positioned_lines = _get_positioned_lines(page)

        def rk(line):
            return (0 if line["x"] < COL_SPLIT else 1, line["y"])

        page_sections = _detect_answer_sections(positioned_lines, chapters, COL_SPLIT)
        ordered_lines = sorted(positioned_lines, key=rk)

        cur_name = carry_section[0] if carry_section else None
        cur_pages = carry_section[1] if carry_section else None
        sec_idx = 0

        # 각 문제의 위치 수집: (col, y_start, y2, qnum, page_range, section)
        entries = []

        for line in ordered_lines:
            line_rk = rk(line)
            text = line["text"]

            while sec_idx < len(page_sections) and page_sections[sec_idx][0] <= line_rk:
                _, cur_name, cur_pages = page_sections[sec_idx]
                sec_idx += 1

            if not cur_name or not cur_pages:
                continue
            if any(kw in text for kw in skip_keywords):
                continue
            if re.search(r'\d+쪽$', text):
                continue

            col = 0 if line["x"] < COL_SPLIT else 1
            y2 = line.get("y2", line["y"] + 15)

            if cur_name == "개념 완성하기":
                # 압축 형식: "N answer N answer ..."
                matches = re.findall(r'(\d)\s+(.+?)(?=\s\d\s|$)', text)
                if matches:
                    for qnum_str, _ in matches:
                        qnum = int(qnum_str)
                        if qnum > 0:
                            entries.append((col, line["y"], y2, qnum, cur_pages, cur_name))
                else:
                    # 독립 숫자 (시각적 답변): "N" 단독
                    m = re.match(r'^(\d)\s*$', text)
                    if m:
                        qnum = int(m.group(1))
                        if 0 < qnum <= 8:
                            entries.append((col, line["y"], y2, qnum, cur_pages, cur_name))
            else:
                # "NN..." 형식 — 한 줄에 여러 문제번호 가능 "01 ans 02 ans"
                compact = re.findall(r'(\d{2})\s+(.+?)(?=\s\d{2}\s|$)', text)
                if len(compact) >= 2:
                    for qnum_str, _ in compact:
                        qnum = int(qnum_str)
                        if qnum > 0:
                            entries.append((col, line["y"], y2, qnum, cur_pages, cur_name))
                else:
                    m = re.match(r'^(\d{2})\s', text)
                    if not m:
                        m = re.match(r'^(\d{2})$', text)
                    if m:
                        qnum = int(m.group(1))
                        if qnum > 0:
                            entries.append((col, line["y"], y2, qnum, cur_pages, cur_name))

        # 컬럼별로 크롭
        mat = fitz.Matrix(2.5, 2.5)

        for col_val in [0, 1]:
            col_entries = [(e[1], e[2], e[3], e[4], e[5])
                          for e in entries if e[0] == col_val]
            col_entries.sort(key=lambda x: x[0])

            for i, (y_start, y2, qnum, pages, sec_name) in enumerate(col_entries):
                # y_end: 같은 줄이 아닌 다음 문제의 y (같은 줄 문제들은 공유)
                next_diff_y = ph - 30
                for j in range(i + 1, len(col_entries)):
                    if abs(col_entries[j][0] - y_start) > 3:
                        next_diff_y = col_entries[j][0] - 2
                        break
                y_end = next_diff_y

                x0 = 5 if col_val == 0 else COL_SPLIT + 5
                x1 = COL_SPLIT - 5 if col_val == 0 else pw - 5

                clip = fitz.Rect(x0, max(0, y_start - 3),
                                 x1, min(ph, y_end + 3))
                if clip.height < 5 or clip.width < 10:
                    continue

                pix = page.get_pixmap(matrix=mat, clip=clip)

                first_mp = min(pages)
                fname = f"{book_code}_p{first_mp:02d}_q{qnum:02d}_ans.png"
                fpath = os.path.join(output_dir, fname)
                pix.save(fpath)

                for mp in pages:
                    key = (mp, qnum)
                    if key not in answer_img_map:
                        answer_img_map[key] = f"questions/{fname}"

        if page_sections:
            _, last_name, last_pages = page_sections[-1]
            carry_section = (last_name, last_pages)
        elif cur_name:
            carry_section = (cur_name, cur_pages)

    doc.close()
    return answer_img_map


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

        q_type = SECTION_TYPE.get(current_section, "SHORT_ANSWER")
        for pq in page_questions:
            pq["bookCode"] = book_code
            pq["chapter"] = current_chapter
            pq["section"] = current_section
            pq["difficulty"] = difficulty
            pq["type"] = q_type
            pq["content"] = pq.pop("textContent", "")
            pq["choices"] = None
            pq["sourceTag"] = current_section
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

    # 답지 이미지 크롭
    print(f"Cropping answer images...")
    answer_img_map = crop_answer_images(answer_pdf, grade_semester, output_dir, book_code)
    img_matched = 0
    for q in all_questions:
        key = (q["pageNum"], q["questionNum"])
        if key in answer_img_map:
            q["answerImage"] = answer_img_map[key]
            img_matched += 1
    print(f"  Answer images: {img_matched}/{len(all_questions)}")

    return all_questions


ALL_GRADES = ["3-1", "3-2", "4-1", "4-2", "5-1", "5-2", "6-1", "6-2"]


def main():
    DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
    OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'questions')

    # CLI 인자: 특정 학년만 처리 (없으면 전체)
    targets = sys.argv[1:] if len(sys.argv) > 1 else ALL_GRADES
    for gs in targets:
        if gs not in CHAPTERS:
            print(f"[SKIP] Unknown grade-semester: {gs}")
            continue

        matching_pdf = os.path.join(DATA_DIR, f"큐브수학 실력/{gs} 큐브실력/큐브수학 실력 {gs}_매칭북.pdf")
        answer_pdf = os.path.join(DATA_DIR, f"큐브수학 실력/{gs} 큐브실력/큐브수학실력{gs}정답(01~64).pdf")

        if not os.path.exists(matching_pdf):
            print(f"[SKIP] Not found: {matching_pdf}")
            continue

        questions = extract_book(matching_pdf, answer_pdf, gs, OUTPUT_DIR)

        # JSON 저장
        json_path = os.path.join(DATA_DIR, f"questions-실력-{gs}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(questions, f, ensure_ascii=False, indent=2)

        # 통계
        by_ch = {}
        for q in questions:
            by_ch[q["chapter"]] = by_ch.get(q["chapter"], 0) + 1

        with_answer = sum(1 for q in questions if q["answer"])

        print(f"\n{'='*60}")
        print(f"큐브수학 실력 {gs}: {len(questions)} questions, {with_answer} with answers")
        print(f"  JSON: {json_path}")
        for ch, cnt in by_ch.items():
            print(f"  {ch}: {cnt}")
        print()


if __name__ == "__main__":
    main()
