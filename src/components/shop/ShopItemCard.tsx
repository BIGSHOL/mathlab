'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { Star, Lock, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AvatarEffect, EFFECT_META } from '@/components/ui/AvatarEffect';
import type { EffectType } from '@/components/ui/AvatarEffect';
import { AvatarAccessory, HAT_META, GLASSES_META } from '@/components/ui/AvatarAccessory';
import type { HatType, GlassesType } from '@/components/ui/AvatarAccessory';
import type { ShopItemData } from '@/types/shop';

interface ShopItemCardProps {
  item: ShopItemData;
  userLevel: number;
  spendableXp: number;
  onPurchase: (item: ShopItemData) => void;
  onEquip: (itemId: string, category: string) => void;
  onUnequip: (category: string) => void;
}

function ItemPreview({ item }: { item: ShopItemData }) {
  const style = item.value as CSSProperties;

  switch (item.category) {
    case 'FRAME':
      return (
        <div className="flex items-center justify-center h-20">
          <div
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-lg"
            style={style}
          >
            A
          </div>
        </div>
      );
    case 'BACKGROUND':
      return (
        <div className="h-20 rounded-sm flex items-center justify-center" style={style}>
          <span className="text-sm font-medium" style={{ color: (style as Record<string, string>).color || '#334155' }}>
            미리보기
          </span>
        </div>
      );
    case 'TITLE':
      return (
        <div className="flex items-center justify-center h-20">
          <span className="text-sm font-semibold text-slate-700">
            {(item.value as Record<string, string>).text}
          </span>
        </div>
      );
    case 'NAME_COLOR':
      return (
        <div className="flex items-center justify-center h-20">
          <span className="text-lg font-bold" style={style}>
            내 이름
          </span>
        </div>
      );
    case 'AVATAR':
      return (
        <div className="flex items-center justify-center h-20">
          <Image
            src={(item.value as Record<string, string>).src}
            alt={item.name}
            width={64}
            height={64}
            className="object-contain"
          />
        </div>
      );
    case 'EFFECT': {
      const effectKey = (item.value as Record<string, string>).effect as EffectType;
      const meta = EFFECT_META[effectKey];
      return (
        <div className="flex items-center justify-center h-20">
          <AvatarEffect effectType={effectKey} size={40}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm">
              {meta?.emoji ?? '?'}
            </div>
          </AvatarEffect>
        </div>
      );
    }
    case 'HAT': {
      const hatKey = (item.value as Record<string, string>).hat as HatType;
      const meta = HAT_META[hatKey];
      return (
        <div className="flex items-center justify-center h-20">
          <AvatarAccessory hatType={hatKey} size={40}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm">
              {meta?.emoji ?? '?'}
            </div>
          </AvatarAccessory>
        </div>
      );
    }
    case 'GLASSES': {
      const glassesKey = (item.value as Record<string, string>).glasses as GlassesType;
      const meta = GLASSES_META[glassesKey];
      return (
        <div className="flex items-center justify-center h-20">
          <AvatarAccessory glassesType={glassesKey} size={40}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-accent text-white flex items-center justify-center font-bold text-sm">
              {meta?.emoji ?? '?'}
            </div>
          </AvatarAccessory>
        </div>
      );
    }
    default:
      return <div className="h-20" />;
  }
}

export function ShopItemCard({ item, userLevel, spendableXp, onPurchase, onEquip, onUnequip }: ShopItemCardProps) {
  const locked = userLevel < item.levelReq;
  const canAfford = spendableXp >= item.price;

  return (
    <div className={`border rounded-sm overflow-hidden transition-all ${
      item.equipped ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-slate-300'
    }`}>
      {/* 미리보기 */}
      <div className={`border-b border-slate-100 px-3 py-2 ${locked ? 'opacity-40' : ''}`}>
        <ItemPreview item={item} />
      </div>

      {/* 정보 */}
      <div className="px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-text-primary truncate">{item.name}</h4>
          {locked && <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        </div>
        {item.description && (
          <p className="text-xs text-text-secondary mb-2 line-clamp-1">{item.description}</p>
        )}

        {/* 가격 */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className={`text-sm font-bold ${canAfford || item.owned ? 'text-amber-600' : 'text-red-500'}`}>
            {item.price} XP
          </span>
          {locked && (
            <span className="text-xs text-slate-400 ml-auto">Lv.{item.levelReq}</span>
          )}
        </div>

        {/* 액션 버튼 */}
        {item.equipped ? (
          <Button size="sm" variant="ghost" className="w-full" onClick={() => onUnequip(item.category)}>
            <Check className="w-3.5 h-3.5 mr-1" />
            장착 해제
          </Button>
        ) : item.owned ? (
          <Button size="sm" variant="secondary" className="w-full" onClick={() => onEquip(item.id, item.category)}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            장착하기
          </Button>
        ) : (
          <Button
            size="sm"
            className="w-full"
            disabled={locked || !canAfford}
            onClick={() => onPurchase(item)}
          >
            {locked ? '잠김' : !canAfford ? 'XP 부족' : '구매하기'}
          </Button>
        )}
      </div>
    </div>
  );
}
