# Storage Architecture Recommendations

## Current Implementation (Development Only)
- **Frontend**: React with Zustand + localStorage
- **Data**: Mock data stored in browser localStorage
- **Purpose**: Quick prototyping and demonstration

## Recommended Production Architecture

### 1. Backend API Server
```
Node.js/Express or Python/Django or Java/Spring Boot
├── Authentication & Authorization (JWT/OAuth)
├── RESTful APIs for all entities
├── Input validation & sanitization
├── Rate limiting & security middleware
└── Error handling & logging
```

### 2. Database Layer
```
Primary Database: PostgreSQL/MySQL
├── Users table (id, username, email, password_hash, role, rating, etc.)
├── Problems table (id, code, title, description, constraints, etc.)
├── Contests table (id, title, start_time, end_time, problems[], etc.)
├── Groups table (id, name, description, owner_id, members[], etc.)
├── Submissions table (id, user_id, problem_id, code, status, etc.)
└── Leaderboard views (computed rankings)

Cache Layer: Redis
├── Session storage
├── Leaderboard cache
├── Frequent queries cache
└── Real-time data
```

### 3. File Storage
```
Object Storage (AWS S3/Google Cloud Storage)
├── Problem test cases
├── User profile pictures
├── Contest files
└── System backups
```

### 4. Real-time Features
```
WebSocket Server (Socket.io/WebSocket)
├── Live contest updates
├── Real-time chat in groups
├── Live submission results
└── Leaderboard updates
```

## Recommended Tech Stack

### Backend Options:

#### Option 1: Node.js/TypeScript
```javascript
// Express.js with TypeScript
app.get('/api/leaderboard', async (req, res) => {
  const users = await User.findAll({
    order: [['rating', 'DESC']],
    limit: 100,
    attributes: ['username', 'rating', 'problems_solved']
  });
  res.json(users);
});
```

#### Option 2: Python/Django
```python
# Django REST Framework
class LeaderboardView(APIView):
    def get(self, request):
        users = User.objects.order_by('-rating')[:100]
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
```

#### Option 3: Java/Spring Boot
```java
@RestController
@RequestMapping("/api")
public class LeaderboardController {
    @GetMapping("/leaderboard")
    public List<UserDTO> getLeaderboard() {
        return userService.getTopUsers(100);
    }
}
```

### Database Schema Example:

```sql
-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    rating INTEGER DEFAULT 1200,
    max_rating INTEGER DEFAULT 1200,
    problems_solved INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Problems table
CREATE TABLE problems (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    input_format TEXT,
    output_format TEXT,
    constraints TEXT,
    difficulty VARCHAR(20) NOT NULL,
    time_limit INTEGER DEFAULT 1000,
    memory_limit INTEGER DEFAULT 256,
    is_public BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Submissions table
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    problem_id INTEGER REFERENCES problems(id),
    contest_id INTEGER REFERENCES contests(id) NULL,
    language VARCHAR(20) NOT NULL,
    code TEXT NOT NULL,
    status VARCHAR(20) NOT NULL,
    runtime INTEGER,
    memory_used INTEGER,
    score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Optimized leaderboard view
CREATE MATERIALIZED VIEW leaderboard AS
SELECT 
    u.id,
    u.username,
    u.rating,
    u.max_rating,
    u.problems_solved,
    COUNT(DISTINCT c.id) as contests_participated,
    ROW_NUMBER() OVER (ORDER BY u.rating DESC) as rank
FROM users u
LEFT JOIN contest_participants cp ON u.id = cp.user_id
LEFT JOIN contests c ON cp.contest_id = c.id
WHERE u.role = 'user'
GROUP BY u.id, u.username, u.rating, u.max_rating, u.problems_solved
ORDER BY u.rating DESC;
```

### Frontend API Integration:

```typescript
// Replace Zustand localStorage with API calls
const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  users: [],
  loading: false,
  
  fetchLeaderboard: async (timeFrame: string, category: string) => {
    set({ loading: true });
    try {
      const response = await fetch(`/api/leaderboard?timeFrame=${timeFrame}&category=${category}`);
      const users = await response.json();
      set({ users, loading: false });
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      set({ loading: false });
    }
  }
}));

// Admin operations with proper API calls
const deleteUser = async (userId: number) => {
  try {
    await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    toast.success('User deleted successfully');
    fetchUsers(); // Refresh the list
  } catch (error) {
    toast.error('Failed to delete user');
  }
};
```

## Migration Strategy

### Phase 1: Keep localStorage for Development
- Current setup works for development/demo
- Add API layer gradually
- Mock API responses initially

### Phase 2: Add Backend API
- Set up Express.js/Node.js server
- Create database schema
- Implement core APIs (auth, users, problems)

### Phase 3: Replace Frontend Storage
- Replace Zustand localStorage with API calls
- Add error handling and loading states
- Implement optimistic updates

### Phase 4: Add Advanced Features
- Real-time updates with WebSockets
- File upload for problems
- Advanced admin analytics
- Performance monitoring

## Security Considerations

### Current Issues (localStorage):
- Passwords stored in plain text
- No authentication verification
- Data easily manipulated
- No rate limiting

### Production Security:
```typescript
// JWT Authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Password hashing
const hashedPassword = await bcrypt.hash(password, 12);

// Input validation
const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});
```

## Performance Optimizations

1. **Database Indexing**:
```sql
CREATE INDEX idx_users_rating ON users(rating DESC);
CREATE INDEX idx_submissions_user_problem ON submissions(user_id, problem_id);
```

2. **Caching Strategy**:
```typescript
// Redis caching for leaderboard
const getLeaderboard = async () => {
  const cached = await redis.get('leaderboard');
  if (cached) return JSON.parse(cached);
  
  const data = await database.query('SELECT * FROM leaderboard');
  await redis.setex('leaderboard', 300, JSON.stringify(data)); // 5 min cache
  return data;
};
```

3. **Pagination**:
```typescript
app.get('/api/leaderboard', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;
  
  // Return paginated results
});
```

## Why localStorage Was Used Initially

1. **Rapid Prototyping**: Get features working quickly
2. **No Backend Dependency**: Frontend-only development
3. **Demo Purposes**: Show UI/UX without infrastructure
4. **Learning Focus**: Concentrate on React/frontend concepts

## When to Use Each Approach

### Use localStorage for:
- Prototypes and demos
- Client-side preferences
- Temporary data
- Offline-first apps (with sync)

### Use Database + API for:
- Production applications
- Multi-user systems
- Data integrity requirements
- Real-time features
- Scalable solutions