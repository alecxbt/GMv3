#!/bin/bash
# GM Terminal Deployment Script

echo "🚀 GM Terminal Deployment Helper"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Windows and suggest using Git Bash
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo -e "${YELLOW}Note: Running on Windows. Make sure you're using Git Bash or WSL.${NC}"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${GREEN}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed."
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"

# Main menu
while true; do
    echo -e "\n${GREEN}What would you like to do?${NC}"
    echo "1) Install dependencies"
    echo "2) Setup database (Prisma)"
    echo "3) Start development servers"
    echo "4) Build for production"
    echo "5) Generate deployment config files"
    echo "6) Run tests"
    echo "7) Exit"
    
    read -p "Enter your choice (1-7): " choice
    
    case $choice in
        1)
            echo -e "\n${GREEN}Installing dependencies...${NC}"
            npm install
            cd backend && npm install && cd ..
            cd frontend && npm install && cd ..
            echo "✅ Dependencies installed"
            ;;
            
        2)
            echo -e "\n${GREEN}Setting up database...${NC}"
            cd backend
            
            # Check if .env exists
            if [ ! -f .env ]; then
                echo -e "${YELLOW}Creating .env file...${NC}"
                cat > .env << EOL
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/gm_terminal_dev"

# Auth
JWT_SECRET="$(openssl rand -hex 32)"

# Frontend URL
FRONTEND_URL="http://localhost:3000"

# Redis (optional for development)
REDIS_URL="redis://localhost:6379"
EOL
                echo "✅ Created .env file. Please update DATABASE_URL with your PostgreSQL connection string."
            fi
            
            echo "Running Prisma migrations..."
            npx prisma generate
            npx prisma migrate dev --name init
            cd ..
            echo "✅ Database setup complete"
            ;;
            
        3)
            echo -e "\n${GREEN}Starting development servers...${NC}"
            echo "Starting backend on port 5001 and frontend on port 3000..."
            npm run dev
            ;;
            
        4)
            echo -e "\n${GREEN}Building for production...${NC}"
            npm run build
            echo "✅ Production build complete"
            ;;
            
        5)
            echo -e "\n${GREEN}Generating deployment configs...${NC}"
            
            # Create vercel.json for frontend
            cat > frontend/vercel.json << EOL
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
EOL
            
            # Create railway.json for backend
            cat > backend/railway.json << EOL
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npx prisma generate && npx prisma migrate deploy"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
EOL
            
            # Create sample env files
            cat > backend/.env.example << EOL
# Database (Supabase/Neon)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"

# Redis (Upstash)
REDIS_URL="redis://default:password@host:port"

# Auth
JWT_SECRET="your-32-character-secret-here"

# Frontend URL (Vercel)
FRONTEND_URL="https://your-app.vercel.app"

# Port (Railway sets automatically)
PORT=5000

# Data Providers (add as needed)
POLYGON_API_KEY=""
ALPHA_VANTAGE_KEY=""
EOL
            
            cat > frontend/.env.example << EOL
# Backend API URL (Railway)
VITE_API_URL=https://your-backend.up.railway.app
VITE_WS_URL=wss://your-backend.up.railway.app
EOL
            
            echo "✅ Deployment config files created"
            echo ""
            echo "Next steps:"
            echo "1. Create accounts on Supabase, Railway, and Vercel"
            echo "2. Update the .env files with your actual credentials"
            echo "3. Push to GitHub"
            echo "4. Connect GitHub repo to Railway and Vercel"
            ;;
            
        6)
            echo -e "\n${GREEN}Running tests...${NC}"
            npm test
            ;;
            
        7)
            echo -e "\n${GREEN}Goodbye! 🚀${NC}"
            exit 0
            ;;
            
        *)
            echo -e "${YELLOW}Invalid choice. Please try again.${NC}"
            ;;
    esac
done