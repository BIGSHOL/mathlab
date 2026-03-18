'use client';

import React from 'react';

interface DiagramPreviewProps {
  svgHtml: string;
}

export function DiagramPreview({ svgHtml }: DiagramPreviewProps) {
  return (
    <div>
      <label className="text-xs text-slate-500 mb-1 block">미리보기</label>
      <div className="border border-slate-200 rounded-md bg-slate-50 p-3 flex items-center justify-center min-h-[180px]">
        {svgHtml ? (
          <div dangerouslySetInnerHTML={{ __html: svgHtml }} className="[&_svg]:max-w-full [&_svg]:h-auto" />
        ) : (
          <span className="text-slate-400 text-sm">미리보기 없음</span>
        )}
      </div>
    </div>
  );
}
