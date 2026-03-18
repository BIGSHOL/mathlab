# PDF Extract Engine

> 범용 PDF → AI 구조화 추출 엔진. 플러그인 기반으로 어떤 도메인이든 PDF에서 데이터를 추출할 수 있습니다.

## 아키텍처 개요

```
pdf-extract-engine/
├── core/                  # 범용 PDF 유틸 (100% 재사용)
│   ├── pdf-loader.ts      # pdfjs-dist 동적 로딩, PDF 파싱
│   ├── pdf-renderer.ts    # 썸네일, AI용 고해상도, 크롭, 배치 렌더링
│   ├── text-extractor.ts  # 텍스트 레이어 추출 (OCR 참조용)
│   └── page-filter.ts     # 설정 기반 페이지 필터 생성기
│
├── ai/                    # Gemini Vision 추출 엔진
│   ├── extractor.ts       # extractViaProxy (클라이언트), extractDirect (서버)
│   └── post-processor.ts  # LaTeX 이스케이프 복원, 코드펜스 제거, deepFixText
│
├── hooks/                 # React 위자드 상태머신
│   └── usePdfExtract.ts   # 4단계 훅: 업로드 → 선택 → 추출 → 저장
│
├── presets/               # 도메인별 프리셋 (플러그인 구현체)
│   └── math-textbook.ts   # MathLab 수학 교재용 (스키마+프롬프트+후처리)
│
├── types.ts               # 코어 타입 + PdfExtractPlugin 인터페이스
└── index.ts               # Public API
```

## 핵심 개념: PdfExtractPlugin

엔진의 확장 포인트. 새 도메인을 지원하려면 이 인터페이스만 구현하면 됩니다.

```typescript
interface PdfExtractPlugin<TItem, TMeta = unknown> {
  name: string;                                              // 플러그인 이름
  responseSchema: Record<string, unknown>;                   // Gemini JSON 스키마
  systemPrompt: string;                                      // AI 시스템 프롬프트
  isTargetPage?: (textLayer: string) => boolean;             // 페이지 필터
  postProcess: (raw: unknown, pageNum: number, meta?: TMeta) => TItem[];  // 후처리
  fixText?: (text: string) => string;                        // 텍스트 보정
  buildUserPrompt?: (systemPrompt: string, textLayer?: string) => string; // 프롬프트 조합
}
```

## 사용 패턴

### 패턴 1: React 위자드 (가장 일반적)

```tsx
import { usePdfExtract } from './hooks';
import { mathTextbookPlugin } from './presets';

function PdfImportPage() {
  const wizard = usePdfExtract({
    plugin: mathTextbookPlugin,
    extractEndpoint: '/api/questions/pdf-extract',
    onSave: async (items) => {
      const res = await fetch('/api/questions/bulk', {
        method: 'POST',
        body: JSON.stringify({ questions: items }),
      });
      return res.json().data;
    },
  });

  // wizard.step (1~4), wizard.pages, wizard.selectedPages,
  // wizard.items, wizard.progress, wizard.extracting, ...
}
```

### 패턴 2: API Route에서 직접 추출

```typescript
import { extractDirect } from './ai';
import { mathTextbookPlugin } from './presets';

export async function POST(req: NextRequest) {
  const { pages } = await req.json();
  const result = await extractDirect(pages, mathTextbookPlugin, {
    apiKey: process.env.GEMINI_API_KEY!,
    model: 'gemini-2.5-flash',
  });
  return NextResponse.json({ data: result.items });
}
```

### 패턴 3: 코어 유틸만 사용

```typescript
import { loadPdf, renderThumbnailsBatched, extractPageText } from './core';

const pdf = await loadPdf(file);
await renderThumbnailsBatched(pdf, (batch, done, total) => {
  console.log(`${done}/${total} 렌더링 완료`);
});
```

### 패턴 4: 커스텀 플러그인 생성

```typescript
import type { PdfExtractPlugin } from './types';
import { createPageFilter, fixLatexEscaping } from '.';

interface EnglishQuestion {
  number: number;
  passage: string;
  question: string;
  choices: string[];
  answer: string;
}

const englishPlugin: PdfExtractPlugin<EnglishQuestion> = {
  name: 'english-workbook',
  responseSchema: {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: { /* ... */ },
      },
    },
    required: ['questions'],
  },
  systemPrompt: 'You are an English workbook analyzer...',
  isTargetPage: createPageFilter({
    targetPatterns: [/\d+\.\s/, /Question\s+\d/],
    skipPatterns: [/Table of Contents/, /Answer Key/],
  }),
  postProcess: (raw, pageNum) => {
    const data = raw as { questions: any[] };
    return data.questions.map(q => ({
      number: q.number,
      passage: q.passage || '',
      question: q.question,
      choices: q.choices || [],
      answer: q.answer || '',
    }));
  },
};
```

## 두 가지 추출 모드

| 모드 | 함수 | 사용 위치 | API 키 |
|------|------|----------|--------|
| Proxy | `extractViaProxy()` | 클라이언트 (브라우저) | 서버에서 관리 |
| Direct | `extractDirect()` | 서버 (API Route) | 직접 전달 |

- **Proxy 모드**: 클라이언트에서 PDF 렌더링 → 서버 API에 이미지 전송 → 서버에서 Gemini 호출. API 키 노출 없음.
- **Direct 모드**: 서버에서 이미 렌더링된 이미지를 받아 직접 Gemini 호출. API Route 핸들러 내 사용.

## 메모리 최적화

| 전략 | 구현 위치 |
|------|----------|
| 배치 썸네일 (10개씩) | `renderThumbnailsBatched()` |
| Canvas 즉시 해제 | 모든 렌더링 함수에서 `canvas.width=0` |
| 순차 API 호출 | `extractViaProxy()`, `extractDirect()` |
| 이중 해상도 | 썸네일 JPEG 0.5 / AI PNG 2x |

## 코딩 규칙

1. **core/에는 도메인 로직 금지** — PDF 처리, 렌더링만. AI/도메인 로직은 ai/ 또는 presets/로
2. **플러그인은 순수 함수** — 사이드이펙트 없이 입력→출력 변환만
3. **타입 안전성** — `PdfExtractPlugin<TItem, TMeta>` 제네릭으로 타입 추론 보장
4. **동적 import** — pdfjs-dist, @google/genai는 필요할 때만 로드 (번들 최적화)
5. **에러 격리** — 페이지 단위 try-catch, 한 페이지 실패해도 나머지 계속 추출

## 새 프리셋 추가 시 체크리스트

1. `presets/` 아래에 새 파일 생성 (예: `english-workbook.ts`)
2. `PdfExtractPlugin<TItem>` 인터페이스 구현
3. Gemini `responseSchema` 정의 (Google GenAI Type 형식)
4. `systemPrompt` 작성 (추출 규칙 상세히)
5. `postProcess` 구현 (raw JSON → 정규화 타입)
6. 선택: `isTargetPage` (페이지 필터), `fixText` (텍스트 보정)
7. `presets/index.ts`에 export 추가

## 의존성

| 패키지 | 용도 | 필수 |
|--------|------|:---:|
| `pdfjs-dist` | PDF 파싱/렌더링 | **필수** |
| `@google/genai` | Gemini AI API | 서버 추출 시 필수 |
| `react` | usePdfExtract 훅 | 훅 사용 시 필수 |