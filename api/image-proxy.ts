
export default async function handler(req, res) {
    const { path } = req.query;

    if (!path || typeof path !== 'string') {
        return res.status(400).json({ error: 'Missing path parameter' });
    }

    // Construct the IGDB URL
    // Ensure we only proxy to igdb
    const targetUrl = `https://images.igdb.com/igdb/image/upload/${path}`;

    try {
        const imageRes = await fetch(targetUrl);

        if (!imageRes.ok) {
            return res.status(imageRes.status).send('Failed to fetch image');
        }

        const buffer = await imageRes.arrayBuffer();
        const bufferObj = Buffer.from(buffer);

        res.setHeader('Content-Type', imageRes.headers.get('content-type') || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Long cache for images
        res.send(bufferObj);

    } catch (error) {
        console.error('Image proxy error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
