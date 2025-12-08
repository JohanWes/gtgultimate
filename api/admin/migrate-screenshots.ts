import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
    res.status(501).json({
        error: 'Not Implemented on Serverless',
        message: 'File system is read-only on Vercel. To run migrations, execute scripts locally.'
    });
}
