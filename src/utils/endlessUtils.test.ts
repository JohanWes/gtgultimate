import { describe, expect, it, vi } from 'vitest';

import {
  calculateScore,
  generateAnagram,
  getDifficultyZoomBonus,
  shuffleString,
} from './endlessUtils';

describe('calculateScore', () => {
  it('returns points based on guess count', () => {
    expect(calculateScore(1)).toBe(5);
    expect(calculateScore(2)).toBe(4);
    expect(calculateScore(3)).toBe(3);
    expect(calculateScore(4)).toBe(2);
    expect(calculateScore(5)).toBe(1);
  });

  it('returns 0 for out-of-range guess count', () => {
    expect(calculateScore(0)).toBe(0);
    expect(calculateScore(6)).toBe(0);
  });
});

describe('getDifficultyZoomBonus', () => {
  it('increases by 10 every 5 levels', () => {
    expect(getDifficultyZoomBonus(0)).toBe(0);
    expect(getDifficultyZoomBonus(4)).toBe(0);
    expect(getDifficultyZoomBonus(5)).toBe(10);
    expect(getDifficultyZoomBonus(14)).toBe(20);
  });
});

describe('shuffleString', () => {
  it('returns a space-separated string with the same characters', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const shuffled = shuffleString('ABC');
    expect(shuffled.replaceAll(' ', '').split('').sort().join('')).toBe('ABC');
    expect(shuffled).toContain(' ');
  });
});

describe('generateAnagram', () => {
  it('removes non-alphanumeric characters and uppercases the result', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const anagram = generateAnagram('Halo: CE!');
    expect(anagram.replaceAll(' ', '').split('').sort().join('')).toBe('ACEHLO');
  });
});
