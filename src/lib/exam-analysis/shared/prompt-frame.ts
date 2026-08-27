/**
 * 분석 프롬프트의 **과목 무관 프레임** — 조립 순서 + 공통 하네스(H1·H2·H7~H17 / V1·V2·V6~V13).
 *
 * 2026-08 수학·영어 파이프라인 분리: 옛 prompt-builder.ts 에서 잘라냈다. **텍스트는 한 글자도 바꾸지 않았다.**
 *
 * ⚠️ 여기를 고치면 **수학과 영어 프롬프트가 동시에** 바뀐다.
 *    한 과목만 바꾸려면 여기가 아니라 `../math/prompt-builder` · `../english/prompt-builder` 의
 *    주입 블록(hardConstraints / selfVerify)을 고칠 것.
 *    변경 후 반드시 `scripts/parity` 대조로 다른 과목이 안 흔들렸는지 확인한다.
 */

/** 과목별로 갈리는 하네스 조각. 프레임은 이 두 덩이만 주입받는다. */
export interface SubjectHarnessBlocks {
  /** H3~H6 — 허용 question_type / ability_domain 값과 표기 규칙 */
  hardConstraints: string;
  /** V3~V5(+) — 반환 직전 과목별 자기검증 */
  selfVerify: string;
  /**
   * H11~H14 — 난이도 절대 기준·평가 축·분포 강제·위치 휴리스틱.
   *
   * ⚠️ 공유하면 안 되는 자리다. 수학 기준(정답률 90%+, 개념 결합 수, 식 변형, 추상도)이
   *    영어 루브릭(85%+, 어법·독해 축)과 **정면으로 충돌**해, 한 프롬프트 안에
   *    서로 다른 난이도 경계 두 벌이 들어가 있었다 (적대적 리뷰 1.3).
   */
  difficultyRules: string;
  /** V10~V11 — 난이도 분포·위치 자기검증. H13/H14 를 참조하므로 위와 같이 움직인다. */
  difficultySelfVerify: string;
}

export interface CombinePromptParts {
  base: string;
  guidelines: string[];
  paperType: string;
  schema: string;
}

/**
 * 시험지 유형별 지시사항 — 과목과 무관하게 동일하다.
 * - "blank": 빈 시험지 — 문항만 추출
 * - "student": 학생 답안지 — 답안 분석 + 오류 패턴
 */
export function getPaperTypeInstructions(paperType: string): string {
  if (paperType === 'blank') {
    return `📋 **[시험지 유형: 빈 시험지 (blank)]**

이 시험지는 **학생 답안이 없는 원본 시험지**입니다.

**분석 범위:**
- 각 문항의 번호, 형식(객관식/주관식/서술형), 배점 추출
- 난이도, 유형, 단원 분류
- ai_comment 작성 (출제 의도 및 풀이 포인트)

**주의사항:**
- is_correct, student_answer, earned_points, error_type 필드는 포함하지 마세요
- 배점이 보이지 않으면 confidence를 0.5 이하로 설정하고 일반적 배점 추정`;
  }

  return `📋 **[시험지 유형: 학생 답안지 (student)]**

이 시험지는 **학생이 작성한 답안이 포함된 시험지**입니다.

**분석 범위:**
- 각 문항의 번호, 형식, 배점 추출
- 난이도, 유형, 단원 분류
- **학생 답안 판독 및 정오 판별**
- **오류 유형 분석**

**필수 필드:**
- is_correct: 정답 여부 (true/false, 판단 불가 시 null)
- student_answer: 학생이 작성한 답 (판독 불가 시 null)
- earned_points: 획득 점수 (서술형은 부분 점수 추정)
- error_type: 오류 유형 (정답이면 null)
  - "calculation_error": 계산 실수
  - "concept_gap": 개념 미이해
  - "careless": 단순 실수 (부호, 단위 등)
  - "time_pressure": 시간 부족 (미작성/미완성)
  - "misread": 문제 오독

**채점 마크 해석:**
- ○ (동그라미): 정답
- × (엑스), / (슬래시): 오답
- △ (삼각형): 부분 점수
- 빨간/파란 펜 마크: 채점 결과

**주의사항:**
- 글씨가 불분명하면 student_answer를 null로, confidence를 낮게
- 채점 마크가 있으면 마크를 우선 (AI 판단보다 선생님 채점이 정확)`;
}

/** 모든 프롬프트 파트를 결합 (하네스 → 역할 → 시험지 유형 → 가이드라인 → 스키마 → 최종 지시) */
export function combinePrompts(parts: CombinePromptParts, blocks: SubjectHarnessBlocks): string {
  const sections: string[] = [];

  // 0. 하네스 (하드 제약 + 자기검증) — 최우선
  sections.push('════════════════════════════════════════════════');
  sections.push('🔒 하드 제약 (HARD CONSTRAINTS) — 위반 시 출력 무효');
  sections.push('════════════════════════════════════════════════');
  sections.push(`H1. 출력은 **순수 JSON 객체 하나**만 허용. 마크다운 코드펜스(\`\`\`), 서술문, 주석, 선행/후행 공백 텍스트 금지.
   - 금지: \`\`\`json\\n{...}\\n\`\`\`  /  "분석 결과입니다: {...}"
   - 허용: \`{ "questions": [...] }\`
H2. 난이도(difficulty) 필드는 **문자열** "1" | "2" | "3" | "4" | "5" 중 하나만. 숫자형(1), "상/중/하", "easy/hard" 등 금지.
${blocks.hardConstraints}
H7. OCR 오류 의심 문자(£ ¥ ¢ Á Ñ ¼ 등) 사용 금지. 불명확하면 해당 필드를 빈 문자열로.
H8. 추측 금지 — 이미지에서 확인 불가능한 정보는 confidence를 0.3 이하로 낮추고, 텍스트 필드는 빈 문자열("")로 둘 것. 허구 단원명/배점 생성 금지.
H9. topic 필드는 아래 "소단원 분류 목록"이 제공된 경우 **그 목록의 문자열과 정확히 동일하게만** 기재 (오타/공백/구분자 변형 금지).
H10. **문항 번호는 절대 건너뛰지 말 것** — 1번부터 마지막 번호까지 모든 정수가 questions 배열에 존재해야 한다.
   - 스캔 품질이 낮아 문항 내용을 판독할 수 없어도 **question_number와 points 필드는 반드시 채울 것**.
   - 그 외 필드(difficulty / question_type / ability_domain / topic / ai_comment)는 \`null\` 또는 빈 문자열로 두고, confidence를 0.2 이하로 설정.
   - confidence_reason에 "판독 실패 — 번호만 인식"으로 명시.
   - 예: 1~18번 중 11번을 판독할 수 없으면 \`{ "question_number": 11, "points": <추정값 또는 null>, "difficulty": null, "topic": null, "confidence": 0.1, "confidence_reason": "판독 실패 — 번호만 인식" }\`

${blocks.difficultyRules}
────────────────────────────────────────────────
🎯 H15~H17. 신뢰도(confidence) 절대 매핑 — 일률 출력 금지
────────────────────────────────────────────────
H15. **confidence 값은 다음 5단계 매핑에서만 선택**:
   - **0.95~1.00**: 시험지 명확 + 단원/유형/배점/난이도 모두 확실
   - **0.85~0.94**: 일부 추정 (배점 또는 단원 중 하나만 모호)
   - **0.70~0.84**: 비정형 유형 / 단원 분류 어려움 / 출제범위 의심
   - **0.60~0.69**: 스캔 품질 낮음 / 다중 단원 가능성
   - **0.30~0.59**: 판독 어려움 (수동 검토 필요, 추측 금지)
   - **0.00~0.29**: 판독 실패 (H10 placeholder만 사용)

H16. **confidence_reason ↔ confidence 값 매핑 엄수**:
   | confidence_reason | confidence 범위 |
   |---|---|
   | "문항 내용 명확" | 0.90~1.00 |
   | "비정형 유형" | 0.75~0.89 |
   | "배점 추정" | 0.70~0.89 |
   | "출제범위 의심" | 0.60~0.79 |
   | "스캔 품질 낮음" | 0.50~0.74 |
   | "판독 실패 — 번호만 인식" | 0.00~0.29 |
   - ❌ "문항 내용 명확"이면서 confidence 0.95 미만 금지
   - ❌ "스캔 품질 낮음"이면서 confidence 0.85 초과 금지

H17. **모든 문항을 동일 confidence(예: 0.95)로 출력 금지** — 학습 데이터 편향 회피 강제:
   - 21문항이면 최소 2~3가지 confidence 값(0.95 / 0.90 / 0.85 등)이 분포해야 함
   - 실제 시험지의 **약 30% 이상은 0.85 이하**가 정상 (배점 추정 또는 단원 모호 등)
   - 모두 0.95 출력 = 자기 평가 미작동 → 무효
   - ⚠️ confidence는 "메타데이터 추출의 확실성"을 의미하며, 풀이 정답 여부와 무관

════════════════════════════════════════════════
📤 출력 전 자기검증 (SELF-VERIFY) — 반환 직전 모두 체크
════════════════════════════════════════════════
V1. 응답 첫 글자가 \`{\` 이고 마지막 글자가 \`}\` 인가? (코드펜스/서술문 없음)
V2. 모든 difficulty 값이 "1"~"5" 문자열인가?
${blocks.selfVerify}
V6. 모든 question_number가 실제 시험지에 존재하는가? 소문항(1)(2)을 별도 문항으로 분리하지 않았는가?
V7. 배점 합계가 시험지 총점(보통 100점)에 근접하는가?
V8. 추측성 단원명/설명이 없는가? 불확실한 항목은 confidence를 0.3 이하로 낮췄는가?
V9. **문항 번호 시퀀스에 갭이 없는가?** 1~N 중 일부 번호가 questions 배열에 없으면, 판독 실패한 번호를 H10 규칙에 따라 placeholder로 추가했는가?
${blocks.difficultySelfVerify}
V12. **신뢰도 분포 검증** — 모든 confidence가 0.95? 21문항이면 최소 2~3가지 값으로 분포해야 함 (H17 위반 회피).
V13. **신뢰도 ↔ 사유 매핑 검증** — "문항 내용 명확"인데 confidence 0.85? "스캔 품질 낮음"인데 0.95? H16 매핑 위반 점검.
════════════════════════════════════════════════`);
  sections.push('');

  // 1. 역할 정의
  sections.push('═══════════════════════════════════════');
  sections.push('📌 ROLE (역할 정의)');
  sections.push('═══════════════════════════════════════');
  sections.push(parts.base);

  // 2. 시험지 유형 지시
  sections.push('');
  sections.push('═══════════════════════════════════════');
  sections.push('📋 PAPER TYPE (시험지 유형)');
  sections.push('═══════════════════════════════════════');
  sections.push(parts.paperType);

  // 3. 분석 가이드라인
  sections.push('');
  sections.push('═══════════════════════════════════════');
  sections.push('📚 ANALYSIS GUIDELINES (분석 가이드라인)');
  sections.push('═══════════════════════════════════════');
  for (const guideline of parts.guidelines) {
    sections.push('');
    sections.push(guideline);
  }

  // 4. JSON 스키마
  sections.push('');
  sections.push('═══════════════════════════════════════');
  sections.push('🔧 OUTPUT FORMAT (출력 형식)');
  sections.push('═══════════════════════════════════════');
  sections.push(parts.schema);

  // 5. 최종 지시
  sections.push('');
  sections.push('═══════════════════════════════════════');
  sections.push('⚡ FINAL INSTRUCTIONS (최종 지시)');
  sections.push('═══════════════════════════════════════');
  sections.push(`**반드시 위 JSON 형식만 출력하세요.**
- 추가 설명, 마크다운, 코드 블록 태그 없이 순수 JSON만 반환
- 모든 문항을 빠짐없이 분석
- 배점 합계가 100점에 근접하는지 확인
- 불확실한 부분은 confidence를 낮추되, 최선의 판단은 유지

🚨 **[최우선] 서술형 소문항 통합 규칙:**
- 서술형 문제 하나가 (1), (2) 등 소문항을 포함하는 경우, **절대 분리하지 말고 하나의 문항으로 통합 분석**하세요!
- 예: "서술형 2번: (1) ~을 구하시오. (2) ~을 구하시오." → question_number: "서술형2" (하나의 행)
- 배점은 소문항 배점의 **합계**를 사용 (예: (1) 3점 + (2) 3점 = 6점)
- **분리 기준**: 시험지에 독립적인 문항 번호가 부여된 경우만 별도 문항 (서술형1, 서술형2, 서술형3 등)
- **통합 기준**: 하나의 문항 번호 안에 (1), (2), ①, ② 등 하위 번호가 있는 경우 → 하나의 문항
- ai_comment에서 소문항 전체를 아우르는 분석을 작성하세요`);


  return sections.join('\n');
}
