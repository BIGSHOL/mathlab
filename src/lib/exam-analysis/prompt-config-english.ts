// 영어 과목 프롬프트 설정 - Python prompt_config_english.py에서 1:1 이식

// ============================================================
// 영어 토픽 분류표 (학년별 분리)
// ============================================================

export const ENGLISH_TOPICS: Record<string, Record<string, string[]>> = {
  "중1": {
    "문법": [
      "be동사 (am, is, are)",
      "일반동사 (현재시제, 과거시제)",
      "There is/are",
      "의문사 (What, Who, When, Where, Why, How)",
      "명령문, 감탄문",
      "형용사, 부사",
      "전치사 (in, on, at, for, to)",
    ],
    "어휘": [
      "기초 어휘 500단어 (가족, 학교, 음식, 날씨, 취미, 시간, 요일)",
    ],
    "독해": [
      "짧은 대화문 (3-5문장)",
      "간단한 안내문 (광고, 일정표)",
      "일기, 편지",
      "주제/요지 파악 (명시적)",
    ],
    "듣기": [
      "기초 대화 듣기 (인사, 소개)",
      "간단한 정보 파악 (숫자, 장소)",
    ],
  },
  "중2": {
    "문법": [
      "to부정사 (명사적, 형용사적, 부사적 용법)",
      "동명사 (주어, 목적어, 보어)",
      "접속사 (and, but, or, so, because, when, if)",
      "비교급, 최상급",
      "조동사 (can, may, must, should, will)",
      "현재진행형, 과거진행형",
    ],
    "어휘": [
      "필수 어휘 1000단어 (감정, 날씨, 직업, 취미, 여행)",
    ],
    "독해": [
      "중급 길이 지문 (7-10문장)",
      "세부정보 파악",
      "문맥상 어휘 추론",
    ],
  },
  "중3": {
    "문법": [
      "관계대명사 (who, which, that, whose, whom)",
      "현재완료 (경험, 완료, 계속, 결과)",
      "수동태 (be + p.p.)",
      "분사 (현재분사, 과거분사)",
      "간접의문문",
    ],
    "어휘": [
      "필수 어휘 1500단어",
    ],
    "독해": [
      "추론 문제 (필자 의도, 분위기)",
      "글의 요지/주제",
    ],
  },
  "고1": {
    "문법": [
      "가정법 과거, 과거완료",
      "분사구문",
      "명사절 (that, whether, if)",
      "부사절 (시간, 이유, 조건, 양보)",
      "형용사절 (관계대명사 심화)",
      "강조, 도치 구문",
    ],
    "어휘": [
      "고등 필수 어휘 2000단어",
    ],
    "독해": [
      "긴 지문 (15문장 이상)",
      "빈칸 추론 (단어, 구)",
    ],
  },
  "고2": {
    "문법": [
      "복합 관계사 (whoever, whatever, whichever)",
      "가정법 도치",
      "병렬구조",
    ],
    "어휘": [
      "수능 필수 어휘 2500단어",
      "문맥상 적절한 어휘",
    ],
    "독해": [
      "수능형 유형: 빈칸 추론, 글의 순서, 문장 삽입, 요약문 완성",
      "실용문 (광고, 안내문, 이메일)",
    ],
  },
  "고3": {
    "문법": [
      "준동사 종합 (to부정사, 동명사, 분사)",
      "복합 구문 (관계사+분사구문+가정법 중첩)",
    ],
    "어휘": [
      "수능 어휘 3500단어",
      "함축적 의미",
    ],
    "독해": [
      "고난도 추론 (빈칸, 함축 의미, 어조/분위기)",
      "장문 독해 (2지문 연계)",
      "복잡한 논리 구조",
    ],
  },
};


// ============================================================
// 영어 내신 평가 체계 분석
// ============================================================

export const ENGLISH_EVALUATION_SYSTEM = `📚 **영어 내신 평가 이원화 구조**

### 평가 대상의 두 축
1. **교과서 (Textbook)** - 닫힌 코퍼스 (Closed Corpus)
   - 범위가 명확한 암기형 평가
   - 성실성, 정확성, 암기력 평가
   - 주요 변형: 문법적 변형, 어휘 교체

2. **외부지문 (External Passages)** - 열린 코퍼스 (Open Corpus)
   - 수능형 사고력 평가
   - 논리력, 응용력, 추론 능력 평가
   - 주요 변형: 패러프레이징, 빈칸 추론, 문장 삽입

### 2026년 교육 개혁 영향
- 내신 5등급제 (2026년 고1부터 적용)
- 1등급 비율 확대 (4% → 10%)
- 역설적으로 변별력 확보 위해 난이도 상향 예상
- 외부지문 비중 증가 예상`;


// ============================================================
// 영어 난이도 시스템 (정량 기준 포함)
// ============================================================

export const ENGLISH_DIFFICULTY_SYSTEM_4LEVEL = `🚨 **영어 난이도 4단계 시스템 (정량 기준)**

**핵심 원칙: 문제를 푸는데 필요한 사고의 깊이와 언어 능력으로 판단!**

### 1️⃣ concept (개념) - 정답률 85% 이상 예상
**정의**: 기초 문법 규칙, 교과서 필수 어휘, 지문에 직접 언급된 정보

**문법 예시**:
- be동사와 일반동사 구분
- 3인칭 단수 -s
- 기본 시제 (현재/과거/미래)
- 단순 의문문/부정문

**어휘 예시**:
- 교과서 본문 어휘 (굵은 글씨, 단어장 수록)
- 일상 기본 어휘 (가족, 학교, 음식)

**독해 예시**:
- 주제문이 첫 문장/마지막 문장에 명시적
- 지문에 답이 그대로 있음 (Not, True 문제)
- 대화문에서 직접 언급된 정보

**판정 키워드**: "직접 언급", "기본 문법", "교과서 어휘", "명시적"

---

### 2️⃣ pattern (유형) - 정답률 60-85% 예상
**정의**: 중급 문법 적용, 문맥 기반 추론, 2-3문장 연결 필요

**문법 예시**:
- to부정사 vs 동명사 구분 (enjoy + 동명사)
- 관계대명사 격 선택 (who/whom/which)
- 시제 일치 (주절 과거 → 종속절 과거완료)
- 수동태 vs 능동태 구분

**어휘 예시**:
- 문맥상 의미 추론 (동의어 선택)
- 비슷한 단어 구분 (borrow vs lend)

**독해 예시**:
- 환언된 정보 찾기 (paraphrase)
- 2-3문장 연결 추론
- 빈칸에 적절한 단어/구 (기본)

**판정 키워드**: "문맥 파악", "문법 적용", "유형 문제", "추론 1-2단계"

---

### 3️⃣ reasoning (심화) - 정답률 30-60% 예상
**정의**: 복합 구문 해석, 다단계 추론, 필자 의도/함축 의미 파악

**문법 예시**:
- 분사구문 (시간/이유/양보 판단)
- 관계사 + 분사 중첩 구문
- 가정법 (현실 반대 상황 이해)
- 도치 구문 (부정어 도치, 강조 구문)

**어휘 예시**:
- 다의어 문맥 판단 (run: 달리다/운영하다/흐르다)
- 함축적 의미 (긍정적/부정적 뉘앙스)

**독해 예시**:
- 수능형 빈칸 추론 (문단 전체 흐름 파악)
- 글의 순서 배열, 문장 삽입
- 필자의 태도/어조 파악
- 3문장 이상 종합 추론

**판정 키워드**: "추론 필요", "함축 의미", "복합 구문", "다단계 논리"

---

### 4️⃣ creative (최상위) - 정답률 30% 미만 예상
**정의**: 수능 33-34번급 고난도, 복합 추론 + 어휘 + 구문 동시 요구

**문법 예시**:
- 준동사 종합 (to부정사+동명사+분사 중첩)
- 복합 관계사 + 가정법 + 분사구문 결합
- 고난도 어법 (특수 구문 연속)

**어휘 예시**:
- 추상적 어휘 (perspective, implication, nuance)
- 학술적 표현 (empirical, paradigm, hypothesis)

**독해 예시**:
- 장문 독해 (20문장 이상, 2지문 연계)
- 고난도 빈칸 (전체 논지 + 세부 + 어휘 모두 필요)
- 함축적 주제 (행간 의미, 비판적 독해)
- 복잡한 논리 구조 (역설, 반전, 다층 추론)

**판정 키워드**: "복합 능력", "고난도", "수능 최상위", "창의적 사고"

---

## 난이도 판정 시 체크리스트

1. **문법**: 기본 규칙 → concept / 복합 적용 → pattern / 구문 분석 → reasoning / 중첩 구조 → creative
2. **어휘**: 교과서 필수 → concept / 문맥 추론 → pattern / 다의어·함축 → reasoning / 추상·학술 → creative
3. **독해**: 직접 언급 → concept / 환언·연결 → pattern / 빈칸·순서·태도 → reasoning / 장문·복합 → creative
4. **시험당 최대 1-2문제**: creative는 변별력 최상위 문항이므로 시험에 1-2문제만 출제됨

## 경계선 판단 기준

- **concept ↔ pattern**: 문맥 파악 필요 여부가 핵심
  - 단순 규칙 적용만으로 풀림 → concept
  - 문맥/상황 판단 필요 → pattern

- **pattern ↔ reasoning**: 추론 단계 수가 핵심
  - 1-2단계 추론 → pattern
  - 3단계 이상 또는 복합 구문 → reasoning

- **reasoning ↔ creative**: 복합도와 출제 의도가 핵심
  - 수능 일반 문항 수준 → reasoning
  - 수능 최상위 변별 문항 (33-34번) → creative`;


// ============================================================
// 영어 문제 유형별 대비 전략
// ============================================================

export const ENGLISH_QUESTION_STRATEGIES = `📝 **영어 문제 유형별 대비 전략**

### 빈칸 추론 (킬러 문항)

**부정어 논리 주의**:
- not, never, seldom, hardly, doubt, fail to, prevent
- 부정어 있으면 → 정답은 원래 주제의 반대말

**타겟팅 전략**: 선지 보기 전 빈칸 내용 먼저 추론

| 지문 상황 | 빈칸 앞 단서 | 정답 방향 | 오답 함정 |
|-----------|-------------|-----------|-----------|
| A는 좋다 | (없음) | A의 장점 | A의 단점 |
| A는 좋다 | Not/Never | A의 단점 | A의 장점 |
| A는 좋다 | fail to/prevent | A의 효과(반의어) | A의 효과(유의어) |

### 순서 배열 및 문장 삽입

**단서 찾기**:
- 대명사 (it, they, this)
- 지시 형용사 (such a)
- 정관사 (the)
- 연결사 (however, therefore)

**전략**: 논리적 공백(Logical Gap) 찾기 훈련

### 패러프레이징 대응 전략

- **동의어/반의어 치환**: increase → boost, escalate, surge
- **이중 부정**: not decrease
- **구문 전환**: 능동태 ↔ 수동태, 명사구 ↔ 절`;


// ============================================================
// 영어 흔한 실수 가이드 (학년별 상세화)
// ============================================================

interface EnglishMistake {
  category: string;
  examples: string[];
  reason: string;
  strategy: string;
  related_grammar: string;
}

export const ENGLISH_COMMON_MISTAKES: Record<string, EnglishMistake[]> = {
  "중1": [
    {
      category: "be동사/일반동사 혼용",
      examples: [
        "❌ I am like pizza → ✅ I like pizza",
        "❌ She is plays tennis → ✅ She plays tennis",
        "❌ They are go to school → ✅ They go to school",
      ],
      reason: "be동사 문장에서는 일반동사를 쓰지 않음",
      strategy: "'be동사 문장에는 일반동사 X' 원칙 암기",
      related_grammar: "be동사, 일반동사",
    },
    {
      category: "3인칭 단수 -s 누락",
      examples: [
        "❌ He play soccer → ✅ He plays soccer",
        "❌ She study English → ✅ She studies English",
        "❌ It work well → ✅ It works well",
      ],
      reason: "3인칭 단수 주어일 때 동사에 -(e)s 필수",
      strategy: "주어 확인 → 3인칭 단수면 -s 추가",
      related_grammar: "일반동사 현재시제",
    },
    {
      category: "과거시제 불규칙 동사",
      examples: [
        "❌ I goed to school → ✅ I went to school",
        "❌ She eated lunch → ✅ She ate lunch",
        "❌ They buyed books → ✅ They bought books",
      ],
      reason: "불규칙 동사는 과거형이 따로 있음",
      strategy: "불규칙 동사 50개 암기 (go-went-gone, eat-ate-eaten 등)",
      related_grammar: "과거시제",
    },
    {
      category: "의문문 어순 오류",
      examples: [
        "❌ You are happy? → ✅ Are you happy?",
        "❌ He is a student? → ✅ Is he a student?",
        "❌ They can swim? → ✅ Can they swim?",
      ],
      reason: "의문문은 be동사/조동사를 주어 앞으로",
      strategy: "의문사/be동사/조동사 + 주어 + ... 어순 암기",
      related_grammar: "의문문",
    },
  ],
  "중2": [
    {
      category: "to부정사/동명사 혼동",
      examples: [
        "❌ I enjoy to read → ✅ I enjoy reading",
        "❌ She finished to study → ✅ She finished studying",
        "❌ He wants going → ✅ He wants to go",
      ],
      reason: "동사마다 to부정사 또는 동명사만 가능",
      strategy: "'메가펍스드' 암기 (mind, enjoy, give up, avoid, put off, finish, stop, deny)",
      related_grammar: "to부정사, 동명사",
    },
    {
      category: "비교급 이중 사용",
      examples: [
        "❌ more bigger → ✅ bigger",
        "❌ more better → ✅ better",
        "❌ most easiest → ✅ easiest",
      ],
      reason: "more/most와 -er/-est 동시 사용 금지",
      strategy: "1음절 -er, 3음절↑ more, 예외 암기 (good-better-best)",
      related_grammar: "비교급, 최상급",
    },
    {
      category: "조동사 뒤 동사원형 미사용",
      examples: [
        "❌ She can plays → ✅ She can play",
        "❌ He must goes → ✅ He must go",
        "❌ They will studying → ✅ They will study",
      ],
      reason: "조동사 뒤는 항상 동사원형",
      strategy: "can, will, must, should + 동사원형 철저히",
      related_grammar: "조동사",
    },
  ],
  "중3": [
    {
      category: "관계대명사 격 오류",
      examples: [
        "❌ The man which I saw → ✅ The man who(m) I saw",
        "❌ The book who I read → ✅ The book which/that I read",
      ],
      reason: "선행사가 사람이면 who, 사물이면 which",
      strategy: "선행사 확인 → 사람 who, 사물 which, 둘 다 that",
      related_grammar: "관계대명사",
    },
    {
      category: "현재완료 vs 과거시제",
      examples: [
        "❌ I have went yesterday → ✅ I went yesterday",
        "❌ She has seen him last week → ✅ She saw him last week",
        "❌ Have you finished it just now? → ✅ Did you finish it just now?",
      ],
      reason: "과거 특정 시점(yesterday, last week)은 과거시제",
      strategy: "ago, yesterday, last → 과거 / just, already, yet → 현재완료",
      related_grammar: "현재완료, 과거시제",
    },
    {
      category: "수동태 by 생략 불가",
      examples: [
        "❌ The book was written. (행위자 중요 시) → ✅ The book was written by him.",
        "❌ English is spoke → ✅ English is spoken",
      ],
      reason: "행위자가 중요하면 by 필수, 과거분사 형태 정확히",
      strategy: "be + p.p. 공식, 행위자 중요도 판단",
      related_grammar: "수동태",
    },
  ],
  "고1": [
    {
      category: "가정법 시제 혼동",
      examples: [
        "❌ If I am rich, I would buy a car → ✅ If I were rich, I would buy a car",
        "❌ If she studied, she will pass → ✅ If she had studied, she would have passed",
      ],
      reason: "가정법 과거: 현재 사실 반대, 가정법 과거완료: 과거 사실 반대",
      strategy: "현재 반대 → If S + 과거, S + would + 원형 / 과거 반대 → If S + 과거완료, S + would have p.p.",
      related_grammar: "가정법",
    },
    {
      category: "분사구문 의미 오해",
      examples: [
        "분사구문이 시간인지 이유인지 양보인지 문맥으로 판단 필요",
        "Being tired (이유) vs Having finished (시간) 구분",
      ],
      reason: "분사구문은 접속사 생략되어 의미가 모호",
      strategy: "문맥으로 판단, 필요시 접속사 복원해보기",
      related_grammar: "분사구문",
    },
  ],
  "고2": [
    {
      category: "문맥상 어휘 오답",
      examples: [
        "❌ He is very interested (X, 문맥상 interesting 필요할 수도)",
        "영향을 주다: affect vs influence 뉘앙스 차이",
      ],
      reason: "비슷한 의미 단어의 뉘앙스 차이",
      strategy: "문맥 전체 읽고 긍정/부정, 강도 차이 파악",
      related_grammar: "어휘",
    },
    {
      category: "수능형 함정 선지",
      examples: [
        "부분만 맞는 선지 (일부 맞지만 전체는 틀림)",
        "극단적 표현 (all, never, always, only) 주의",
      ],
      reason: "매력적 오답이 정답처럼 보임",
      strategy: "전체 흐름 파악 후 선지 검증, 극단 표현 경계",
      related_grammar: "독해 전략",
    },
  ],
  "고3": [
    {
      category: "수능 빈칸 추론 오류",
      examples: [
        "부분만 보고 판단 → 전체 논지 파악 필요",
        "첫 문장만 읽고 선택 → 마지막 문장까지 확인",
      ],
      reason: "빈칸은 전체 흐름과 핵심 주제를 반영",
      strategy: "주제 파악 → 빈칸 전후 문맥 → 선택지 소거",
      related_grammar: "독해 추론",
    },
    {
      category: "장문 독해 시간 부족",
      examples: [
        "20문장 이상 지문을 끝까지 읽다가 시간 소진",
        "불필요한 세부사항까지 정독",
      ],
      reason: "스캐닝/스키밍 전략 부족",
      strategy: "주제문 먼저, 세부는 문제 나올 때 찾기",
      related_grammar: "독해 전략",
    },
  ],
};


// ============================================================
// 영작/서술형 채점 가이드
// ============================================================

export const ENGLISH_WRITING_GUIDE = `📝 **영작/서술형 채점 기준 (4단계)**

### 1. 내용 (40%)
- ✅ 주제 적합성: 요구사항 충족 여부
- ✅ 필수 정보 포함: 주어진 조건 모두 반영
- ✅ 논리적 구성: 서론-본론-결론 흐름 (자유 서술형)

**만점 예시**: 모든 조건 충족 + 논리적
**감점 예시**: 조건 1개 누락 → -40%

### 2. 언어 사용 (30%)
- ✅ 문법 정확성: 시제, 수 일치, 어순
- ✅ 어휘 적절성: 문맥에 맞는 단어
- ✅ 표현 다양성: 단순 반복 회피

**만점 예시**: 문법 오류 0개, 적절한 어휘
**감점 예시**: 문법 오류 1개 → -10%, 2개 → -20%

### 3. 구성 (20%)
- ✅ 논리적 흐름: 문장 간 연결
- ✅ 연결어: however, therefore, because 등
- ✅ 문단 구성: 주제문 + 뒷받침 문장

**만점 예시**: 연결어 적절, 흐름 자연스러움
**감점 예시**: 연결어 없음 → -10%, 흐름 어색 → -10%

### 4. 형식 (10%)
- ✅ 철자 정확성: 스펠링 오류
- ✅ 구두점: 마침표, 쉼표, 물음표
- ✅ 대소문자: 문장 시작, 고유명사

**만점 예시**: 형식 오류 0개
**감점 예시**: 스펠링 1개 → -3%, 2개 → -7%

---

## 영작 유형별 채점 포인트

### 문장 완성형 (주어진 단어로 문장 완성)
- **핵심**: 주어진 단어/구조 정확히 사용
- **만점 조건**: 모든 단어 사용 + 문법적 완전 + 의미 명확
- **감점**: 단어 누락 → -50% / 어순 오류 → -30% / 문법 오류 → -20%

**예시**:
- 조건: (he, not, like, coffee) 사용하여 문장 작성
- ✅ He does not like coffee. (만점)
- ❌ He not like coffee. (조동사 누락 -50%)
- ❌ He do not like coffee. (3인칭 단수 오류 -30%)

### 문장 변환형 (같은 의미, 다른 구조)
- **핵심**: 원문과 동일한 의미 유지
- **만점 조건**: 의미 100% 일치 + 지정된 문법 구조 사용
- **감점**: 의미 변경 → -60% / 구조 미사용 → -40% / 문법 오류 → -20%

**예시**:
- 원문: "She is too young to drive."
- 조건: so...that 구조로 변환
- ✅ She is so young that she can't drive. (만점)
- ❌ She is so young that she doesn't drive. (의미 미묘하게 다름 -30%)

### 자유 서술형 (주제에 대한 글쓰기)
- **핵심**: 주제 관련성 + 창의성 + 정확성 균형
- **만점 조건**: 주제 명확 + 논리적 구성 + 문법/어휘 정확 + 분량 준수
- **감점**: 주제 벗어남 → -40% / 논리 부족 → -20% / 문법 오류 누적 → -30%

### 조건 영작형 (특정 조건 포함)
- **핵심**: 모든 조건 충족 확인
- **만점 조건**: 모든 조건 포함 + 문법 정확 + 의미 자연스러움
- **감점**: 조건 1개 누락 → -30% / 조건 불완전 → -15% / 문법 오류 → -20%

**예시**:
- 조건: (1) 가정법 사용 (2) 10단어 이상 (3) 여행에 대한 소망
- ✅ If I had more money, I would travel to Europe and visit many museums. (만점)
- ❌ I want to travel to Europe. (가정법 미사용 -30%, 조건 불충족)

---

## 흔한 감점 요인 Top 10

1. **주어-동사 수 불일치** (-20%): He play → He plays
2. **시제 일관성 부족** (-20%): I go yesterday → I went yesterday
3. **관사 누락/오용** (-15%): I have dog → I have a dog
4. **전치사 오류** (-10%): good in → good at
5. **스펠링 오류** (-5%/개): recieve → receive
6. **to부정사/동명사 혼동** (-15%): enjoy to read → enjoy reading
7. **어순 오류** (-20%): I very like it → I like it very much
8. **복수형 오류** (-10%): two book → two books
9. **조동사 뒤 동사원형 미사용** (-15%): can plays → can play
10. **대명사 격 오류** (-10%): Me and him went → He and I went`;


// ============================================================
// 영어 선수학습 연계 (중→고)
// ============================================================

export const ENGLISH_PREREQUISITE_MAPPING = `🔗 **중학교 ↔ 고등학교 교육과정 연계 (취약 원인 분석용)**

| 고등학교 취약 단원 | 필요한 중학교 선수 개념 | 연계 설명 |
|---|---|---|
| 가정법 | 중2 조동사, 중3 시제 체계 | 가정법은 조동사 would/could와 과거/과거완료 시제의 결합 |
| 분사구문 | 중3 분사 (현재분사/과거분사), 중2 접속사 | 분사구문 = 접속사+주어+동사를 분사로 축약 |
| 관계부사 | 중3 관계대명사, 중1 부사의 역할 | 관계부사 = 전치사+관계대명사 (where = in which) |
| 복합 구문 | 중2 접속사, 중3 관계대명사+수동태 | 긴 문장 = 절 + 절의 조합 |
| 수능형 독해 | 중3 추론 독해, 중2 지문 구조 파악 | 수능 독해 = 중학교 독해 스킬 + 고급 어휘 + 복잡한 구문 |

**ai_comment 작성 예시**:
- 가정법 오류 → "중2 조동사와 중3 시제 개념 복습 권장"
- 분사구문 오류 → "중3 분사 개념부터 재확인 필요"
- 복합 구문 독해 오류 → "중3 관계대명사, 중2 접속사 복습 후 재도전"`;


// ============================================================
// 영어 등급별 학습 전략
// ============================================================

interface ScoreLevelStrategy {
  range: string;
  goal: string;
  principle: string;
  strategies: string[];
}

export const ENGLISH_SCORE_LEVEL_STRATEGIES: Record<string, ScoreLevelStrategy> = {
  "하위권": {
    range: "60점 미만 (4~5등급)",
    goal: "3등급 진입 (70점대)",
    principle: "기초 다지기 + 쉬운 문제 완벽히",
    strategies: [
      "듣기 평가 만점 필수 (듣기가 점수 확보의 핵심)",
      "교과서 본문 암기 + 쉬운 유형(주제, 요지, 분위기) 집중",
      "외부지문: 한글 해석 위주로 내용 일치 문제 대비",
      "기초 문법(be동사, 시제, 인칭) 완벽 숙지",
      "필수 어휘 500단어 암기부터 시작",
    ],
  },
  "중위권": {
    range: "60-79점 (3등급)",
    goal: "2등급 도약",
    principle: "교과서 완벽 + 구문 독해 강화",
    strategies: [
      "교과서 완벽 숙지 (본문 암기, 어법 문제 완성)",
      "외부지문 구문 독해 연습 (끊어 읽기, 수식어 찾기)",
      "기출 분석으로 선생님 출제 스타일 파악",
      "취약 문법 유형 집중 보완 (to부정사/동명사, 관계사 등)",
      "중급 어휘 1000단어 추가 암기",
    ],
  },
  "상위권": {
    range: "80점 이상 (1~2등급)",
    goal: "1등급 사수 (95~100점)",
    principle: "만점 전략 + 고난도 변형 대비",
    strategies: [
      "교과서 문제 빠르게 처리 → 시간 확보 (외부지문에 집중)",
      "외부지문 고난도 변형 대비 (빈칸 추론, 순서 배열, 문장 삽입)",
      "유의어, 반의어, 파생어 폭넓게 학습",
      "매력적 오답 회피 위한 논리적 검증 훈련",
      "수능형 문제 집중 연습 (EBS, 수능 기출)",
    ],
  },
};


// ============================================================
// 헬퍼 함수: 영어 학년별 선택적 포함
// ============================================================

/** 학년에 맞는 영어 토픽만 반환 (토큰 절감) */
export function getEnglishTopicsForGrade(gradeLevel: string | null | undefined): string {
  if (!gradeLevel || !(gradeLevel in ENGLISH_TOPICS)) {
    // 학년 미지정 시 전체 개괄만 반환
    return `
[영어 토픽 분류]
문법, 어휘, 독해, 듣기 영역으로 구분됩니다.
학년에 따라 세부 토픽이 달라집니다.
`;
  }

  const topics = ENGLISH_TOPICS[gradeLevel];
  const lines: string[] = [`\n[${gradeLevel} 영어 토픽]`];

  for (const [category, items] of Object.entries(topics)) {
    lines.push(`\n**${category}**:`);
    for (const item of items) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join("\n");
}

/** 학년에 맞는 영어 실수 유형만 반환 */
export function getEnglishMistakesForGrade(gradeLevel: string | null | undefined): string {
  if (!gradeLevel || !(gradeLevel in ENGLISH_COMMON_MISTAKES)) {
    return "";
  }

  const mistakes = ENGLISH_COMMON_MISTAKES[gradeLevel];
  const lines: string[] = [`\n**${gradeLevel} 주요 실수 유형:**\n`];

  mistakes.forEach((mistake, idx) => {
    lines.push(`${idx + 1}. **${mistake.category}**`);
    lines.push(`   - 이유: ${mistake.reason}`);
    lines.push(`   - 전략: ${mistake.strategy}`);
    lines.push(`   - 예시:`);
    for (const example of mistake.examples) {
      lines.push(`     ${example}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

/** 영작/서술형 문항이 있을 때만 가이드 반환 */
export function getEnglishWritingGuideIfNeeded(hasEssay: boolean): string {
  return hasEssay ? ENGLISH_WRITING_GUIDE : "";
}

/** 점수대에 맞는 영어 학습 전략 반환 */
export function getEnglishScoreLevelStrategy(scorePercentage: number): ScoreLevelStrategy {
  if (scorePercentage < 60) {
    return ENGLISH_SCORE_LEVEL_STRATEGIES["하위권"];
  } else if (scorePercentage < 80) {
    return ENGLISH_SCORE_LEVEL_STRATEGIES["중위권"];
  } else {
    return ENGLISH_SCORE_LEVEL_STRATEGIES["상위권"];
  }
}
