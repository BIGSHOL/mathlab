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
 * ⚠️ 전 서체 `preload: false` 필수 — 빼면 프로덕션 빌드가 실패한다.
 *    next/font 는 preload 가 켜져 있는데 `subsets` 가 없으면 **webpack 에러**로 빌드를 중단시킨다
 *    (dev 는 통과 → 배포에서만 터짐. 실제 사례: 2026-07-28 프로덕션 배포 실패).
 *    한글 서체는 Google Fonts 가 'korean' 서브셋을 이름으로 노출하지 않아(가용 서브셋에 latin 계열만 존재)
 *    subsets 로 해결할 수 없다 → preload 를 끄는 쪽이 정답. 한글 글리프는 CSS unicode-range 로 온디맨드 로드된다.
 *    성능상으로도 이게 맞다 — 총평 템플릿에서만 쓰는 서체를 기출분석 전 페이지에서 미리 받을 이유가 없다.
 * ⚠️ 블로그 이미지 캡처 전에는 `document.fonts.ready` 를 기다려야 폴백 서체로 찍히지 않는다
 *    (AnalysisDetail::handleCopyNaverImages). preload 를 끄면 더 중요해진다.
 */
const songMyung = Song_Myung({
  weight: ['400'], variable: '--font-song-myung', display: 'swap',
  // @ts-expect-error Song Myung 만 번들 타입에 preload/subsets 가 누락돼 있다(@next/font 데이터 버그 — 나머지 7종은 정상).
  // 런타임 로더는 라이브 Google Fonts 데이터로 검증해 preload 를 끄지 않으면 빌드를 막으므로 값은 반드시 넘겨야 한다.
  // 업스트림이 타입을 고치면 이 지시자가 "불필요"로 잡히므로 그때 제거할 것.
  preload: false,
});
const plexSansKR = IBM_Plex_Sans_KR({
  subsets: ['latin'], weight: ['300', '400', '500', '600', '700'], variable: '--font-plex-kr', display: 'swap', preload: false,
});
const blackHanSans = Black_Han_Sans({
  weight: ['400'], variable: '--font-black-han', display: 'swap', preload: false,
});
const gowunDodum = Gowun_Dodum({
  weight: ['400'], variable: '--font-gowun', display: 'swap', preload: false,
});
const nanumMyeongjo = Nanum_Myeongjo({
  weight: ['400', '700', '800'], variable: '--font-nanum-myeongjo', display: 'swap', preload: false,
});
const nanumCoding = Nanum_Gothic_Coding({
  weight: ['400', '700'], variable: '--font-nanum-coding', display: 'swap', preload: false,
});
const gothicA1 = Gothic_A1({
  weight: ['300', '400', '500', '700', '900'], variable: '--font-gothic-a1', display: 'swap', preload: false,
});
const doHyeon = Do_Hyeon({
  weight: ['400'], variable: '--font-do-hyeon', display: 'swap', preload: false,
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
