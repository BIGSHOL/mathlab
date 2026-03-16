/**
 * Gemini AI 공통 유틸리티
 * mathgen.ts, pdf-extract route 등에서 반복되던 클라이언트 초기화 + 응답 파싱 통합
 */

import { GoogleGenAI } from '@google/genai';

let _client: GoogleGenAI | null = null;

/** Gemini 클라이언트 (싱글톤) */
export function getGeminiClient(): GoogleGenAI {
  if (_client) return _client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing. Set it in .env.local');
  _client = new GoogleGenAI({ apiKey });
  return _client;
}

/** Gemini 응답 텍스트에서 코드 펜스(```json, ```xml 등) 제거 */
export function stripCodeFence(text: string): string {
  let s = text.trim();
  if (s.startsWith('```json')) {
    s = s.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (s.startsWith('```xml')) {
    s = s.replace(/^```xml\s*/, '').replace(/\s*```$/, '');
  } else if (s.startsWith('```svg')) {
    s = s.replace(/^```svg\s*/, '').replace(/\s*```$/, '');
  } else if (s.startsWith('```')) {
    s = s.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return s;
}

/** Gemini 응답을 JSON으로 파싱 (코드 펜스 자동 제거) */
export function parseGeminiJson<T>(text: string | undefined): T {
  if (!text) throw new Error('No content generated.');
  return JSON.parse(stripCodeFence(text)) as T;
}
