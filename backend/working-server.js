#!/usr/bin/env node

const express = require('express');
const app = express();

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.json({ status: 'ok', message: 'Server is running', timestamp: new Date() });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request:', req.body);
  console.log('Headers:', req.headers);
  
  const { username, password } = req.body;
  
  if (username === 'testuser' && password === 'Password123') {
    const response = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: '9441fee8-fb99-4487-8132-af583f6634d0',
          username: 'testuser',
          email: 'testuser@example.com',
          full_name: 'Test User',
          role: 'admin',
          is_active: true,
          rating: 1200
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI5NDQxZmVlOC1mYjk5LTQ0ODctODEzMi1hZjU4M2Y2NjM0ZDAiLCJ1c2VybmFtZSI6InRlc3R1c2VyIiwicm9sZSI6ImFkbWluIn0.test-signature',
        refreshToken: 'refresh-token-example'
      }
    };
    console.log('Login successful for:', username);
    res.json(response);
  } else {
    console.log('Login failed for:', username);
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Catch all for API routes
app.use('/api/*', (req, res) => {
  console.log('API request to:', req.url);
  res.json({
    success: true,
    message: 'API endpoint working',
    endpoint: req.url,
    method: req.method
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'TechFolks Backend API',
    status: 'running',
    endpoints: ['/health', '/api/auth/login']
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, '127.0.0.1', (err) => {
  if (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
  console.log(`🚀 Working server running on http://127.0.0.1:${PORT}`);
  console.log(`🔗 Health check: http://127.0.0.1:${PORT}/health`);
  console.log(`🔐 Login endpoint: http://127.0.0.1:${PORT}/api/auth/login`);
});