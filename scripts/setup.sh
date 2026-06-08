#!/bin/bash

# GM Terminal Setup Script

echo "🚀 Setting up GM Terminal..."

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if PostgreSQL is running (optional)
if command -v psql &> /dev/null; then
    echo "✅ PostgreSQL found"
    echo "💡 To set up database, run:"
    echo "   createdb gmterminal"
    echo "   cd backend && npm run db:migrate"
else
    echo "⚠️  PostgreSQL not found (optional for MVP)"
fi

# Create .env files if they don't exist
if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend/.env..."
    cat > backend/.env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/gmterminal
REDIS_URL=redis://localhost:6379
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Created backend/.env (please update with your values)"
fi

if [ ! -f "frontend/.env" ]; then
    echo "📝 Creating frontend/.env..."
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:5000
EOF
    echo "✅ Created frontend/.env"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev"
echo ""
echo "Or separately:"
echo "  npm run dev:frontend  # Frontend on port 3000"
echo "  npm run dev:backend   # Backend on port 5000"
echo ""

