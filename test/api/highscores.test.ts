import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const mongoMocks = vi.hoisted(() => {
  const toArray = vi.fn();
  const limit = vi.fn(() => ({ toArray }));
  const sort = vi.fn(() => ({ limit }));
  const find = vi.fn(() => ({ sort }));
  const insertOne = vi.fn();

  const collection = vi.fn(() => ({
    find,
    insertOne,
  }));
  const db = vi.fn(() => ({ collection }));
  const client = { db };

  return { toArray, limit, sort, find, insertOne, collection, db, client };
});

vi.mock('../../api/_lib/mongodb.js', () => ({
  default: Promise.resolve(mongoMocks.client),
}));

import handler from '../../api/highscores';

describe('/api/highscores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns scores for GET requests', async () => {
    mongoMocks.toArray.mockResolvedValueOnce([{ name: 'AAA', score: 42 }]);
    const { req, res } = createMocks({ method: 'GET' });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Cache-Control')).toBe('s-maxage=60, stale-while-revalidate');
    expect(res._getJSONData()).toEqual([{ name: 'AAA', score: 42 }]);
  });

  it('returns 400 for invalid POST payload', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { name: '', score: 'nope' },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(400);
    expect(mongoMocks.insertOne).not.toHaveBeenCalled();
  });

  it('stores trimmed score payload on POST', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        name: 'VeryLongPlayerNameThatShouldBeTrimmed',
        score: 99,
        runId: 'abcd1234',
      },
    });

    await handler(req as any, res as any);

    expect(mongoMocks.insertOne).toHaveBeenCalledTimes(1);
    const inserted = mongoMocks.insertOne.mock.calls[0]?.[0];
    expect(inserted.name).toBe('VeryLongPlayerNameTh');
    expect(inserted.score).toBe(99);
    expect(inserted.runId).toBe('abcd1234');
    expect(typeof inserted.date).toBe('string');
    expect(res._getStatusCode()).toBe(201);
  });

  it('returns 405 for unsupported methods', async () => {
    const { req, res } = createMocks({ method: 'DELETE' });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(405);
  });
});
