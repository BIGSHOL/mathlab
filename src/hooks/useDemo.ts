'use client';

import { useAuth } from './useAuth';
import { isDemoUser } from '@/lib/demo';

export function useDemo() {
  const { user } = useAuth();
  return { isDemo: isDemoUser(user) };
}
