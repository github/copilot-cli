"""
Pydantic models for Stilya Fashion AI Assistant.
Defines data structures for inter-agent communication and API contracts.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field, validator
from enum import Enum


class AgentType(str, Enum):
    """Available agent types in the Stilya system."""
    WARDROBE = "wardrobe"
    VISUAL = "visual"
    CREATIVITY = "creativity"
    EMPATHY = "empathy"
    LEARNING = "learning"
    KNOWLEDGE = "knowledge"


class RequestPriority(str, Enum):
    """Request priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class AgentStatus(str, Enum):
    """Agent execution status."""
    IDLE = "idle"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    TIMEOUT = "timeout"


# Base Models
class BaseRequest(BaseModel):
    """Base request model with common fields."""
    user_id: str = Field(..., description="Unique user identifier")
    request_id: Optional[str] = Field(default=None, description="Unique request identifier")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Request timestamp")
    priority: RequestPriority = Field(default=RequestPriority.NORMAL, description="Request priority")


class BaseResponse(BaseModel):
    """Base response model with common fields."""
    success: bool = Field(..., description="Whether the operation was successful")
    message: Optional[str] = Field(default=None, description="Response message")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    processing_time: Optional[float] = Field(default=None, description="Processing time in seconds")


# Fashion Item Models
class FashionItem(BaseModel):
    """Fashion item representation."""
    id: str = Field(..., description="Unique item identifier")
    name: str = Field(..., description="Item name")
    category: str = Field(..., description="Item category (e.g., 'shirt', 'pants', 'dress')")
    subcategory: Optional[str] = Field(default=None, description="Item subcategory")
    brand: Optional[str] = Field(default=None, description="Brand name")
    color: List[str] = Field(default_factory=list, description="Primary colors")
    pattern: Optional[str] = Field(default=None, description="Pattern type")
    material: Optional[str] = Field(default=None, description="Material composition")
    season: Optional[str] = Field(default=None, description="Suitable season")
    occasion: List[str] = Field(default_factory=list, description="Suitable occasions")
    style: List[str] = Field(default_factory=list, description="Style tags")
    price_range: Optional[str] = Field(default=None, description="Price range category")
    image_url: Optional[str] = Field(default=None, description="Item image URL")
    embedding: Optional[List[float]] = Field(default=None, description="Item embedding vector")
    
    class Config:
        schema_extra = {
            "example": {
                "id": "item_12345",
                "name": "Classic White Button Shirt",
                "category": "shirt",
                "subcategory": "button_down",
                "brand": "Example Brand",
                "color": ["white"],
                "pattern": "solid",
                "material": "cotton",
                "season": "all_season",
                "occasion": ["business", "casual"],
                "style": ["classic", "minimalist"],
                "price_range": "mid"
            }
        }


class OutfitRecommendation(BaseModel):
    """Complete outfit recommendation."""
    outfit_id: str = Field(..., description="Unique outfit identifier")
    items: List[FashionItem] = Field(..., description="Fashion items in the outfit")
    style_description: str = Field(..., description="Overall style description")
    occasion: str = Field(..., description="Recommended occasion")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Recommendation confidence")
    creativity_score: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Creativity score")
    explanation: str = Field(..., description="Why this outfit was recommended")
    styling_tips: List[str] = Field(default_factory=list, description="Additional styling tips")
    
    @validator('confidence_score', 'creativity_score')
    def validate_scores(cls, v):
        if v is not None and (v < 0.0 or v > 1.0):
            raise ValueError('Score must be between 0.0 and 1.0')
        return v


# User Models
class UserContext(BaseModel):
    """User context and preferences."""
    user_id: str = Field(..., description="Unique user identifier")
    mood: Optional[str] = Field(default=None, description="Current mood")
    body_type: Optional[str] = Field(default=None, description="Body type information")
    cultural_context: Optional[str] = Field(default=None, description="Cultural background")
    style_preferences: List[str] = Field(default_factory=list, description="Preferred styles")
    color_preferences: List[str] = Field(default_factory=list, description="Preferred colors")
    brand_preferences: List[str] = Field(default_factory=list, description="Preferred brands")
    budget_range: Optional[str] = Field(default=None, description="Budget range")
    wardrobe_items: List[str] = Field(default_factory=list, description="User's wardrobe item IDs")


class UserFeedback(BaseModel):
    """User feedback on recommendations."""
    user_id: str = Field(..., description="User identifier")
    recommendation_id: str = Field(..., description="Recommendation identifier")
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    feedback_type: Literal["like", "dislike", "love", "neutral"] = Field(..., description="Feedback type")
    comments: Optional[str] = Field(default=None, description="Additional comments")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Feedback timestamp")


# Agent Communication Models
class AgentRequest(BaseRequest):
    """Request sent to individual agents."""
    agent_type: AgentType = Field(..., description="Target agent type")
    task_description: str = Field(..., description="Task description for the agent")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Agent-specific parameters")


class AgentResponse(BaseResponse):
    """Response from individual agents."""
    agent_type: AgentType = Field(..., description="Responding agent type")
    status: AgentStatus = Field(..., description="Agent execution status")
    result: Dict[str, Any] = Field(default_factory=dict, description="Agent result data")
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Result confidence")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


# Orchestrator Models
class OrchestratorRequest(BaseRequest):
    """Main request to the orchestration manager."""
    user_query: str = Field(..., description="Natural language user query")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    required_agents: Optional[List[AgentType]] = Field(default=None, description="Specific agents to use")
    
    class Config:
        schema_extra = {
            "example": {
                "user_id": "user_12345",
                "user_query": "I need a professional outfit for a job interview tomorrow",
                "context": {
                    "occasion": "job_interview",
                    "weather": "mild",
                    "time_of_day": "morning"
                },
                "preferences": {
                    "style": "professional",
                    "color_preferences": ["navy", "black", "white"],
                    "budget": "mid"
                }
            }
        }


class OrchestratorResponse(BaseResponse):
    """Response from the orchestration manager."""
    recommendation: Optional[OutfitRecommendation] = Field(default=None, description="Fashion recommendation")
    explanation: str = Field(..., description="Detailed explanation of the recommendation")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Overall confidence score")
    agents_involved: List[AgentType] = Field(..., description="Agents that participated")
    processing_details: Dict[str, Any] = Field(default_factory=dict, description="Processing details")
    
    @validator('confidence_score')
    def validate_confidence_score(cls, v):
        if v < 0.0 or v > 1.0:
            raise ValueError('Confidence score must be between 0.0 and 1.0')
        return v


# Health Check Models
class HealthCheck(BaseModel):
    """Health check response."""
    status: Literal["healthy", "degraded", "unhealthy"] = Field(..., description="Overall system status")
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    agents: Dict[str, AgentStatus] = Field(default_factory=dict, description="Individual agent statuses")
    dependencies: Dict[str, bool] = Field(default_factory=dict, description="External dependency statuses")


# Error Models
class ErrorResponse(BaseModel):
    """Error response model."""
    error: bool = Field(default=True, description="Error flag")
    error_code: str = Field(..., description="Error code")
    error_message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    
    class Config:
        schema_extra = {
            "example": {
                "error": True,
                "error_code": "AGENT_TIMEOUT",
                "error_message": "One or more agents failed to respond within the timeout period",
                "details": {
                    "timeout_agents": ["creativity", "empathy"],
                    "timeout_duration": 30
                }
            }
        }