'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { KeyRound, LayoutDashboard, Users, BarChart3 } from 'lucide-react';
import LicenseOverviewTab from '@/components/teacher/licenses/LicenseOverviewTab';
import LicenseAssignmentTab from '@/components/teacher/licenses/LicenseAssignmentTab';
import LicenseUsageTab from '@/components/teacher/licenses/LicenseUsageTab';

type TabKey = 'overview' | 'assignment' | 'usage';

export default function LicensesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

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
