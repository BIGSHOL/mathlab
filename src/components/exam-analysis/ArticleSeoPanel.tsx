'use client';

/**
 * 기출 분석 블로그 글 SEO 점수 사이드 패널
 * 6항목 실시간 SEO 점수 + 개선 제안 + 태그 편집
 */

import { useMemo, useState } from 'react';
import { TrendingUp, AlertCircle, X, Plus, Hash } from 'lucide-react';
import type { ArticleSeoScore } from '@/lib/exam-analysis/article-seo';

interface ArticleSeoPanelProps {
  seoScore: ArticleSeoScore | null;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
}

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#EF4444';
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{score}</span>
        <span className="text-[10px] text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export function ArticleSeoPanel({ seoScore, tags, onTagsChange }: ArticleSeoPanelProps) {
  const [newTag, setNewTag] = useState('');

  const score = seoScore?.totalScore ?? 0;
  const categories = seoScore?.categories ?? [];
  const suggestions = seoScore?.suggestions ?? [];

  const gradeLabel = useMemo(() => {
    if (score >= 85) return { text: '최적화', color: 'text-green-600' };
    if (score >= 65) return { text: '준최적화', color: 'text-yellow-600' };
    return { text: '개선 필요', color: 'text-red-600' };
  }, [score]);

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    const formatted = tag.startsWith('#') ? tag : `#${tag}`;
    if (!tags.includes(formatted)) {
      onTagsChange([...tags, formatted]);
    }
    setNewTag('');
  };

  const handleRemoveTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* 총점 */}
      <div className="flex flex-col items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-500">SEO 점수</h3>
        <ScoreCircle score={score} />
        <span className={`text-sm font-semibold ${gradeLabel.color}`}>
          {gradeLabel.text}
        </span>
      </div>

      {/* 항목별 점수 */}
      <div className="space-y-2">
        {categories.map((cat) => {
          const ratio = cat.maxScore > 0 ? cat.score / cat.maxScore : 0;
          const barColor = ratio >= 0.8 ? 'bg-green-500' : ratio >= 0.5 ? 'bg-yellow-500' : 'bg-red-400';

          return (
            <div key={cat.id} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">{cat.name}</span>
                <span className="font-medium text-slate-800">{cat.score}/{cat.maxScore}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">{cat.details}</p>
            </div>
          );
        })}
      </div>

      {/* 개선 제안 */}
      {suggestions.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-500">
            <TrendingUp className="w-3 h-3" />
            개선 제안
          </h4>
          {suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
              <AlertCircle className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}

      {/* 태그 편집 */}
      <div className="space-y-2">
        <h4 className="flex items-center gap-1 text-xs font-semibold text-slate-500">
          <Hash className="w-3 h-3" />
          태그 ({tags.length}개)
        </h4>
        <div className="flex flex-wrap gap-1">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-sm">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(i)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="#태그 추가"
            className="flex-1 px-2 py-1 text-xs border border-slate-200 rounded-sm focus:outline-none focus:border-slate-400"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-2 py-1 text-xs bg-slate-100 rounded-sm hover:bg-slate-200"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
