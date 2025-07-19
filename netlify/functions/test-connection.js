exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': 'https://buy.mountainshares.us',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            message: 'MountainShares API is working',
            method: event.httpMethod,
            path: event.path,
            timestamp: new Date().toISOString(),
            function_version: '1.0.0'
        })
    };
};
