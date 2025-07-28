const express = require('express');
const cors = require('cors');
const app = express();

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Login endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  
  const { username, password } = req.body;
  
  if (username === 'testuser' && password === 'Password123') {
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: '9441fee8-fb99-4487-8132-af583f6634d0',
          username: 'testuser',
          email: 'testuser@example.com',
          full_name: 'Test User',
          role: 'admin',
          is_active: true
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-token',
        refreshToken: 'refresh-token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Get user profile
app.get('/api/auth/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: '9441fee8-fb99-4487-8132-af583f6634d0',
      username: 'testuser',
      email: 'testuser@example.com',
      full_name: 'Test User',
      role: 'admin',
      is_active: true
    }
  });
});

// Problems endpoint
app.get('/api/problems', (req, res) => {
  res.json({
    success: true,
    data: [],
    pagination: { total: 0, page: 1, limit: 10 }
  });
});

// Contests endpoint
app.get('/api/contests', (req, res) => {
  res.json({
    success: true,
    data: [],
    pagination: { total: 0, page: 1, limit: 10 }
  });
});

// Dashboard endpoint
app.get('/api/dashboard', (req, res) => {
  res.json({
    success: true,
    data: {
      totalProblems: 10,
      solvedProblems: 5,
      totalContests: 3,
      participatedContests: 1,
      rank: 150,
      rating: 1200
    }
  });
});

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Simple TechFolks server running on http://localhost:${PORT}`);
  console.log('CORS enabled for:', ['http://localhost:3002', 'http://localhost:3003', 'http://localhost:5173']);
});