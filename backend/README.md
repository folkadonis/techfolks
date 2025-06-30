# TechFolks Backend

Backend API for TechFolks competitive coding platform built with Node.js, Express, and TypeScript.

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js with TypeScript
- **Databases**: PostgreSQL (main), MongoDB (problems), Redis (caching)
- **Message Queue**: RabbitMQ
- **Code Execution**: Judge0 API
- **Real-time**: Socket.io
- **Authentication**: JWT
- **Documentation**: Swagger/OpenAPI

## Prerequisites

- Node.js 18+ and npm 9+
- Docker and Docker Compose
- PostgreSQL 15+
- Redis 7+
- MongoDB 6+

## Getting Started

1. Clone the repository and navigate to backend directory:
```bash
cd techfolks/backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Start the development services using Docker:
```bash
docker-compose up -d
```

5. Run database migrations:
```bash
npm run migrate
```

6. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier

## API Documentation

Once the server is running, API documentation is available at:
- Swagger UI: `http://localhost:3000/api-docs`

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── tests/              # Test files
├── docker/             # Docker configurations
├── logs/               # Application logs
└── dist/               # Compiled JavaScript
```

## Environment Variables

See `.env.example` for all available environment variables.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Docker Support

The project includes Docker configurations for all required services:

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

## Code Style

This project uses ESLint and Prettier for code formatting. Configuration files are included in the project root.

## Security

- Helmet.js for security headers
- Rate limiting on API endpoints
- Input validation with express-validator
- JWT authentication
- CORS configuration
- Environment variable validation

## License

ISC