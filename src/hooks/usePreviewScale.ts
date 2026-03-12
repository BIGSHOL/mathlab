'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

/** A4 크기 (mm → px, 1mm ≈ 3.7795275591px) */
export const A4_WIDTH_PX = 210 * 3.7795275591;   // 793.7mm
export const A4_HEIGHT_PX = 297 * 3.7795275591;  // 1122.5mm

/**
 * 인쇄 미리보기용 스케일링 훅
 * - 화면 크기에 맞게 자동 스케일 계산 (fitToContainer)
 * - 슬라이더용 퍼센트 계산 (scalePercent)
 * - 75%, 100% 자석 효과 (Snapping)
 */
export function usePreviewScale() {
  const [scale, setScale] = useState(1.0);
  const galleryRef = useRef<HTMLDivElement>(null);

  const scalePercent = Math.round(scale * 100);

  // 1. 컨테이너 크기에 맞춰 자동 조절
  const fitToContainer = useCallback(() => {
    const el = galleryRef.current;
    if (!el) return;
    
    const containerH = el.clientHeight;
    const a4H = A4_HEIGHT_PX;
    const padding = 32;
    const calculatedScale = Math.min((containerH - padding) / a4H, 1.0);
    
    // 0.45 ~ 1.0 사이로 조정
    setScale(Math.max(0.45, calculatedScale));
  }, []);

  // 2. 초기 로드 및 리사이즈 대응
  useEffect(() => {
    fitToContainer();
    window.addEventListener('resize', fitToContainer);
    return () => window.removeEventListener('resize', fitToContainer);
  }, [fitToContainer]);

  // 3. 직접 스케일 설정 (Snapping 포함)
  const setScaleWithSnapping = useCallback((value: number) => {
    let v = value;
    // 75% 나 100% 근처에서 자석 효과
    if (v >= 0.73 && v <= 0.77) v = 0.75;
    else if (v >= 0.98 && v <= 1.02) v = 1.0;
    setScale(v);
  }, []);

  // 4. 슬라이더용 핸들러
  const setScaleFromSlider = useCallback((value: number) => {
    setScaleWithSnapping(value / 100);
  }, [setScaleWithSnapping]);

  return {
    scale,
    setScale: setScaleWithSnapping,
    scalePercent,
    galleryRef,
    fitToContainer,
    setScaleFromSlider,
  };
}
