"""
Azure-optimized logging configuration for Stilya Fashion AI Assistant.
Integrates with Azure Application Insights and follows Azure monitoring best practices.
"""

import sys
import logging
from typing import Any, Dict
from datetime import datetime
import structlog
from structlog.stdlib import filter_by_level
from azure.monitor.opentelemetry import configure_azure_monitor
from opentelemetry import trace
from .settings import get_settings

settings = get_settings()


def configure_structlog() -> None:
    """Configure structured logging with Azure integration."""
    
    # Configure OpenTelemetry for Azure if connection string is available
    if settings.azure.application_insights_connection_string:
        try:
            configure_azure_monitor(
                connection_string=settings.azure.application_insights_connection_string
            )
        except Exception as e:
            print(f"Failed to configure Azure Monitor: {e}")
    
    # Configure structlog processors
    processors = [
        filter_by_level,
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="ISO"),
    ]
    
    # Add different processors for different environments
    if settings.is_development():
        processors.extend([
            structlog.dev.ConsoleRenderer(colors=True)
        ])
    else:
        processors.extend([
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer()
        ])
    
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.log_level.upper())
        ),
        logger_factory=structlog.WriteLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = None) -> structlog.BoundLogger:
    """
    Get a configured logger instance.
    
    Args:
        name: Logger name, defaults to the calling module
    
    Returns:
        Configured structlog logger
    """
    return structlog.get_logger(name)


def add_azure_context(logger: structlog.BoundLogger, **kwargs) -> structlog.BoundLogger:
    """
    Add Azure-specific context to logger.
    
    Args:
        logger: Logger instance
        **kwargs: Additional context to add
    
    Returns:
        Logger with Azure context
    """
    context = {
        "environment": settings.environment,
        "tenant_id": settings.azure.tenant_id,
        "subscription_id": getattr(settings.azure, 'subscription_id', None),
        **kwargs
    }
    
    # Remove None values
    context = {k: v for k, v in context.items() if v is not None}
    
    return logger.bind(**context)


class RequestIDFilter(logging.Filter):
    """Add request ID to log records for tracing."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        # Try to get request ID from OpenTelemetry span
        span = trace.get_current_span()
        if span:
            record.request_id = span.get_span_context().trace_id
        else:
            record.request_id = "no-request-id"
        return True


def setup_logging() -> None:
    """Setup logging configuration for the entire application."""
    configure_structlog()
    
    # Configure standard library logging
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper()),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    # Add request ID filter to all handlers
    for handler in logging.root.handlers:
        handler.addFilter(RequestIDFilter())
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("azure").setLevel(logging.WARNING)
    logging.getLogger("openai").setLevel(logging.WARNING)
    
    logger = get_logger(__name__)
    logger.info("Logging configured", 
                log_level=settings.log_level,
                environment=settings.environment)


# Initialize logging when module is imported
setup_logging()