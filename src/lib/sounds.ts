'use client';

// ── Web Audio API 기반 효과음 시스템 ──
// 외부 파일 없이 코드로 사운드 합성

export interface SoundDef {
  id: string;
  label: string;
  category: 'feedback' | 'reward' | 'ui' | 'timer';
  description: string;
  play: (ctx: AudioContext) => void;
}

// ── 유틸 ──

/** 단일 오실레이터 톤 재생 */
function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  startTime: number,
  type: OscillatorType = 'sine',
  volume = 0.3,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // 어택 → 서스테인 → 릴리즈 (ADSR 간소화)
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01); // 빠른 어택
  gain.gain.setValueAtTime(volume, startTime + duration * 0.6);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

/** 풍성한 톤: 기본음 + 옥타브 배음 레이어 */
function playRichTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  startTime: number,
  type: OscillatorType = 'sine',
  volume = 0.4,
) {
  // 기본음
  playTone(ctx, freq, duration, startTime, type, volume);
  // 옥타브 위 배음 (부드럽게)
  playTone(ctx, freq * 2, duration * 0.7, startTime, 'sine', volume * 0.15);
  // 5도 배음 (아주 약하게)
  playTone(ctx, freq * 1.5, duration * 0.5, startTime, 'sine', volume * 0.08);
}

/** 노이즈 버스트 (심벌즈/스파클 효과) */
function playNoise(
  ctx: AudioContext,
  duration: number,
  startTime: number,
  volume = 0.12,
) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  // 하이패스 필터로 밝은 질감
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 4000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(startTime);
}

// ── 사운드 정의 ──

export const SOUNDS: SoundDef[] = [
  // ─ 피드백 ─
  {
    id: 'correct',
    label: '정답',
    category: 'feedback',
    description: '문제 정답 시 밝은 2음 효과',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 523.25, 0.18, t, 'sine', 0.45);       // C5
      playRichTone(ctx, 783.99, 0.3, t + 0.1, 'sine', 0.5);   // G5
      playNoise(ctx, 0.08, t + 0.1, 0.06); // 스파클
    },
  },
  {
    id: 'wrong',
    label: '오답',
    category: 'feedback',
    description: '문제 오답 시 낮은 경고음',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 311.13, 0.2, t, 'sawtooth', 0.3);        // Eb4
      playTone(ctx, 261.63, 0.35, t + 0.15, 'sawtooth', 0.25); // C4
      playTone(ctx, 233.08, 0.2, t + 0.15, 'sine', 0.12);    // Bb3 저음 깔기
    },
  },
  {
    id: 'streak',
    label: '연속 정답',
    category: 'feedback',
    description: '3연속 정답 등 콤보 효과',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 523.25, 0.15, t, 'sine', 0.35);        // C5
      playRichTone(ctx, 659.25, 0.15, t + 0.08, 'sine', 0.4);  // E5
      playRichTone(ctx, 783.99, 0.15, t + 0.16, 'sine', 0.45); // G5
      playRichTone(ctx, 1046.5, 0.3, t + 0.24, 'sine', 0.5);   // C6
      playNoise(ctx, 0.12, t + 0.28, 0.08);
    },
  },
  {
    id: 'blank_fill',
    label: '빈칸 채우기',
    category: 'feedback',
    description: '빈칸에 답 입력 시 짧은 클릭',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 880, 0.06, t, 'sine', 0.35);
      playTone(ctx, 1200, 0.05, t + 0.03, 'sine', 0.3);
      playTone(ctx, 1760, 0.03, t + 0.02, 'sine', 0.1); // 배음
    },
  },
  {
    id: 'stage_complete',
    label: '단계 완료',
    category: 'feedback',
    description: '빈칸 학습 단계 클리어',
    play(ctx) {
      const t = ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 783.99, 1046.5]; // C D E G C6
      notes.forEach((f, i) => {
        playRichTone(ctx, f, 0.18, t + i * 0.09, 'sine', 0.35 + i * 0.03);
      });
      playNoise(ctx, 0.2, t + 0.4, 0.1);
    },
  },

  // ─ 보상 ─
  {
    id: 'xp_gain',
    label: 'XP 획득',
    category: 'reward',
    description: 'XP 포인트 획득 코인 소리',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 987.77, 0.12, t, 'sine', 0.4);        // B5
      playRichTone(ctx, 1318.5, 0.2, t + 0.07, 'sine', 0.45); // E6
      playTone(ctx, 1975.5, 0.08, t + 0.05, 'sine', 0.1);     // B6 반짝임
      playNoise(ctx, 0.06, t + 0.08, 0.05);
    },
  },
  {
    id: 'level_up',
    label: '레벨업',
    category: 'reward',
    description: '레벨 상승 팡파레',
    play(ctx) {
      const t = ctx.currentTime;
      // 웅장한 팡파레: C E G C(high) + 화음 레이어
      playRichTone(ctx, 523.25, 0.2, t, 'sine', 0.4);
      playRichTone(ctx, 659.25, 0.2, t + 0.13, 'sine', 0.42);
      playRichTone(ctx, 783.99, 0.2, t + 0.26, 'sine', 0.45);
      // 피날레 화음 (C+E+G+C6 동시)
      playRichTone(ctx, 1046.5, 0.5, t + 0.39, 'sine', 0.5);
      playTone(ctx, 523.25, 0.5, t + 0.39, 'sine', 0.2);
      playTone(ctx, 659.25, 0.5, t + 0.39, 'sine', 0.18);
      playTone(ctx, 783.99, 0.5, t + 0.39, 'sine', 0.18);
      // 스파클
      playNoise(ctx, 0.25, t + 0.42, 0.12);
    },
  },
  {
    id: 'badge',
    label: '뱃지 획득',
    category: 'reward',
    description: '뱃지/업적 달성 효과',
    play(ctx) {
      const t = ctx.currentTime;
      // 반짝이는 상승 아르페지오 (풍성하게)
      const notes = [659.25, 783.99, 987.77, 1174.7, 1318.5]; // E5 G5 B5 D6 E6
      notes.forEach((f, i) => {
        playRichTone(ctx, f, 0.15, t + i * 0.07, 'sine', 0.35 + i * 0.03);
      });
      // 마지막 화음 유지
      playTone(ctx, 659.25, 0.3, t + 0.35, 'sine', 0.15);
      playTone(ctx, 987.77, 0.3, t + 0.35, 'sine', 0.15);
      playNoise(ctx, 0.25, t + 0.35, 0.12);
    },
  },
  {
    id: 'mission_complete',
    label: '미션 완료',
    category: 'reward',
    description: '일일 미션 달성',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 392, 0.15, t, 'sine', 0.35);          // G4
      playRichTone(ctx, 523.25, 0.15, t + 0.1, 'sine', 0.38); // C5
      playRichTone(ctx, 659.25, 0.15, t + 0.2, 'sine', 0.42); // E5
      playRichTone(ctx, 783.99, 0.35, t + 0.3, 'sine', 0.48); // G5
      playTone(ctx, 523.25, 0.3, t + 0.32, 'sine', 0.15);     // 화음
      playNoise(ctx, 0.18, t + 0.35, 0.1);
    },
  },
  {
    id: 'revenge_win',
    label: '복수전 승리',
    category: 'reward',
    description: '복수전 승리 시 승리 효과',
    play(ctx) {
      const t = ctx.currentTime;
      // 승리 팡파레 (강렬 + 화음)
      playRichTone(ctx, 392, 0.12, t, 'triangle', 0.35);
      playRichTone(ctx, 523.25, 0.12, t + 0.09, 'triangle', 0.38);
      playRichTone(ctx, 659.25, 0.12, t + 0.18, 'triangle', 0.42);
      playRichTone(ctx, 783.99, 0.12, t + 0.27, 'triangle', 0.45);
      // 피날레 화음
      playRichTone(ctx, 1046.5, 0.5, t + 0.36, 'sine', 0.5);
      playTone(ctx, 783.99, 0.45, t + 0.36, 'sine', 0.2);
      playTone(ctx, 523.25, 0.45, t + 0.36, 'sine', 0.15);
      playNoise(ctx, 0.2, t + 0.4, 0.12);
    },
  },

  // ─ UI ─
  {
    id: 'click',
    label: '버튼 클릭',
    category: 'ui',
    description: '일반 버튼/탭 전환 클릭음',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 1000, 0.05, t, 'sine', 0.3);
      playTone(ctx, 1500, 0.03, t + 0.01, 'sine', 0.12);
    },
  },
  {
    id: 'tab_switch',
    label: '탭 전환',
    category: 'ui',
    description: '탭/페이지 전환 시 부드러운 소리',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 600, 0.08, t, 'sine', 0.25);
      playTone(ctx, 900, 0.08, t + 0.04, 'sine', 0.2);
    },
  },
  {
    id: 'submit',
    label: '제출',
    category: 'ui',
    description: '시험/숙제 제출 확인',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 440, 0.12, t, 'sine', 0.35);
      playRichTone(ctx, 554.37, 0.12, t + 0.08, 'sine', 0.38);
      playRichTone(ctx, 659.25, 0.18, t + 0.16, 'sine', 0.42);
    },
  },
  {
    id: 'notification',
    label: '알림',
    category: 'ui',
    description: '토스트/알림 표시',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 880, 0.12, t, 'sine', 0.35);
      playRichTone(ctx, 1108.7, 0.15, t + 0.1, 'sine', 0.3);
    },
  },

  // ─ 타이머 ─
  {
    id: 'countdown_tick',
    label: '카운트다운 틱',
    category: 'timer',
    description: '퀴즈/시험 카운트다운 초읽기',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 800, 0.07, t, 'sine', 0.3);
      playTone(ctx, 1600, 0.04, t, 'sine', 0.1); // 배음
    },
  },
  {
    id: 'countdown_final',
    label: '카운트다운 종료',
    category: 'timer',
    description: '마지막 3초 긴박한 효과',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 880, 0.12, t, 'square', 0.3);
      playTone(ctx, 880, 0.12, t + 0.18, 'square', 0.35);
      playTone(ctx, 1760, 0.06, t, 'sine', 0.1);
      playTone(ctx, 1760, 0.06, t + 0.18, 'sine', 0.12);
    },
  },
  {
    id: 'timer_start',
    label: '타이머 시작',
    category: 'timer',
    description: '시험/연산 시작 신호',
    play(ctx) {
      const t = ctx.currentTime;
      playRichTone(ctx, 440, 0.15, t, 'sine', 0.35);
      playRichTone(ctx, 440, 0.15, t + 0.18, 'sine', 0.35);
      playRichTone(ctx, 880, 0.3, t + 0.36, 'sine', 0.5);
      playNoise(ctx, 0.1, t + 0.38, 0.06);
    },
  },
  {
    id: 'timer_end',
    label: '시간 종료',
    category: 'timer',
    description: '시험/연산 시간 만료',
    play(ctx) {
      const t = ctx.currentTime;
      playTone(ctx, 440, 0.2, t, 'sawtooth', 0.3);
      playTone(ctx, 349.23, 0.2, t + 0.22, 'sawtooth', 0.3);
      playTone(ctx, 261.63, 0.4, t + 0.44, 'sawtooth', 0.25);
      playTone(ctx, 261.63, 0.4, t + 0.44, 'sine', 0.15); // 깔기
    },
  },
];

// ── 카테고리 메타 ──

export const SOUND_CATEGORIES = {
  feedback: { label: '학습 피드백', icon: '📝', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  reward: { label: '보상/성취', icon: '🏆', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  ui: { label: 'UI 인터랙션', icon: '🖱️', color: 'bg-slate-50 border-slate-200 text-slate-700' },
  timer: { label: '타이머', icon: '⏱️', color: 'bg-red-50 border-red-200 text-red-700' },
} as const;

// ── 재생 헬퍼 (앱 전체에서 사용) ──

let _audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

/** 사운드 ID로 효과음 재생 (음소거 시 무시) */
export function playSound(id: string) {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('sound_muted') === 'true') return;

  const sound = SOUNDS.find((s) => s.id === id);
  if (!sound) return;

  try {
    const ctx = getAudioContext();
    sound.play(ctx);
  } catch {
    // 브라우저 정책으로 재생 불가 시 무시
  }
}

/** 음소거 토글 */
export function toggleMute(): boolean {
  const muted = localStorage.getItem('sound_muted') === 'true';
  localStorage.setItem('sound_muted', String(!muted));
  return !muted;
}

/** 음소거 상태 조회 */
export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('sound_muted') === 'true';
}
