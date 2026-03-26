import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
    // 1. 출석 및 스트릭 업적
    { key: 'streak_3', label: '작은 불씨', description: '연속 학습 3일 달성', icon: '/badges/streak_3.png', color: '#f59e0b', condition: { type: 'streak', value: 3 }, sortOrder: 10 },
    { key: 'streak_7', label: '타오르는 열정', description: '연속 학습 7일 달성', icon: '/badges/streak_7.png', color: '#ef4444', condition: { type: 'streak', value: 7 }, sortOrder: 11 },
    { key: 'streak_14', label: '꺾이지 않는 마음', description: '연속 학습 14일 달성', icon: '/badges/streak_14.png', color: '#b91c1c', condition: { type: 'streak', value: 14 }, sortOrder: 12 },
    { key: 'streak_30', label: '습관의 완성', description: '연속 학습 30일 달성', icon: '/badges/streak_30.png', color: '#8b5cf6', condition: { type: 'streak', value: 30 }, sortOrder: 13 },

    // 2. 백지쓰기/개념 업적
    { key: 'blank_1', label: '첫 발걸음', description: '개념 백지쓰기 1회 통과', icon: '/badges/blank_1.png', color: '#3b82f6', condition: { type: 'blank', value: 1 }, sortOrder: 20 },
    { key: 'blank_10', label: '지식의 탐구자', description: '개념 백지쓰기 10회 통과', icon: '/badges/blank_10.png', color: '#2563eb', condition: { type: 'blank', value: 10 }, sortOrder: 21 },
    { key: 'blank_50', label: '완벽주의자', description: '개념 백지쓰기 50회 통과', icon: '/badges/blank_50.png', color: '#1d4ed8', condition: { type: 'blank', value: 50 }, sortOrder: 22 },
    { key: 'blank_perfect', label: '결백주의', description: '오답 없이 한 번에 백지쓰기 통과', icon: '/badges/blank_perfect.png', color: '#d946ef', condition: { type: 'blank_perfect', value: 1 }, sortOrder: 23 },

    // 3. 연산 연습 업적
    { key: 'arithmetic_100', label: '계산의 시작', description: '연산 문제 100개 정답', icon: '/badges/arithmetic_100.png', color: '#10b981', condition: { type: 'arithmetic', value: 100 }, sortOrder: 30 },
    { key: 'arithmetic_1000', label: '인간 계산기', description: '연산 문제 1,000개 정답', icon: '/badges/arithmetic_1000.png', color: '#059669', condition: { type: 'arithmetic', value: 1000 }, sortOrder: 31 },
    { key: 'timeattack_1', label: '빛보다 빠른', description: '연산 타임어택 최초 참여', icon: '/badges/timeattack_1.png', color: '#0ea5e9', condition: { type: 'timeattack', value: 1 }, sortOrder: 32 },

    // 4. 시험 및 결과 업적
    { key: 'test_100_1', label: '백점 만점', description: '시험에서 첫 100점 달성', icon: '/badges/test_100_1.png', color: '#ec4899', condition: { type: 'test_100', value: 1 }, sortOrder: 40 },
    { key: 'test_100_5', label: '퍼펙트 스코어', description: '시험 100점 5회 달성', icon: '/badges/test_100_5.png', color: '#be185d', condition: { type: 'test_100', value: 5 }, sortOrder: 41 },
    { key: 'level_5', label: '폭풍 성장', description: '캐릭터 레벨 5 달성', icon: '/badges/level_5.png', color: '#14b8a6', condition: { type: 'level', value: 5 }, sortOrder: 42 },
    { key: 'level_10', label: '마스터의 길', description: '캐릭터 레벨 10 달성', icon: '/badges/level_10.png', color: '#0f766e', condition: { type: 'level', value: 10 }, sortOrder: 43 },

    // 5. 히든 업적 (조건 안보여줌)
    { key: 'hidden_owl', label: '올빼미족', description: '새벽 시간(00시~04시)에 학습 진행', icon: '/badges/hidden_owl.png', color: '#4f46e5', condition: { type: 'hidden_owl', value: 1 }, sortOrder: 90 },
    { key: 'hidden_error', label: '버그 헌터', description: '예상치 못한 시스템 에러 화면 발견', icon: '/badges/hidden_error.png', color: '#6b7280', condition: { type: 'hidden_error', value: 1 }, sortOrder: 91 },

    // ──────── 2차 업적 업데이트 ────────

    // 추가된 스트릭
    { key: 'streak_100', label: '백일의 기적', description: '연속 학습 100일 달성', icon: '/badges/streak_100.png', color: '#c026d3', condition: { type: 'streak', value: 100 }, sortOrder: 14 },
    { key: 'streak_365', label: '1년의 마스터', description: '연속 학습 365일 달성', icon: '/badges/streak_365.png', color: '#db2777', condition: { type: 'streak', value: 365 }, sortOrder: 15 },
    { key: 'earlybird_1', label: '얼리버드', description: '오전 6시~8시 사이 학습 완료', icon: '/badges/earlybird_1.png', color: '#fb923c', condition: { type: 'earlybird', value: 1 }, sortOrder: 16 },

    // 주말의 전사
    { key: 'weekend_1', label: '주말의 시작', description: '주말에 1시간 이상 학습 1회', icon: '/badges/weekend_1.png', color: '#2dd4bf', condition: { type: 'weekend', value: 1 }, sortOrder: 17 },
    { key: 'weekend_5', label: '주말 지킴이', description: '주말에 1시간 이상 학습 5회', icon: '/badges/weekend_5.png', color: '#0d9488', condition: { type: 'weekend', value: 5 }, sortOrder: 18 },
    { key: 'weekend_20', label: '주말의 전사', description: '주말에 1시간 이상 학습 20회', icon: '/badges/weekend_20.png', color: '#115e59', condition: { type: 'weekend', value: 20 }, sortOrder: 19 },

    // 추가된 백지쓰기
    { key: 'blank_100', label: '암기왕', description: '개념 백지쓰기 100회 통과', icon: '/badges/blank_100.png', color: '#1e3a8a', condition: { type: 'blank', value: 100 }, sortOrder: 24 },
    { key: 'blank_500', label: '인간 백과사전', description: '개념 백지쓰기 500회 통과', icon: '/badges/blank_500.png', color: '#312e81', condition: { type: 'blank', value: 500 }, sortOrder: 25 },

    // 추가된 연산 연습
    { key: 'arithmetic_5000', label: '연산의 신', description: '연산 문제 5,000개 정답', icon: '/badges/arithmetic_5000.png', color: '#047857', condition: { type: 'arithmetic', value: 5000 }, sortOrder: 33 },
    { key: 'arithmetic_10000', label: '걸어다니는 슈퍼컴', description: '연산 문제 10,000개 정답', icon: '/badges/arithmetic_10000.png', color: '#064e3b', condition: { type: 'arithmetic', value: 10000 }, sortOrder: 34 },

    // 추가된 타임어택
    { key: 'timeattack_10', label: '스피드 러너', description: '연산 타임어택 10개 돌파', icon: '/badges/timeattack_10.png', color: '#0284c7', condition: { type: 'timeattack', value: 10 }, sortOrder: 35 },
    { key: 'timeattack_30', label: '시간의 지배자', description: '연산 타임어택 30개 돌파', icon: '/badges/timeattack_30.png', color: '#0369a1', condition: { type: 'timeattack', value: 30 }, sortOrder: 36 },

    // 추가된 시험/레벨
    { key: 'test_100_10', label: '만점 폭격기', description: '시험 100점 10회 달성', icon: '/badges/test_100_10.png', color: '#9d174d', condition: { type: 'test_100', value: 10 }, sortOrder: 44 },
    { key: 'level_20', label: '베테랑', description: '캐릭터 레벨 20 달성', icon: '/badges/level_20.png', color: '#065f46', condition: { type: 'level', value: 20 }, sortOrder: 45 },
    { key: 'level_50', label: '그랜드 마스터', description: '캐릭터 레벨 50 달성', icon: '/badges/level_50.png', color: '#022c22', condition: { type: 'level', value: 50 }, sortOrder: 46 },
    { key: 'recovery_30', label: '불굴의 의지', description: '이전 시험 대비 30점 이상 향상', icon: '/badges/recovery_30.png', color: '#ca8a04', condition: { type: 'recovery', value: 30 }, sortOrder: 47 },
    { key: 'revenge_100', label: '극복의 아이콘', description: '오답노트 누적 복습 100문제', icon: '/badges/revenge_100.png', color: '#eab308', condition: { type: 'revenge', value: 100 }, sortOrder: 48 },

    // ──────── 3차 업적 업데이트 (망각곡선) ────────
    { key: 'forgetting_1', label: '망각과의 싸움', description: '망각곡선 복습 1회 완료', icon: '/badges/forgetting_1.png', color: '#6366f1', condition: { type: 'forgetting', value: 1 }, sortOrder: 50 },
    { key: 'forgetting_10', label: '기억의 파수꾼', description: '망각곡선 복습 10회 완료', icon: '/badges/forgetting_10.png', color: '#3b82f6', condition: { type: 'forgetting', value: 10 }, sortOrder: 51 },
    { key: 'forgetting_50', label: '에빙하우스의 후예', description: '망각곡선 복습 50회 완료', icon: '/badges/forgetting_50.png', color: '#8b5cf6', condition: { type: 'forgetting', value: 50 }, sortOrder: 52 },
    { key: 'forgetting_100', label: '완전 기억 능력자', description: '망각곡선 복습 100회 완료', icon: '/badges/forgetting_100.png', color: '#f59e0b', condition: { type: 'forgetting', value: 100 }, sortOrder: 53 },

    // 추가된 히든 업적
    { key: 'hidden_marathon', label: '마라토너', description: '하루에 5시간 이상 로그인 유지', icon: '/badges/hidden_marathon.png', color: '#4338ca', condition: { type: 'hidden_marathon', value: 1 }, sortOrder: 92 },
    { key: 'hidden_answer', label: '저기요, 답지 보셨어요?', description: '하루에 답보기 기능 50번 이상 사용', icon: '/badges/hidden_answer.png', color: '#374151', condition: { type: 'hidden_answer', value: 1 }, sortOrder: 93 },
    { key: 'hidden_quiz', label: '고독한 싸움꾼', description: '실시간 퀴즈에서 혼자만 정답 맞추기', icon: '/badges/hidden_quiz.png', color: '#111827', condition: { type: 'hidden_quiz', value: 1 }, sortOrder: 94 },

    // ──────── 4차 업적 업데이트 (종합 활동) ────────
    { key: 'ranking_1', label: '지점의 자존심', description: '우리 지점 랭킹 1위 최초 달성', icon: '/badges/ranking_1.png', color: '#4f46e5', condition: { type: 'ranking', value: 1 }, sortOrder: 60 },
    { key: 'homework_streak_7', label: '약속의 7일', description: '7일 연속으로 모든 숙제 완료', icon: '/badges/homework_streak_7.png', color: '#10b981', condition: { type: 'homework_streak', value: 7 }, sortOrder: 61 },
    { key: 'quiz_master', label: '퀴즈의 제왕', description: '실시간 퀴즈 30회 우승 달성', icon: '/badges/quiz_master.png', color: '#f43f5e', condition: { type: 'quiz_win', value: 30 }, sortOrder: 62 },
    { key: 'memo_50', label: '필기의 달인', description: '개념 학습 중 나만의 메모 50개 작성', icon: '/badges/memo_50.png', color: '#0ea5e9', condition: { type: 'memo', value: 50 }, sortOrder: 63 },
    { key: 'diagnostic_master', label: '정밀 분석 완료', description: '레벨 테스트 및 정밀 진단 3회 완료', icon: '/badges/diagnostic_master.png', color: '#8b5cf6', condition: { type: 'diagnostic', value: 3 }, sortOrder: 64 },
];

async function main() {
    console.log('Seeding achievements (badges)...');

    for (const badgeData of badges) {
        await prisma.badge.upsert({
            where: { key: badgeData.key },
            update: badgeData,
            create: badgeData,
        });
    }

    // 특정한 학생 1명(이수학, student01)에게 테스트용으로 몇 개의 배지를 부여합니다.
    const student = await prisma.user.findUnique({ where: { username: 'student01' } });
    if (student) {
        const earnedKeys = ['streak_3', 'blank_1', 'level_5', 'hidden_owl'];
        const earnedBadges = await prisma.badge.findMany({
            where: { key: { in: earnedKeys } },
        });

        let daysAgo = 10;
        for (const b of earnedBadges) {
            const testDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
            await prisma.userBadge.upsert({
                where: {
                    userId_badgeId: {
                        userId: student.id,
                        badgeId: b.id,
                    },
                },
                update: {
                    earnedAt: testDate,
                },
                create: {
                    userId: student.id,
                    badgeId: b.id,
                    earnedAt: testDate,
                },
            });
            daysAgo -= 3; // 갈수록 최신 날짜로 부여
        }
        console.log(`Seeded badges for user: ${student.username}`);
    }

    console.log(`Successfully seeded ${badges.length} badges!`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
