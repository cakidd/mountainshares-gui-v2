exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': 'https://buy.mountainshares.us',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // Return success response  
    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'MountainShares API connection successful',
            platform: 'Community-Controlled AI Token Purchase',
            method: event.httpMethod,
            timestamp: new Date().toISOString(),
            functions_status: 'operational'
        })
    };
};
