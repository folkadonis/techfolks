#!/bin/bash

# TechFolks Development Setup Script
echo "🚀 Setting up TechFolks development environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
check_docker() {
    print_step "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Check if Node.js is installed (for local development)
check_node() {
    print_step "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_warning "Node.js is not installed. You can still use Docker for development."
    else
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    fi
}

# Copy environment file
setup_env() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f .env ]; then
        cp .env.development .env
        print_success "Environment file created (.env)"
        print_warning "Please review and update .env file with your specific settings"
    else
        print_success "Environment file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_step "Installing backend dependencies..."
    
    if command -v node &> /dev/null; then
        npm install
        print_success "Backend dependencies installed"
        
        print_step "Installing frontend dependencies..."
        cd techfolks/frontend
        npm install
        cd ../..
        print_success "Frontend dependencies installed"
    else
        print_warning "Node.js not found. Dependencies will be installed in Docker containers."
    fi
}

# Setup database
setup_database() {
    print_step "Setting up PostgreSQL database..."
    
    # Start only postgres service first
    docker-compose -f docker-compose.dev.yml up -d postgres redis
    
    # Wait for postgres to be ready
    echo "Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Check if database is accessible
    if docker-compose -f docker-compose.dev.yml exec postgres pg_isready -U postgres -d techfolks_db > /dev/null 2>&1; then
        print_success "PostgreSQL database is ready"
    else
        print_error "Failed to connect to PostgreSQL database"
        return 1
    fi
    
    # Create admin user
    print_step "Creating admin user..."
    docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d techfolks_db -c \"\n        INSERT INTO users (id, username, email, password_hash, role, rating, max_rating) \n        VALUES (\n            gen_random_uuid(), \n            'admin', \n            'admin@techfolks.com', \n            '\\$2b\\$12\\$LQv3c1yqBwEHxPuNyaGK1.rZXVoJ1ByL1J8J1J8J1J8J1J8J1J8J1J8J1J', \n            'admin', \n            3000, \n            3000\n        ) ON CONFLICT (username) DO NOTHING;\n    \" > /dev/null 2>&1\n    \n    if [ $? -eq 0 ]; then\n        print_success \"Admin user created (username: admin, password: admin123)\"\n    else\n        print_warning \"Admin user might already exist\"\n    fi\n}\n\n# Start all services\nstart_services() {\n    print_step \"Starting all services...\"\n    \n    docker-compose -f docker-compose.dev.yml up -d\n    \n    print_success \"All services started!\"\n    echo\n    echo -e \"${GREEN}🎉 TechFolks development environment is ready!${NC}\"\n    echo\n    echo -e \"${BLUE}📱 Access points:${NC}\"\n    echo -e \"  • Frontend: ${YELLOW}http://localhost:5173${NC}\"\n    echo -e \"  • Backend API: ${YELLOW}http://localhost:3000${NC}\"\n    echo -e \"  • API Documentation: ${YELLOW}http://localhost:3000/api-docs${NC}\"\n    echo -e \"  • Health Check: ${YELLOW}http://localhost:3000/health${NC}\"\n    echo\n    echo -e \"${BLUE}🗄️  Database:${NC}\"\n    echo -e \"  • PostgreSQL: ${YELLOW}localhost:5432${NC}\"\n    echo -e \"  • Redis: ${YELLOW}localhost:6379${NC}\"\n    echo\n    echo -e \"${BLUE}👤 Default Admin Account:${NC}\"\n    echo -e \"  • Username: ${YELLOW}admin${NC}\"\n    echo -e \"  • Password: ${YELLOW}admin123${NC}\"\n    echo\n    echo -e \"${BLUE}🛠️  Useful commands:${NC}\"\n    echo \"  • View logs: docker-compose -f docker-compose.dev.yml logs -f\"\n    echo \"  • Stop services: docker-compose -f docker-compose.dev.yml down\"\n    echo \"  • Restart services: docker-compose -f docker-compose.dev.yml restart\"\n    echo \"  • View database: docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d techfolks_db\"\n    echo\n}\n\n# Main execution\nmain() {\n    echo -e \"${BLUE}=====================================${NC}\"\n    echo -e \"${BLUE}   TechFolks Development Setup${NC}\"\n    echo -e \"${BLUE}=====================================${NC}\"\n    echo\n    \n    check_docker\n    check_node\n    setup_env\n    install_dependencies\n    setup_database\n    start_services\n    \n    print_success \"Setup completed successfully!\"\n}\n\n# Run main function\nmain"