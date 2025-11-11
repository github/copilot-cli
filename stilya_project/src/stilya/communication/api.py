"""
Azure-optimized FastAPI application for Stilya Fashion AI Assistant.
Implements Azure best practices for security, monitoring, and scalability.
"""

import asyncio
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Depends, Security, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import structlog
from azure.identity import DefaultAzureCredential
from azure.monitor.opentelemetry import configure_azure_monitor

from ..config.settings import get_settings
from ..config.logging import get_logger, add_azure_context
from ..orchestration.manager import OrchestrationManager
from .models import (
    OrchestratorRequest, OrchestratorResponse, HealthCheck, ErrorResponse,
    UserFeedback, AgentStatus, AgentType
)

# Configuration
settings = get_settings()
logger = get_logger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter('stilya_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('stilya_request_duration_seconds', 'Request duration')
AGENT_CALLS = Counter('stilya_agent_calls_total', 'Agent calls', ['agent_type', 'status'])

# Security
security = HTTPBearer(auto_error=False)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager for proper startup and shutdown.
    Implements Azure best practices for resource management.
    """
    # Startup
    logger.info("Starting Stilya Fashion AI Assistant", 
                version=app.version, environment=settings.environment)
    
    try:
        # Initialize Azure services
        if settings.azure.application_insights_connection_string:
            configure_azure_monitor(
                connection_string=settings.azure.application_insights_connection_string
            )
            logger.info("Azure Application Insights configured")
        
        # Initialize orchestration manager
        app.state.orchestration_manager = OrchestrationManager()
        await app.state.orchestration_manager.initialize()
        logger.info("Orchestration manager initialized")
        
        # Health check for dependencies
        health_status = await perform_health_check(app.state.orchestration_manager)
        if health_status.status == "unhealthy":
            logger.error("Health check failed during startup", status=health_status.status)
        else:
            logger.info("Application startup completed successfully")
        
        yield
        
    except Exception as e:
        logger.error("Failed to start application", error=str(e))
        raise
    
    # Shutdown
    logger.info("Shutting down Stilya Fashion AI Assistant")
    try:
        if hasattr(app.state, 'orchestration_manager'):
            await app.state.orchestration_manager.cleanup()
        logger.info("Application shutdown completed")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))


# Create FastAPI application
app = FastAPI(
    title="Stilya Fashion AI Assistant",
    description="Advanced personal fashion AI assistant with multi-agent orchestration",
    version="0.1.0",
    docs_url=settings.api.docs_url,
    redoc_url="/redoc" if settings.is_development() else None,
    openapi_url="/openapi.json" if not settings.is_production() else None,
    lifespan=lifespan
)

# Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.api.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

if settings.is_production():
    app.add_middleware(
        TrustedHostMiddleware, 
        allowed_hosts=["*.azurewebsites.net", "*.azure.com", "localhost"]
    )


# Middleware for metrics and logging
@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Middleware for collecting metrics and structured logging."""
    start_time = time.time()
    
    # Add request context to logger
    request_logger = add_azure_context(
        logger,
        request_id=request.headers.get("x-request-id", "unknown"),
        user_agent=request.headers.get("user-agent", "unknown"),
        client_ip=request.client.host
    )
    
    response = await call_next(request)
    
    # Record metrics
    duration = time.time() - start_time
    REQUEST_DURATION.observe(duration)
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()
    
    # Log request completion
    request_logger.info("Request completed",
                       method=request.method,
                       path=request.url.path,
                       status_code=response.status_code,
                       duration=duration)
    
    return response


# Dependency functions
async def get_orchestration_manager() -> OrchestrationManager:
    """Get the orchestration manager instance."""
    if not hasattr(app.state, 'orchestration_manager'):
        raise HTTPException(status_code=503, detail="Orchestration manager not initialized")
    return app.state.orchestration_manager


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> str:
    """
    Verify JWT token using Azure AD or custom authentication.
    In production, this should validate against Azure AD.
    """
    if not credentials and settings.is_production():
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if credentials:
        # In production, validate the token with Azure AD
        # For now, return the token for development
        return credentials.credentials
    
    return "anonymous"


# Health check utility
async def perform_health_check(manager: OrchestrationManager) -> HealthCheck:
    """Perform comprehensive health check."""
    try:
        # Check agent statuses
        agent_statuses = {}
        for agent_type in AgentType:
            try:
                # This would be implemented in the actual agent
                agent_statuses[agent_type.value] = AgentStatus.IDLE
            except Exception:
                agent_statuses[agent_type.value] = AgentStatus.ERROR
        
        # Check dependencies
        dependencies = {
            "database": True,  # Would check actual database connection
            "redis": True,     # Would check actual Redis connection
            "azure_storage": True,  # Would check Azure Storage
        }
        
        # Determine overall status
        unhealthy_agents = [k for k, v in agent_statuses.items() if v == AgentStatus.ERROR]
        failed_dependencies = [k for k, v in dependencies.items() if not v]
        
        if unhealthy_agents or failed_dependencies:
            status = "degraded" if len(unhealthy_agents) < 3 else "unhealthy"
        else:
            status = "healthy"
        
        return HealthCheck(
            status=status,
            version=app.version,
            agents=agent_statuses,
            dependencies=dependencies
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return HealthCheck(
            status="unhealthy",
            version=app.version,
            agents={},
            dependencies={}
        )


# API Routes
@app.get("/health", response_model=HealthCheck, tags=["System"])
async def health_check(manager: OrchestrationManager = Depends(get_orchestration_manager)):
    """Comprehensive health check endpoint."""
    return await perform_health_check(manager)


@app.get("/metrics", tags=["System"])
async def metrics():
    """Prometheus metrics endpoint."""
    return JSONResponse(content=generate_latest().decode('utf-8'), 
                       media_type=CONTENT_TYPE_LATEST)


@app.post(f"{settings.api.prefix}/recommend", 
          response_model=OrchestratorResponse, 
          responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
          tags=["Fashion Recommendations"])
async def get_fashion_recommendation(
    request: OrchestratorRequest,
    background_tasks: BackgroundTasks,
    manager: OrchestrationManager = Depends(get_orchestration_manager),
    token: str = Depends(verify_token)
):
    """
    Get personalized fashion recommendations using multi-agent orchestration.
    
    This endpoint processes natural language queries and returns comprehensive
    fashion recommendations by coordinating multiple specialized AI agents.
    """
    request_logger = add_azure_context(
        logger,
        user_id=request.user_id,
        request_id=request.request_id,
        query=request.user_query[:100]  # Truncate for logging
    )
    
    try:
        request_logger.info("Processing fashion recommendation request")
        
        # Process request through orchestration manager
        start_time = time.time()
        response = await manager.process_request(request)
        processing_time = time.time() - start_time
        
        # Update response with processing time
        response.processing_time = processing_time
        
        # Record agent metrics
        for agent_type in response.agents_involved:
            AGENT_CALLS.labels(agent_type=agent_type.value, status="success").inc()
        
        request_logger.info("Fashion recommendation completed",
                           confidence=response.confidence_score,
                           agents_used=len(response.agents_involved),
                           processing_time=processing_time)
        
        # Background task for analytics (if needed)
        background_tasks.add_task(log_recommendation_analytics, request, response)
        
        return response
        
    except ValueError as e:
        request_logger.warning("Invalid request", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    
    except asyncio.TimeoutError:
        request_logger.error("Request timeout")
        raise HTTPException(status_code=408, detail="Request timeout")
    
    except Exception as e:
        request_logger.error("Internal server error", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post(f"{settings.api.prefix}/feedback", 
          response_model=Dict[str, str],
          tags=["User Feedback"])
async def submit_feedback(
    feedback: UserFeedback,
    background_tasks: BackgroundTasks,
    manager: OrchestrationManager = Depends(get_orchestration_manager),
    token: str = Depends(verify_token)
):
    """Submit user feedback on fashion recommendations."""
    feedback_logger = add_azure_context(
        logger,
        user_id=feedback.user_id,
        recommendation_id=feedback.recommendation_id,
        rating=feedback.rating
    )
    
    try:
        feedback_logger.info("Processing user feedback")
        
        # Process feedback through learning agent
        # This would be implemented in the actual learning agent
        background_tasks.add_task(process_feedback_async, feedback)
        
        feedback_logger.info("Feedback submitted successfully")
        return {"status": "success", "message": "Feedback submitted successfully"}
        
    except Exception as e:
        feedback_logger.error("Failed to process feedback", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to process feedback")


@app.get(f"{settings.api.prefix}/status", 
         response_model=Dict[str, Any],
         tags=["System"])
async def get_system_status(
    manager: OrchestrationManager = Depends(get_orchestration_manager),
    token: str = Depends(verify_token)
):
    """Get detailed system status and metrics."""
    try:
        health = await perform_health_check(manager)
        
        status = {
            "system_health": health.status,
            "version": app.version,
            "environment": settings.environment,
            "agents": health.agents,
            "dependencies": health.dependencies,
            "uptime": time.time() - app.state.start_time if hasattr(app.state, 'start_time') else 0
        }
        
        return status
        
    except Exception as e:
        logger.error("Failed to get system status", error=str(e))
        raise HTTPException(status_code=500, detail="Failed to get system status")


# Background tasks
async def log_recommendation_analytics(request: OrchestratorRequest, response: OrchestratorResponse):
    """Log recommendation analytics for business intelligence."""
    analytics_logger = get_logger("analytics")
    
    analytics_data = {
        "user_id": request.user_id,
        "query_type": "fashion_recommendation",
        "confidence_score": response.confidence_score,
        "agents_used": [agent.value for agent in response.agents_involved],
        "processing_time": response.processing_time,
        "success": response.success
    }
    
    analytics_logger.info("Recommendation analytics", **analytics_data)


async def process_feedback_async(feedback: UserFeedback):
    """Process user feedback asynchronously."""
    feedback_logger = get_logger("feedback")
    
    try:
        # This would integrate with the learning agent
        # For now, just log the feedback
        feedback_logger.info("User feedback processed",
                           user_id=feedback.user_id,
                           rating=feedback.rating,
                           feedback_type=feedback.feedback_type)
        
    except Exception as e:
        feedback_logger.error("Failed to process feedback async", error=str(e))


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging."""
    logger.warning("HTTP exception occurred",
                   status_code=exc.status_code,
                   detail=exc.detail,
                   path=request.url.path)
    
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error_code=f"HTTP_{exc.status_code}",
            error_message=exc.detail
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions."""
    logger.error("Unhandled exception occurred",
                 error=str(exc),
                 path=request.url.path,
                 exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            error_code="INTERNAL_SERVER_ERROR",
            error_message="An internal server error occurred"
        ).dict()
    )


# Application startup
if __name__ == "__main__":
    import uvicorn
    
    # Store start time for uptime calculation
    app.state.start_time = time.time()
    
    # Run the application
    uvicorn.run(
        "stilya.communication.api:app",
        host=settings.api.host,
        port=settings.api.port,
        reload=settings.is_development(),
        log_level=settings.log_level.lower(),
        access_log=True,
        server_header=False,  # Security: Don't expose server info
        date_header=False     # Security: Don't expose server date
    )


def main():
    """Entry point for console script."""
    import uvicorn
    uvicorn.run("stilya.communication.api:app",
                host=settings.api.host,
                port=settings.api.port,
                reload=settings.is_development())