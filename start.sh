#!/bin/bash

echo "========================================"
echo "   NHA TOI ERP - RESTAURANT MANAGEMENT"
echo "========================================"
echo

echo "Starting development environment..."
echo

echo "[1/4] Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install root dependencies"
    exit 1
fi

echo
echo "[2/4] Installing backend dependencies..."
cd apps/backend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install backend dependencies"
    exit 1
fi

echo
echo "[3/4] Installing frontend dependencies..."
cd ../frontend
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install frontend dependencies"
    exit 1
fi

echo
echo "[4/4] Starting development servers..."
cd ../..

echo
echo "Starting with Docker Compose..."
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:3001/api/docs"
echo

docker-compose up --build
