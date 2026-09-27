import { describe, expect, it } from 'vitest';

import { areSimilarNames } from './seriesDetection';

describe('areSimilarNames', () => {
  it('detects games from the same series', () => {
    expect(areSimilarNames('Fallout 3', 'Fallout: New Vegas')).toBe(true);
    expect(areSimilarNames('The Legend of Zelda: Wind Waker', 'Zelda')).toBe(true);
    expect(areSimilarNames('Dark Souls', 'Dark Souls III')).toBe(true);
    expect(areSimilarNames('Hollow Knight', 'Hollow Knight: Silksong')).toBe(true);
    expect(areSimilarNames('Metro 2033', 'Metro Exodus')).toBe(true);
  });

  it('does not treat identical names as similar', () => {
    expect(areSimilarNames('Portal 2', 'Portal 2')).toBe(false);
  });

  it('avoids obvious false positives', () => {
    expect(areSimilarNames('Halo Infinite', 'Hollow Knight')).toBe(false);
    expect(areSimilarNames('Portal 2', 'Half-Life 2')).toBe(false);
  });

  it('does not match on a shared first word alone', () => {
    expect(areSimilarNames('Star Fox', 'Star Wars')).toBe(false);
    expect(areSimilarNames('Call of Duty', 'Call of Juarez')).toBe(false);
    expect(areSimilarNames('Dead Space', 'Dead Cells')).toBe(false);
    expect(areSimilarNames('Super Meat Boy', 'Super Mario Bros.')).toBe(false);
    expect(areSimilarNames('The Last of Us', 'The Last Guardian')).toBe(false);
    expect(areSimilarNames('Final Fantasy', 'Final Fight')).toBe(false);
  });
});
