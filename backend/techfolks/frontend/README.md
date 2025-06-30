# TechFolks Frontend

This is the frontend application for the TechFolks competitive coding platform, built with React, TypeScript, and Vite.

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Zustand** - State management
- **React Query** - Server state management
- **Monaco Editor** - Code editor
- **Socket.io Client** - Real-time communication
- **Chart.js** - Data visualization
- **React Hook Form** - Form handling
- **Axios** - HTTP client

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Backend API running on http://localhost:8000

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:3000

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── common/      # Shared components
│   ├── auth/        # Authentication components
│   ├── problems/    # Problem-related components
│   ├── editor/      # Code editor components
│   ├── contests/    # Contest components
│   └── leaderboard/ # Leaderboard components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── services/        # API and WebSocket services
├── store/           # Zustand stores
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── styles/          # Global styles
```

## Features

- User authentication (login/register)
- Browse and solve coding problems
- Real-time code editor with syntax highlighting
- Submit solutions and get instant feedback
- Participate in coding contests
- View global and contest leaderboards
- Track submission history
- User profiles and statistics

## Environment Variables

See `.env.example` for required environment variables.

## Contributing

1. Follow the existing code style
2. Use TypeScript for all new code
3. Write meaningful commit messages
4. Add appropriate types and interfaces
5. Test your changes thoroughly

## License

This project is part of the TechFolks platform.