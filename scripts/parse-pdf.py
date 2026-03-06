"""
MathLab Question Bank PDF Parser
개념원리 중학수학 교사용 PDF에서 문제를 추출하고,
정답 PDF에서 해설/정답을 매칭하여 JSON으로 출력한다.

Usage:
  pip install pymupdf
  python scripts/parse-pdf.py

Output:
  data/questions.json
"""

import fitz  # pymupdf
import json
import re
import os
import sys

# -- Configuration --
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'questions.json')

BOOKS = [
    {"code": "1-1", "textbook": "개념원리 중학 1-1 교사용.pdf", "answers": "개념원리 중학 1-1 정답.pdf"},
    {"code": "1-2", "textbook": "개념원리 중학 1-2 교사용.pdf", "answers": "개념원리 중학 1-2 정답.pdf"},
    {"code": "2-1", "textbook": "개념원리 중학 2-1 교사용.pdf", "answers": "개념원리 중학 2-1 정답.pdf"},
    {"code": "2-2", "textbook": "개념원리 중학 2-2 교사용.pdf", "answers": "개념원리 중학 2-2 정답.pdf"},
    {"code": "3-1", "textbook": "개념원리 중학 3-1 교사용.pdf", "answers": "개념원리 중학 3-1 정답.pdf"},
    {"code": "3-2", "textbook": "개념원리 중학 3-2 교사용.pdf", "answers": "개념원리 중학 3-2 정답.pdf"},
]

# 각 교재의 단원 목록 (정확한 순서)
CHAPTERS = {
    "1-1": [
        "소인수분해", "최대공약수와 최소공배수",
        "정수와 유리수", "정수와 유리수의 계산",
        "문자의 사용과 식의 계산", "일차방정식",
        "좌표와 그래프", "정비례와 반비례",
    ],
    "1-2": [
        "기본 도형", "위치 관계", "작도와 합동",
        "다각형", "원과 부채꼴",
        "다면체와 회전체", "입체도형의 겉넓이와 부피",
        "대푯값", "도수분포표와 상대도수",
    ],
    "2-1": [
        "유리수와 순환소수",
        "단항식의 계산", "다항식의 계산",
        "일차부등식", "일차부등식의 활용",
        "연립일차방정식", "연립일차방정식의 활용",
        "일차함수",
    ],
    "2-2": [
        "삼각형의 성질", "삼각형의 외심과 내심",
        "평행사변형", "여러 가지 사각형",
        "피타고라스 정리", "도형의 닮음",
        "경우의 수", "확률",
    ],
    "3-1": [
        "제곱근과 실수", "근호를 포함한 식의 계산",
        "다항식의 곱셈", "다항식의 인수분해",
        "이차방정식의 풀이", "이차방정식의 활용",
        "이차함수의 그래프",
    ],
    "3-2": [
        "삼각비", "삼각비의 활용",
        "원과 직선", "원주각",
        "산포도", "상자그림과 산점도",
    ],
}

# 섹션 → 난이도 매핑
SECTION_DIFFICULTY = {
    "개념원리 확인하기": "BASIC",
    "핵심문제 익히기": "MEDIUM",
    "계산력 강화하기": "BASIC",
    "이런 문제가 시험에 나온다": "HIGH",
    "STEP 1": "BASIC",
    "STEP 2": "MEDIUM",
    "STEP 3": "HIGH",
    "서술형 대비 문제": "HIGHEST",
    "서술하기": "HIGHEST",
}

# 문제가 아닌 것으로 판정하는 키워드 (content 첫 50자 이내)
JUNK_KEYWORDS = [
    '개념원리 이해', '개념원리\n이해', 'KEY POINT', 'Plus 강의', 'Plus\n강의',
    '참고\u200c', '보충 학습', '이 단원의 내용', '이 단원에서는',
    '이전에 배운', '이후에 배울', '단원의 내용',
    '개념원리\n확인하기', '핵심문제\n익히기', '계산력\n강화하기',
    '중단원\n마무리하기', '대단원\n마무리하기',
]

# 페이지 하단에 나오는 패턴 (페이지번호 + 단원명 + 날짜코드)
PAGE_FOOTER_PATTERN = re.compile(
    r'\n\d{1,3}\n[ⅠⅡⅢⅣⅤⅥIViv]+[\.\s][^\n]+\n\d{6}\s*$'
    r'|\n\d{1,3}\n\d{6}\s*$'
    r'|\n\d{6}\s*$',
    re.MULTILINE
)


def clean_page_text(text):
    """페이지 텍스트 전처리: 푸터 제거, running header 제거"""
    # 페이지 하단 푸터 제거 (페이지번호 + 단원명 + 날짜코드 191226 등)
    text = PAGE_FOOTER_PATTERN.sub('', text)
    # Running header 제거: "Ⅰ. 소인수분해15" 등 (로마숫자 + 점 + 단원명 + 페이지번호)
    text = re.sub(r'[ⅠⅡⅢⅣⅤⅥIViv]+[\.\s]+[^\n]{2,20}\d{1,3}\s*\n', '\n', text)
    return text


def detect_chapter(text, book_code):
    """텍스트에서 현재 단원을 감지 (긴 이름 우선 매칭)"""
    chapters = CHAPTERS.get(book_code, [])
    cleaned = clean_page_text(text)
    # 긴 이름부터 매칭 (substring collision 방지)
    sorted_chapters = sorted(chapters, key=len, reverse=True)
    for ch in sorted_chapters:
        if ch in cleaned:
            return ch
    return None


def detect_section(text):
    """텍스트에서 섹션 유형을 감지하고 (섹션명, 난이도) 반환"""
    # STEP 감지: PDF에서 "STEP\n기본 문제\n1" 같은 multi-line 형태로 나옴
    if re.search(r'STEP\s*3|STEP\s+실력', text):
        return "STEP 3", SECTION_DIFFICULTY["STEP 3"]
    if re.search(r'STEP\s+발전\s*문제\s*\n?\s*2', text):
        return "STEP 2", SECTION_DIFFICULTY["STEP 2"]
    if re.search(r'STEP\s+기본\s*문제\s*\n?\s*1', text):
        return "STEP 1", SECTION_DIFFICULTY["STEP 1"]

    # 나머지 섹션 키워드
    section_checks = [
        ("서술형 대비 문제", "서술형 대비 문제"),
        ("서술하기", "서술하기"),
        ("이런 문제가 시험에 나온다", "시험에 나온다"),
        ("계산력 강화하기", "계산력 강화"),
        ("핵심문제 익히기", "핵심문제"),
        ("개념원리 확인하기", "확인하기"),
    ]
    for section_name, keyword in section_checks:
        if keyword in text:
            return section_name, SECTION_DIFFICULTY[section_name]
    return None, None


def is_question_page(text):
    """이 페이지가 문제를 포함하는 페이지인지 판별"""
    question_section_markers = [
        '확인하기', '핵심문제', '계산력 강화', 'STEP',
        '시험에 나온다', '서술형 대비', '서술하기',
        '마무리하기', '중단원', '대단원',
        '정답 및 풀이',  # 문제 페이지 상단에 자주 나타남
    ]
    return any(marker in text for marker in question_section_markers)


def is_concept_page(text):
    """이 페이지가 개념 설명 전용 페이지인지 판별"""
    concept_markers = ['개념원리\n이해', '개념원리 이해', '개념원리 \n이해']
    has_concept = any(m in text for m in concept_markers)
    has_questions = bool(re.search(r'확인하기|핵심문제|STEP|서술하기|계산력', text))
    # 개념 페이지이면서 문제 섹션이 없으면 개념 전용
    return has_concept and not has_questions


def detect_question_type(content):
    """문제 유형 자동 분류"""
    if re.search(r'[①②③④⑤]', content):
        return "MULTIPLE_CHOICE"
    if any(kw in content for kw in ['풀이 과정', '과정을 서술', '서술하시오', '구하는 과정']):
        return "ESSAY"
    return "SHORT_ANSWER"


def extract_choices(content):
    """객관식 선택지 추출"""
    choices = re.findall(r'([①②③④⑤][^①②③④⑤\n]*)', content)
    if len(choices) >= 2:
        return [c.strip() for c in choices]
    return None


def clean_content(text):
    """문제 내용 정리"""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]+', ' ', text)
    text = text.strip()
    return text


def is_valid_question(content):
    """추출된 내용이 실제 문제인지 검증"""
    if not content or len(content) < 15:
        return False

    # 페이지번호나 섹션 헤더가 주 내용인 경우
    lines = content.strip().split('\n')
    first_line = lines[0].strip()

    # 첫 줄이 숫자만으로 구성 (페이지번호)
    if re.match(r'^\d{1,3}$', first_line):
        return False

    # 날짜코드 (191226 등)
    if re.match(r'^\d{6}$', first_line):
        return False

    # 전체가 숫자 나열인 경우 (2 3 4 5 6 7 8 9 10)
    if re.match(r'^[\d\s]+$', content.strip()):
        return False

    # 개념 설명 블록 체크 (앞쪽 80자 내)
    check_area = content[:80]
    for kw in JUNK_KEYWORDS:
        if kw in check_area:
            return False

    # "Plus 강의" 등 개념 키워드가 전체 내용에서 dominant
    concept_kw_count = sum(1 for kw in ['Plus', '강의', '참고', '예\u200c', '주의\u200c', '약속이다']
                          if kw in content)
    if concept_kw_count >= 2:
        return False

    # 문제다운 내용이 있는지: 지시문 패턴, 물음표, 선택지 등
    question_patterns = [
        r'구하시오|구하여라|구해 보자|구하세요',
        r'나타내시오|나타내어라|나타내세요',
        r'풀어라|풀이하시오|풀이하여라|풀어 보자',
        r'쓰시오|써넣으시오|쓰세요|써 보자',
        r'것은\?|것은\s*\?|무엇인가|얼마인가',
        r'옳은 것|옳지 않은|바르게|잘못',
        r'설명하시오|설명하여라|서술하시오',
        r'계산하시오|계산하여라|간단히 하',
        r'값은|값을|값이',
        r'[①②③④⑤]',  # 객관식 선택지
        r'⑴|⑵|⑶',  # 소문항
        r'\?\s*$',  # 물음표로 끝남
        r'다음.*중|다음을|다음 식|다음 그림|다음 표',
    ]
    has_question_pattern = any(re.search(p, content) for p in question_patterns)

    if not has_question_pattern and len(content) < 50:
        return False

    return True


def extract_questions_from_page(text, page_num, book_code, current_chapter, current_section, current_difficulty):
    """한 페이지에서 개별 문제 추출"""
    questions = []

    # 텍스트 전처리
    text = clean_page_text(text)

    # 문제 번호 패턴: "01 ", "02 ", ... (줄 시작 + 2자리 숫자 + 공백)
    pattern = r'(?:^|\n)\s*(0[1-9]|[1-9][0-9]?)\s{1,4}((?:(?!(?:^|\n)\s*(?:0[1-9]|[1-9][0-9]?)\s{1,4}).)+)'
    matches = re.finditer(pattern, text, re.DOTALL)

    for m in matches:
        q_num_str = m.group(1)
        q_content = m.group(2).strip()

        try:
            q_num = int(q_num_str)
        except ValueError:
            continue

        q_type = detect_question_type(q_content)
        choices = None

        if q_type == "MULTIPLE_CHOICE":
            choices = extract_choices(q_content)
            if choices:
                # 선택지 이전 부분을 본문으로
                first_choice_pos = q_content.find(choices[0])
                if first_choice_pos > 0:
                    q_content = clean_content(q_content[:first_choice_pos])
                else:
                    q_content = clean_content(q_content)
            else:
                q_content = clean_content(q_content)
        else:
            q_content = clean_content(q_content)

        # 내용 검증
        if not is_valid_question(q_content):
            continue

        questions.append({
            "bookCode": book_code,
            "chapter": current_chapter,
            "section": current_section,
            "questionNum": q_num,
            "pageNum": page_num + 1,
            "difficulty": current_difficulty,
            "type": q_type,
            "content": q_content,
            "choices": choices,
            "answer": "",
            "explanation": None,
            "sourceTag": current_section,
        })

    return questions


def extract_essay_questions(text, page_num, book_code, current_chapter):
    """서술형 페이지에서 '유제' 형식 문제 추출"""
    questions = []
    # "유제" 블록 찾기
    pattern = r'유제\s*\n?\s*(.*?)(?=유제\s*\n|$)'
    matches = re.finditer(pattern, text, re.DOTALL)

    for i, m in enumerate(matches):
        content = m.group(1).strip()
        # 풀이와 답 분리
        answer = ""
        explanation = None

        answer_match = re.search(r'답\s*\n?\s*(.+?)(?:\n|$)', content)
        if answer_match:
            answer = answer_match.group(1).strip()

        solution_match = re.search(r'풀이 과정\s*\n(.*?)(?=\n답\s|\n유제|$)', content, re.DOTALL)
        if solution_match:
            explanation = solution_match.group(1).strip()

        # 문제 본문 추출 (풀이 전까지)
        q_content = re.split(r'\n풀이 과정|\n풀이\s', content)[0].strip()

        if not q_content or len(q_content) < 15:
            continue

        # 점수 추출
        score_match = re.search(r'\[(\d+)점\]', q_content)

        questions.append({
            "bookCode": book_code,
            "chapter": current_chapter,
            "section": "서술하기",
            "questionNum": i + 1,
            "pageNum": page_num + 1,
            "difficulty": "HIGHEST",
            "type": "ESSAY",
            "content": q_content,
            "choices": None,
            "answer": answer,
            "explanation": explanation,
            "sourceTag": "서술하기",
        })

    return questions


def parse_textbook(book_config):
    """교사용 PDF에서 문제 추출"""
    textbook_path = os.path.join(DATA_DIR, book_config["textbook"])
    if not os.path.exists(textbook_path):
        print(f"  [SKIP] File not found: {textbook_path}")
        return []

    doc = fitz.open(textbook_path)
    questions = []
    current_chapter = None
    current_section = None
    current_difficulty = "MEDIUM"

    for page_num in range(6, len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if not text or not text.strip():
            continue

        # 단원 감지
        detected_ch = detect_chapter(text, book_config["code"])
        if detected_ch:
            current_chapter = detected_ch

        # 섹션 감지
        detected_section, detected_diff = detect_section(text)
        if detected_section:
            current_section = detected_section
            current_difficulty = detected_diff

        if not current_chapter:
            continue

        # 개념 전용 페이지는 스킵
        if is_concept_page(text):
            continue

        # 문제 페이지가 아니면 스킵 (섹션이 설정되어 있어도 개념 페이지일 수 있음)
        if not is_question_page(text) and not current_section:
            continue

        # 서술하기 페이지는 별도 처리
        if current_section == "서술하기" and '유제' in text:
            essay_qs = extract_essay_questions(text, page_num, book_config["code"], current_chapter)
            questions.extend(essay_qs)
            continue

        # 일반 문제 추출
        page_questions = extract_questions_from_page(
            text, page_num, book_config["code"],
            current_chapter, current_section, current_difficulty
        )
        questions.extend(page_questions)

    doc.close()
    return questions


def parse_answer_pdf(book_config):
    """정답 PDF에서 (chapter, section, questionNum) 3중 키로 해설/정답 추출"""
    answer_path = os.path.join(DATA_DIR, book_config["answers"])
    if not os.path.exists(answer_path):
        print(f"  [SKIP] Answer file not found: {answer_path}")
        return {}

    doc = fitz.open(answer_path)
    answer_map = {}
    current_chapter = None
    current_section = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if not text or not text.strip():
            continue

        detected_ch = detect_chapter(text, book_config["code"])
        if detected_ch:
            current_chapter = detected_ch

        detected_sec, _ = detect_section(text)
        if detected_sec:
            current_section = detected_sec

        if not current_chapter:
            continue

        # 정답 항목 추출
        pattern = r'(?:^|\n)\s*(0[1-9]|[1-9][0-9]?)\s+((?:(?!(?:^|\n)\s*(?:0[1-9]|[1-9][0-9]?)\s).)+)'
        matches = re.finditer(pattern, text, re.DOTALL)

        for m in matches:
            try:
                q_num = int(m.group(1))
                answer_text = m.group(2).strip()
            except (ValueError, IndexError):
                continue

            if answer_text and len(answer_text) >= 1:
                key3 = (current_chapter, current_section or "", q_num)
                if key3 not in answer_map or len(answer_text) > len(answer_map[key3]):
                    answer_map[key3] = answer_text

    doc.close()
    return answer_map


def apply_answer(q, answer_text):
    """정답 텍스트를 파싱하여 문제에 적용"""
    answer_match = re.search(r'답\s+(.+?)(?:\n|$)', answer_text)
    if answer_match:
        q["answer"] = answer_match.group(1).strip()
        remaining = answer_text[answer_match.end():].strip()
        if remaining and len(remaining) > 5:
            q["explanation"] = remaining
    else:
        lines = answer_text.split('\n')
        q["answer"] = lines[0].strip()
        if len(lines) > 1:
            q["explanation"] = '\n'.join(lines[1:]).strip()


def match_answers(questions, answer_map):
    """문제에 정답/해설 매칭 (3중 키 → 폴백)"""
    matched = 0
    for q in questions:
        if q["answer"]:  # 이미 답이 있으면 (서술형 등)
            matched += 1
            continue

        # 1차: (chapter, section, questionNum) 정확 매칭
        key3 = (q["chapter"], q["section"] or "", q["questionNum"])
        if key3 in answer_map:
            apply_answer(q, answer_map[key3])
            if q["answer"]:
                matched += 1
            continue

        # 2차: section 없이 폴백
        key_nosec = (q["chapter"], "", q["questionNum"])
        if key_nosec in answer_map:
            apply_answer(q, answer_map[key_nosec])
            if q["answer"]:
                matched += 1
            continue

        # 3차: 같은 chapter+questionNum 중 아무 section
        for (ch, sec, num), ans in answer_map.items():
            if ch == q["chapter"] and num == q["questionNum"]:
                apply_answer(q, ans)
                if q["answer"]:
                    matched += 1
                break

    return matched


def deduplicate_questions(questions):
    """중복 문제 제거"""
    seen = set()
    unique = []
    for q in questions:
        key = (q["bookCode"], q["chapter"], q["questionNum"], q["section"] or "")
        if key not in seen:
            seen.add(key)
            unique.append(q)
    return unique


def main():
    all_questions = []

    for book in BOOKS:
        print(f"\n{'='*60}")
        print(f"Processing: {book['textbook']}")
        print(f"{'='*60}")

        questions = parse_textbook(book)
        print(f"  Extracted: {len(questions)} questions")

        print(f"  Parsing answers: {book['answers']}")
        answer_map = parse_answer_pdf(book)
        print(f"  Answer entries: {len(answer_map)}")

        matched = match_answers(questions, answer_map)
        print(f"  Matched answers: {matched}/{len(questions)}")

        chapters_found = set(q["chapter"] for q in questions)
        print(f"  Chapters found: {', '.join(sorted(chapters_found))}")

        by_diff = {}
        for q in questions:
            by_diff[q["difficulty"]] = by_diff.get(q["difficulty"], 0) + 1
        print(f"  By difficulty: {by_diff}")

        by_type = {}
        for q in questions:
            by_type[q["type"]] = by_type.get(q["type"], 0) + 1
        print(f"  By type: {by_type}")

        by_section = {}
        for q in questions:
            s = q["section"] or "NONE"
            by_section[s] = by_section.get(s, 0) + 1
        print(f"  By section: {by_section}")

        all_questions.extend(questions)

    all_questions = deduplicate_questions(all_questions)
    print(f"\n{'='*60}")
    print(f"Total unique questions: {len(all_questions)}")

    with_answers = [q for q in all_questions if q["answer"]]
    print(f"Questions with answers: {len(with_answers)}")
    print(f"Questions without answers: {len(all_questions) - len(with_answers)}")

    print(f"\n--- Final Statistics ---")
    by_book = {}
    for q in all_questions:
        by_book[q["bookCode"]] = by_book.get(q["bookCode"], 0) + 1
    for code in sorted(by_book.keys()):
        print(f"  중{code}: {by_book[code]} questions")

    by_diff_total = {}
    for q in all_questions:
        d = q["difficulty"]
        by_diff_total[d] = by_diff_total.get(d, 0) + 1
    print(f"\n  Difficulty distribution:")
    for d in ["BASIC", "MEDIUM", "HIGH", "HIGHEST"]:
        print(f"    {d}: {by_diff_total.get(d, 0)}")

    by_type_total = {}
    for q in all_questions:
        t = q["type"]
        by_type_total[t] = by_type_total.get(t, 0) + 1
    print(f"\n  Type distribution:")
    for t in ["MULTIPLE_CHOICE", "SHORT_ANSWER", "ESSAY"]:
        print(f"    {t}: {by_type_total.get(t, 0)}")

    by_section_total = {}
    for q in all_questions:
        s = q["section"] or "NONE"
        by_section_total[s] = by_section_total.get(s, 0) + 1
    print(f"\n  Section distribution:")
    for s, cnt in sorted(by_section_total.items(), key=lambda x: -x[1]):
        print(f"    {s}: {cnt}")

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\nWritten to {OUTPUT_FILE}")
    print("Done!")


if __name__ == "__main__":
    main()
