'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { KeyRound, LayoutDashboard, Users, BarChart3, ShieldAlert } from 'lucide-react';
import { useAuth, hasRoleClient } from '@/hooks/useAuth';
import LicenseOverviewTab from '@/components/teacher/licenses/LicenseOverviewTab';
import LicenseAssignmentTab from '@/components/teacher/licenses/LicenseAssignmentTab';
import LicenseUsageTab from '@/components/teacher/licenses/LicenseUsageTab';

type TabKey = 'overview' | 'assignment' | 'usage';

export default function LicensesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isOwner = hasRoleClient(user?.role, 'OWNER');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  if (authLoading) {
    return (
      <PageContainer maxWidth="xl">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </PageContainer>
    );
  }

  if (!isOwner) {
    return (
      <PageContainer maxWidth="xl">
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <ShieldAlert className="w-8 h-8 mb-2 text-slate-300" />
          <p className="text-sm">지점장 이상 권한이 필요합니다</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="xl">
      <PageHeader
        title="이용권 관리"
        subtitle="이용권 현황, 학생 배정, 사용 통계를 확인합니다"
        icon={<KeyRound className="w-6 h-6" />}
      />

      <div className="mb-6">
        <Tabs
          variant="underline"
          items={[
            { key: 'overview' as TabKey, label: '이용권 현황', icon: LayoutDashboard },
            { key: 'assignment' as TabKey, label: '학생 배정', icon: Users },
            { key: 'usage' as TabKey, label: '사용 통계', icon: BarChart3 },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab === 'overview' && <LicenseOverviewTab />}
      {activeTab === 'assignment' && <LicenseAssignmentTab />}
      {activeTab === 'usage' && <LicenseUsageTab />}
    </PageContainer>
  );
}
