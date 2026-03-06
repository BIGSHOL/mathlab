import { http, HttpResponse } from 'msw';
import { mockConcepts, mockSubjects, mockBlankExercises } from '../data/concepts';

export const conceptHandlers = [
  // GET /api/concepts?subjectId=xxx
  http.get('/api/concepts', ({ request }) => {
    const url = new URL(request.url);
    const subjectId = url.searchParams.get('subjectId');

    let concepts = mockConcepts;
    if (subjectId) {
      concepts = concepts.filter((c) => c.subjectId === subjectId);
    }

    const data = concepts.map((c) => {
      const subject = mockSubjects.find((s) => s.id === c.subjectId)!;
      return {
        id: c.id,
        subjectId: c.subjectId,
        title: c.title,
        sortOrder: c.sortOrder,
        subject: { title: subject.title, gradeLevel: subject.gradeLevel },
      };
    });

    return HttpResponse.json({ data, meta: { total: data.length } });
  }),

  // GET /api/concepts/:id
  http.get('/api/concepts/:id', ({ params }) => {
    const concept = mockConcepts.find((c) => c.id === params.id);
    if (!concept) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '개념을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    const subject = mockSubjects.find((s) => s.id === concept.subjectId)!;
    return HttpResponse.json({
      data: {
        ...concept,
        subject: { title: subject.title, gradeLevel: subject.gradeLevel },
      },
    });
  }),

  // GET /api/concepts/:id/blanks?level=1
  http.get('/api/concepts/:id/blanks', ({ params, request }) => {
    const url = new URL(request.url);
    const level = Number(url.searchParams.get('level') ?? 1);

    const exercise = mockBlankExercises.find(
      (e) => e.conceptId === params.id && e.level === level
    );

    if (!exercise) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: '빈칸 문제를 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    return HttpResponse.json({ data: exercise });
  }),
];
