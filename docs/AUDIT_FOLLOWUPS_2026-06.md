# 전체 검수 후속 과제 (2026-06-10)

> 2026-06-10 폴더 전체 검수(병렬 에이전트 5종 + `tsc --noEmit`) 결과 문서.
> **높음·중간 이슈는 전부 수정 완료** — 아래 3개 커밋 참조. 이 문서는 의도적으로 **보류한 항목**의 추적용이다.

## 수정 완료 (커밋)

| 커밋 | 내용 |
|------|------|
| `abaa5fd5` | 테넌트 격리 강화 — questions/bulk·feedback POST에 `getTenantFilter` 검증, LearnedPattern 쓰기(POST/PATCH/DELETE) SUPER_ADMIN 격상 + admin UI 동기화 |
| `667d4d70` | 벤더/모델명 비노출(billing 토스페이먼츠·ai-engine "Gemini"·modelVersion 툴팁) + V3 headline/dek/pull_quote/Q&A 질문 `renderInlineMath` 방어 + generate-article·trends Json? 정규화 |
| `57cd1bfa` | 레이아웃 표준화(entitlements·admin/users·admin/tenants → PageContainer/PageHeader, rounded-lg→rounded-sm) + exam-uploads·trends SUPER_ADMIN 가드 + 관리 메뉴 트렌드 항목 추가 |

검증: `tsc --noEmit` 0 에러, src 전체 `rounded-lg` 0건, 사용자 노출 벤더명 grep 0건.

---

## 후속 과제

### 1. 조사 후 진행 (삭제류)

- [ ] **V2 article 체인 삭제** — `V2_ARTICLE_ENABLED=false`(AnalysisDetail.tsx)지만 `ArticleEditorModal`이 `V4_NAVER_COPY_ENABLED` 경유로 렌더될 수 있어 **도달성 조사 선행**.
  - 대상: `src/lib/exam-analysis/article-generator.ts`, `article-anti-patterns.ts`, `article-seo.ts`, `article-archetype.ts`, `src/app/api/exam-analysis/[id]/generate-article/route.ts` (~2K LoC)
  - 삭제 시 generate-article의 플랜 게이트 부재 이슈(V2만 미게이트)도 함께 소멸하는지 확인
- [~] **스키마 정리** — dead model 5종 ✅ + dead 스키마 파일 ✅ + orphan enum 10종 ⬜
  - ~~dead model~~: **2026-08-31 제거 완료** — `prisma/manual-migrations/drop-dead-pattern-taxonomy.sql`.
    상세: [DEAD_CODE_ARCHIVE_2026-08.md](DEAD_CODE_ARCHIVE_2026-08.md) "후속: Prisma 모델 정리"
  - ~~`src/lib/schemas/workbook.ts`~~: 2026-08-30 레포 밖으로 이관 완료
  - orphan enum(남음): `Stage`, `PointTransactionType`, `ShopItemCategory`, `AssignmentStatus`, `QuizStatus`, `CourseStatus`, `ExamCampaignType`, `ExamCampaignStatus`, `WorkbookSectionItemKind`, `AnswerSpaceSize`
  - ⚠️ **`db push` 금지** (위 문서 참조 — public 스키마에 schema.prisma 밖 테이블 16개가 산다).
    워크플로: dev 중지 → `prisma generate` + `prisma/manual-migrations/*.sql` 개별 DDL → dev 재시작
- [ ] **`src/lib/supabase.ts::uploadExamFile`** — 호출처 0건 dead code, 벤더명("Supabase") 에러 메시지 포함. 삭제 권장.

### 2. 일관성 / 리팩토링

- [ ] **verify 스킬 3종 재작성** — `.claude/skills/verify-schema-sync`·`verify-page-patterns`·`verify-nav-sync`가 기출분석 트림 *이전* 구조(모델 69개, Sidebar, NAV_GROUPS, (student) 디렉토리)를 참조 → 현 구조(모델 28개, ExamOnlyTopBar ADMIN_LINKS) 기준으로 갱신
- [ ] **라벨 맵 중앙화** — `DIFFICULTY_LABELS`·`TYPE_LABELS` 류가 9곳 로컬 재정의 (AnalysisResultView, AnalysisCommentTab, QuestionPointsChart, EssayAnalysisSection, study-strategy/constants, chart-image-generator, commentary-agent, naver-v3-renderer 등) → `src/lib/exam-analysis/constants.ts` import로 통일
- [ ] **`stripEnglishEnums` 공용화** — commentary-agent.ts와 article-generator.ts에 같은 함수 2벌 → `enum-mapper.ts` 공용 모듈로 추출
- [ ] **curriculum 데이터 JSON 외부화** — `killerPatterns.ts`(3,333줄)·`topicLevelStrategies.ts`(3,173줄)·`gradeConnections.ts`(2,703줄)·`commonMistakes.ts`(2,455줄) 등 순수 데이터 ~12K LoC
- [ ] **대형 컴포넌트 분리** — `commentary-agent.ts`(2,185줄, V3/V4 에이전트 분리), `AnalysisDetail.tsx`(1,293줄, 탭별 추출), `AnalysisResultView.tsx`(1,182줄, 섹션별 분리)
- [ ] **에러 코드 명명 통일** — `entitlements/allocate`의 `INTERNAL`→`INTERNAL_ERROR`, `BAD_INPUT`→`BAD_REQUEST` (형식 자체는 표준 준수, 명명만 비일관)
- [ ] **landing 폰트 리터럴** — `FeatureShowcase.tsx`·`V3ReportPreview.tsx`의 `const SANS = 'Pretendard, …'` → `var(--font-display)`

### 3. 보류 결정 (재논의 시점 명시)

- [ ] **'injaewon' 매직 username** — `login/page.tsx:37`(리다이렉트) + `exam-analysis/admin/page.tsx`(강사 탭 분기). 운영자 의도적 분기로 **이번 유지 결정**(2026-06-10). 계정명 변경 또는 DB 플래그(User 모델) 도입 시 교체.
- [ ] **question-references `[refId]` 조건부 테넌트 검증** — `examPaperId`가 null인 수동 등록 참조는 임의 OWNER가 수정/삭제 가능 (`ExamQuestionReference`에 tenantId 없음). 수동 등록분 실존 여부 확인 후 판단.

### 4. 검수 PASS 항목 (참고 — 재검수 시 기준선)

`isResponse` 가드 67/67, 인증 없는 라우트 6건 전부 의도적 공개(웹훅 HMAC 정상), `alert()` 0건, `\dfrac` 생성 지시 0건, 영문 enum 직접 노출 0건, 무한 스켈레톤 패턴 0건, 네비 href→페이지 8/8, 모델/enum 스키마 동기화 PASS.
