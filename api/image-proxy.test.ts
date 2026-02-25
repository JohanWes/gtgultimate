import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMocks } from 'node-mocks-http';

const sharpMocks = vi.hoisted(() => {
  const metadata = vi.fn();
  const toBuffer = vi.fn();
  const extract = vi.fn(() => ({ toBuffer }));
  const sharpFn = vi.fn(() => ({ metadata, extract, toBuffer }));
  return { metadata, extract, toBuffer, sharpFn };
});

const axiosMock = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: axiosMock,
}));

vi.mock('sharp', () => ({
  default: sharpMocks.sharpFn,
}));

import handler from './image-proxy';

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
      query: { url: encodeURIComponent('https://example.com/img.jpg') },
    });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(403);
  });

  it('returns original image when crop params are missing', async () => {
    axiosMock.mockResolvedValueOnce({
      data: Uint8Array.from([1, 2, 3]),
      headers: { 'content-type': 'image/jpeg' },
    });

    const { req, res } = createMocks({
      method: 'GET',
      query: { url: encodeURIComponent('https://images.igdb.com/image/upload/foo.jpg') },
    });

    await handler(req as any, res as any);

    expect(axiosMock).toHaveBeenCalledTimes(1);
    expect(res._getStatusCode()).toBe(200);
    expect(res.getHeader('Content-Type')).toBe('image/jpeg');
    expect(res.getHeader('Cache-Control')).toBe('public, max-age=31536000');
    expect(Buffer.isBuffer(res._getData())).toBe(true);
    expect(sharpMocks.sharpFn).not.toHaveBeenCalled();
  });

  it('crops image when x, y, and zoom are provided', async () => {
    axiosMock.mockResolvedValueOnce({
      data: Uint8Array.from([1, 2, 3, 4]),
      headers: { 'content-type': 'image/png' },
    });
    sharpMocks.metadata.mockResolvedValueOnce({ width: 1000, height: 800 });
    sharpMocks.toBuffer.mockResolvedValueOnce(Buffer.from([9, 9, 9]));

    const { req, res } = createMocks({
      method: 'GET',
      query: {
        url: encodeURIComponent('https://images.igdb.com/image/upload/foo.png'),
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

  it('returns 500 when upstream processing fails', async () => {
    axiosMock.mockRejectedValueOnce(new Error('boom'));

    const { req, res } = createMocks({
      method: 'GET',
      query: { url: encodeURIComponent('https://images.igdb.com/image/upload/foo.jpg') },
    });

    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(500);
    expect(res._getJSONData()).toEqual({ error: 'Failed to proxy image' });
  });
});
