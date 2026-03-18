'use client';

import { Button } from '@/components/ui/Button';
import { gradeLabel } from './helpers';

interface StudentCreateFormProps {
  formData: { username: string; password: string; name: string; grade: number };
  formError: string;
  onFormDataChange: (data: { username: string; password: string; name: string; grade: number }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function StudentCreateForm({ formData, formError, onFormDataChange, onSubmit, onCancel }: StudentCreateFormProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-lg mx-auto p-3">
        <h2 className="text-sm font-semibold text-text-primary mb-1">새 학생 추가</h2>
        <p className="text-sm text-text-secondary mb-3">학생 계정 정보를 입력하세요.</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          {formError && <div className="p-3 rounded-sm bg-red-50 border border-red-200 text-red-600 text-sm">{formError}</div>}
          <div><label className="block text-xs font-medium text-text-secondary mb-1">이름</label><input className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" placeholder="학생 이름" value={formData.name} onChange={(e) => onFormDataChange({...formData, name: e.target.value})} required /></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">아이디</label><input className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" placeholder="로그인 아이디" value={formData.username} onChange={(e) => onFormDataChange({...formData, username: e.target.value})} required /></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">초기 비밀번호</label><input className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" type="password" placeholder="초기 비밀번호" value={formData.password} onChange={(e) => onFormDataChange({...formData, password: e.target.value})} required /></div>
          <div><label className="block text-xs font-medium text-text-secondary mb-1">학년</label><select className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary" value={formData.grade} onChange={(e) => onFormDataChange({...formData, grade: Number(e.target.value)})}>{[1,2,3,4,5,6,7,8,9].map((g) => (<option key={g} value={g}>{gradeLabel(g)}</option>))}</select></div>
          <div className="flex gap-3 pt-2"><Button type="submit">생성</Button><Button type="button" variant="ghost" onClick={onCancel}>취소</Button></div>
        </form>
      </div>
    </div>
  );
}
