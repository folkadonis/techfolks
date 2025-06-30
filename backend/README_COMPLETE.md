# TechFolks Competitive Coding Platform - Backend

A full-stack competitive programming platform similar to VJudge that allows users to solve programming problems, participate in contests, and track their progress.

## Features

### Core Features
- **User Management**: Registration, authentication, profile management with JWT
- **Problem Management**: CRUD operations, difficulty levels, tags, and search
- **Code Submission**: Multi-language support with Judge0 integration
- **Contest System**: ACM-ICPC, IOI, and AtCoder style contests
- **Real-time Updates**: WebSocket integration for live contest updates
- **Ranking System**: Global and contest-specific leaderboards
- **Achievement System**: Badges and points for various accomplishments

### Technical Features
- **Secure Code Execution**: Sandboxed environment using Judge0
- **Queue System**: Bull queue for handling submissions
- **Caching**: Redis for session management and caching
- **Database**: PostgreSQL with TypeORM
- **API Documentation**: Swagger/OpenAPI integration
- **Real-time Communication**: Socket.io for live updates

## Tech Stack

- **Backend Framework**: Node.js with Express.js and TypeScript
- **Database**: PostgreSQL (main), Redis (caching), MongoDB (logs)
- **ORM**: TypeORM
- **Queue**: Bull with Redis
- **Code Execution**: Judge0
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io
- **API Documentation**: Swagger

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL >= 14
- Redis >= 6
- Docker and Docker Compose (for Judge0 and other services)

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd techfolks/backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=techfolks
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# Email (for password reset and verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Judge0
JUDGE0_URL=http://localhost:2358
```

4. **Start required services with Docker**
```bash
docker-compose up -d
```

This will start:
- PostgreSQL
- Redis
- MongoDB
- RabbitMQ
- Judge0

5. **Run database migrations and seed data**
```bash
npm run setup:db
```

6. **Start the development server**
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run setup:db` - Run migrations and seed data

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: `http://localhost:3000/api-docs`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/verify-email` - Verify email address
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/change-password` - Change password

### Problems
- `GET /api/problems` - List problems with filters
- `GET /api/problems/:slug` - Get problem details
- `POST /api/problems` - Create problem (admin/setter)
- `PUT /api/problems/:id` - Update problem (admin/setter)
- `DELETE /api/problems/:id` - Delete problem (admin)
- `GET /api/problems/user` - Get user's problem status

### Submissions
- `POST /api/submissions` - Submit solution
- `GET /api/submissions` - List submissions
- `GET /api/submissions/:id` - Get submission details
- `GET /api/submissions/my` - Get user's submissions
- `POST /api/submissions/run` - Run code without submitting
- `POST /api/submissions/:id/rejudge` - Rejudge submission (admin)

### Contests
- `GET /api/contests` - List contests
- `GET /api/contests/:slug` - Get contest details
- `POST /api/contests` - Create contest (admin)
- `PUT /api/contests/:id` - Update contest (admin)
- `DELETE /api/contests/:id` - Delete contest (admin)
- `POST /api/contests/:id/register` - Register for contest
- `GET /api/contests/:id/standings` - Get contest standings
- `GET /api/contests/my` - Get user's contests

## WebSocket Events

### Client to Server
- `join-contest` - Join a contest room for live updates
- `leave-contest` - Leave a contest room

### Server to Client
- `submission-created` - New submission created
- `submission-update` - Submission status update
- `contest-updated` - Contest details updated
- `standings-update` - Contest standings updated

## Database Schema

The platform uses the following main tables:
- `users` - User accounts and profiles
- `problems` - Programming problems
- `submissions` - Code submissions
- `contests` - Programming contests
- `test_cases` - Test cases for problems
- `contest_participants` - Contest registrations
- `achievements` - Available achievements
- `tags` - Problem categories

## Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- XSS protection with helmet
- CORS configuration
- Secure code execution in sandboxed environment

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint rules
- Format code with Prettier
- Write meaningful commit messages

### Testing
- Write unit tests for services
- Write integration tests for API endpoints
- Test edge cases and error scenarios

### Error Handling
- Use consistent error response format
- Log errors with appropriate levels
- Return meaningful error messages

## Deployment

### Using Docker
```bash
docker build -t techfolks-backend .
docker run -p 3000:3000 --env-file .env techfolks-backend
```

### Manual Deployment
1. Build the project: `npm run build`
2. Set environment variables
3. Run migrations: `npm run migrate`
4. Start server: `npm start`

### Production Considerations
- Use environment variables for sensitive data
- Enable HTTPS with SSL certificates
- Set up monitoring and logging
- Configure database backups
- Use a process manager like PM2
- Set up CI/CD pipeline

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Create an issue on GitHub
- Contact the development team

## Acknowledgments

- Judge0 for code execution engine
- All open-source libraries used in this project