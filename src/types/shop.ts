import type { CSSProperties } from 'react';

export interface EquippedItems {
  frame?: string;      // ShopItem id
  background?: string;
  title?: string;
  nameColor?: string;
  avatar?: string;
  effect?: string;
  hat?: string;
  glasses?: string;
}

/** resolve된 스타일 (렌더링용) */
export interface EquippedStyles {
  frame?: CSSProperties;
  background?: CSSProperties;
  title?: string;           // 칭호 텍스트
  nameColor?: CSSProperties;
  avatar?: string;          // 아바타 이미지 경로
  effect?: string;          // 이펙트 타입 (sparkle, hearts 등)
  hat?: string;             // 모자 타입 (crown, baseball 등)
  glasses?: string;         // 안경 타입 (round, sunglasses 등)
}

export interface ShopItemData {
  id: string;
  category: 'FRAME' | 'BACKGROUND' | 'TITLE' | 'NAME_COLOR' | 'AVATAR' | 'EFFECT' | 'HAT' | 'GLASSES';
  name: string;
  description: string | null;
  price: number;
  value: Record<string, string>;
  preview: string | null;
  levelReq: number;
  owned: boolean;
  equipped: boolean;
}
