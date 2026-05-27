/**
 * 에이전트 추상 기반 클래스
 * 모든 확장 분석 에이전트의 공통 인터페이스
 */

import { GoogleGenAI } from '@google/genai';
import type { AgentType } from '../constants';
import { AGENT_PROMPT_VERSIONS } from '../constants';
import type { BasicAnalysisResult } from '../types';
import { normalizeMathText } from '@/lib/pdf-extract-engine/ai/post-processor';

/**
 * AI 응답 객체의 모든 문자열 필드에 수식 정규화를 재귀 적용.
 * \dfrac→\frac, \text{한글} 제거, 인접 수식 글루 분리, literal \n 복원 등.
 *
 * CommentaryAgent 처럼 base-agent.aiAnalysis 를 오버라이드하는 에이전트에서
 * 동일한 정규화 일관성을 유지하기 위해 export.
 */
export function deepNormalizeMath<T>(value: T): T {
  if (typeof value === 'string') return normalizeMathText(value) as unknown as T;
  if (Array.isArray(value)) return value.map(deepNormalizeMath) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepNormalizeMath(v);
    }
    return out as unknown as T;
  }
  return value;
}

// 독립 Gemini 클라이언트 (ai-engine.ts와 동일 패턴)
let _agentClient: GoogleGenAI | null = null;

function getAgentClient(): GoogleGenAI {
  if (!_agentClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY 환경변수가 설정되지 않았습니다');
    _agentClient = new GoogleGenAI({ apiKey });
  }
  return _agentClient;
}

const MODEL_NAME = 'gemini-3.5-flash';

export interface AgentInput {
  basicAnalysis: BasicAnalysisResult;
  [key: string]: unknown;
}

export abstract class BaseAgent<TResult> {
  abstract readonly agentType: AgentType;
  abstract readonly temperature: number;

  /**
   * 마지막 AI 호출이 실패해서 ruleBased 폴백으로 갔다면 여기에 에러 메시지가 들어감.
   * orchestrator 가 이 값을 읽어서 DB의 errorMessage 필드에 기록 → 다음 호출 시 캐시 무시 + 진단 정보 노출.
   */
  lastAiFailure: string | null = null;

  /** 에이전트별 프롬프트 버전 (constants.AGENT_PROMPT_VERSIONS 참조) */
  get promptVersion(): string {
    return AGENT_PROMPT_VERSIONS[this.agentType] ?? 'v0.0.0';
  }

  /**
   * AI 프롬프트 생성
   */
  abstract buildPrompt(input: AgentInput): string;

  /**
   * AI 응답 파싱
   */
  abstract parseResponse(raw: Record<string, unknown>): TResult;

  /**
   * 규칙 기반 폴백 (AI 실패 시)
   */
  abstract ruleBased(input: AgentInput): TResult;

  /**
   * 에이전트 실행 (AI 우선, 실패 시 규칙 기반)
   */
  async run(input: AgentInput): Promise<TResult> {
    this.lastAiFailure = null;
    try {
      return await this.aiAnalysis(input);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.lastAiFailure = msg;
      console.error(`[${this.agentType}] AI 분석 실패, 규칙 기반 폴백:`, e);
      return this.ruleBased(input);
    }
  }

  /**
   * AI 기반 분석
   */
  protected async aiAnalysis(input: AgentInput): Promise<TResult> {
    const client = getAgentClient();
    const prompt = this.buildPrompt(input);

    const response = await client.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: this.temperature,
        maxOutputTokens: 4096,
      },
    });

    const text = response.text;
    if (!text) throw new Error('AI 응답이 비어있습니다');

    // 코드 펜스 제거
    const cleaned = text.replace(/```(?:json)?\s*/g, '').replace(/```\s*$/g, '').trim();
    const parsed = JSON.parse(cleaned);
    // 수식 정규화 하네스: 모든 문자열 필드에 normalizeMathText 적용
    // (\dfrac→\frac, \text{한글} 제거, $A$$B$→$A$ $B$, literal \n 복원 등)
    const normalized = deepNormalizeMath(parsed);
    return this.parseResponse(normalized);
  }

  // ── 공통 유틸 ──

  protected safePercent(count: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((count / total) * 1000) / 10;
  }

  protected calcSeverity(count: number, total: number, thresholdHigh = 0.3): 'critical' | 'high' | 'medium' | 'low' {
    if (total === 0) return 'low';
    const ratio = count / total;
    if (ratio >= thresholdHigh * 2) return 'critical';
    if (ratio >= thresholdHigh) return 'high';
    if (ratio >= thresholdHigh / 2) return 'medium';
    return 'low';
  }
}
