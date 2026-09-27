
import type { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';

const ALLOWED_IMAGE_HOSTS = ['images.igdb.com'];
const MAX_BYTES = 10 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url, x, y, zoom } = req.query;

    if (!url || Array.isArray(url)) {
        return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    // req.query is already URL-decoded (the client encodes the url once), so no extra decodeURIComponent.

    // SSRF Protection: Validate Host
    try {
        const parsedUrl = new URL(url);
        if (parsedUrl.protocol !== 'https:' || !ALLOWED_IMAGE_HOSTS.includes(parsedUrl.hostname)) {
            return res.status(403).json({ error: 'Domain not allowed' });
        }
    } catch {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
        const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Upstream responded ${response.status}`);
        if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Image too large');
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length > MAX_BYTES) throw new Error('Image too large');
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.startsWith('image/')) return res.status(400).json({ error: 'Not an image' });

        // x/y are percentages (0..100), zoom is a percentage (100 = full image)
        const clampInt = (v: unknown, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || 0)));
        const zoomVal = clampInt(zoom, 100, 1000);
        const xPos = clampInt(x, 0, 100);
        const yPos = clampInt(y, 0, 100);

        // If no crop parameters, return original image
        if (!x || !y || !zoom || zoomVal <= 100) {
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            return res.send(buffer);
        }

        // Apply cropping
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        // Calculation for crop logic
        const scale = zoomVal / 100;
        const cropWidth = Math.max(1, Math.round(width / scale));
        const cropHeight = Math.max(1, Math.round(height / scale));

        const maxScrollX = width - cropWidth;
        const maxScrollY = height - cropHeight;

        let cropX = Math.round(maxScrollX * (xPos / 100));
        let cropY = Math.round(maxScrollY * (yPos / 100));

        // Clamp values
        cropX = Math.max(0, Math.min(cropX, maxScrollX));
        cropY = Math.max(0, Math.min(cropY, maxScrollY));

        const croppedImage = await image
            .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
            .toBuffer();

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        res.send(croppedImage);

    } catch (err) {
        console.error('Error proxying image:', err);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
}
