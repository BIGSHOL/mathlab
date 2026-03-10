import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

// GET /api/concepts/bulk/template — 샘플 엑셀 템플릿 다운로드
export async function GET() {
  const headers = ['제목', '내용', '개념코드', '학년', '카테고리', '영역', '키워드'];
  const exampleRow = [
    '소수와 합성수',
    '소수는 1과 자기 자신만으로 나누어지는 자연수입니다. 합성수는 1과 자기 자신 외에 다른 약수를 가진 자연수입니다.',
    'M1-NUM-01',
    'middle_1',
    'concept',
    'calc',
    '소수,합성수,약수',
  ];
  const helpRow = [
    '(필수) 최대 200자',
    '(필수) 개념 설명 전문',
    '(선택) 최대 20자, 고유값',
    '(선택) elementary_3~6, middle_1~3, high_1',
    '(선택) concept 또는 computation',
    '(선택) calc, algebra, func, geo, data',
    '(선택) 쉼표로 구분',
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow, helpRow]);

  // Set column widths
  ws['!cols'] = [
    { wch: 20 }, // 제목
    { wch: 50 }, // 내용
    { wch: 15 }, // 개념코드
    { wch: 15 }, // 학년
    { wch: 15 }, // 카테고리
    { wch: 12 }, // 영역
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
