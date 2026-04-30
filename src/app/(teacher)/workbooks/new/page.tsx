'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookText } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';

const COLORS = [
  { name: '파랑', value: '#135bec' },
  { name: '주황', value: '#F97316' },
  { name: '초록', value: '#10b981' },
  { name: '보라', value: '#8b5cf6' },
  { name: '핑크', value: '#ec4899' },
  { name: '회색', value: '#64748b' },
];

const TEMPLATES = [
  { id: 'default', label: '기본형' },
  { id: 'exam', label: '모의고사' },
  { id: 'large', label: '초등확대' },
  { id: 'minimal', label: '미니멀' },
  { id: 'classic', label: '클래식' },
  { id: 'notebook', label: '노트형' },
] as const;

export default function NewWorkbookPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [studentLabel, setStudentLabel] = useState('');
  const [semesterLabel, setSemesterLabel] = useState('');
  const [academyName, setAcademyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [template, setTemplate] = useState<typeof TEMPLATES[number]['id']>('default');
  const [color, setColor] = useState('#135bec');
  const [defaultAnswerSpace, setDefaultAnswerSpace] = useState<'NONE' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'XLARGE'>('MEDIUM');

  async function handleSubmit() {
    if (!title.trim()) {
      toast.warning('워크북 제목을 입력하세요');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/workbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim() || null,
          studentLabel: studentLabel.trim() || null,
          semesterLabel: semesterLabel.trim() || null,
          academyName: academyName.trim() || null,
          ownerName: ownerName.trim() || null,
          defaultAnswerSpace,
          separateAnswerKey: true,
          showToc: true,
          showCover: true,
          printPreset: {
            template,
            color,
            columns: 1,
            spacing: 16,
            showAnswers: false,
            quickAnswerOnly: false,
            showDate: true,
            showChapter: true,
            showDifficulty: false,
            showDivider: true,
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? '생성에 실패했습니다');
      }
      const j = await res.json();
      toast.success('워크북이 생성되었습니다');
      router.push(`/workbooks/${j.data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '생성에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer maxWidth="md">
      <PageHeader
        title="새 워크북 만들기"
        subtitle="제목과 표지 정보를 입력하면 빈 워크북이 생성됩니다. 컨텐츠는 다음 화면에서 추가하세요."
        icon={<BookText className="w-6 h-6" />}
        backHref="/workbooks"
      />

      <div className="bg-white border border-slate-200 rounded-sm p-6 space-y-5">
        {/* 표지 정보 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">제목 *</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 1학기 중간고사 대비 워크북"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">부제 (선택)</label>
          <Input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="예: 중2 대수 영역"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">학생/반 (선택)</label>
            <Input
              value={studentLabel}
              onChange={(e) => setStudentLabel(e.target.value)}
              placeholder="예: 중2-A반 / 김철수"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">학기 (선택)</label>
            <Input
              value={semesterLabel}
              onChange={(e) => setSemesterLabel(e.target.value)}
              placeholder="예: 2026년 1학기"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">학원명 (선택)</label>
            <Input
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              placeholder="예: 인재원"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">원장명 (선택)</label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="예: 홍길동 원장"
            />
          </div>
        </div>

        {/* 인쇄 옵션 */}
        <div className="pt-3 border-t border-slate-200">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">템플릿</label>
          <div className="grid grid-cols-3 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                className={`px-3 py-2 rounded-sm border text-sm font-medium transition ${
                  template === t.id
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">테마 색상</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`w-8 h-8 rounded-sm transition ${
                  color === c.value ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                }`}
                style={{ backgroundColor: c.value }}
                aria-label={c.name}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">기본 풀이공간 크기</label>
          <div className="grid grid-cols-5 gap-2">
            {(['NONE', 'SMALL', 'MEDIUM', 'LARGE', 'XLARGE'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setDefaultAnswerSpace(s)}
                className={`px-2 py-2 rounded-sm border text-xs font-medium transition ${
                  defaultAnswerSpace === s
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {s === 'NONE' ? '없음' : s === 'SMALL' ? '작게' : s === 'MEDIUM' ? '보통' : s === 'LARGE' ? '크게' : '매우 크게'}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1.5">
            새로 추가하는 문항의 기본 풀이공간. 개별 문항마다 별도 조절 가능.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
          <Button variant="ghost" onClick={() => router.push('/workbooks')}>취소</Button>
          <Button variant="primary" loading={submitting} onClick={handleSubmit}>
            워크북 생성
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
