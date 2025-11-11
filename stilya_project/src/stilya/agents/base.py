"""
Base agent interface for Stilya Fashion AI Assistant.
Defines the common structure and functionality for all specialized agents.
"""

import asyncio
import time
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
import structlog
from azure.identity import DefaultAzureCredential

from ..config.settings import get_settings
from ..communication.models import AgentRequest, AgentResponse, AgentType, AgentStatus

settings = get_settings()


class BaseAgent(ABC):
    """
    Abstract base class for all Stilya agents.
    Implements common functionality and enforces the agent interface.
    """
    
    def __init__(self, agent_type: AgentType, name: str):
        self.agent_type = agent_type
        self.name = name
        self.status = AgentStatus.IDLE
        self.logger = structlog.get_logger(f"agent.{agent_type.value}")
        self.credential: Optional[DefaultAzureCredential] = None
        self._initialize_azure_services()
    
    def _initialize_azure_services(self) -> None:
        """Initialize Azure services common to all agents."""
        try:
            if settings.azure.tenant_id:
                self.credential = DefaultAzureCredential()
                self.logger.info("Azure credential initialized", agent=self.name)
        except Exception as e:
            self.logger.warning("Failed to initialize Azure credential", 
                              agent=self.name, error=str(e))
    
    @abstractmethod
    async def initialize(self) -> bool:
        """
        Initialize the agent with required resources.
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        pass
    
    @abstractmethod
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """
        Process an agent request and return a response.
        
        Args:
            request: The agent request to process
            
        Returns:
            AgentResponse: The agent's response
        """
        pass
    
    @abstractmethod
    async def cleanup(self) -> None:
        """Clean up agent resources."""
        pass
    
    async def health_check(self) -> bool:
        """
        Perform a health check for this agent.
        
        Returns:
            bool: True if agent is healthy, False otherwise
        """
        try:
            # Basic health check - can be overridden by specific agents
            return self.status != AgentStatus.ERROR
        except Exception as e:
            self.logger.error("Health check failed", agent=self.name, error=str(e))
            return False
    
    async def _execute_with_timeout(self, coro, timeout: int = None) -> Any:
        """
        Execute a coroutine with timeout handling.
        
        Args:
            coro: Coroutine to execute
            timeout: Timeout in seconds (defaults to agent_timeout from settings)
            
        Returns:
            Result of the coroutine
            
        Raises:
            asyncio.TimeoutError: If operation times out
        """
        timeout = timeout or settings.agent_timeout
        
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            self.status = AgentStatus.TIMEOUT
            self.logger.error("Agent operation timed out", 
                            agent=self.name, timeout=timeout)
            raise
    
    def _create_response(self, 
                        success: bool, 
                        result: Dict[str, Any] = None,
                        message: str = None,
                        confidence: float = None,
                        processing_time: float = None) -> AgentResponse:
        """
        Create a standardized agent response.
        
        Args:
            success: Whether the operation was successful
            result: Result data
            message: Response message
            confidence: Confidence score (0.0 to 1.0)
            processing_time: Processing time in seconds
            
        Returns:
            AgentResponse: Standardized response
        """
        return AgentResponse(
            success=success,
            message=message,
            agent_type=self.agent_type,
            status=self.status,
            result=result or {},
            confidence=confidence,
            processing_time=processing_time,
            metadata={
                "agent_name": self.name,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    
    async def _safe_process_request(self, request: AgentRequest) -> AgentResponse:
        """
        Safely process a request with error handling and metrics.
        
        Args:
            request: The agent request to process
            
        Returns:
            AgentResponse: The agent's response
        """
        start_time = time.time()
        self.status = AgentStatus.PROCESSING
        
        self.logger.info("Processing request", 
                        agent=self.name,
                        request_id=request.request_id,
                        user_id=request.user_id)
        
        try:
            # Execute the actual processing logic
            response = await self._execute_with_timeout(
                self.process_request(request)
            )
            
            self.status = AgentStatus.COMPLETED
            processing_time = time.time() - start_time
            
            # Update response with processing time
            response.processing_time = processing_time
            
            self.logger.info("Request processed successfully",
                           agent=self.name,
                           request_id=request.request_id,
                           processing_time=processing_time,
                           confidence=response.confidence)
            
            return response
            
        except asyncio.TimeoutError:
            self.status = AgentStatus.TIMEOUT
            processing_time = time.time() - start_time
            
            self.logger.error("Request processing timed out",
                            agent=self.name,
                            request_id=request.request_id,
                            processing_time=processing_time)
            
            return self._create_response(
                success=False,
                message=f"Agent {self.name} timed out",
                processing_time=processing_time
            )
            
        except Exception as e:
            self.status = AgentStatus.ERROR
            processing_time = time.time() - start_time
            
            self.logger.error("Request processing failed",
                            agent=self.name,
                            request_id=request.request_id,
                            error=str(e),
                            processing_time=processing_time)
            
            return self._create_response(
                success=False,
                message=f"Agent {self.name} failed: {str(e)}",
                processing_time=processing_time
            )
    
    def __str__(self) -> str:
        return f"{self.name} ({self.agent_type.value})"
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(type={self.agent_type.value}, status={self.status.value})>"


class AgentRegistry:
    """Registry for managing agent instances."""
    
    def __init__(self):
        self._agents: Dict[AgentType, BaseAgent] = {}
        self.logger = structlog.get_logger("agent.registry")
    
    def register_agent(self, agent: BaseAgent) -> None:
        """Register an agent in the registry."""
        self._agents[agent.agent_type] = agent
        self.logger.info("Agent registered", 
                        agent_type=agent.agent_type.value,
                        agent_name=agent.name)
    
    def get_agent(self, agent_type: AgentType) -> Optional[BaseAgent]:
        """Get an agent by type."""
        return self._agents.get(agent_type)
    
    def get_all_agents(self) -> List[BaseAgent]:
        """Get all registered agents."""
        return list(self._agents.values())
    
    async def initialize_all(self) -> Dict[AgentType, bool]:
        """
        Initialize all registered agents.
        
        Returns:
            Dict mapping agent types to initialization success status
        """
        results = {}
        
        for agent_type, agent in self._agents.items():
            try:
                success = await agent.initialize()
                results[agent_type] = success
                
                if success:
                    self.logger.info("Agent initialized successfully", 
                                   agent_type=agent_type.value)
                else:
                    self.logger.error("Agent initialization failed", 
                                    agent_type=agent_type.value)
                    
            except Exception as e:
                results[agent_type] = False
                self.logger.error("Agent initialization error",
                                agent_type=agent_type.value,
                                error=str(e))
        
        return results
    
    async def cleanup_all(self) -> None:
        """Clean up all registered agents."""
        for agent in self._agents.values():
            try:
                await agent.cleanup()
                self.logger.info("Agent cleaned up", agent_name=agent.name)
            except Exception as e:
                self.logger.error("Agent cleanup failed", 
                                agent_name=agent.name, error=str(e))
    
    async def health_check_all(self) -> Dict[AgentType, bool]:
        """
        Check health of all registered agents.
        
        Returns:
            Dict mapping agent types to health status
        """
        results = {}
        
        for agent_type, agent in self._agents.items():
            try:
                results[agent_type] = await agent.health_check()
            except Exception as e:
                results[agent_type] = False
                self.logger.error("Agent health check failed",
                                agent_type=agent_type.value,
                                error=str(e))
        
        return results


# Global agent registry instance
agent_registry = AgentRegistry()