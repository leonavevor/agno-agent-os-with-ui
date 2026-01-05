"""Logging configuration for AgentOS."""

import logging
import sys
from pathlib import Path


# Custom filter to suppress health check logs
class HealthCheckFilter(logging.Filter):
    """Filter out health check endpoint logs to reduce noise."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Suppress logs for health check endpoints
        message = record.getMessage()
        return not any(
            endpoint in message
            for endpoint in ["/system/health", "/health", "/readiness", "/liveness"]
        )


def setup_logging(log_level: str = "INFO", suppress_health_checks: bool = True) -> None:
    """
    Configure logging for the application.

    Args:
        log_level: The minimum log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        suppress_health_checks: Whether to suppress health check endpoint logs
    """
    # Convert string to logging level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Configure root logger
    logging.basicConfig(
        level=numeric_level,
        format="%(levelname)-8s %(name)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )

    # Set specific log levels for noisy libraries
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("multipart.multipart").setLevel(logging.WARNING)

    # Suppress uvicorn access logs for health checks
    if suppress_health_checks:
        access_logger = logging.getLogger("uvicorn.access")
        access_logger.addFilter(HealthCheckFilter())


def get_uvicorn_log_config() -> dict:
    """
    Get uvicorn logging configuration with health check suppression.

    Returns:
        Dictionary compatible with uvicorn's log_config parameter
    """
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "health_check_filter": {
                "()": "app.logging_config.HealthCheckFilter",
            }
        },
        "formatters": {
            "default": {
                "format": "%(levelname)-8s %(name)s - %(message)s",
            },
            "access": {
                "format": '%(levelname)s:     %(client_addr)s - "%(request_line)s" %(status_code)s',
            },
        },
        "handlers": {
            "default": {
                "formatter": "default",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
            },
            "access": {
                "formatter": "access",
                "class": "logging.StreamHandler",
                "stream": "ext://sys.stdout",
                "filters": ["health_check_filter"],
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["default"], "level": "INFO", "propagate": False},
            "uvicorn.error": {"level": "INFO"},
            "uvicorn.access": {
                "handlers": ["access"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }
