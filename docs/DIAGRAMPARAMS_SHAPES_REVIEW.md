# DiagramParam 도형 구현도 검토 보고서

> 검토 일시: 2026-04-14
> 검토 범위: `src/lib/utils/svg-diagrams/` (26 타입) + `src/lib/diagram-param-engine/` (플러그인 엔진) + 어댑터/리졸버/에디터 전반
> 성격: **코드 수정 없는 분석 + 우선순위별 개선 권고**

## 1. Context

프로젝트는 Gemini가 반환한 `DiagramParam[]`을 SVG로 렌더링하여 수학 문제 도형을 표현한다.
CLAUDE.md는 "26 타입 × 플러그인 엔진 + DiagramSpec 6유형 어댑터"를 활성 시스템이라 설명하지만,
전수 검토 결과 구조·품질·일관성·보안 면에서 여러 갭이 발견되었다.

## 2. 시스템 지형 (Current Shape)

```
┌──────────────────────────────────────────────────────────────────┐
│ DB.diagramSpec Json?                                             │
│  └─ 927 rows: DiagramParam[]  (+ DiagramSpec 일부 레거시)         │
└──────────────────────────────────────────────────────────────────┘
                         │
                         ▼ resolveDiagramSpec
              (DiagramSpec → DiagramParam[] 어댑터)
                         │
       ┌─────────────────┴─────────────────┐
       ▼                                   ▼
┌──────────────────────┐        ┌──────────────────────────┐
│ svg-diagrams/index   │        │ diagram-param-engine     │
│ (legacy dispatcher)  │        │ (plugin-based)           │
│ 460 LoC, inline      │        │ 26 plugins + registry    │
│ normalize*() 20개    │        │ scripts/tests만 사용      │
└──────────┬───────────┘        └────────────┬─────────────┘
           │                                 │
           ▼ (실사용 8곳)              (production 사용처 0곳)
   DiagramRenderer.tsx / QuestionCreateModal / QuestionViewEditModal
   / useQuestionManager / DiagramEditorPopup / DiagramSVGEditor
   / mockups/diagram-editor / api/questions/pdf-extract
```

**핵심 관찰:** `ALL_PLUGINS` 기반 엔진은 `scripts/test-*.ts` 2개만 import 중이며,
프로덕션 경로는 전부 legacy `svg-diagrams/index.ts`를 쓴다.
두 시스템의 `render*` 함수는 동일 파일을 공유하므로 **시각적 결과는 동일**하지만,
normalize 로직은 중복·불일치하여 **Gemini 필드명 변형 대응이 비대칭적으로 이뤄짐**.

## 3. 발견 사항 (우선순위순)

### P0 — 구조·보안

**(1) 이중 시스템 / 죽은 엔진**
`diagram-param-engine`이 production에서 import 0건. CLAUDE.md 기재와 실제 연결 상태 불일치. 정리 대상 2택:
- 엔진을 실제로 채택: DiagramRenderer 등 8개 consumer를 `@/lib/diagram-param-engine`으로 전환.
- 엔진을 제거: 플러그인/engine.ts/types.ts 폐기하고 legacy만 유지.

**(2) function-graph `new Function('x', expr)`** (`src/lib/utils/svg-diagrams/middle/function-graph.ts:209-223`)
Gemini가 반환한 문자열을 sanitize 후 바로 `new Function`으로 실행.
서버 `api/questions/pdf-extract/route.ts:536`에서도 호출되며 Node 런타임에서 임의 표현식 평가.
`pi`→`Math.PI` 치환이 단순 regex라 `api` 같은 변수명도 오염 위험.
→ **표현식 파서(mathjs 등) 도입 또는 화이트리스트 기반 AST 검증**으로 전환 권고.

**(3) normalize 로직 중복 + 중등 plugin pass-through**
- legacy `svg-diagrams/index.ts`: 20개 `normalize*()` 인라인 (fallback 필드명 다수).
- engine plugin `plugins/middle/triangle.ts`, `circle.ts`, `quadrilateral.ts` 등: `normalize: (p) => p as TriangleParams` — 필드명 변형 정규화 **누락**.
→ 엔진 채택 시점에 Gemini가 `quadType`/`shape` 등 변형 키로 반환하면 pass-through가 터짐.

### P1 — 렌더링 품질

**(4) SolidFigure dimensions 무시** (`middle/solid-figure.ts`)
- `_w`, `_h`, `_d`, `_r` 모두 underscore(사용 안 함). 2m×10m 직육면체도 1×1 정육면체와 동일 픽셀로 렌더.
- faceLabels는 `cube/rectangular_prism`만 지원, 다른 모양은 무시.
- 공, 원뿔, 사각뿔 모두 하드코딩 좌표만 사용.
→ **등축 투영 기반 실제 비율 반영** 필요 (초5~중1 부피/겉넓이 문제에 치명적).

**(5) Triangle — 각도 호(arc) 미표시** (`shapes.ts:401-411`)
`angles` 라벨은 꼭짓점 근방 텍스트만 놓고 각 호를 그리지 않음. `angle-figure.ts`는 호를 그림.
→ 일관성 위해 각 호 + 라벨 배치 추가.

**(6) Circle arc sweep 고정** (`shapes.ts:73, 162, 168`)
모든 `A rx ry 0 L 0 x y` — sweep flag 항상 0 (counterclockwise). startAngle > endAngle 또는 360° wrap 시 잘못 그려짐.

**(7) RegularPolygon 한계** (`shapes.ts:535`)
- 반지름 r=70 고정 → sides=20일 때 변 라벨 뭉개짐.
- `sideLength`은 0→1 변 하나만 라벨. 모든 변에 동일 길이 표시 기능 없음.

**(8) Quadrilateral 자동 평행 마커 없음**
`type === 'parallelogram' | 'trapezoid'`인데 `parallelMarks`가 비면 수동 표기 없음.
→ rectangle/square의 rightAngleMark 자동 채움과 대칭적으로 평행 변도 자동 표기 권고.

**(9) Net diagram — 치수 고정, 펼침 패턴 1종**
`renderRectPrismNet`도 `dimensions` 무시. 펼침 패턴도 십자형만 지원 (T/L/Z형 없음).

**(10) Coordinate-plane / Function-graph 축 렌더링 중복 (~60 LoC)**
`createCoordinateMapper`는 공유하지만 격자/눈금/축 화살표 그리는 코드는 복붙.
→ `renderAxes(parts, opts)` 같은 헬퍼로 추출 가능.

### P2 — 타입 안전성 / 접근성

**(11) `DiagramParam.type: string` 느슨한 타입** (`src/types/pdf-extract.ts:56`)
26개 union 대신 string → Gemini 오타(`'fractioncircle'`)가 런타임 null 반환.
→ `DiagramType`으로 좁히고, resolver 단에서 unknown type에 명시적 에러 로깅.

**(12) `||` vs `??` fallback 혼용** (`shapes.ts:29`, `solid-figure.ts:13` 등)
`cx = params.cx || r + 30` — cx=0이 r+30으로 치환됨. 좌표=0 입력 시 의도와 다르게 이동.
→ `??`로 통일.

**(13) SVG 접근성 전무**
- `svgWrap`이 `<title>`/`<desc>` 생략. `DiagramParam.label` ("삼각형", "좌표평면" 등)이 SVG에 전달 안 됨.
- DiagramRenderer가 `dangerouslySetInnerHTML`만 사용, aria-label 없음.
→ `svgWrap(content, w, h, pad, { title, desc })` 확장 후 label 주입.

**(14) 테스트 커버리지 부족**
- `scripts/test-diagram-engine.ts`: `getDefaultParams()` 결과만 smoke test. normalize 경로/엣지케이스 없음.
- Vitest 단위 테스트 0건 (특수점 계산 `computeOrthocenter` 등 수학 로직).
- 시각 회귀 (Playwright snapshot) 없음.

## 4. 권장 후속 작업 (Action Items)

| # | 항목 | 파일 | 우선순위 |
|---|------|------|----------|
| A | function-graph 표현식 파서 교체 (mathjs) + 서버 호출부 검증 | `middle/function-graph.ts`, `api/questions/pdf-extract/route.ts` | P0 |
| B | 이중 시스템 정리 결정 (엔진 채택 or 폐기) + CLAUDE.md 동기화 | `diagram-param-engine/`, `DiagramRenderer.tsx`, `CLAUDE.md` | P0 |
| C | 엔진 채택 시: 중등 plugin normalize 실 로직 이식 (triangle/circle/quadrilateral 등) | `diagram-param-engine/plugins/middle/*.ts` | P0 |
| D | SolidFigure — dimensions 기반 실제 비율 렌더 + faceLabels 전체 shape 지원 | `middle/solid-figure.ts` | P1 |
| E | Triangle 각도 호 + Circle sweep flag 보정 + RegularPolygon 동적 크기 | `middle/shapes.ts` | P1 |
| F | Quadrilateral `type`별 자동 평행/합동 마커 | `middle/shapes.ts` | P1 |
| G | Net diagram dimensions 반영 + Pattern 선택 (십자/T/L) | `middle/net-diagram.ts` | P1 |
| H | `renderAxes()` / `fitPointsToCanvas` 재사용으로 축/스케일 중복 제거 | `middle/coordinate-plane.ts`, `function-graph.ts`, `shapes.ts` | P2 |
| I | `DiagramParam.type`을 `DiagramType` union으로 타입 강화 + `||` → `??` 일괄 | `types/pdf-extract.ts`, 전체 renderers | P2 |
| J | `svgWrap`에 title/desc 주입 + DiagramRenderer aria-label | `shared/svg-utils.ts`, `DiagramRenderer.tsx` | P2 |
| K | Vitest 단위 테스트 (geometry-math, 각 normalize), 시각 회귀 snapshot | `src/lib/utils/svg-diagrams/__tests__/` | P2 |

## 5. Verification (개선 구현 시 확인 방법)

1. `npx tsx scripts/test-diagram-engine.ts` — 26 타입 스모크.
2. `/mockups/diagram-editor` UI에서 각 타입 기본값/엣지케이스 시각 확인.
3. `npm run build`로 타입 에러 없음 확인.
4. 실제 DB 샘플 대상 `scripts/estimate-diagram-coverage.ts` 재실행해 렌더 성공률 비교.
5. `api/questions/pdf-extract` 경로 — 안전한 표현식 파서 교체 전/후 동일 입력으로 SVG byte-diff 확인 (외견 불변).

## 6. 다음 단계

본 문서는 **분석 전용**이다. 사용자가 Action Item 중 선택하면 개별 PR로 진행.
권장 시작점: **A (보안) + B (구조 결정)** — 이 둘이 나머지 항목의 기반이 되기 때문.
