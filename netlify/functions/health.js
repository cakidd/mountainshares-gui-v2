const headers = {
  'Access-Control-Allow-Origin': 'https://buy.mountainshares.us',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: 'healthy',
      service: 'MountainShares API',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    })
  };
};
