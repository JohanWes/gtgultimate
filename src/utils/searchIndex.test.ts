import { describe, expect, it } from 'vitest';

import type { Game } from '../types';
import {
  clearSearchIndex,
  getSearchIndex,
  initializeSearchIndex,
  search,
} from './searchIndex';

const games: Game[] = [
  {
    id: 1,
    name: 'Super Mario Odyssey',
    year: 2017,
    platform: 'Switch',
    genre: 'Platformer',
    rating: 97,
    screenshots: [],
    cover: null,
    cropPositions: [],
  },
  {
    id: 2,
    name: 'Luigi Mansion 3',
    year: 2019,
    platform: 'Switch',
    genre: 'Adventure',
    rating: 84,
    screenshots: [],
    cover: null,
    cropPositions: [],
  },
];

describe('searchIndex', () => {
  it('initializes and searches for matching games', () => {
    initializeSearchIndex(games);
    const results = search('mario');
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe('Super Mario Odyssey');
  });

  it('reuses the same index for the same games reference', () => {
    const first = initializeSearchIndex(games);
    const second = initializeSearchIndex(games);
    expect(first).toBe(second);
    expect(getSearchIndex()).toBe(first);
  });

  it('clears cached index', () => {
    initializeSearchIndex(games);
    clearSearchIndex();
    expect(search('mario')).toEqual([]);
    expect(getSearchIndex()).toBeNull();
  });
});
