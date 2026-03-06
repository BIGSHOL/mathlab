"""
MathLab Elementary Question Bank PDF Parser
큐브수학(개념/개념응용/실력) 초등 3~6학년 PDF에서 문제를 추출하고,
정답/매칭북에서 해설/정답을 매칭하여 JSON으로 출력한다.

Usage:
  python scripts/parse-elementary-pdf.py

Output:
  data/questions-elementary.json
"""

import fitz
import json
import re
import os
import glob

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
OUTPUT_FILE = os.path.join(DATA_DIR, 'questions-elementary.json')

# ===== 초등 단원 목록 (학년-학기별) =====
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

# 시리즈별 섹션 → 난이도 매핑
SECTION_DIFFICULTY_MAP = {
    # 큐브수학 개념
    "교과서 개념 잡기": "BASIC",
    "개념 한 번 더 잡기": "BASIC",
    "수학 익힘 문제 잡기": "MEDIUM",
    "기초력 학습지": "BASIC",
    "서술형 잡기": "HIGH",
    "단원 마무리": "MEDIUM",
    # 큐브수학 개념응용
    "개념 꽉": "BASIC",
    "문제 콕": "MEDIUM",
    "응용 쑥": "HIGH",
    # 큐브수학 실력
    "STEP 1": "BASIC",
    "개념 완성하기": "BASIC",
    "STEP 2": "MEDIUM",
    "실력 다지기": "MEDIUM",
    "STEP 3": "HIGH",
    "서술형 해결하기": "HIGH",
    # 공통
    "서술형": "HIGH",
    "학업 성취도 평가": "HIGHEST",
}

SECTION_KEYWORDS = [
    ("학업 성취도 평가", "학업 성취도"),
    ("서술형 해결하기", "서술형 해결하기"),
    ("서술형 잡기", "서술형 잡기"),
    ("STEP 3", "STEP 3"),
    ("STEP 2", "STEP 2"),
    ("STEP 1", "STEP 1"),
    ("실력 다지기", "실력 다지기"),
    ("개념 완성하기", "개념 완성하기"),
    ("응용 쑥", "응용 쑥"),
    ("문제 콕", "문제 콕"),
    ("개념 꽉", "개념 꽉"),
    ("단원 마무리", "단원 마무리"),
    ("수학 익힘 문제 잡기", "익힘 문제"),
    ("개념 한 번 더 잡기", "한 번 더"),
    ("기초력 학습지", "기초력"),
    ("교과서 개념 잡기", "개념 잡기"),
]


def detect_chapter(text, grade_semester):
    """텍스트에서 현재 단원 감지"""
    chapters = CHAPTERS.get(grade_semester, [])
    for ch in chapters:
        if ch in text:
            return ch
    return None


def detect_section(text):
    """섹션 유형 감지"""
    for section_name, keyword in SECTION_KEYWORDS:
        if keyword in text:
            diff = SECTION_DIFFICULTY_MAP.get(section_name, "MEDIUM")
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


def clean_text(text):
    """제어문자 제거 및 텍스트 정리"""
    # 제어문자 제거 (탭/개행 제외)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    # 페이지 하단 푸터 제거 (페이지번호 + 교재명)
    text = re.sub(r'\n\d{3}\n수학\s+\d[－-]\d\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'\n\d{3}\s*$', '', text, flags=re.MULTILINE)
    # 사이드바 네비게이션 텍스트 제거
    text = re.sub(r'유형\s*S\s*T\s*E\s*P\s*실력\s*다지기\s*확인\s*유형\s*강화', '', text)
    text = re.sub(r'개념\s*익히기\s*유형\s*익히기\s*실력\s*키우기', '', text)
    text = re.sub(r'확인\s*유형\s*강화\s*\(\s*\)', '', text)
    # 단원 번호 + 이름 사이드바: "1. 덧셈과 뺄셈", "단원3" 등
    text = re.sub(r'단원\d\s*$', '', text, flags=re.MULTILINE)
    # 쪽수 참조 제거
    text = re.sub(r'\d{3}~\d{3}쪽', '', text)
    text = re.sub(r'\d{2,3}쪽', '', text)
    return text


def is_valid_question(content):
    """추출된 내용이 실제 문제인지 검증"""
    if not content or len(content) < 12:
        return False

    # 숫자만으로 구성된 것
    if re.match(r'^[\d\s\.\,]+$', content.strip()):
        return False

    # 페이지/날짜 코드
    if re.match(r'^\d{3,6}$', content.strip().split('\n')[0]):
        return False

    # 목차/학습계획 (월 일, 쪽, 개념 잡기 패턴)
    if re.search(r'월\s*일\s*\n.*쪽', content[:80]):
        return False

    # 정답/매칭북 참조만
    if re.match(r'^정답\s+\d+쪽|^매칭북\s+\d+쪽', content.strip()):
        return False

    # 개념 설명 키워드가 dominant
    junk_kw = ['예제', '예⃝', 'KEY', '외우자', '학습 계획표',
               '개념 한 번 더 잡기\n월', '교과서 개념 잡기\n월',
               '수학 익힘 문제 잡기\n월', '서술형 잡기\n월',
               '유형 STEP', 'STEP 실력', '확인 유형 강화']
    if any(kw in content[:80] for kw in junk_kw):
        return False

    # @ 기호가 과도하게 많은 경우 (이미지 placeholder)
    at_count = content.count('@')
    if at_count >= 3 and at_count > len(content) / 20:
        return False

    # 내용이 대부분 @와 공백/줄바꿈
    cleaned = re.sub(r'[@\s\n⑴⑵⑶]', '', content)
    if len(cleaned) < 8:
        return False

    # 문제다운 패턴이 있는지 (초등)
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
    ]
    has_pattern = any(re.search(p, content) for p in question_patterns)
    if not has_pattern and len(content) < 40:
        return False

    return True


def extract_questions_from_page(text, page_num, book_code, series, chapter, section, difficulty):
    """한 페이지에서 문제 추출"""
    questions = []

    text = clean_text(text)

    # 초등 문제 패턴: "01 ", "02 " 또는 "1 ", "2 "
    pattern = r'(?:^|\n)\s*(0[1-9]|[1-9][0-9]?)\s{1,4}((?:(?!(?:^|\n)\s*(?:0[1-9]|[1-9][0-9]?)\s{1,4}).)+)'
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

        # 내용 검증
        if not is_valid_question(q_content):
            continue

        q_type = detect_question_type(q_content)
        choices = None
        if q_type == "MULTIPLE_CHOICE":
            choices = extract_choices(q_content)

        questions.append({
            "bookCode": f"E{book_code}",  # E prefix for elementary
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
            "sourceTag": f"{series} 초{book_code} #{q_num:02d}",
        })

    return questions


def parse_textbook(filepath, book_code, series):
    """교과서 PDF에서 문제 추출"""
    if not os.path.exists(filepath):
        print(f"  [SKIP] {filepath}")
        return []

    doc = fitz.open(filepath)
    questions = []
    current_chapter = None
    current_section = None
    current_difficulty = "MEDIUM"

    for page_num in range(4, len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if not text or not text.strip():
            continue

        detected_ch = detect_chapter(text, book_code)
        if detected_ch:
            current_chapter = detected_ch

        detected_sec, detected_diff = detect_section(text)
        if detected_sec:
            current_section = detected_sec
            current_difficulty = detected_diff

        if not current_chapter:
            continue

        page_questions = extract_questions_from_page(
            text, page_num, book_code, series,
            current_chapter, current_section, current_difficulty
        )
        questions.extend(page_questions)

    doc.close()
    return questions


def parse_answer_pdf(filepath, book_code):
    """정답 PDF에서 (chapter, section, questionNum) 3중 키로 답안 추출"""
    if not os.path.exists(filepath):
        return {}

    doc = fitz.open(filepath)
    answer_map = {}
    current_chapter = None
    current_section = None

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()
        if not text:
            continue

        detected_ch = detect_chapter(text, book_code)
        if detected_ch:
            current_chapter = detected_ch

        detected_sec, _ = detect_section(text)
        if detected_sec:
            current_section = detected_sec

        if not current_chapter:
            continue

        pattern = r'(?:^|\n)\s*(0[1-9]|[1-9][0-9]?)\s+((?:(?!(?:^|\n)\s*(?:0[1-9]|[1-9][0-9]?)\s).)+)'
        matches = re.finditer(pattern, text, re.DOTALL)

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
    return answer_map


def match_answers(questions, answer_map):
    """문제에 정답 매칭 (3중 키 → 폴백)"""
    matched = 0
    for q in questions:
        # 1차: (chapter, section, questionNum) 정확 매칭
        key3 = (q["chapter"], q["section"] or "", q["questionNum"])
        if key3 in answer_map:
            _apply_answer(q, answer_map[key3])
            if q["answer"]:
                matched += 1
            continue

        # 2차: section 없이 폴백
        key_nosec = (q["chapter"], "", q["questionNum"])
        if key_nosec in answer_map:
            _apply_answer(q, answer_map[key_nosec])
            if q["answer"]:
                matched += 1
            continue

        # 3차: 같은 chapter+questionNum 중 아무 section
        for (ch, sec, num), ans in answer_map.items():
            if ch == q["chapter"] and num == q["questionNum"]:
                _apply_answer(q, ans)
                if q["answer"]:
                    matched += 1
                break

    return matched


def _apply_answer(q, answer_text):
    """정답 텍스트를 파싱하여 문제에 적용"""
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


def main():
    all_questions = []
    grade_semesters = ["3-1", "3-2", "4-1", "4-2", "5-1", "5-2", "6-1", "6-2"]

    # === 1. 큐브수학 개념 ===
    print("\n" + "="*60)
    print("큐브수학 개념 시리즈")
    print("="*60)
    for gs in grade_semesters:
        textbook = os.path.join(DATA_DIR, f"큐브수학 개념/진도북/큐브수학 개념 {gs}_진도북.pdf")
        answer = os.path.join(DATA_DIR, f"큐브수학 개념/매칭북/큐브수학 개념 {gs}_매칭북.pdf")

        print(f"\n  개념 {gs}:")
        questions = parse_textbook(textbook, gs, "큐브수학 개념")
        print(f"    Extracted: {len(questions)} questions")

        answer_map = parse_answer_pdf(answer, gs)
        matched = match_answers(questions, answer_map)
        print(f"    Matched: {matched}/{len(questions)} answers")

        all_questions.extend(questions)

    # === 2. 큐브수학 개념응용 ===
    print("\n" + "="*60)
    print("큐브수학 개념응용 시리즈")
    print("="*60)
    for gs in grade_semesters:
        textbook = os.path.join(DATA_DIR, f"큐브수학 개념응용/진도북/큐브수학 개념응용 {gs} 진도북.pdf")
        answer = os.path.join(DATA_DIR, f"큐브수학 개념응용/응용강화북/큐브수학 개념응용 {gs} 응용강화북.pdf")

        print(f"\n  개념응용 {gs}:")
        questions = parse_textbook(textbook, gs, "큐브수학 개념응용")
        print(f"    Extracted: {len(questions)} questions")

        answer_map = parse_answer_pdf(answer, gs)
        matched = match_answers(questions, answer_map)
        print(f"    Matched: {matched}/{len(questions)} answers")

        all_questions.extend(questions)

    # === 3. 큐브수학 실력 ===
    print("\n" + "="*60)
    print("큐브수학 실력 시리즈")
    print("="*60)
    for gs in grade_semesters:
        folder = os.path.join(DATA_DIR, f"큐브수학 실력/{gs} 큐브실력")
        textbook = os.path.join(folder, f"큐브수학 실력 {gs}_진도북.pdf")
        answer_pdf = os.path.join(folder, f"큐브수학실력{gs.replace('-', '')}정답(01~64).pdf")  # e.g., 큐브수학실력31정답
        matching = os.path.join(folder, f"큐브수학 실력 {gs}_매칭북.pdf")

        print(f"\n  실력 {gs}:")
        questions = parse_textbook(textbook, gs, "큐브수학 실력")
        print(f"    Extracted: {len(questions)} questions")

        # Try answer PDF first, then matching book
        answer_map = {}
        if os.path.exists(answer_pdf):
            answer_map = parse_answer_pdf(answer_pdf, gs)
        elif os.path.exists(matching):
            answer_map = parse_answer_pdf(matching, gs)

        matched = match_answers(questions, answer_map)
        print(f"    Matched: {matched}/{len(questions)} answers")

        all_questions.extend(questions)

    # 중복 제거
    all_questions = deduplicate(all_questions)

    print(f"\n{'='*60}")
    print(f"Total unique elementary questions: {len(all_questions)}")

    # 통계
    by_book = {}
    for q in all_questions:
        by_book[q["bookCode"]] = by_book.get(q["bookCode"], 0) + 1
    print("\nBy grade-semester:")
    for code in sorted(by_book.keys()):
        print(f"  초{code[1:]}: {by_book[code]} questions")

    by_diff = {}
    for q in all_questions:
        by_diff[q["difficulty"]] = by_diff.get(q["difficulty"], 0) + 1
    print(f"\nDifficulty: {by_diff}")

    by_type = {}
    for q in all_questions:
        by_type[q["type"]] = by_type.get(q["type"], 0) + 1
    print(f"Type: {by_type}")

    # JSON 출력
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(all_questions, f, ensure_ascii=False, indent=2)

    print(f"\nWritten to {OUTPUT_FILE}")
    print("Done!")


if __name__ == "__main__":
    main()
