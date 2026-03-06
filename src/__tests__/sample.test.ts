import { describe, it, expect } from 'vitest';
import { calculateLevel, xpToNextLevel, XP_REWARDS } from '@/lib/utils/xp';

describe('XP Utility Functions', () => {
  it('calculates level 1 for 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it('calculates level 2 for 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });

  it('calculates level 3 for 250 XP', () => {
    expect(calculateLevel(250)).toBe(3);
  });

  it('stays at level 2 for 99 XP', () => {
    expect(calculateLevel(99)).toBe(1);
  });

  it('calculates XP to next level correctly', () => {
    const result = xpToNextLevel(150);
    expect(result.current).toBe(50); // 150 - 100 (level 2 threshold)
    expect(result.required).toBe(150); // 250 - 100
    expect(result.remaining).toBe(100); // 250 - 150
  });

  it('has correct XP rewards', () => {
    expect(XP_REWARDS.READING_COMPLETE).toBe(5);
    expect(XP_REWARDS.BLANK_EASY).toBe(10);
    expect(XP_REWARDS.BLANK_HARD).toBe(15);
    expect(XP_REWARDS.BLANK_PAGE).toBe(30);
  });
});
