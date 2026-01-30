#!/bin/bash
# Database initialization script for SayTruth backend

echo "🔧 Initializing SayTruth database..."

# Wait a moment for any file system operations to complete
sleep 1

# Run the database initialization
python -m app.db.init_db

if [ $? -eq 0 ]; then
    echo "✅ Database initialized successfully!"
else
    echo "❌ Database initialization failed!"
    exit 1
fi

echo "🚀 Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
