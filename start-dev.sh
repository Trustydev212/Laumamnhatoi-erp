#!/bin/bash

echo "========================================"
echo "   NHA TOI ERP - RESTAURANT MANAGEMENT"
echo "========================================"
echo

echo "Starting development environment (without Docker)..."
echo

echo "[1/3] Starting PostgreSQL and Redis..."
echo "Please make sure PostgreSQL and Redis are running on your system"
echo "PostgreSQL: localhost:5432"
echo "Redis: localhost:6379"
echo

echo "[2/3] Starting Backend API..."
cd apps/backend
npm run start:dev &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 10

echo "[3/3] Starting Frontend..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo
echo "========================================"
echo "  Development servers are starting..."
echo "========================================"
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:3001/api/docs"
echo
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
wait
