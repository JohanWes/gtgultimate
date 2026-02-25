import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const mongoMocks = vi.hoisted(() => {
  const insertOne = vi.fn();
  const collection = vi.fn(() => ({ insertOne }));
  const db = vi.fn(() => ({ collection }));
  const client = { db };
  return { insertOne, collection, db, client };
});

vi.mock('../_lib/mongodb.js', () => ({
  default: Promise.resolve(mongoMocks.client),
}));

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  return {
    ...actual,
    randomUUID: vi.fn(() => 'abcd1234-1111-2222-3333-abcdefghijkl'),
  };
});

import handler from './save';

describe('/api/run/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-POST requests', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 400 for invalid history payload', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { history: null, totalScore: 12, totalGames: 3 },
    });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(400);
    expect(mongoMocks.insertOne).not.toHaveBeenCalled();
  });

  it('saves a run and returns a short id', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        history: [{ gameId: 1, status: 'won' }],
        totalScore: 42,
        totalGames: 10,
      },
    });

    await handler(req as any, res as any);

    expect(mongoMocks.insertOne).toHaveBeenCalledTimes(1);
    const inserted = mongoMocks.insertOne.mock.calls[0]?.[0];
    expect(inserted._id).toBe('abcd1234');
    expect(inserted.totalScore).toBe(42);
    expect(inserted.totalGames).toBe(10);
    expect(Array.isArray(inserted.history)).toBe(true);
    expect(typeof inserted.createdAt).toBe('string');
    expect(res._getStatusCode()).toBe(201);
    expect(res._getJSONData()).toEqual({ id: 'abcd1234' });
  });
});
