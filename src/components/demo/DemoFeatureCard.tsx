'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { LucideIcon } from 'lucide-react';

interface DemoFeatureCardProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  href: string;
  tag?: string;
  tagVariant?: 'default' | 'info' | 'success' | 'warning';
}

export function DemoFeatureCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  href,
  tag,
  tagVariant = 'info',
}: DemoFeatureCardProps) {
  return (
    <Card
      padding="lg"
      className="group hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-sm ${iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {tag && <Badge variant={tagVariant}>{tag}</Badge>}
      </div>
      <h3 className="text-base font-bold text-text-primary mb-1.5">{title}</h3>
      <p className="text-sm text-text-secondary leading-relaxed mb-4 flex-1">{description}</p>
      <Link href={href}>
        <Button size="sm" variant="ghost" className="w-full justify-center group-hover:bg-primary/5">
          체험하기 &rarr;
        </Button>
      </Link>
    </Card>
  );
}
