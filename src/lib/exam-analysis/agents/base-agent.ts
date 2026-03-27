/**
 * 에이전트 추상 기반 클래스
 * 모든 확장 분석 에이전트의 공통 인터페이스
 */

import { GoogleGenAI } from '@google/genai';
import type { AgentType } from '../constants';
import type { BasicAnalysisResult } from '../types';

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

const MODEL_NAME = 'gemini-2.5-flash';

export interface AgentInput {
  basicAnalysis: BasicAnalysisResult;
  [key: string]: unknown;
}

export abstract class BaseAgent<TResult> {
  abstract readonly agentType: AgentType;
  abstract readonly temperature: number;

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
    try {
      return await this.aiAnalysis(input);
    } catch (e) {
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
    const result = JSON.parse(cleaned);
    return this.parseResponse(result);
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
