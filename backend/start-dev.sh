#!/bin/bash

# Simple development startup script
echo "🚀 Starting TechFolks Development Environment..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📋 Creating environment file..."
    cp .env.development .env
    echo "✅ Environment file created"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Install frontend dependencies
if [ ! -d "techfolks/frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd techfolks/frontend
    npm install
    cd ../..
fi

# Build the backend
echo "🔨 Building backend..."
npm run build

# Start the database (you might want to start PostgreSQL and Redis separately)
echo "🗄️ Make sure PostgreSQL and Redis are running..."
echo "   PostgreSQL: brew services start postgresql (macOS) or sudo service postgresql start (Linux)"
echo "   Redis: brew services start redis (macOS) or sudo service redis start (Linux)"

# Wait for user confirmation
read -p "Press Enter when database services are ready..."

# Run database setup
echo "📊 Setting up database..."
if command -v psql &> /dev/null; then
    # Create database if it doesn't exist
    createdb techfolks_db 2>/dev/null || echo "Database might already exist"
    
    # Run schema
    psql -d techfolks_db -f src/database/schema.sql
    psql -d techfolks_db -f src/database/migrations/002_create_groups_tables.sql
    psql -d techfolks_db -f src/database/seeds/sample-problems.sql
    
    echo "✅ Database setup complete"
else
    echo "⚠️ psql not found. Please set up the database manually using the SQL files in src/database/"
fi

# Start backend
echo "🖥️ Starting backend server..."
npm run dev &
BACKEND_PID=$!

# Start frontend
echo "🌐 Starting frontend server..."
cd techfolks/frontend
npm run dev &
FRONTEND_PID=$!
cd ../..

echo ""
echo "🎉 Development environment started!"
echo ""
echo "📱 Access points:"
echo "  • Frontend: http://localhost:5173"
echo "  • Backend API: http://localhost:3000"
echo "  • API Documentation: http://localhost:3000/api-docs"
echo ""
echo "👤 Default Admin Account:"
echo "  • Username: admin"
echo "  • Password: admin123"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt signal
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

# Keep script running
wait