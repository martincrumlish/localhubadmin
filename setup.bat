@echo off
REM LocalHub Setup Script for Windows
REM This script automates the initial setup process

echo.
echo ============================================
echo     LocalHub Setup Script for Windows
echo ============================================
echo.

REM Check if .env.local exists
if not exist .env.local (
  echo Creating .env.local from .env.example...
  copy .env.example .env.local
  echo.
  echo WARNING: Please edit .env.local and add your Google Maps API keys
  echo You can get API keys from: https://console.cloud.google.com/apis/credentials
  echo.
) else (
  echo .env.local already exists
  echo.
)

REM Install dependencies
echo Installing dependencies...
call npm install

REM Install widget dependencies
echo Installing widget dependencies...
cd apps\localhub\web
call npm install
cd ..\..\..

REM Generate Prisma Client
echo Generating Prisma Client...
call npx prisma generate

REM Run database migrations
echo Running database migrations...
call npx prisma migrate dev --name init

REM Seed the database
echo Seeding database with initial data...
call npx prisma db seed

REM Build the widget
echo Building widget bundle...
call npm run build:widget

echo.
echo ============================================
echo Setup complete!
echo ============================================
echo.
echo Next steps:
echo   1. Edit .env.local and add your Google Maps API keys
echo   2. Run 'npm run dev' to start the development server
echo   3. Visit http://localhost:3000/admin/login
echo   4. Login with: admin@example.com / password123
echo.
echo See README.md for full documentation
echo.
pause
