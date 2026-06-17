/**
 * 페이지 컨테이너 — 중앙 정렬 레이아웃 페이지용
 * (패널 레이아웃 페이지는 이 컴포넌트 사용하지 않음)
 */
interface PageContainerProps {
  /** sm=640px, md=800px, lg=1024px, xl=1200px, full=제한없음 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  className?: string;
}

const maxWidthStyles: Record<NonNullable<PageContainerProps['maxWidth']>, string> = {
  sm: 'max-w-[640px]',
  md: 'max-w-[800px]',
  lg: 'max-w-[1024px]',
  xl: 'max-w-[1200px]',
  full: '',
};

export function PageContainer({ maxWidth = 'lg', children, className = '' }: PageContainerProps) {
  return (
    <div className={`w-full mx-auto px-4 md:px-8 pt-14 pb-6 md:pb-8 ${maxWidthStyles[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}
