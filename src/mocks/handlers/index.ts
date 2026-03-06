import { authHandlers } from './auth';
import { conceptHandlers } from './concept';
import { learningHandlers } from './learning';
import { gamificationHandlers } from './gamification';

export const handlers = [
  ...authHandlers,
  ...conceptHandlers,
  ...learningHandlers,
  ...gamificationHandlers,
];
