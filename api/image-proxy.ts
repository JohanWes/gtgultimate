
import type { VercelRequest, VercelResponse } from '@vercel/node';
import sharp from 'sharp';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { url, x, y, zoom } = req.query;

    if (!url || Array.isArray(url)) {
        return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    try {
        const response = await axios({
            url: decodeURIComponent(url as string),
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
