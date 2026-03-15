# MathLab 대규모 리팩토링 계획서 (Refactoring Plan)

## 1. 개요 (Overview)
현재 MathLab 프로젝트는 `worksheet-wizard`, `level-test-editor`와 같은 고도화된 UI 기능과 `arithmetic-generator`의 대규모 확장이 이루어지면서 플랫폼의 기능이 비약적으로 발전했습니다. 하지만 이 과정에서 코드의 중복, 파일의 비대화, 상태 관리의 파편화가 발생했습니다. 본 문서에서는 시스템의 유지보수성, 확장성, 그리고 일관성을 확보하기 위한 핵심 리팩토링 목표와 실행 단계를 정의합니다.

---

## 2. 주요 분석 결과 (Key Findings)

### A. 상태 관리 및 편집기 아키텍처 파편화
*   **이슈:** `worksheet-wizard`는 `src/stores/wizardStore.ts` (Zustand)를 사용하여 단계별 전역 상태를 관리하는 반면, 새로 구현된 `level-test-editor/LevelTestEditorShell.tsx`는 컴포넌트 내부의 로컬 상태(`useState`)에 의존하고 있습니다.
*   **결과:** 문제 추가, 삭제, 순서 변경, 영역(Domain) 태깅 등 핵심 로직이 두 곳에 중복으로 구현되어 있으며, 향후 유지보수 시 두 곳을 동시에 수정해야 하는 위험(Risk)이 있습니다.

### B. 서비스 로직 비대화 (God Object)
*   **이슈:** `src/lib/services/arithmetic-generator.ts` 파일이 약 1,800줄 이상으로 비대해졌습니다. 모든 학년, 모든 유형의 연산 로직이 하나의 파일에 강하게 결합되어 있어, 단일 책임 원칙(SRP)을 위배하고 있습니다.
*   **결과:** 특정 연산 유형을 수정하거나 새로운 학년의 로직을 추가할 때 가독성이 떨어지고 파일 충돌(Merge Conflict) 발생 확률이 매우 높습니다.

### C. 레거시 뷰와 신규 시스템 간의 불일치
*   **이슈:** `level-test/create/page.tsx` 등 일부 과거 페이지들이 새로 도입된 `Wizard` 기반 플로우와 형태/UX가 다릅니다.
*   **결과:** 사용자 경험(UX)이 파편화되고 관리해야 할 레거시 코드가 잔존하게 됩니다.

### D. 데이터 레이어(Type/Contract) 표준화 부족
*   **이슈:** `types`와 `contracts` 내부에 타입들이 정의되어 있으나, API 호출부와 컴포넌트 간에 타입이 엄격하게 강제되지 않는 부분들이 발견되었습니다.

---

## 3. 리팩토링 실행 계획 (Action Plan)

### 단계 1: Creator Framework 통합 (UI & 상태 관리)
목표: 위저드와 에디터의 로직을 하나의 통합 프레임워크로 병합합니다.
*   **상태 관리 통합:** `wizardStore.ts`를 확장하여 `LevelTestEditorShell`의 로컬 상태(questions, questionDomains, dirty 상태 등)를 흡수합니다.
*   **공통 컴포넌트 추출:** 문제 목록 렌더링(Left/Right Panel), 드래그 앤 드롭 순서 변경, 문제 검색 등의 UI를 공통 레이아웃 컴포넌트로 분리합니다.
*   **전환 작업:** `LevelTestEditorShell`이 내부 상태 대신 Zustand Store의 상태와 액션을 사용하도록 변경합니다.

### 단계 2: Arithmetic Generator 모듈화
목표: 1,800줄의 코드를 도메인 단위로 분할하여 가독성과 테스트 용이성을 확보합니다.
*   **디렉토리 분리:** `src/lib/services/arithmetic-generator/` 디렉토리를 생성합니다.
*   **모듈 분할 전략:**
    *   `core.ts`: 타입 정의(`ArithmeticCategory`), 라벨 매핑, 공통 유틸 함수(난수 생성, 셔플 등).
    *   `elementary.ts`: 초등부 전용 생성 로직.
    *   `middle.ts`: 중등부 전용 생성 로직.
    *   `index.ts`: 각 모듈을 통합하여 내보내는 Entry Point.

### 단계 3: 레거시 페이지 마이그레이션
목표: 구형 플로우를 걷어내고 신규 Wizard 시스템으로 통일합니다.
*   **대상 파악:** 기존에 존재하던 문제 생성, 시험지 생성 관련 레거시 페이지 탐색.
*   **라우팅 통일:** 모든 생성 플로우를 `/worksheet/create?mode=...` 또는 이와 유사한 진입점으로 유도하고, 불필요한 구형 라우트를 삭제합니다.

### 단계 4: 데이터 컨트랙트(Contracts) 일관성 강화
*   **타입 강제:** API 호출 결과를 처리하는 `fetch` 로직과 Custom Hook들이 `src/contracts/`에 정의된 인터페이스를 정확히 따르도록 Zod 스키마 검증 등을 보강합니다.

---

## 4. 기대 효과 (Expected Outcomes)
*   **유지보수성 향상:** 쪼개진 모듈과 통합된 스토어를 통해 코드 수정 및 버그 추적이 매우 용이해집니다.
*   **일관된 UX/DX:** 학생과 교사 모두 동일한 디자인 시스템 기반의 UI를 경험하게 되며, 개발자는 단일화된 'Creator Framework' 패턴으로 새 기능을 쉽게 추가할 수 있습니다.
*   **성능 안정화:** 불필요하게 렌더링되던 부분들을 Zustand Selector 기반으로 최적화하여 편집기 환경의 반응성을 높일 수 있습니다.