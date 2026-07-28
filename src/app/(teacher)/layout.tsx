import {
  Song_Myung, IBM_Plex_Sans_KR, Black_Han_Sans, Gowun_Dodum,
  Nanum_Myeongjo, Nanum_Gothic_Coding, Gothic_A1, Do_Hyeon,
} from 'next/font/google';
import { ExamOnlyTopBar } from '@/components/layout/ExamOnlyTopBar';
import { SubscriptionProvider } from '@/components/providers/SubscriptionProvider';
import { ToastContainer } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

/**
 * 총평 템플릿 서체 팩 — 레이아웃(골격)마다 완전히 다른 타이포그래피를 주기 위한 한글 지원 서체군.
 *
 * 루트가 아니라 여기(기출분석 레이아웃)에 두는 이유: 한글 웹폰트는 용량이 커서
 * 총평을 쓰지 않는 페이지까지 부담시킬 이유가 없다. 변수 클래스도 이 레이아웃 안에서만 적용된다.
 *
 * 한글 전용 서체(Song Myung·Black Han Sans·Gowun Dodum)는 next/font 가 subsets/preload 인자를 받지 않는다
 * — 서브셋이 하나뿐이라 선택지가 없기 때문. IBM Plex Sans KR 만 라틴 서브셋 분리가 가능해 preload:false 로 둔다.
 * ⚠️ 대신 블로그 이미지 캡처 전에 `document.fonts.ready` 를 기다려야 폴백 서체로 찍히지 않는다
 *    (AnalysisDetail::handleCopyNaverImages).
 */
const songMyung = Song_Myung({
  weight: ['400'], variable: '--font-song-myung', display: 'swap',
});
const plexSansKR = IBM_Plex_Sans_KR({
  subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-plex-kr', display: 'swap', preload: false,
});
const blackHanSans = Black_Han_Sans({
  weight: ['400'], variable: '--font-black-han', display: 'swap',
});
const gowunDodum = Gowun_Dodum({
  weight: ['400'], variable: '--font-gowun', display: 'swap',
});
const nanumMyeongjo = Nanum_Myeongjo({
  weight: ['400', '700', '800'], variable: '--font-nanum-myeongjo', display: 'swap',
});
const nanumCoding = Nanum_Gothic_Coding({
  weight: ['400', '700'], variable: '--font-nanum-coding', display: 'swap',
});
const gothicA1 = Gothic_A1({
  weight: ['300', '400', '500', '700', '900'], variable: '--font-gothic-a1', display: 'swap',
});
const doHyeon = Do_Hyeon({
  weight: ['400'], variable: '--font-do-hyeon', display: 'swap',
});

const templateFontVars = [
  songMyung.variable, plexSansKR.variable, blackHanSans.variable, gowunDodum.variable,
  nanumMyeongjo.variable, nanumCoding.variable, gothicA1.variable, doHyeon.variable,
].join(' ');

/**
 * 기출분석 전용 레이아웃.
 * 사이드바/하단 내비/커맨드 팔레트 없이 우측 상단 미니바(ExamOnlyTopBar)만 노출.
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // 기출분석은 TEACHER 이상 전용. STUDENT 는 로그인으로.
  if (user.role === 'STUDENT') redirect('/login');

  return (
    <SubscriptionProvider>
      <div className={`${templateFontVars} h-screen flex bg-background overflow-hidden print:h-auto print:overflow-visible print:bg-white`}>
        <ExamOnlyTopBar />
        <main className="flex-1 flex flex-col min-h-0 overflow-y-auto overflow-x-hidden pb-14 md:pb-0 print:overflow-visible">
          {children}
        </main>
        <ToastContainer />
        <ConfirmDialog />
      </div>
    </SubscriptionProvider>
  );
}
