#!/bin/bash

############################################################################
# Container Entrypoint script
############################################################################

set -e

if [[ "$PRINT_ENV_ON_LOAD" = true || "$PRINT_ENV_ON_LOAD" = True ]]; then
  echo "=================================================="
  printenv
  echo "=================================================="
fi

if [[ "$WAIT_FOR_DB" = true || "$WAIT_FOR_DB" = True ]]; then
  echo "⏳ Waiting for database to be ready..."
  dockerize \
    -wait tcp://$DB_HOST:$DB_PORT \
    -timeout 300s
  
  echo "✅ Database is ready"
  
  # Initialize database with pgvector and tables
  if [[ "$INIT_DB" = true || "$INIT_DB" = True ]]; then
    echo "🔧 Running database initialization..."
    bash /app/scripts/init_db.sh
  fi
fi

############################################################################
# Start App
############################################################################

case "$1" in
  chill)
    echo "😎 Running in chill mode..."
    ;;
  app|server|api)
    echo "🚀 Starting AgentOS API server..."
    exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --reload
    ;;
  worker)
    echo "⚙️  Starting background worker..."
    exec python -m workers.main
    ;;
  *)
    echo "Running custom command: $@"
    exec "$@"
    ;;
esac

echo ">>> Hello from AgentOS!"
while true; do sleep 18000; done
