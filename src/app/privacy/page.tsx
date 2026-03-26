import Link from 'next/link';

export const metadata = {
  title: '개인정보처리방침 | MathLab',
  description: 'MathLab 개인정보처리방침',
};

export default function PrivacyPage() {
  return (
    <main className="h-screen overflow-y-auto bg-white">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-4 text-3xl font-bold text-slate-900">개인정보처리방침</h1>
        <p className="mb-8 text-slate-500">
          MathLab의 개인정보 처리방침입니다.
        </p>

        <div className="mb-10 rounded-sm border border-slate-200 bg-slate-50 p-6 text-sm leading-relaxed text-slate-600">
          <p>
            MathLab(이하 &quot;회사&quot;)은(는) 「개인정보보호법」 제30조에 따라
            정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록
            하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
          </p>
          <p className="mt-3">
            이 개인정보처리방침은 2026년 3월 26일부터 적용됩니다.
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-slate-600">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제1조 (개인정보의 처리 목적)</h2>
            <p className="mb-3">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다.
              처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며
              이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라
              별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ol className="list-decimal space-y-3 pl-6">
              <li>
                <span className="font-medium text-slate-900">회원가입 및 관리</span>
                <br />
                회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 이용량 관리 목적으로 개인정보를 처리합니다.
              </li>
              <li>
                <span className="font-medium text-slate-900">교육 서비스 제공</span>
                <br />
                수학 개념 학습, 빈칸 암기, 연산 연습, 시험 응시, 레벨테스트 진단, 학습 분석, AI 문제 생성 등
                핵심 교육 기능 제공을 목적으로 개인정보를 처리합니다.
              </li>
              <li>
                <span className="font-medium text-slate-900">학습 분석 및 보고서</span>
                <br />
                학생의 학습 진도, 성취도 분석, 취약 영역 진단, 학부모 보고서 생성 등을 목적으로 개인정보를 처리합니다.
              </li>
              <li>
                <span className="font-medium text-slate-900">서비스 개선</span>
                <br />
                접속빈도 파악, 회원의 서비스 이용에 대한 통계, 서비스 업데이트 안내 등을 목적으로 개인정보를 처리합니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제2조 (개인정보의 처리 및 보유 기간)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
              <li>
                각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><span className="font-medium text-slate-900">회원가입 및 관리:</span> 회원 탈퇴 시까지 (탈퇴 후 지체없이 파기, 단 법령에 따른 보존 의무 제외)</li>
                  <li><span className="font-medium text-slate-900">학습 데이터:</span> 회원 탈퇴 시까지 (성적, 답안 기록, 학습 이력 등)</li>
                  <li><span className="font-medium text-slate-900">통신비밀보호법에 따른 접속 기록:</span> 3개월</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제3조 (처리하는 개인정보의 항목)</h2>
            <p className="mb-3">회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-900">1. 회원가입 및 관리</h3>
                <ul className="mt-1 list-disc space-y-1 pl-6">
                  <li><span className="font-medium">필수항목:</span> 이메일 주소, 비밀번호(암호화 저장), 이름, 역할(학생/교사/관리자)</li>
                  <li><span className="font-medium">선택항목:</span> 학년, 소속 학원(테넌트)</li>
                  <li><span className="font-medium">자동수집:</span> 서비스 이용 기록, 접속 로그, 접속 IP 정보</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-slate-900">2. 교육 서비스 이용</h3>
                <ul className="mt-1 list-disc space-y-1 pl-6">
                  <li>학습 기록 (개념 학습, 빈칸 연습, 연산 연습, 시험 응시)</li>
                  <li>답안 기록, 성적, XP, 레벨, 뱃지</li>
                  <li>레벨테스트 진단 결과, 취약 영역 분석</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제4조 (개인정보의 제3자 제공에 관한 사항)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회사는 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</li>
              <li>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 이용자가 사전에 동의한 경우 또는 법령에 의하여 요구되는 경우에는 예외로 합니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제5조 (개인정보처리의 위탁에 관한 사항)</h2>
            <p className="mb-3">회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="py-2.5 px-3 text-left font-medium text-slate-900">수탁업체</th>
                    <th className="py-2.5 px-3 text-left font-medium text-slate-900">위탁 업무</th>
                    <th className="py-2.5 px-3 text-left font-medium text-slate-900">보유 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2.5 px-3">Vercel Inc.</td>
                    <td className="py-2.5 px-3">웹 서비스 호스팅 및 배포</td>
                    <td className="py-2.5 px-3">위탁계약 종료 시</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2.5 px-3">Supabase Inc.</td>
                    <td className="py-2.5 px-3">데이터베이스 호스팅 (PostgreSQL)</td>
                    <td className="py-2.5 px-3">위탁계약 종료 시</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2.5 px-3">Google LLC (Gemini API)</td>
                    <td className="py-2.5 px-3">AI 문제 생성, 빈칸 추출, PDF 문제 추출</td>
                    <td className="py-2.5 px-3">위탁계약 종료 시</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2.5 px-3">Anthropic PBC (Claude API)</td>
                    <td className="py-2.5 px-3">레벨테스트 보고서 AI 생성</td>
                    <td className="py-2.5 px-3">위탁계약 종료 시</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제6조 (개인정보의 파기절차 및 파기방법)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</li>
              <li>
                개인정보 파기의 절차 및 방법은 다음과 같습니다.
                <ul className="mt-2 list-disc space-y-1 pl-6">
                  <li><span className="font-medium">파기절차:</span> 회사는 파기 사유가 발생한 개인정보를 선정하고, 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
                  <li><span className="font-medium">파기방법:</span> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법(데이터베이스 삭제)을 사용하여 파기합니다.</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제7조 (정보주체의 권리·의무 및 그 행사방법)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>정보주체는 회사에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
              <li>제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</li>
              <li>개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 의하여 정보주체의 권리가 제한될 수 있습니다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제8조 (개인정보의 안전성 확보조치)</h2>
            <p className="mb-3">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ol className="list-decimal space-y-2 pl-6">
              <li>
                <span className="font-medium text-slate-900">개인정보의 암호화</span><br />
                이용자의 비밀번호는 bcrypt 해시 알고리즘으로 암호화되어 저장되며, 중요한 데이터는 SSL/TLS 암호화 통신을 통해 전송됩니다.
              </li>
              <li>
                <span className="font-medium text-slate-900">접근 권한 관리</span><br />
                역할 기반 접근 제어(RBAC)를 적용하여 학생은 본인 데이터만, 교사는 담당 학생 데이터만, 관리자는 소속 지점 데이터만 접근할 수 있습니다.
              </li>
              <li>
                <span className="font-medium text-slate-900">접속기록 보관</span><br />
                개인정보처리시스템에 접속한 기록을 최소 3개월 이상 보관·관리하고 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제9조 (쿠키의 설치·운영 및 거부)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>회사는 이용자 인증 및 세션 관리를 위해 쿠키(cookie)를 사용합니다.</li>
              <li>
                쿠키의 설치·운영 및 거부: 웹브라우저 설정에서 쿠키 저장을 거부할 수 있습니다.
                다만, 쿠키 저장을 거부할 경우 로그인 등 일부 서비스 이용에 어려움이 발생할 수 있습니다.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제10조 (개인정보 보호책임자)</h2>
            <p className="mb-3">
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
              정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
              <p className="font-medium text-slate-900">개인정보 보호책임자</p>
              <ul className="mt-2 space-y-1">
                <li>담당: MathLab 운영팀</li>
                <li>이메일: st2000423@gmail.com</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제11조 (권익침해 구제방법)</h2>
            <p className="mb-3">
              정보주체는 개인정보침해로 인한 구제를 받기 위하여 다음 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
              <li>경찰청: (국번없이) 182 (ecrm.cyber.go.kr)</li>
            </ul>
          </section>

          <section className="border-t border-slate-200 pt-8">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">제12조 (개인정보 처리방침 변경)</h2>
            <ol className="list-decimal space-y-2 pl-6">
              <li>이 개인정보처리방침은 2026년 3월 26일부터 적용됩니다.</li>
              <li>이전의 개인정보 처리방침은 아래에서 확인하실 수 있습니다.</li>
            </ol>
            <p className="mt-3 text-xs">(이전 내역 없음)</p>
          </section>
        </div>

        <div className="mt-12 flex justify-center gap-4">
          <Link href="/terms" className="text-sm text-primary hover:underline">이용약관 보기</Link>
          <span className="text-slate-300">|</span>
          <Link href="/login" className="text-sm text-primary hover:underline">로그인으로 돌아가기</Link>
        </div>
      </div>
    </main>
  );
}
