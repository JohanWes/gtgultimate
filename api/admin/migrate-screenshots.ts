export default function handler(req, res) {
    res.status(501).json({
        error: 'Not Implemented on Serverless',
        message: 'File system is read-only on Vercel. To run migrations, execute scripts locally.'
    });
}
