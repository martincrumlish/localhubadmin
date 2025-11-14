#!/bin/bash

# LocalHub Setup Script
# This script automates the initial setup process

echo "🚀 LocalHub Setup Script"
echo "========================"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "📝 Creating .env.local from .env.example..."
  cp .env.example .env.local
  echo "⚠️  Please edit .env.local and add your Google Maps API keys"
  echo "   You can get API keys from: https://console.cloud.google.com/apis/credentials"
  echo ""
else
  echo "✅ .env.local already exists"
  echo ""
fi

# Create .env file for Prisma (Prisma requires DATABASE_URL in .env, not .env.local)
if [ ! -f .env ]; then
  echo "📝 Creating .env file for Prisma..."
  cp .env.example .env
  echo ""
else
  echo "✅ .env already exists"
  echo ""
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install widget dependencies
echo "📦 Installing widget dependencies..."
cd apps/localhub/web
npm install
cd ../../..

# Generate Prisma Client
echo "🗄️  Generating Prisma Client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma migrate dev --name init

# Seed the database
echo "🌱 Seeding database with initial data..."
npx prisma db seed

# Build the widget
echo "🔨 Building widget bundle..."
npm run build:widget

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Edit .env.local and add your Google Maps API keys"
echo "   2. Run 'npm run dev' to start the development server"
echo "   3. Visit http://localhost:3000/admin/login"
echo "   4. Login with: admin@example.com / password123"
echo ""
echo "📚 See README.md for full documentation"
