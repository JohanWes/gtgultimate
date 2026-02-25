import { describe, expect, it } from 'vitest';

import { redactGameName } from './redaction';

describe('redactGameName', () => {
  it('redacts full names and subtitle fragments', () => {
    const synopsis =
    'The Legend of Zelda: Tears of the Kingdom is a game where Zelda appears.';

    const result = redactGameName(synopsis, 'The Legend of Zelda: Tears of the Kingdom');

    expect(result).not.toContain('Zelda');
    expect(result).not.toContain('Tears of the Kingdom');
    expect(result).toContain('[REDACTED]');
  });

  it('collapses repeated redacted sections', () => {
    const synopsis = 'Portal Portal Portal 2 is different from Portal.';
    const result = redactGameName(synopsis, 'Portal 2');

    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('Portal');
    expect(result).not.toMatch(/\[REDACTED\]\s*\[REDACTED\]/);
  });

  it('keeps unrelated words intact', () => {
    const synopsis = 'This puzzle game has creative mechanics and physics.';
    const result = redactGameName(synopsis, 'Portal 2');

    expect(result).toContain('creative mechanics');
    expect(result).toContain('physics');
  });
});
