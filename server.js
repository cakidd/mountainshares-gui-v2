const express = require('express');
const app = express();

// Manual CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://buy.mountainshares.us');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Calculate purchase endpoint
app.post('/calculate-purchase', (req, res) => {
  const { tokenQuantity } = req.body;
  
  const basePrice = 1.00;
  const subtotal = tokenQuantity * basePrice;
  const stripeFee = (subtotal * 0.029) + 0.30;
  const platformFee = subtotal * 0.02;
  const total = subtotal + stripeFee + platformFee;
  
  res.json({
    baseTokenPrice: basePrice,
    subtotal: subtotal,
    fees: {
      processing: stripeFee,
      platform: platformFee
    },
    total: total,
    pricingModel: 'USD Transaction-Based'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
