#!/bin/bash
set -e

############################################################################
# Database Initialization Script
# Ensures PostgreSQL is ready and pgvector extension is enabled
############################################################################

echo "🔧 Initializing database..."

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL..."
until PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_DATABASE}" -c '\q' 2>/dev/null; do
  >&2 echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "✅ PostgreSQL is up"

# Enable pgvector extension
echo "🔌 Enabling pgvector extension..."
PGPASSWORD="${DB_PASS}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_DATABASE}" -c "CREATE EXTENSION IF NOT EXISTS vector;" || {
  echo "⚠️  Failed to enable pgvector - may already exist or require superuser"
}

# Initialize memory tables
echo "📝 Initializing memory tables..."
python -c "
from core.memory_manager import MemoryManager
try:
    MemoryManager()
    print('✅ Memory tables initialized')
except Exception as e:
    print(f'⚠️  Memory tables may already exist: {e}')
" || echo "⚠️  Could not initialize memory tables"

# Initialize vector reference tables
echo "🔍 Initializing vector reference tables..."
python -c "
from shared.tools.vector_references import VectorReferenceStore
try:
    VectorReferenceStore()
    print('✅ Vector reference tables initialized')
except Exception as e:
    print(f'⚠️  Vector tables may already exist: {e}')
" || echo "⚠️  Could not initialize vector tables"

echo "🎉 Database initialization complete!"
