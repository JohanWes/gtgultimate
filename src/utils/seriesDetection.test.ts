import { describe, expect, it } from 'vitest';

import { areSimilarNames } from './seriesDetection';

describe('areSimilarNames', () => {
  it('detects games from the same series', () => {
    expect(areSimilarNames('Fallout 3', 'Fallout: New Vegas')).toBe(true);
    expect(areSimilarNames('The Legend of Zelda: Wind Waker', 'Zelda')).toBe(true);
  });

  it('does not treat identical names as similar', () => {
    expect(areSimilarNames('Portal 2', 'Portal 2')).toBe(false);
  });

  it('avoids obvious false positives', () => {
    expect(areSimilarNames('Halo Infinite', 'Hollow Knight')).toBe(false);
    expect(areSimilarNames('Portal 2', 'Half-Life 2')).toBe(false);
  });
});
