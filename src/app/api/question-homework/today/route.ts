import { NextRequest, NextResponse } from 'next/server';
import { requireAuthViewAs, isResponse, requireLicense } from '@/lib/api';
import { getTodayQuestionHomework } from '@/lib/services/question-homework';

export async function GET(request: NextRequest) {
  const user = await requireAuthViewAs(request);
  if (isResponse(user)) return user;
  const licenseCheck = await requireLicense(user, 'homework');
  if (licenseCheck) return licenseCheck;

  const homework = await getTodayQuestionHomework(user.id);
  return NextResponse.json({ data: homework });
}
