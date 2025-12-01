const express = require('express');
const cors = require('cors');
const app = express();

// Enable CORS
app.use(cors());

// Mock data
const products = [
  { id: 1, name: 'Product 1', price: 100 },
  { id: 2, name: 'Product 2', price: 200 },
];

// API route
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Start the server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});