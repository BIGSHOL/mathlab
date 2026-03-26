import Link from 'next/link';

export const metadata = {
  title: '서비스 이용약관 | MathLab',
  description: 'MathLab 서비스 이용약관',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-slate-900">서비스 이용약관</h1>
        <p className="mb-8 text-slate-500">MathLab의 서비스 이용약관입니다.</p>

        <div className="mb-10 rounded-sm border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
          <p className="mb-3">
            본 이용약관은 MathLab(이하 &quot;회사&quot;라 합니다)이 제공하는 수학 학습 관리 플랫폼 서비스와 관련하여,
            회사와 회원의 권리·의무 및 책임사항 등을 규정합니다.
          </p>
          <p>
            회원은 본 약관의 내용을 충분히 숙지하신 후 서비스를 이용해 주시기 바랍니다.
            본 약관에 동의하지 않는 경우 서비스 이용이 제한될 수 있습니다.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제1조 (목적)</h2>
            <p>
              이 약관은 회사가 제공하는 MathLab 서비스(이하 &quot;서비스&quot;)와 관련된
              회사와 회원의 권리, 의무 및 책임사항 등 필요한 사항을 규정하기 위함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제2조 (정의)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>&quot;서비스&quot;란 MathLab이 제공하는 수학 개념 학습, 빈칸 암기, 연산 연습, 시험 관리, 레벨테스트, AI 문제 생성, 학습 분석, 학습지 생성 등 모든 온라인 교육 서비스를 의미합니다.</li>
              <li>&quot;회원&quot;이란 본 약관에 동의하고 서비스에 가입하여 계정을 부여받은 자를 의미합니다.</li>
              <li>&quot;학생&quot;이란 학습 활동을 수행하는 회원을 의미합니다.</li>
              <li>&quot;교사&quot;란 학생을 관리하고 교육 콘텐츠를 운영하는 회원을 의미합니다.</li>
              <li>&quot;관리자&quot;란 학원 지점(테넌트)을 운영·관리하는 회원을 의미합니다.</li>
              <li>&quot;테넌트&quot;란 서비스를 이용하는 학원 지점 단위를 의미합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제3조 (약관의 명시 및 개정)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>이 약관의 내용은 회사가 제공하는 MathLab 웹사이트에 게시하여 공지하며, 이용자가 회원으로 가입하면서 이 약관에 동의함으로써 효력을 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령에 위배되지 않는 범위 내에서 이 약관을 변경할 수 있습니다. 변경 시 시행일자 7일 전부터 공지합니다. 회원에게 불리한 변경의 경우 30일 이상의 유예기간을 둡니다.</li>
              <li>회원이 변경된 약관에 동의하지 않는 경우 이용계약을 해지할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제4조 (서비스의 제공)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>
                회사는 다음과 같은 서비스를 제공합니다.
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>수학 개념 학습 및 5단계 빈칸 암기 학습</li>
                  <li>연산 문제 생성 및 연습 (79개 카테고리)</li>
                  <li>AI 기반 문제 자동 생성 (Gemini)</li>
                  <li>PDF 문제집 추출 및 문제은행 관리</li>
                  <li>시험 출제, 배정, 채점, 결과 분석</li>
                  <li>레벨테스트 진단 및 AI 보고서 생성</li>
                  <li>실시간 퀴즈, 숙제 관리, 학습지 생성</li>
                  <li>학습 분석 대시보드 및 게이미피케이션 (XP, 뱃지, 랭킹)</li>
                  <li>기타 회사가 정하는 교육 부가 서비스</li>
                </ul>
              </li>
              <li>회사는 365일 24시간 서비스를 제공하기 위하여 노력하나, 시스템 점검, 외부 API 장애 등으로 일시 중단될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제5조 (회원가입 및 계정 관리)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>이용자는 회사가 정한 가입 양식에 따라 이메일과 비밀번호를 통해 회원가입을 할 수 있습니다.</li>
              <li>계정은 회원 본인만 이용할 수 있으며, 타인에게 양도·대여할 수 없습니다.</li>
              <li>회원은 비밀번호를 안전하게 관리할 책임이 있으며, 무단 사용 발견 시 즉시 회사에 통지하여야 합니다.</li>
              <li>허위 정보로 가입하거나 타인의 정보를 도용한 경우 서비스 이용이 제한됩니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제6조 (이용권 및 요금)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>서비스는 이용권(라이선스) 기반으로 제공되며, 기능별(개념학습, 연산, 타임어택, 시험, 복수전, 진단, 퀴즈) 이용권이 구분됩니다.</li>
              <li>이용권은 학원 관리자(OWNER)가 지점 단위로 구매하고, 소속 학생에게 배정합니다.</li>
              <li>이용권의 구체적인 요금, 기간, 좌석 수 등은 서비스 내 안내 또는 별도 계약에 따릅니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제7조 (서비스 이용 제한)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>
                회원은 서비스를 자유롭게 이용할 수 있으나, 다음 행위는 금지됩니다.
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li>자동화 도구(크롤링, 봇 등)를 이용하여 서비스에 접근하는 행위</li>
                  <li>다른 회원의 정보를 무단으로 수집·이용하는 행위</li>
                  <li>서비스를 통해 얻은 문제·콘텐츠를 회사의 동의 없이 상업적으로 재판매하는 행위</li>
                  <li>시험 응시 시 부정행위를 하는 행위</li>
                  <li>서비스의 정상적 운영을 방해하는 행위</li>
                </ul>
              </li>
              <li>위반 시 회사는 서비스 이용을 중단하거나 계정을 삭제할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제8조 (AI 생성 콘텐츠에 관한 사항)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>서비스는 Google Gemini API, Anthropic Claude API 등을 활용하여 문제 생성, 빈칸 추출, 보고서 생성 등의 AI 기능을 제공합니다.</li>
              <li>AI가 생성한 콘텐츠(문제, 풀이, 분석 보고서 등)의 정확성·완전성을 보장하지 않습니다.</li>
              <li>교사는 AI가 생성한 문제를 반드시 검토·수정한 후 학생에게 배정하여야 합니다.</li>
              <li>회사는 AI 콘텐츠 품질 향상을 위해 생성 데이터를 익명화하여 분석할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제9조 (학습 데이터의 관리)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>학생의 학습 데이터(성적, 답안, XP, 레벨 등)는 회원 탈퇴 시까지 보관됩니다.</li>
              <li>교사는 담당 학생의 학습 데이터를 조회·분석할 수 있으며, 학부모 보고서를 생성할 수 있습니다.</li>
              <li>관리자는 소속 지점의 전체 학습 데이터를 관리할 수 있습니다.</li>
              <li>학습 데이터의 삭제를 원하는 경우 회원 탈퇴를 통해 처리할 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제10조 (이용계약의 해지)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회원은 언제든지 서비스 내 설정 또는 이메일(st2000423@gmail.com)을 통하여 이용계약의 해지를 신청할 수 있습니다.</li>
              <li>해지 시 회사는 법령 및 개인정보처리방침에 따라 회원의 정보를 처리합니다.</li>
              <li>해지 후에도 다시 회원가입을 할 수 있습니다. 다만, 부정이용 이력이 있는 경우 재가입이 제한될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제11조 (저작권)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회사가 작성한 저작물(서비스 UI, 코드, 디자인, 브랜드 등)에 대한 저작권은 회사에 귀속합니다.</li>
              <li>회원은 서비스를 통해 얻은 정보를 회사의 승낙 없이 상업적으로 이용하거나 제3자에게 제공할 수 없습니다.</li>
              <li>교사가 서비스 내에서 직접 작성한 문제·개념 콘텐츠에 대한 권리는 해당 교사에게 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제12조 (개인정보의 보호)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회원의 개인정보는 서비스의 원활한 제공을 위하여 회원이 동의한 목적과 범위 내에서만 이용됩니다.</li>
              <li>자세한 사항은 <Link href="/privacy" className="text-primary underline">개인정보처리방침</Link>에서 정합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제13조 (회사의 책임 제한)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회사는 회사의 귀책사유로 발생한 시스템 오류에 대해 손해를 배상할 책임이 있습니다.</li>
              <li>천재지변, 불가항력, 외부 API 장애 등 회사의 귀책사유가 없는 경우 책임을 부담하지 않습니다.</li>
              <li>AI가 생성한 콘텐츠의 정확성을 보증하지 않으며, AI 결과물 활용으로 인한 손해에 대해 책임을 부담하지 않습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제14조 (분쟁의 해결)</h2>
            <p>
              본 약관 또는 서비스는 대한민국 법령에 의하여 규정되고 이행됩니다.
              서비스 이용과 관련하여 회사와 회원 간의 분쟁이 발생하면 당사자 사이의 해결을 위하여 노력하되,
              해결되지 아니하면 대한민국의 민사소송법에 따른 관할 법원에 소를 제기할 수 있습니다.
            </p>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">부칙</h2>
            <p>본 약관은 2026년 3월 26일부터 시행합니다.</p>
          </section>
        </div>

        <div className="mt-12 flex justify-center gap-4">
          <Link href="/privacy" className="text-sm text-primary hover:underline">개인정보처리방침 보기</Link>
          <span className="text-slate-300">|</span>
          <Link href="/login" className="text-sm text-primary hover:underline">로그인으로 돌아가기</Link>
        </div>
      </div>
    </main>
  );
}
