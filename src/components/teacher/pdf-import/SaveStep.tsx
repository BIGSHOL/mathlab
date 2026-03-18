'use client';

import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface SaveStepProps {
  result: { created: number; conceptsCreated?: number };
  bookCode: string;
}

export function SaveStep({ result, bookCode }: SaveStepProps) {
  return (
    <Card className="p-5 text-center">
      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-slate-900 mb-2">등록 완료!</h2>
      <p className="text-slate-600 mb-2">
        <span className="text-primary font-bold">{result.created}개</span> 문제가 문제 은행에 등록되었습니다.
      </p>
      {result.conceptsCreated && result.conceptsCreated > 0 && (
        <p className="text-slate-600 mb-6">
          <span className="text-amber-600 font-bold">{result.conceptsCreated}개</span> 개념이 개념 관리에 등록되었습니다.
        </p>
      )}
      {(!result.conceptsCreated || result.conceptsCreated === 0) && <div className="mb-6" />}
      <div className="flex justify-center gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          새로운 PDF 추출
        </Button>
        <Button onClick={() => (window.location.href = `/questions?bookCode=${bookCode}`)}>
          문제 은행으로 이동
        </Button>
      </div>
    </Card>
  );
}
