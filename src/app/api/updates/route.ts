import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUpdatesByRole } from '@/lib/data/updates';

export async function GET() {
  const currentUser = await getCurrentUser();
  const role = currentUser?.role ?? null;
  const updates = getUpdatesByRole(role);

  return NextResponse.json({ data: updates });
}
