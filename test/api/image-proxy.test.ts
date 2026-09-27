import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const sharpMocks = vi.hoisted(() => {
  const metadata = vi.fn();
  const toBuffer = vi.fn();
  const extract = vi.fn(() => ({ toBuffer }));
  const sharpFn = vi.fn(() => ({ metadata, extract, toBuffer }));
  return { metadata, extract, toBuffer, sharpFn };
});

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const imageResponse = (bytes: number[], contentType: string) => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': contentType }),
  arrayBuffer: async () => Uint8Array.from(bytes).buffer,
});

vi.mock('sharp', () => ({
  default: sharpMocks.sharpFn,
}));

import handler from '../../api/image-proxy';

describe('/api/image-proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if url query is missing', async () => {
    const { req, res } = createMocks({ method: 'GET', query: {} });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
  });

  it('returns 403 for non-allowlisted hosts', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { url: 'https://example.com/img.jpg' },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(403);
  });

  it('returns original image when crop params are missing', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse([1, 2, 3], 'image/jpeg'));

    const { req, res } = createMocks({
      method: 'GET',
      query: { url: 'https://images.igdb.com/image/upload/foo.jpg' },
    });

    await handler(req as any, res as any);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/jpeg');
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=31536000');
    expect(Buffer.isBuffer(res._getData())).toBe(true);
    expect(sharpMocks.sharpFn).not.toHaveBeenCalled();
  });

  it('crops image when x, y, and zoom are provided', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse([1, 2, 3, 4], 'image/png'));
    sharpMocks.metadata.mockResolvedValueOnce({ width: 1000, height: 800 });
    sharpMocks.toBuffer.mockResolvedValueOnce(Buffer.from([9, 9, 9]));

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        url: 'https://images.igdb.com/image/upload/foo.png',
        x: '25',
        y: '75',
        zoom: '200',
      },
    });

    await handler(req as any, res as any);

    expect(sharpMocks.sharpFn).toHaveBeenCalledTimes(1);
    expect(sharpMocks.extract).toHaveBeenCalledWith({
      left: 125,
      top: 300,
      width: 500,
      height: 400,
    });
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=86400');
    expect(Buffer.isBuffer(res._getData())).toBe(true);
  });

  it('clamps out-of-range crop params', async () => {
    fetchMock.mockResolvedValueOnce(imageResponse([1, 2, 3, 4], 'image/png'));
    sharpMocks.metadata.mockResolvedValueOnce({ width: 1000, height: 800 });
    sharpMocks.toBuffer.mockResolvedValueOnce(Buffer.from([9]));

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        url: 'https://images.igdb.com/image/upload/foo.png',
        x: '-50',
        y: '500',
        zoom: '99999',
      },
    });

    await handler(req as any, res as any);

    expect(sharpMocks.extract).toHaveBeenCalledWith({
      left: 0,
      top: 720,
      width: 100,
      height: 80,
    });
    expect(res._getStatusCode()).toBe(200);
  });

  it('returns 500 when upstream processing fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('boom'));

    const { req, res } = createMocks({
      method: 'GET',
      query: { url: 'https://images.igdb.com/image/upload/foo.jpg' },
    });

    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Failed to proxy image' });
  });
});
