import { z } from 'zod';

export const loginSchema = z.object({
  username: z
    .string()
    .min(3, '아이디는 3자 이상이어야 합니다')
    .max(50, '아이디는 50자 이하여야 합니다'),
  password: z
    .string()
    .min(4, '비밀번호는 4자 이상이어야 합니다')
    .max(100, '비밀번호는 100자 이하여야 합니다'),
});

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, '아이디는 3자 이상이어야 합니다')
    .max(50, '아이디는 50자 이하여야 합니다')
    .regex(/^[a-zA-Z0-9_]+$/, '아이디는 영문, 숫자, 밑줄만 사용 가능합니다'),
  password: z
    .string()
    .min(4, '비밀번호는 4자 이상이어야 합니다')
    .max(100),
  name: z
    .string()
    .min(1, '이름을 입력해주세요')
    .max(50, '이름은 50자 이하여야 합니다'),
  grade: z
    .number()
    .int()
    .min(1, '학년은 1 이상이어야 합니다')
    .max(9, '학년은 9 이하여야 합니다'),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  grade: z.number().int().min(1).max(9).optional(),
  password: z.string().min(4).max(100).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
