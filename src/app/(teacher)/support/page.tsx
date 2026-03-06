'use client';

import { useState } from 'react';
import {
  HelpCircle,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  Phone,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const FAQ_ITEMS = [
  {
    q: '학생 계정은 어떻게 생성하나요?',
    a: '학생 관리 페이지에서 "학생 추가" 버튼을 클릭하여 이름, 아이디, 초기 비밀번호, 학년을 입력하면 계정이 생성됩니다.',
  },
  {
    q: '학생의 비밀번호를 초기화하려면?',
    a: '학생 관리 페이지에서 해당 학생의 "비밀번호 초기화" 버튼을 클릭하면 비밀번호가 1234로 초기화됩니다.',
  },
  {
    q: '학습 분석 리포트는 어떻게 확인하나요?',
    a: '학습 분석 메뉴에서 학생을 선택하면 월간 분석 리포트를 확인할 수 있습니다. PDF로 다운로드하여 학부모에게 전달할 수도 있습니다.',
  },
  {
    q: '4단계 학습 시스템이 무엇인가요?',
    a: 'Stage 1(개념 읽기) → Stage 2(빈칸 쉬움) → Stage 3(빈칸 어려움) → Stage 4(백지 쓰기)의 4단계로 구성되어 있으며, 학생이 개념을 완전히 이해할 수 있도록 설계되었습니다.',
  },
  {
    q: 'XP와 레벨 시스템은 어떻게 작동하나요?',
    a: '학생이 각 스테이지를 완료할 때마다 XP를 획득합니다. XP가 일정량 이상 쌓이면 레벨이 올라가며, 랭킹 페이지에서 다른 학생과 순위를 비교할 수 있습니다.',
  },
];

export default function SupportPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  return (
    <div className="flex-1 p-6 md:p-10 max-w-[1000px] mx-auto w-full flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">고객지원</h1>
        <p className="text-text-secondary text-sm mt-1">
          도움이 필요하신가요? FAQ를 확인하거나 문의해주세요.
        </p>
      </div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 flex flex-col items-center text-center gap-3 hover:shadow-hover transition-shadow">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-bold text-text-primary">이메일 문의</h3>
          <p className="text-sm text-text-secondary">support@mathlogic.lab</p>
          <p className="text-xs text-text-secondary">영업일 기준 24시간 이내 답변</p>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-3 hover:shadow-hover transition-shadow">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <Phone className="w-6 h-6 text-emerald-600" />
          </div>
          <h3 className="font-bold text-text-primary">전화 상담</h3>
          <p className="text-sm text-text-secondary">02-1234-5678</p>
          <p className="text-xs text-text-secondary">평일 09:00 - 18:00</p>
        </Card>

        <Card className="p-6 flex flex-col items-center text-center gap-3 hover:shadow-hover transition-shadow">
          <div className="p-3 bg-amber-50 rounded-xl">
            <BookOpen className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-text-primary">사용 가이드</h3>
          <p className="text-sm text-text-secondary">자세한 사용법 안내</p>
          <button className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
            가이드 보기 <ExternalLink className="w-3 h-3" />
          </button>
        </Card>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" /> 자주 묻는 질문
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ_ITEMS.map((item, i) => (
            <Card key={i} className="overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-semibold text-text-primary pr-4">{item.q}</span>
                {expandedFaq === i ? (
                  <ChevronUp className="w-5 h-5 text-text-secondary shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-text-secondary shrink-0" />
                )}
              </button>
              {expandedFaq === i && (
                <div className="px-6 pb-4 text-sm text-text-secondary leading-relaxed border-t border-slate-100 pt-3">
                  {item.a}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Form */}
      <div>
        <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" /> 1:1 문의하기
        </h2>
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">제목</label>
            <input
              className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]"
              placeholder="문의 제목을 입력해주세요"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">카테고리</label>
            <select className="h-11 px-4 rounded-lg border border-slate-200 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px]">
              <option>계정 관련</option>
              <option>학습 기능</option>
              <option>시스템 오류</option>
              <option>기타</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-text-primary">내용</label>
            <textarea
              className="px-4 py-3 rounded-lg border border-slate-200 bg-white text-text-primary placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-[15px] min-h-[120px] resize-y"
              placeholder="문의 내용을 자세히 적어주세요"
            />
          </div>
          <div className="pt-2">
            <Button>
              <MessageSquare className="w-4 h-4 mr-2" />
              문의 등록
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
