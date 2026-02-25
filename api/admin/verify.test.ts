import { afterEach, describe, expect, it } from 'vitest';
import { createMocks } from 'node-mocks-http';

import handler from './verify';

const ORIGINAL_ADMIN_KEY = process.env.ADMIN_KEY;

afterEach(() => {
  if (ORIGINAL_ADMIN_KEY === undefined) {
    delete process.env.ADMIN_KEY;
  } else {
    process.env.ADMIN_KEY = ORIGINAL_ADMIN_KEY;
  }
});

describe('/api/admin/verify', () => {
  it('returns 405 for non-POST requests', () => {
    const { req, res } = createMocks({ method: 'GET' });
    handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(405);
  });

  it('returns 500 when ADMIN_KEY is not set', () => {
    delete process.env.ADMIN_KEY;
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'x-admin-key': 'secret' },
    });
    handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({
      error: 'Server misconfiguration: ADMIN_KEY not set',
    });
  });

  it('returns 401 for invalid key', () => {
    process.env.ADMIN_KEY = 'correct';
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'x-admin-key': 'wrong' },
    });
    handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(401);
  });

  it('returns 200 for a valid key', () => {
    process.env.ADMIN_KEY = 'correct';
    const { req, res } = createMocks({
      method: 'POST',
      headers: { 'x-admin-key': 'correct' },
    });
    handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getJSONData()).toEqual({ success: true });
  });
});
