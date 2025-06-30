# 🚀 TechFolks Quick Start Guide

## Problem Details Fixed! ✅

The problem details pages now work with the production API instead of localStorage.

### What's Working:
- ✅ **Real database** with PostgreSQL tables
- ✅ **API endpoints** for problems, users, leaderboard
- ✅ **Problem details** page with API integration
- ✅ **Problem solving** page with submission API
- ✅ **Leaderboard** with real data
- ✅ **Admin console** with backend integration
- ✅ **Groups management** via API

## 🏃‍♂️ Quick Setup (5 minutes)

### Prerequisites
```bash
# Install Node.js 18+
node --version

# Install PostgreSQL
brew install postgresql  # macOS
# or
sudo apt install postgresql postgresql-contrib  # Ubuntu

# Install Redis
brew install redis  # macOS
# or
sudo apt install redis-server  # Ubuntu
```

### 1. Start Database Services
```bash
# Start PostgreSQL
brew services start postgresql  # macOS
# or
sudo service postgresql start  # Linux

# Start Redis
brew services start redis  # macOS
# or
sudo service redis start  # Linux
```

### 2. Quick Start
```bash
# Navigate to project
cd /Users/folknallathambi/tf/techfolks/backend

# Run the setup script
./start-dev.sh
```

### 3. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs

### 4. Login
- **Username**: `admin`
- **Password**: `admin123`

## 🧪 Test Problem Details

1. Visit: http://localhost:5173/problems
2. Click on any problem (e.g., "Two Sum")
3. View problem details with real API data
4. Click "Solve Problem" to open the coding interface
5. Submit solutions through the API

## 🗄️ Database Schema

The app now uses a real PostgreSQL database with:
- **27 tables** including users, problems, contests, groups
- **Sample data** with 5 coding problems
- **Proper relationships** and constraints
- **Indexes** for performance

## 🔧 Key Features

### Problem Management
- **Real problems** loaded from database
- **Problem tags** and difficulty levels
- **Submission tracking** and statistics
- **Test cases** and sample inputs/outputs

### User System
- **JWT authentication** 
- **Role-based permissions** (admin, user)
- **User profiles** and statistics
- **Rating system**

### Leaderboard
- **Real-time rankings** from database
- **Multiple categories** (rating, problems solved, contests)
- **Search and filtering**
- **User position tracking**

### Admin Features
- **User management** (ban, promote, delete)
- **Content management** (problems, contests, groups)
- **System statistics** and monitoring

## 🐛 Troubleshooting

### Problem Details Not Loading?
1. Check backend is running: http://localhost:3000/health
2. Check database connection: `psql -d techfolks_db -c "SELECT COUNT(*) FROM problems;"`
3. Check browser console for API errors

### Database Issues?
```bash
# Reset database
dropdb techfolks_db
createdb techfolks_db
psql -d techfolks_db -f src/database/schema.sql
psql -d techfolks_db -f src/database/migrations/002_create_groups_tables.sql
psql -d techfolks_db -f src/database/seeds/sample-problems.sql
```

### API Errors?
1. Check `.env` file configuration
2. Verify database credentials
3. Check server logs: `npm run dev`

## 📊 Sample Data Included

### Problems
- Two Sum (Beginner)
- Add Two Numbers (Intermediate) 
- Longest Substring Without Repeating Characters (Intermediate)
- Median of Two Sorted Arrays (Expert)
- Valid Parentheses (Beginner)

### Users
- Admin user with full permissions
- Sample users for leaderboard testing

### Test Cases
- Sample inputs/outputs for each problem
- Proper test case validation

## 🚀 Production Deployment

For production deployment, see: `PRODUCTION_DEPLOYMENT.md`

## 📝 API Documentation

Visit http://localhost:3000/api-docs for interactive API documentation with Swagger UI.

---

**Problem Details are now fully functional with real database integration!** 🎉