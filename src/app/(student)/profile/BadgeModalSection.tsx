'use client';

import { useEffect, useState, useCallback } from 'react';
import { Award, ArrowRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BadgeModalSection({
    achievementRateText,
    previewNodes,
    fullNodes,
}: {
    achievementRateText: string;
    previewNodes: React.ReactNode;
    fullNodes: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(false);

    // ESC 키로 닫기
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsOpen(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    return (
        <>
            <div className="rounded-xl mt-4 border border-slate-200 bg-white shadow-soft relative z-40">
                <div className="flex items-center px-4 py-3 border-b border-slate-100 gap-1.5 bg-slate-50/50 rounded-t-xl relative z-10">
                    <Award className="w-4 h-4 text-amber-500" />
                    <h2 className="text-sm font-bold text-text-primary">도전 과제 (업적)</h2>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5 ml-3"
                    >
                        전체 보기 <ArrowRight className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ml-auto shadow-sm">
                        {achievementRateText}
                    </span>
                </div>
                <div className="p-4 bg-slate-50/30 rounded-b-xl">
                    {previewNodes}
                </div>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="fixed inset-0 z-[100] overflow-y-auto"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* 배경 오버레이 — 클릭으로 닫기 */}
                        <div
                            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                            onClick={() => setIsOpen(false)}
                        />

                        <div className="flex min-h-full items-center justify-center p-4 py-12 md:py-24 relative">
                            <motion.div
                                className="w-full max-w-[1000px] flex flex-col rounded-2xl shadow-2xl relative bg-white ring-1 ring-slate-900/5"
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                                {/* 헤더 */}
                                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white relative z-10 shadow-sm rounded-t-2xl">
                                    <div className="flex items-center gap-2">
                                        <Award className="w-5 h-5 text-amber-500" />
                                        <h2 className="text-base font-bold text-text-primary">전체 달성 과제</h2>
                                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full ml-3 shadow-sm">
                                            {achievementRateText}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                        aria-label="닫기"
                                    >
                                        <X className="w-4 h-4 text-slate-600" />
                                    </button>
                                </div>

                                {/* 뱃지 영역 */}
                                <div className="p-4 md:p-6 bg-slate-50/30 rounded-b-2xl">
                                    {fullNodes}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
