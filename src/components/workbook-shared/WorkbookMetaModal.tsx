'use client';

import { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/components/ui/Toast';
import { AddModalShell } from './_AddModalShell';
import type { AnswerSpaceSizeInput, PrintOptionsInput } from '@/lib/schemas/workbook';

/** 미니 표지 미리보기 — 모달 우측에 항상 노출되어 변경사항 즉시 반영 */
function MiniCoverPreview({
  title,
  subtitle,
  studentLabel,
  semesterLabel,
  academyName,
  ownerName,
  accentColor,
}: {
  title: string;
  subtitle: string;
  studentLabel: string;
  semesterLabel: string;
  academyName: string;
  ownerName: string;
  accentColor: string;
}) {
  return (
    <div className="aspect-[210/297] w-full bg-white border border-slate-200 rounded-sm shadow-sm flex flex-col items-center justify-between py-4 px-3 text-center">
      <div className="min-h-[28px]">
        {academyName && <div className="text-[10px] font-bold text-slate-700">{academyName}</div>}
        {ownerName && <div className="text-[8px] text-slate-500">{ownerName}</div>}
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: accentColor }} />
        <div className="text-[11px] font-extrabold text-slate-900 leading-tight line-clamp-3 px-1">
          {title || '제목'}
        </div>
        {subtitle && <div className="text-[8px] text-slate-600 line-clamp-2 px-1">{subtitle}</div>}
        <div className="w-6 h-0.5 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>
      <div className="min-h-[24px] space-y-0.5">
        {studentLabel && <div className="text-[10px] font-bold text-slate-800 line-clamp-1">{studentLabel}</div>}
        {semesterLabel && <div className="text-[8px] text-slate-500 line-clamp-1">{semesterLabel}</div>}
      </div>
    </div>
  );
}

interface WorkbookMeta {
  title: string;
  subtitle: string | null;
  studentLabel: string | null;
  semesterLabel: string | null;
  academyName: string | null;
  ownerName: string | null;
  defaultAnswerSpace: AnswerSpaceSizeInput;
  separateAnswerKey: boolean;
  showCover: boolean;
  showToc: boolean;
  printPreset: PrintOptionsInput;
}

interface Props {
  workbookId: string;
  initial: WorkbookMeta;
  onClose: () => void;
  onSaved: (updated: WorkbookMeta) => void;
}

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
  { id: 'csat', label: '수능형' },
  { id: 'classic', label: '클래식' },
  { id: 'notebook', label: '노트형' },
  { id: 'formal', label: '격식형' },
  { id: 'bubble', label: '말풍선' },
] as const;

const ANSWER_SIZES: { value: AnswerSpaceSizeInput; label: string }[] = [
  { value: 'NONE', label: '없음' },
  { value: 'SMALL', label: '작게' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LARGE', label: '크게' },
  { value: 'XLARGE', label: '매우 크게' },
];

/**
 * 워크북의 표지 정보 + 인쇄 옵션을 한 모달에서 편집.
 * 신규 페이지(workbooks/new)와 동일한 폼이지만 전체 prepopulated.
 */
export function WorkbookMetaModal({ workbookId, initial, onClose, onSaved }: Props) {
  const [form, setForm] = useState<WorkbookMeta>(initial);
  const [saving, setSaving] = useState(false);

  // initial이 바뀌면 폼 동기화 (재오픈 시)
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  function patchPreset<K extends keyof PrintOptionsInput>(key: K, value: PrintOptionsInput[K]) {
    setForm((p) => ({ ...p, printPreset: { ...p.printPreset, [key]: value } }));
  }

  async function handleSave() {
    if (!form.title.trim()) {
      toast.warning('제목을 입력하세요');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/workbooks/${workbookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          subtitle: form.subtitle?.trim() || null,
          studentLabel: form.studentLabel?.trim() || null,
          semesterLabel: form.semesterLabel?.trim() || null,
          academyName: form.academyName?.trim() || null,
          ownerName: form.ownerName?.trim() || null,
          defaultAnswerSpace: form.defaultAnswerSpace,
          separateAnswerKey: form.separateAnswerKey,
          showCover: form.showCover,
          showToc: form.showToc,
          printPreset: form.printPreset,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message ?? '저장에 실패했습니다');
      }
      toast.success('변경사항이 저장되었습니다');
      onSaved(form);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AddModalShell
      icon={<Settings className="w-5 h-5" />}
      title="워크북 표지·인쇄 설정"
      onClose={onClose}
      primaryAction={
        <Button size="sm" onClick={handleSave} loading={saving}>
          저장
        </Button>
      }
    >
      <div className="flex-1 overflow-y-auto -mx-1 px-1 grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
        <div className="space-y-4 min-w-0">
        {/* 표지 정보 */}
        <section className="space-y-2.5">
          <h4 className="text-xs font-bold text-text-secondary">표지 정보</h4>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">제목 *</label>
            <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">부제</label>
            <Input value={form.subtitle ?? ''} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">학생/반</label>
              <Input value={form.studentLabel ?? ''} onChange={(e) => setForm((p) => ({ ...p, studentLabel: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">학기</label>
              <Input value={form.semesterLabel ?? ''} onChange={(e) => setForm((p) => ({ ...p, semesterLabel: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">학원명</label>
              <Input value={form.academyName ?? ''} onChange={(e) => setForm((p) => ({ ...p, academyName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">원장명</label>
              <Input value={form.ownerName ?? ''} onChange={(e) => setForm((p) => ({ ...p, ownerName: e.target.value }))} />
            </div>
          </div>
        </section>

        {/* 인쇄 옵션 */}
        <section className="space-y-2.5 pt-3 border-t border-slate-100">
          <h4 className="text-xs font-bold text-text-secondary">인쇄 옵션</h4>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">템플릿</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patchPreset('template', t.id)}
                  className={`px-2 py-1.5 rounded-sm border text-xs font-medium transition ${
                    form.printPreset.template === t.id
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
            <label className="block text-xs font-semibold text-slate-700 mb-1">테마 색상</label>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => patchPreset('color', c.value)}
                  className={`w-7 h-7 rounded-sm transition ${
                    form.printPreset.color === c.value ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">기본 풀이공간 (새 항목)</label>
            <div className="grid grid-cols-5 gap-1.5">
              {ANSWER_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, defaultAnswerSpace: s.value }))}
                  className={`px-2 py-1.5 rounded-sm border text-xs font-medium transition ${
                    form.defaultAnswerSpace === s.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">단</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => patchPreset('columns', n as 1 | 2)}
                    className={`px-2 py-1.5 rounded-sm border text-xs font-medium transition ${
                      form.printPreset.columns === n
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {n}단
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">간격 (px)</label>
              <Input
                type="number"
                min={0}
                max={200}
                value={form.printPreset.spacing}
                onChange={(e) => patchPreset('spacing', Math.max(0, Math.min(200, Number(e.target.value) || 0)))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {([
              ['showCover', '표지 표시'],
              ['showToc', '목차 표시'],
              ['separateAnswerKey', '정답 별책'],
            ] as const).map(([k, lab]) => (
              <label
                key={k}
                className="flex items-center gap-1.5 px-2 py-2 border border-slate-200 rounded-sm cursor-pointer hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={form[k]}
                  onChange={(e) => setForm((p) => ({ ...p, [k]: e.target.checked }))}
                />
                <span className="text-xs">{lab}</span>
              </label>
            ))}
          </div>
        </section>
        </div>

        {/* 우측: 라이브 미니 표지 미리보기 (md+에서만 표시) */}
        <aside className="hidden md:block sticky top-0 self-start">
          <div className="text-[10px] font-bold text-text-secondary mb-1.5 text-center">표지 미리보기</div>
          {form.showCover ? (
            <MiniCoverPreview
              title={form.title}
              subtitle={form.subtitle ?? ''}
              studentLabel={form.studentLabel ?? ''}
              semesterLabel={form.semesterLabel ?? ''}
              academyName={form.academyName ?? ''}
              ownerName={form.ownerName ?? ''}
              accentColor={form.printPreset.color}
            />
          ) : (
            <div className="aspect-[210/297] w-full bg-slate-50 border border-dashed border-slate-300 rounded-sm flex items-center justify-center text-[10px] text-slate-400 text-center px-2">
              표지<br />표시 안 함
            </div>
          )}
        </aside>
      </div>
    </AddModalShell>
  );
}
