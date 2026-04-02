/** 데모 계정 감지 유틸 */

export const DEMO_USERNAME = 'demo';

export function isDemoUser(user: { username?: string } | null | undefined): boolean {
  return user?.username === DEMO_USERNAME;
}
