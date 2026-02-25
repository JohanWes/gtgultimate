import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const mongoMocks = vi.hoisted(() => {
  const findOne = vi.fn();
  const collection = vi.fn(() => ({ findOne }));
  const db = vi.fn(() => ({ collection }));
  const client = { db };
  return { findOne, collection, db, client };
});

vi.mock('../_lib/mongodb.js', () => ({
  default: Promise.resolve(mongoMocks.client),
}));

import handler from './[id]';

describe('/api/run/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 405 for non-GET requests', async () => {
    const { req, res } = createMocks({ method: 'POST' });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 400 for invalid id', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 404 when run is not found', async () => {
    mongoMocks.findOne.mockResolvedValueOnce(null);
    const { req, res } = createMocks({ method: 'GET', query: { id: 'abcd1234' } });

    await handler(req as any, res as any);

    expect(mongoMocks.findOne).toHaveBeenCalledWith({ _id: 'abcd1234' });
    expect(res._getStatusCode()).toBe(404);
  });

  it('returns run data with cache header', async () => {
    mongoMocks.findOne.mockResolvedValueOnce({ _id: 'abcd1234', totalScore: 99 });
    const { req, res } = createMocks({ method: 'GET', query: { id: 'abcd1234' } });

    await handler(req as any, res as any);

    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Cache-Control')).toBe('s-maxage=3600, stale-while-revalidate');
    expect(res._getJSONData()).toEqual({ _id: 'abcd1234', totalScore: 99 });
  });
});
