export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'MountainShares Purchase API - Vercel',
        environment: process.env.NODE_ENV || 'production'
    });
}
