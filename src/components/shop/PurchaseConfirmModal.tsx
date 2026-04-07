'use client';

import type { CSSProperties } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ShopItemData } from '@/types/shop';

interface PurchaseConfirmModalProps {
  item: ShopItemData;
  spendableXp: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PurchaseConfirmModal({ item, spendableXp, loading, onConfirm, onCancel }: PurchaseConfirmModalProps) {
  const remaining = spendableXp - item.price;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-white rounded-sm shadow-xl w-full max-w-sm mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-text-primary mb-4">아이템 구매</h3>

        {/* 미리보기 */}
        <div className="border border-slate-200 rounded-sm p-4 mb-4 flex items-center gap-4">
          {item.category === 'FRAME' && (
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold shrink-0"
              style={item.value as CSSProperties}
            >
              A
            </div>
          )}
          <div>
            <p className="font-semibold text-text-primary">{item.name}</p>
            <p className="text-sm text-text-secondary">{item.description}</p>
          </div>
        </div>

        {/* 가격 정보 */}
        <div className="space-y-2 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">아이템 가격</span>
            <span className="font-bold text-amber-600 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              {item.price} XP
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">보유 XP</span>
            <span className="font-medium">{spendableXp} XP</span>
          </div>
          <div className="border-t border-slate-100 pt-2 flex justify-between">
            <span className="text-text-secondary">구매 후 잔액</span>
            <span className={`font-bold ${remaining >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {remaining} XP
            </span>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button className="flex-1" onClick={onConfirm} disabled={loading}>
            {loading ? '구매 중...' : '구매하기'}
          </Button>
        </div>
      </div>
    </div>
  );
}
