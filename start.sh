#!/bin/bash

# JanusGraph K8s Platform Startup Script

echo "Starting JanusGraph K8s Platform..."

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "Backend directory not found!"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "Frontend directory not found!"
    exit 1
fi

# Start backend server
echo "Starting backend server..."
cd backend
pip3 install -r requirements.txt
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend server started with PID: $BACKEND_PID"

# Start frontend development server
echo "Starting frontend server..."
cd ../frontend
npm install
npm start &
FRONTEND_PID=$!
echo "Frontend server started with PID: $FRONTEND_PID"

echo ""
echo "========================================="
echo "JanusGraph K8s Platform is starting up..."
echo "========================================="
echo "Backend API: http://localhost:8000"
echo "Frontend UI: http://localhost:3000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo "========================================="

# Wait for interrupt signal
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT

wait