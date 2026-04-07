'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, Frame, Palette, Award, Type, ShoppingBag, User, Wand2, Crown, Glasses } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { ShopItemCard } from '@/components/shop/ShopItemCard';
import { PurchaseConfirmModal } from '@/components/shop/PurchaseConfirmModal';
import { toast } from '@/components/ui/Toast';
import type { ShopItemData } from '@/types/shop';

type CategoryKey = 'ALL' | 'FRAME' | 'BACKGROUND' | 'TITLE' | 'NAME_COLOR' | 'AVATAR' | 'EFFECT' | 'HAT' | 'GLASSES';

const TABS = [
  { key: 'ALL' as CategoryKey, label: '전체', icon: ShoppingBag },
  { key: 'AVATAR' as CategoryKey, label: '아바타', icon: User },
  { key: 'HAT' as CategoryKey, label: '모자', icon: Crown },
  { key: 'GLASSES' as CategoryKey, label: '안경', icon: Glasses },
  { key: 'EFFECT' as CategoryKey, label: '이펙트', icon: Wand2 },
  { key: 'FRAME' as CategoryKey, label: '프레임', icon: Frame },
  { key: 'BACKGROUND' as CategoryKey, label: '배경', icon: Palette },
  { key: 'TITLE' as CategoryKey, label: '칭호', icon: Award },
  { key: 'NAME_COLOR' as CategoryKey, label: '닉네임 색상', icon: Type },
];

export default function ShopPage() {
  const [category, setCategory] = useState<CategoryKey>('ALL');
  const [items, setItems] = useState<ShopItemData[]>([]);
  const [spendableXp, setSpendableXp] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [confirmItem, setConfirmItem] = useState<ShopItemData | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const params = category !== 'ALL' ? `?category=${category}` : '';
      const res = await fetch(`/api/shop/items${params}`);
      const json = await res.json();
      if (json.data) {
        setItems(json.data.items);
        setSpendableXp(json.data.spendableXp);
        if (json.data.level) setUserLevel(json.data.level);
      }
    } catch {
      toast.error('아이템 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    setLoading(true);
    fetchItems();
  }, [fetchItems]);

  const handlePurchase = async () => {
    if (!confirmItem) return;
    setPurchasing(true);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: confirmItem.id }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success(`"${json.data.itemName}" 구매 완료!`);
        setSpendableXp(json.data.remainingXp);
        fetchItems();
      }
    } catch {
      toast.error('구매에 실패했습니다');
    } finally {
      setPurchasing(false);
      setConfirmItem(null);
    }
  };

  const handleEquip = async (itemId: string, cat: string) => {
    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, category: cat }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success('장착 완료!');
        fetchItems();
      }
    } catch {
      toast.error('장착에 실패했습니다');
    }
  };

  const handleUnequip = async (cat: string) => {
    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: null, category: cat }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error.message);
      } else {
        toast.success('장착 해제 완료');
        fetchItems();
      }
    } catch {
      toast.error('장착 해제에 실패했습니다');
    }
  };

  return (
    <PageContainer maxWidth="lg">
      <PageHeader title="상점" />

      {/* 보유 XP */}
      <div className="flex items-center gap-2 mb-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/60 rounded-sm px-4 py-3">
        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
        <span className="text-sm text-text-secondary">사용 가능 XP</span>
        <span className="text-xl font-bold text-amber-600 ml-1">{spendableXp.toLocaleString()}</span>
      </div>

      {/* 카테고리 탭 */}
      <div className="mb-5">
        <Tabs items={TABS} activeKey={category} onChange={setCategory} />
      </div>

      {/* 아이템 그리드 */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="border border-slate-200 rounded-sm h-52 animate-pulse bg-slate-50" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p>이 카테고리에 아이템이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              userLevel={userLevel}
              spendableXp={spendableXp}
              onPurchase={setConfirmItem}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
            />
          ))}
        </div>
      )}

      {/* 구매 확인 모달 */}
      {confirmItem && (
        <PurchaseConfirmModal
          item={confirmItem}
          spendableXp={spendableXp}
          loading={purchasing}
          onConfirm={handlePurchase}
          onCancel={() => setConfirmItem(null)}
        />
      )}
    </PageContainer>
  );
}
