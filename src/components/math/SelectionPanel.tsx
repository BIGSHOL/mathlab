'use client';

import { useEffect, useState, useRef } from 'react';
import {
  SelectionState,
  SchoolLevel,
  Difficulty,
  ProblemType,
  AnswerType,
  CurriculumUnit,
} from '@/types/mathgen';
import { getCurriculumForLevel, getGradesForLevel } from '@/lib/constants/curriculum';
import { getTextbooksForGrade, getPublisher } from '@/lib/constants/textbook-curriculum';
import { BookOpen, Layers, Zap, PenTool, Upload, X, ImageIcon, Copy, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SelectionPanelProps {
  selection: SelectionState;
  onChange: (newSelection: SelectionState) => void;
  onGenerate: () => void;
  isLoading: boolean;
}

export function SelectionPanel({ selection, onChange, onGenerate, isLoading }: SelectionPanelProps) {
  const [availableMainUnits, setAvailableMainUnits] = useState<CurriculumUnit[]>([]);
  const [availableSubUnits, setAvailableSubUnits] = useState<CurriculumUnit[]>([]);
  const [availableDetailUnits, setAvailableDetailUnits] = useState<CurriculumUnit[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (field: keyof SelectionState, value: unknown) => {
    if (selection[field] !== value) {
      onChange({ ...selection, [field]: value } as SelectionState);
    }
  };

  // Update main units when level/grade changes
  useEffect(() => {
    const curriculum = getCurriculumForLevel(selection.schoolLevel);
    const units = curriculum[selection.grade] || [];
    setAvailableMainUnits(units);

    if (selection.mode === 'curriculum' && units.length > 0) {
      const currentValid = units.some((u) => u.name === selection.mainUnit);
      if (!currentValid) handleChange('mainUnit', units[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.schoolLevel, selection.grade]);

  // Update sub units when main unit changes
  useEffect(() => {
    const main = availableMainUnits.find((u) => u.name === selection.mainUnit);
    const subs = main?.subUnits || [];
    setAvailableSubUnits(subs);

    if (selection.mode === 'curriculum' && subs.length > 0) {
      const currentValid = subs.some((u) => u.name === selection.subUnit);
      if (!currentValid) handleChange('subUnit', subs[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.mainUnit, availableMainUnits]);

  // Update detail units when sub unit changes
  useEffect(() => {
    const sub = availableSubUnits.find((u) => u.name === selection.subUnit);
    const details = sub?.subUnits || [];
    setAvailableDetailUnits(details);

    if (selection.mode === 'curriculum' && details.length > 0) {
      const currentValid = details.some((u) => u.name === selection.detailUnit);
      if (!currentValid) handleChange('detailUnit', details[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection.subUnit, availableSubUnits]);

  // Clipboard paste for image/exact mode
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (selection.mode !== 'image' && selection.mode !== 'exact') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onloadend = () => {
              onChange({ ...selection, sourceImage: reader.result as string });
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [selection, onChange]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange('sourceImage', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => handleChange('sourceImage', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const grades = getGradesForLevel(selection.schoolLevel);

  const isGenerateDisabled = () => {
    if (isLoading) return true;
    if (selection.mode === 'curriculum') return !selection.mainUnit;
    if (selection.mode === 'image' || selection.mode === 'exact') return !selection.sourceImage;
    return false;
  };

  return (
    <div className={`${collapsed ? 'w-12' : 'w-full lg:w-80'} bg-white border-r border-slate-200 h-full flex flex-col print:hidden shadow-lg z-10 transition-all duration-200`}>
      <div className={`border-b border-slate-100 flex items-center ${collapsed ? 'p-3 justify-center' : 'p-6'}`}>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <PenTool className="text-primary" size={22} />
              AI 문제 생성기
            </h1>
            <p className="text-xs text-text-secondary mt-1">2022 개정 교육과정 기반</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className="p-1 hover:bg-slate-100 rounded-sm text-text-secondary transition-colors shrink-0"
          title={collapsed ? '패널 열기' : '패널 접기'}
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {collapsed && (
        <div className="flex flex-col items-center gap-2 py-3">
          <button
            onClick={onGenerate}
            disabled={isGenerateDisabled()}
            className={`p-2 rounded-sm transition-colors ${isGenerateDisabled() ? 'text-slate-300' : 'text-primary hover:bg-primary/10'}`}
            title="문제 생성"
          >
            <PenTool size={18} />
          </button>
        </div>
      )}

      {/* Mode Tabs */}
      {!collapsed && <><div className="flex border-b border-slate-200">
        <button
          onClick={() => handleChange('mode', 'curriculum')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            selection.mode === 'curriculum' ? 'text-primary' : 'text-text-secondary hover:bg-slate-50'
          }`}
        >
          <BookOpen size={16} />
          교과 선택
          {selection.mode === 'curriculum' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => handleChange('mode', 'image')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            selection.mode === 'image' ? 'text-primary' : 'text-text-secondary hover:bg-slate-50'
          }`}
        >
          <ImageIcon size={16} />
          유사 문제
          {selection.mode === 'image' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
          )}
        </button>
        <button
          onClick={() => handleChange('mode', 'exact')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            selection.mode === 'exact' ? 'text-primary' : 'text-text-secondary hover:bg-slate-50'
          }`}
        >
          <Copy size={16} />
          동일 문제
          {selection.mode === 'exact' && (
            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary" />
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* CURRICULUM MODE */}
        {selection.mode === 'curriculum' && (
          <>
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BookOpen size={16} /> 학제 및 학년
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.values(SchoolLevel) as string[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      const newGrades = getGradesForLevel(level);
                      onChange({
                        ...selection,
                        schoolLevel: level as SchoolLevel,
                        grade: newGrades[0] || '',
                      });
                    }}
                    className={`flex-1 px-3 py-2 text-sm rounded-sm transition-colors border text-center ${
                      selection.schoolLevel === level
                        ? 'bg-primary/10 border-primary/30 text-primary font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <select
                value={selection.grade}
                onChange={(e) => handleChange('grade', e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm focus:ring-2 focus:ring-primary/40 outline-none"
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              {selection.mode === 'curriculum' && (() => {
                const schoolLevel = selection.schoolLevel === '중학교' ? 'middle' : selection.schoolLevel === '고등학교' ? 'high' : null;
                if (!schoolLevel) return null;
                const textbooks = getTextbooksForGrade(schoolLevel, selection.grade);
                if (textbooks.length === 0) return null;
                return (
                  <select
                    value={selection.textbookId || ''}
                    onChange={(e) => handleChange('textbookId', e.target.value || undefined)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-primary transition-colors mt-2"
                  >
                    <option value="">교과서 미지정 (범용)</option>
                    {textbooks.map((tb) => {
                      const pub = getPublisher(tb.publisherId);
                      return (
                        <option key={tb.id} value={tb.id}>
                          {pub?.shortName || tb.publisherId} ({tb.author})
                        </option>
                      );
                    })}
                  </select>
                );
              })()}
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Layers size={16} /> 단원 선택
              </label>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-text-secondary mb-1 block">대단원</span>
                  <select
                    value={selection.mainUnit}
                    onChange={(e) => handleChange('mainUnit', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-primary transition-colors"
                  >
                    {availableMainUnits.length > 0 ? (
                      availableMainUnits.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))
                    ) : (
                      <option value="">단원 없음</option>
                    )}
                  </select>
                </div>
                <div>
                  <span className="text-xs text-text-secondary mb-1 block">중단원</span>
                  <select
                    value={selection.subUnit}
                    onChange={(e) => handleChange('subUnit', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:border-primary transition-colors"
                    disabled={availableSubUnits.length === 0}
                  >
                    {availableSubUnits.length > 0 ? (
                      availableSubUnits.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))
                    ) : (
                      <option value="">중단원 없음</option>
                    )}
                  </select>
                </div>
                <div>
                  <span className="text-xs text-text-secondary mb-1 block">소단원</span>
                  {availableDetailUnits.length > 0 ? (
                    <select
                      value={selection.detailUnit}
                      onChange={(e) => handleChange('detailUnit', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      {availableDetailUnits.map((u) => (
                        <option key={u.name} value={u.name}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={selection.detailUnit}
                      onChange={(e) => handleChange('detailUnit', e.target.value)}
                      placeholder="직접 입력"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-sm text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* IMAGE MODE */}
        {selection.mode === 'image' && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-sm border border-blue-100 text-xs text-blue-700 mb-2">
              <strong>유사 문제 생성:</strong> 문제 사진을 업로드하면 AI가 분석하여 같은 개념, 비슷한
              난이도의 <strong>새로운 문제</strong>를 만들어줍니다.
            </div>

            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ImageIcon size={16} /> 문제 사진 업로드
            </label>

            {!selection.sourceImage ? (
              <div
                className="border-2 border-dashed border-slate-300 rounded-sm p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-slate-700">클릭하여 이미지 업로드</p>
                <p className="text-xs text-slate-400 mt-1">
                  파일을 여기로 드래그하거나
                  <br />
                  <span className="font-semibold text-primary">Ctrl+V</span>로 붙여넣으세요
                </p>
              </div>
            ) : (
              <div className="relative rounded-sm overflow-hidden border border-slate-200 shadow-sm group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selection.sourceImage}
                  alt="업로드된 문제"
                  className="w-full h-auto object-contain max-h-60 bg-slate-100"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleChange('sourceImage', null)}
                    className="bg-white text-red-500 px-4 py-2 rounded-sm font-medium shadow-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <X size={16} /> 이미지 삭제
                  </button>
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
        )}

        {/* EXACT MODE */}
        {selection.mode === 'exact' && (
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-sm border border-amber-100 text-xs text-amber-700 mb-2">
              <strong>동일 문제 추출:</strong> 문제 사진을 업로드하면 AI가 텍스트를 그대로 추출하여
              디지털화합니다. 정답과 풀이도 함께 생성됩니다.
            </div>

            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <ImageIcon size={16} /> 문제 사진 업로드
            </label>

            {!selection.sourceImage ? (
              <div
                className="border-2 border-dashed border-slate-300 rounded-sm p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3">
                  <Upload size={24} />
                </div>
                <p className="text-sm font-medium text-slate-700">클릭하여 이미지 업로드</p>
                <p className="text-xs text-slate-400 mt-1">
                  파일을 여기로 드래그하거나
                  <br />
                  <span className="font-semibold text-amber-600">Ctrl+V</span>로 붙여넣으세요
                </p>
              </div>
            ) : (
              <div className="relative rounded-sm overflow-hidden border border-slate-200 shadow-sm group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selection.sourceImage}
                  alt="업로드된 문제"
                  className="w-full h-auto object-contain max-h-60 bg-slate-100"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => handleChange('sourceImage', null)}
                    className="bg-white text-red-500 px-4 py-2 rounded-sm font-medium shadow-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    <X size={16} /> 이미지 삭제
                  </button>
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleImageUpload}
            />

            {/* 배점 제거 옵션 */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-sm border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={selection.removeScore ?? false}
                onChange={(e) => handleChange('removeScore', e.target.checked)}
                className="w-4 h-4 text-primary rounded border-slate-300 focus:ring-primary/40"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">배점 제거</span>
                <p className="text-xs text-slate-400 mt-0.5">
                  문제 텍스트에서 배점 표시 (예: &quot;(10점)&quot;, &quot;[5점]&quot;)를 자동 제거합니다
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Shared Options — 동일 문제 모드에서는 AI가 자동 판별하므로 숨김 */}
        {selection.mode !== 'exact' && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Zap size={16} />
              {selection.mode === 'curriculum' ? '난이도 및 유형' : '생성 옵션'}
            </label>
            <div className="space-y-2">
              {selection.mode === 'image' && (
                <p className="text-xs text-slate-400 mb-2">
                  사진의 문제와 유사한 난이도로 생성되지만, 필요 시 아래 옵션으로 변경할 수 있습니다.
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selection.difficulty}
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none"
                >
                  {Object.values(Difficulty).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <select
                  value={selection.problemType}
                  onChange={(e) => handleChange('problemType', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-sm outline-none"
                >
                  {Object.values(ProblemType).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Answer Type Toggle */}
              <div className="flex bg-slate-50 p-1 rounded-sm border border-slate-200">
                {Object.values(AnswerType).map((type) => (
                  <button
                    key={type}
                    onClick={() => handleChange('answerType', type)}
                    className={`flex-1 py-2 text-sm font-medium rounded-sm transition-all ${
                      selection.answerType === type
                        ? 'bg-white text-primary shadow-sm border border-slate-100'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type === AnswerType.MULTIPLE_CHOICE ? '객관식' : '주관식'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="p-6 border-t border-slate-200 bg-slate-50">
        <button
          onClick={onGenerate}
          disabled={isGenerateDisabled()}
          className={`w-full py-3.5 rounded-sm text-white font-bold shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isGenerateDisabled()
              ? 'bg-primary/40 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover hover:shadow-xl active:scale-95'
          }`}
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            <>
              <PenTool size={20} />
              {selection.mode === 'image' ? '유사 문제 생성하기' : selection.mode === 'exact' ? '동일 문제 추출하기' : '문제 생성하기'}
            </>
          )}
        </button>
      </div>
      </>}
    </div>
  );
}
