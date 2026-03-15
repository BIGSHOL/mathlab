import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getCurrentUser } from '@/lib/auth';

// GET /api/concepts/bulk/template — 샘플 엑셀 템플릿 다운로드
export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role === 'STUDENT') {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: '권한이 없습니다' } },
      { status: 403 },
    );
  }
  const headers = ['제목', '내용', '개념코드', '학년', '학기', '대단원', '중단원', '소단원', '카테고리', '영역', '출처', '키워드'];
  const exampleRow = [
    '소수와 합성수',
    '소수는 1과 자기 자신만으로 나누어지는 자연수입니다. 합성수는 1과 자기 자신 외에 다른 약수를 가진 자연수입니다.',
    'M1-NUM-01',
    'middle_1',
    '1',
    '자연수의 성질',
    '소수와 합성수',
    '',
    'concept',
    'calc',
    '',
    '소수,합성수,약수',
  ];
  const helpRow = [
    '(필수) 최대 200자',
    '(필수) 개념 설명 전문',
    '(선택) 최대 20자, 고유값',
    '(선택) elementary_3~6, middle_1~3, high_1~2/high_algebra/high_calculus1/high_prob/high_calculus2/high_geo',
    '(선택) 1 또는 2',
    '(선택) 교육과정 대단원명',
    '(선택) 교육과정 중단원명',
    '(선택) 교육과정 소단원명',
    '(선택) concept',
    '(선택) calc, algebra, func, geo, data',
    '(선택) 출처',
    '(선택) 쉼표로 구분',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow, helpRow]);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // 제목
    { wch: 50 }, // 내용
    { wch: 15 }, // 개념코드
    { wch: 20 }, // 학년
    { wch: 8 },  // 학기
    { wch: 20 }, // 대단원
    { wch: 20 }, // 중단원
    { wch: 20 }, // 소단원
    { wch: 12 }, // 카테고리
    { wch: 12 }, // 영역
    { wch: 15 }, // 출처
    { wch: 20 }, // 키워드
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '개념 템플릿');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="concept-template.xlsx"',
    },
  });
}
