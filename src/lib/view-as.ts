import { getCurrentUser } from './auth';
import { prisma } from './db';

/**
 * 선생님/관리자가 특정 학생 시점으로 페이지를 볼 때 사용.
 * `_as=studentId` 쿼리 파라미터가 있고 호출자가 TEACHER/ADMIN이면
 * 해당 학생의 정보를 반환. 그 외에는 일반 getCurrentUser()와 동일.
 */
export async function getViewAsUser(searchParams?: { _as?: string; [key: string]: unknown }) {
  const realUser = await getCurrentUser();
  if (!realUser) return null;

  const studentId = searchParams?._as;
  if (typeof studentId === 'string' && studentId && realUser.role !== 'STUDENT') {
    const student = await prisma.user.findUnique({
      where: { id: studentId, role: 'STUDENT', deletedAt: null },
      select: { id: true, name: true, username: true, role: true, grade: true },
    });
    if (student) {
      return {
        id: student.id,
        name: student.name,
        username: student.username,
        role: student.role as 'STUDENT' | 'TEACHER' | 'OWNER' | 'SUPER_ADMIN',
        grade: student.grade,
      };
    }
  }

  return realUser;
}
