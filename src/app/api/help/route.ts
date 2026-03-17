import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getHelpByRole } from '@/lib/data/help';

export async function GET() {
  const currentUser = await getCurrentUser();
  const role = currentUser?.role ?? null;
  const categories = getHelpByRole(role);

  return NextResponse.json({ data: categories });
}
