# Logging Configuration

AgentOS now supports configurable logging with health check suppression to reduce log noise.

## Environment Variables

### `LOG_LEVEL` (default: `INFO`)
Controls the minimum log level for all application logs.

Valid values:
- `DEBUG` - Most verbose, includes all internal operations
- `INFO` - Standard operational logs
- `WARNING` - Only warnings and errors
- `ERROR` - Only errors and critical issues
- `CRITICAL` - Only critical failures

**Example:**
```bash
# Set to DEBUG for detailed troubleshooting
export LOG_LEVEL=DEBUG

# Set to WARNING for production quiet mode
export LOG_LEVEL=WARNING
```

### `SUPPRESS_HEALTH_LOGS` (default: `true`)
Controls whether health check endpoint requests are logged.

Valid values:
- `true` - Health check logs are suppressed (quieter logs)
- `false` - All health check requests are logged

**Example:**
```bash
# Disable health check log suppression (show all logs)
export SUPPRESS_HEALTH_LOGS=false
```

## Docker Compose Configuration

The logging configuration is already integrated into `compose.yaml`:

```yaml
environment:
  LOG_LEVEL: ${LOG_LEVEL:-INFO}
  SUPPRESS_HEALTH_LOGS: ${SUPPRESS_HEALTH_LOGS:-true}
```

You can override these in your `.env` file:

```dotenv
# .env
LOG_LEVEL=WARNING
SUPPRESS_HEALTH_LOGS=false
```

## Filtered Endpoints

When `SUPPRESS_HEALTH_LOGS=true`, the following endpoints are automatically filtered from access logs:
- `/system/health`
- `/health`
- `/readiness`
- `/liveness`

These endpoints will still function normally, but won't clutter your logs with constant health check requests.

## How It Works

1. **Custom Filter** - `HealthCheckFilter` in `app/logging_config.py` intercepts log records and filters out health check messages
2. **Uvicorn Integration** - Custom log configuration in `app/uvicorn_log_config.json` applies the filter to uvicorn's access logger
3. **Environment Control** - Settings are controlled via environment variables for easy adjustment in different environments

## Production Recommendations

### High-Traffic Production
```dotenv
LOG_LEVEL=WARNING
SUPPRESS_HEALTH_LOGS=true
```

### Development
```dotenv
LOG_LEVEL=DEBUG
SUPPRESS_HEALTH_LOGS=true
```

### Debugging Issues
```dotenv
LOG_LEVEL=DEBUG
SUPPRESS_HEALTH_LOGS=false
```

## Restart After Changes

After modifying logging environment variables, restart the service:

```bash
docker restart agent-infra-docker-agno-backend-api-1
```

Or with docker compose:

```bash
docker compose restart agno-backend-api
```
