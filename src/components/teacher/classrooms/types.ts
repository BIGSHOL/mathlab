// 반 관리 타입 정의

export interface StudentInClassroom {
  id: string;
  name: string;
  grade: number | null;
  profile: {
    totalXp: number;
    level: number;
    lastActiveAt: string | null;
  } | null;
}

export interface ClassroomItem {
  id: string;
  name: string;
  grade: number | null;
  teacherId: string | null;
  teacher: { id: string; name: string } | null;
  createdAt: string;
  students: StudentInClassroom[];
}

export interface AllStudent {
  id: string;
  name: string;
  grade: number | null;
}
