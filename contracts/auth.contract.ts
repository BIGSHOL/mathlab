import type { ApiResponse } from './types';

/** POST /api/auth/login */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: string;
    username: string;
    name: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    grade: number | null;
  };
  token: string;
}

/** GET /api/auth/session */
export type SessionResponse = ApiResponse<{
  user: {
    id: string;
    username: string;
    name: string;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
    grade: number | null;
  };
} | null>;

/** POST /api/users (Teacher creates student) */
export interface CreateUserRequest {
  username: string;
  password: string;
  name: string;
  role?: 'STUDENT';
  grade: number;
}

export interface CreateUserResponse {
  id: string;
  username: string;
  name: string;
  role: 'STUDENT';
  grade: number;
}

/** GET /api/users */
export type UsersListResponse = ApiResponse<
  Array<{
    id: string;
    username: string;
    name: string;
    role: string;
    grade: number | null;
    createdAt: string;
  }>
>;

/** PATCH /api/users/:id */
export interface UpdateUserRequest {
  name?: string;
  grade?: number;
  password?: string;
}
