
import type { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import axios from 'axios';

const ALLOWED_IMAGE_HOSTS = ['images.igdb.com'];

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url, x, y, zoom } = req.query;

    if (!url || Array.isArray(url)) {
        return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    const decodedUrl = decodeURIComponent(url as string);

    // SSRF Protection: Validate Host
    try {
        const parsedUrl = new URL(decodedUrl);
        if (!ALLOWED_IMAGE_HOSTS.includes(parsedUrl.hostname)) {
            return res.status(403).json({ error: 'Domain not allowed' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    try {
        const response = await axios({
            url: decodedUrl,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(response.data);

        // If no crop parameters, return original image
        if (!x || !y || !zoom || parseFloat(zoom as string) <= 100) {
            res.setHeader('Content-Type', response.headers['content-type']);
            res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
            return res.send(buffer);
        }

        // Apply cropping
        const image = sharp(buffer);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;

        const zoomVal = parseFloat(zoom as string);
        const xPos = parseFloat(x as string);
        const yPos = parseFloat(y as string);

        // Logical logic for crop (same as prod-server.js)
        const scale = zoomVal / 100;
        const cropWidth = Math.round(width / scale);
        const cropHeight = Math.round(height / scale);

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

        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
        res.send(croppedImage);

    } catch (err) {
        console.error('Error proxying image:', err);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
}
