"""
Orchestration Manager for Stilya Fashion AI Assistant.
Coordinates all agents and manages the recommendation process.
"""

import asyncio
import time
from typing import Dict, Any, List, Optional, Tuple, Set
from datetime import datetime
from enum import Enum
import json
import structlog

from .base import BaseAgent, AgentRegistry
from .wardrobe_agent import WardrobeAgent
from .visual_agent import VisualIntelligenceAgent
from .creativity_agent import CreativityAgent
from .empathy_agent import EmpathyAgent
from .learning_agent import LearningAgent
from .knowledge_agent import KnowledgeIntegrationAgent

from ..communication.models import (
    AgentRequest, AgentResponse, AgentType, 
    RecommendationRequest, RecommendationResponse,
    UserFeedback, UserProfile
)
from ..config.settings import get_settings

settings = get_settings()


class TaskPriority(Enum):
    """Task priority levels for orchestration."""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class OrchestrationManager:
    """
    Main orchestration manager that coordinates all fashion AI agents.
    
    Responsibilities:
    - Agent lifecycle management
    - Task distribution and coordination
    - Inter-agent communication
    - Final recommendation synthesis
    - Performance monitoring
    """
    
    def __init__(self):
        self.logger = structlog.get_logger("orchestration_manager")
        self.agents: Dict[AgentType, BaseAgent] = {}
        self.task_queue: List[Dict[str, Any]] = []
        self.agent_registry = AgentRegistry()
        self.performance_metrics = {}
        self.recommendation_cache = {}
        self.is_initialized = False
        
    async def initialize(self) -> bool:
        """Initialize the orchestration manager and all agents."""
        try:
            self.logger.info("Initializing Orchestration Manager")
            
            # Initialize all agents
            await self._initialize_agents()
            
            # Initialize performance metrics
            await self._initialize_performance_metrics()
            
            # Start background tasks
            await self._start_background_tasks()
            
            self.is_initialized = True
            self.logger.info("Orchestration Manager initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error("Failed to initialize Orchestration Manager", error=str(e))
            return False
    
    async def _initialize_agents(self) -> None:
        """Initialize and register all fashion AI agents."""
        # Create agent instances
        agent_classes = {
            AgentType.WARDROBE: WardrobeAgent,
            AgentType.VISUAL: VisualIntelligenceAgent,
            AgentType.CREATIVITY: CreativityAgent,
            AgentType.EMPATHY: EmpathyAgent,
            AgentType.LEARNING: LearningAgent,
            AgentType.KNOWLEDGE: KnowledgeIntegrationAgent
        }
        
        # Initialize each agent
        for agent_type, agent_class in agent_classes.items():
            try:
                agent = agent_class()
                
                # Initialize the agent
                if await agent.initialize():
                    self.agents[agent_type] = agent
                    self.agent_registry.register_agent(agent)
                    self.logger.info(f"Agent initialized successfully", agent_type=agent_type.value)
                else:
                    self.logger.error(f"Failed to initialize agent", agent_type=agent_type.value)
                    
            except Exception as e:
                self.logger.error(f"Error initializing agent", 
                                agent_type=agent_type.value, error=str(e))
    
    async def _initialize_performance_metrics(self) -> None:
        """Initialize performance monitoring metrics."""
        self.performance_metrics = {
            "total_recommendations": 0,
            "successful_recommendations": 0,
            "average_response_time": 0.0,
            "agent_performance": {
                agent_type.value: {
                    "requests_processed": 0,
                    "success_rate": 0.0,
                    "average_response_time": 0.0,
                    "confidence_scores": []
                } for agent_type in AgentType
            },
            "cache_hit_rate": 0.0,
            "user_satisfaction": 0.0,
            "start_time": datetime.utcnow().isoformat()
        }
    
    async def _start_background_tasks(self) -> None:
        """Start background monitoring and maintenance tasks."""
        # Start performance monitoring
        asyncio.create_task(self._performance_monitoring_loop())
        
        # Start health check monitoring
        asyncio.create_task(self._health_check_loop())
        
        # Start cache cleanup
        asyncio.create_task(self._cache_cleanup_loop())
    
    async def process_recommendation_request(self, request: RecommendationRequest) -> RecommendationResponse:
        """
        Process a complete fashion recommendation request.
        
        This is the main entry point for fashion recommendations.
        Coordinates multiple agents to provide comprehensive recommendations.
        """
        start_time = time.time()
        request_id = f"req_{int(time.time() * 1000)}"
        
        try:
            self.logger.info("Processing recommendation request", 
                           request_id=request_id, 
                           user_id=request.user_id)
            
            # Check cache first
            cache_key = self._generate_cache_key(request)
            cached_response = self._get_cached_recommendation(cache_key)
            
            if cached_response:
                self.logger.info("Returning cached recommendation", request_id=request_id)
                self._update_cache_metrics(hit=True)
                return cached_response
            
            self._update_cache_metrics(hit=False)
            
            # Orchestrate multi-agent recommendation process
            recommendation_result = await self._orchestrate_recommendation(request, request_id)
            
            # Create final response
            response = RecommendationResponse(
                request_id=request_id,
                user_id=request.user_id,
                recommendations=recommendation_result["recommendations"],
                confidence_score=recommendation_result["confidence"],
                processing_time=time.time() - start_time,
                agent_contributions=recommendation_result["agent_contributions"],
                metadata=recommendation_result["metadata"]
            )
            
            # Cache the response
            self._cache_recommendation(cache_key, response)
            
            # Update metrics
            await self._update_recommendation_metrics(response, success=True)
            
            self.logger.info("Recommendation request completed successfully", 
                           request_id=request_id,
                           processing_time=response.processing_time,
                           confidence=response.confidence_score)
            
            return response
            
        except Exception as e:
            self.logger.error("Recommendation request failed", 
                            request_id=request_id, error=str(e))
            
            # Create error response
            error_response = RecommendationResponse(
                request_id=request_id,
                user_id=request.user_id,
                recommendations=[],
                confidence_score=0.0,
                processing_time=time.time() - start_time,
                agent_contributions={},
                metadata={"error": str(e)},
                success=False
            )
            
            # Update metrics
            await self._update_recommendation_metrics(error_response, success=False)
            
            return error_response
    
    async def _orchestrate_recommendation(self, request: RecommendationRequest, 
                                        request_id: str) -> Dict[str, Any]:
        """Orchestrate the multi-agent recommendation process."""
        
        # Phase 1: Gather user context and preferences
        context_data = await self._gather_user_context(request)
        
        # Phase 2: Execute agents in parallel where possible
        agent_results = await self._execute_agent_pipeline(request, context_data, request_id)
        
        # Phase 3: Synthesize final recommendations
        final_recommendations = await self._synthesize_recommendations(
            agent_results, request, context_data
        )
        
        # Phase 4: Apply learning and feedback
        await self._apply_learning_insights(final_recommendations, request)
        
        return final_recommendations
    
    async def _gather_user_context(self, request: RecommendationRequest) -> Dict[str, Any]:
        """Gather comprehensive user context from multiple sources."""
        context_tasks = []
        
        # Get user profile and history
        if AgentType.LEARNING in self.agents:
            learning_request = AgentRequest(
                agent_type=AgentType.LEARNING,
                task_description="Get user profile and preferences",
                context={"user_id": request.user_id},
                parameters={"include_history": True}
            )
            context_tasks.append(
                self._execute_agent_task(AgentType.LEARNING, learning_request)
            )
        
        # Get relevant knowledge
        if AgentType.KNOWLEDGE in self.agents and request.occasion:
            knowledge_request = AgentRequest(
                agent_type=AgentType.KNOWLEDGE,
                task_description="Search knowledge for occasion",
                parameters={"query": request.occasion}
            )
            context_tasks.append(
                self._execute_agent_task(AgentType.KNOWLEDGE, knowledge_request)
            )
        
        # Execute context gathering tasks
        context_results = await asyncio.gather(*context_tasks, return_exceptions=True)
        
        # Process context results
        user_context = {
            "user_profile": {},
            "style_history": [],
            "occasion_knowledge": {},
            "preferences": request.preferences or {}
        }
        
        for i, result in enumerate(context_results):
            if isinstance(result, AgentResponse) and result.success:
                if i == 0:  # Learning agent result
                    user_context["user_profile"] = result.result.get("user_profile", {})
                    user_context["style_history"] = result.result.get("style_history", [])
                elif i == 1:  # Knowledge agent result
                    user_context["occasion_knowledge"] = result.result
        
        return user_context
    
    async def _execute_agent_pipeline(self, request: RecommendationRequest, 
                                    context_data: Dict[str, Any],
                                    request_id: str) -> Dict[AgentType, AgentResponse]:
        """Execute the agent pipeline for recommendation generation."""
        
        # Stage 1: Independent analysis agents (parallel execution)
        stage1_tasks = []
        
        # Wardrobe Agent - Find matching items
        if AgentType.WARDROBE in self.agents:
            wardrobe_request = AgentRequest(
                agent_type=AgentType.WARDROBE,
                task_description="Find fashion items matching criteria",
                context={
                    "user_id": request.user_id,
                    "preferences": context_data["preferences"],
                    "occasion": request.occasion
                },
                parameters={
                    "budget_range": request.budget_range,
                    "style_preferences": request.style_preferences,
                    "max_items": 20
                }
            )
            stage1_tasks.append((AgentType.WARDROBE, wardrobe_request))
        
        # Visual Intelligence Agent - Analyze visual preferences
        if AgentType.VISUAL in self.agents and request.image_url:
            visual_request = AgentRequest(
                agent_type=AgentType.VISUAL,
                task_description="Analyze visual style preferences from image",
                context={"user_id": request.user_id},
                parameters={"image_url": request.image_url}
            )
            stage1_tasks.append((AgentType.VISUAL, visual_request))
        
        # Execute Stage 1
        stage1_results = {}
        if stage1_tasks:
            stage1_futures = [
                self._execute_agent_task(agent_type, req) 
                for agent_type, req in stage1_tasks
            ]
            stage1_responses = await asyncio.gather(*stage1_futures, return_exceptions=True)
            
            for i, response in enumerate(stage1_responses):
                if isinstance(response, AgentResponse) and response.success:
                    agent_type = stage1_tasks[i][0]
                    stage1_results[agent_type] = response
        
        # Stage 2: Creative and empathetic enhancement (depends on Stage 1)
        stage2_tasks = []
        
        # Creativity Agent - Generate creative combinations
        if AgentType.CREATIVITY in self.agents and AgentType.WARDROBE in stage1_results:
            wardrobe_items = stage1_results[AgentType.WARDROBE].result.get("items", [])
            creativity_request = AgentRequest(
                agent_type=AgentType.CREATIVITY,
                task_description="Generate creative outfit combinations",
                context={
                    "user_id": request.user_id,
                    "wardrobe_items": wardrobe_items,
                    "occasion": request.occasion
                },
                parameters={
                    "creativity_level": context_data["preferences"].get("creativity_level", "medium"),
                    "max_combinations": 10
                }
            )
            stage2_tasks.append((AgentType.CREATIVITY, creativity_request))
        
        # Empathy Agent - Add emotional intelligence
        if AgentType.EMPATHY in self.agents:
            empathy_request = AgentRequest(
                agent_type=AgentType.EMPATHY,
                task_description="Analyze emotional needs and provide empathetic recommendations",
                context={
                    "user_id": request.user_id,
                    "occasion": request.occasion,
                    "mood": request.mood,
                    "cultural_context": context_data["user_profile"].get("cultural_background")
                },
                parameters={"empathy_level": "high"}
            )
            stage2_tasks.append((AgentType.EMPATHY, empathy_request))
        
        # Execute Stage 2
        stage2_results = {}
        if stage2_tasks:
            stage2_futures = [
                self._execute_agent_task(agent_type, req) 
                for agent_type, req in stage2_tasks
            ]
            stage2_responses = await asyncio.gather(*stage2_futures, return_exceptions=True)
            
            for i, response in enumerate(stage2_responses):
                if isinstance(response, AgentResponse) and response.success:
                    agent_type = stage2_tasks[i][0]
                    stage2_results[agent_type] = response
        
        # Combine all results
        all_results = {**stage1_results, **stage2_results}
        
        self.logger.info("Agent pipeline execution completed", 
                        request_id=request_id,
                        agents_executed=list(all_results.keys()))
        
        return all_results
    
    async def _execute_agent_task(self, agent_type: AgentType, 
                                request: AgentRequest) -> AgentResponse:
        """Execute a task on a specific agent with error handling."""
        start_time = time.time()
        
        try:
            if agent_type not in self.agents:
                return AgentResponse(
                    agent_type=agent_type,
                    success=False,
                    message=f"Agent {agent_type.value} not available",
                    processing_time=time.time() - start_time
                )
            
            agent = self.agents[agent_type]
            response = await agent.process_request(request)
            
            # Update agent performance metrics
            await self._update_agent_metrics(agent_type, response, time.time() - start_time)
            
            return response
            
        except Exception as e:
            self.logger.error("Agent task execution failed", 
                            agent_type=agent_type.value, error=str(e))
            
            return AgentResponse(
                agent_type=agent_type,
                success=False,
                message=f"Agent execution failed: {str(e)}",
                processing_time=time.time() - start_time
            )
    
    async def _synthesize_recommendations(self, agent_results: Dict[AgentType, AgentResponse],
                                        request: RecommendationRequest,
                                        context_data: Dict[str, Any]) -> Dict[str, Any]:
        """Synthesize final recommendations from all agent results."""
        
        recommendations = []
        agent_contributions = {}
        overall_confidence = 0.0
        confidence_scores = []
        
        # Extract recommendations from each agent
        for agent_type, response in agent_results.items():
            if response.success:
                agent_contributions[agent_type.value] = {
                    "confidence": response.confidence,
                    "processing_time": response.processing_time,
                    "contribution": response.result
                }
                confidence_scores.append(response.confidence)
                
                # Extract specific recommendations based on agent type
                if agent_type == AgentType.WARDROBE:
                    wardrobe_items = response.result.get("items", [])
                    for item in wardrobe_items[:5]:  # Top 5 items
                        recommendations.append({
                            "type": "wardrobe_item",
                            "item": item,
                            "confidence": response.confidence,
                            "source_agent": agent_type.value
                        })
                
                elif agent_type == AgentType.CREATIVITY:
                    creative_combinations = response.result.get("combinations", [])
                    for combo in creative_combinations[:3]:  # Top 3 combinations
                        recommendations.append({
                            "type": "creative_outfit",
                            "combination": combo,
                            "confidence": response.confidence,
                            "source_agent": agent_type.value
                        })
                
                elif agent_type == AgentType.EMPATHY:
                    empathetic_suggestions = response.result.get("suggestions", [])
                    for suggestion in empathetic_suggestions:
                        recommendations.append({
                            "type": "empathetic_advice",
                            "suggestion": suggestion,
                            "confidence": response.confidence,
                            "source_agent": agent_type.value
                        })
        
        # Calculate overall confidence
        if confidence_scores:
            overall_confidence = sum(confidence_scores) / len(confidence_scores)
        
        # Apply intelligent filtering and ranking
        ranked_recommendations = await self._rank_recommendations(
            recommendations, request, context_data
        )
        
        # Generate metadata
        metadata = {
            "agents_involved": list(agent_results.keys()),
            "processing_strategy": "multi_agent_orchestration",
            "confidence_breakdown": {
                agent_type.value: response.confidence 
                for agent_type, response in agent_results.items() 
                if response.success
            },
            "synthesis_timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "recommendations": ranked_recommendations,
            "confidence": overall_confidence,
            "agent_contributions": agent_contributions,
            "metadata": metadata
        }
    
    async def _rank_recommendations(self, recommendations: List[Dict[str, Any]],
                                  request: RecommendationRequest,
                                  context_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply intelligent ranking to recommendations."""
        
        # Score each recommendation
        for rec in recommendations:
            score = rec["confidence"]  # Base score from agent confidence
            
            # Boost score based on user preferences
            if request.style_preferences:
                if any(pref.lower() in str(rec).lower() for pref in request.style_preferences):
                    score += 0.1
            
            # Boost score based on occasion match
            if request.occasion and request.occasion.lower() in str(rec).lower():
                score += 0.1
            
            # Boost score based on user history
            style_history = context_data.get("style_history", [])
            if style_history:
                # Simple history matching (in production, would be more sophisticated)
                if any(hist_item.get("style") in str(rec) for hist_item in style_history):
                    score += 0.05
            
            rec["final_score"] = min(1.0, score)
        
        # Sort by final score and return top recommendations
        ranked = sorted(recommendations, key=lambda x: x["final_score"], reverse=True)
        return ranked[:10]  # Return top 10 recommendations
    
    async def _apply_learning_insights(self, recommendations: Dict[str, Any],
                                     request: RecommendationRequest) -> None:
        """Apply learning insights to improve future recommendations."""
        
        if AgentType.LEARNING not in self.agents:
            return
        
        try:
            # Send recommendation data to learning agent for analysis
            learning_request = AgentRequest(
                agent_type=AgentType.LEARNING,
                task_description="Analyze recommendation for learning insights",
                context={
                    "user_id": request.user_id,
                    "recommendations": recommendations["recommendations"],
                    "request_context": {
                        "occasion": request.occasion,
                        "mood": request.mood,
                        "preferences": request.preferences
                    }
                },
                parameters={"update_user_model": True}
            )
            
            # Execute asynchronously (don't wait for completion)
            asyncio.create_task(
                self._execute_agent_task(AgentType.LEARNING, learning_request)
            )
            
        except Exception as e:
            self.logger.warning("Failed to apply learning insights", error=str(e))
    
    async def process_feedback(self, feedback: UserFeedback) -> Dict[str, Any]:
        """Process user feedback and update agent models."""
        try:
            self.logger.info("Processing user feedback", 
                           user_id=feedback.user_id,
                           rating=feedback.rating)
            
            feedback_tasks = []
            
            # Send feedback to learning agent
            if AgentType.LEARNING in self.agents:
                learning_request = AgentRequest(
                    agent_type=AgentType.LEARNING,
                    task_description="Collect user feedback",
                    context={"feedback_data": feedback.model_dump()}
                )
                feedback_tasks.append(
                    self._execute_agent_task(AgentType.LEARNING, learning_request)
                )
            
            # Send feedback to empathy agent for emotional analysis
            if AgentType.EMPATHY in self.agents and feedback.comments:
                empathy_request = AgentRequest(
                    agent_type=AgentType.EMPATHY,
                    task_description="Analyze emotional feedback",
                    context={
                        "user_id": feedback.user_id,
                        "feedback_text": feedback.comments,
                        "rating": feedback.rating
                    }
                )
                feedback_tasks.append(
                    self._execute_agent_task(AgentType.EMPATHY, empathy_request)
                )
            
            # Execute feedback processing
            results = await asyncio.gather(*feedback_tasks, return_exceptions=True)
            
            # Update performance metrics
            await self._update_feedback_metrics(feedback)
            
            # Invalidate relevant cache entries
            self._invalidate_user_cache(feedback.user_id)
            
            processing_results = {
                "feedback_processed": True,
                "agents_updated": len([r for r in results if isinstance(r, AgentResponse) and r.success]),
                "learning_impact": feedback.rating <= 2,  # Poor ratings trigger more learning
                "cache_invalidated": True
            }
            
            self.logger.info("Feedback processing completed", 
                           user_id=feedback.user_id,
                           results=processing_results)
            
            return processing_results
            
        except Exception as e:
            self.logger.error("Feedback processing failed", 
                            user_id=feedback.user_id, error=str(e))
            return {"feedback_processed": False, "error": str(e)}
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics for the orchestration system."""
        current_time = datetime.utcnow()
        
        # Update real-time metrics
        await self._update_real_time_metrics()
        
        # Calculate uptime
        start_time = datetime.fromisoformat(self.performance_metrics["start_time"])
        uptime_seconds = (current_time - start_time).total_seconds()
        
        # Calculate success rates
        total_recs = self.performance_metrics["total_recommendations"]
        success_recs = self.performance_metrics["successful_recommendations"]
        success_rate = (success_recs / total_recs) if total_recs > 0 else 0.0
        
        metrics = {
            "system_metrics": {
                "uptime_seconds": uptime_seconds,
                "total_recommendations": total_recs,
                "successful_recommendations": success_recs,
                "success_rate": success_rate,
                "average_response_time": self.performance_metrics["average_response_time"],
                "cache_hit_rate": self.performance_metrics["cache_hit_rate"],
                "user_satisfaction": self.performance_metrics["user_satisfaction"]
            },
            "agent_metrics": self.performance_metrics["agent_performance"],
            "system_health": await self._get_system_health(),
            "last_updated": current_time.isoformat()
        }
        
        return metrics
    
    # Utility and monitoring methods
    
    def _generate_cache_key(self, request: RecommendationRequest) -> str:
        """Generate a cache key for a recommendation request."""
        key_data = {
            "user_id": request.user_id,
            "occasion": request.occasion,
            "mood": request.mood,
            "preferences": request.preferences,
            "style_preferences": request.style_preferences,
            "budget_range": request.budget_range
        }
        
        # Create hash of key data
        import hashlib
        key_str = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def _get_cached_recommendation(self, cache_key: str) -> Optional[RecommendationResponse]:
        """Get cached recommendation if available and valid."""
        if cache_key in self.recommendation_cache:
            cached_entry = self.recommendation_cache[cache_key]
            
            # Check if cache entry is still valid (e.g., within 1 hour)
            cache_time = datetime.fromisoformat(cached_entry["timestamp"])
            if (datetime.utcnow() - cache_time).seconds < 3600:  # 1 hour TTL
                return cached_entry["response"]
        
        return None
    
    def _cache_recommendation(self, cache_key: str, response: RecommendationResponse) -> None:
        """Cache a recommendation response."""
        self.recommendation_cache[cache_key] = {
            "response": response,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Limit cache size (simple LRU-like behavior)
        if len(self.recommendation_cache) > 1000:
            # Remove oldest entries
            sorted_entries = sorted(
                self.recommendation_cache.items(),
                key=lambda x: x[1]["timestamp"]
            )
            
            # Keep only the 800 most recent entries
            self.recommendation_cache = dict(sorted_entries[-800:])
    
    def _invalidate_user_cache(self, user_id: str) -> None:
        """Invalidate cache entries for a specific user."""
        keys_to_remove = []
        
        for cache_key, cached_entry in self.recommendation_cache.items():
            if cached_entry["response"].user_id == user_id:
                keys_to_remove.append(cache_key)
        
        for key in keys_to_remove:
            del self.recommendation_cache[key]
    
    def _update_cache_metrics(self, hit: bool) -> None:
        """Update cache performance metrics."""
        if not hasattr(self, '_cache_stats'):
            self._cache_stats = {"hits": 0, "misses": 0}
        
        if hit:
            self._cache_stats["hits"] += 1
        else:
            self._cache_stats["misses"] += 1
        
        total_requests = self._cache_stats["hits"] + self._cache_stats["misses"]
        self.performance_metrics["cache_hit_rate"] = self._cache_stats["hits"] / total_requests
    
    async def _update_recommendation_metrics(self, response: RecommendationResponse, 
                                           success: bool) -> None:
        """Update recommendation performance metrics."""
        self.performance_metrics["total_recommendations"] += 1
        
        if success:
            self.performance_metrics["successful_recommendations"] += 1
        
        # Update average response time
        current_avg = self.performance_metrics["average_response_time"]
        total_recs = self.performance_metrics["total_recommendations"]
        
        new_avg = ((current_avg * (total_recs - 1)) + response.processing_time) / total_recs
        self.performance_metrics["average_response_time"] = new_avg
    
    async def _update_agent_metrics(self, agent_type: AgentType, 
                                  response: AgentResponse, 
                                  processing_time: float) -> None:
        """Update individual agent performance metrics."""
        agent_metrics = self.performance_metrics["agent_performance"][agent_type.value]
        
        agent_metrics["requests_processed"] += 1
        
        # Update success rate
        if response.success:
            current_success_rate = agent_metrics["success_rate"]
            total_requests = agent_metrics["requests_processed"]
            
            # Calculate new success rate
            successful_requests = int(current_success_rate * (total_requests - 1)) + 1
            agent_metrics["success_rate"] = successful_requests / total_requests
        
        # Update average response time
        current_avg = agent_metrics["average_response_time"]
        total_requests = agent_metrics["requests_processed"]
        
        new_avg = ((current_avg * (total_requests - 1)) + processing_time) / total_requests
        agent_metrics["average_response_time"] = new_avg
        
        # Update confidence scores
        if response.confidence is not None:
            agent_metrics["confidence_scores"].append(response.confidence)
            
            # Keep only last 100 confidence scores
            if len(agent_metrics["confidence_scores"]) > 100:
                agent_metrics["confidence_scores"] = agent_metrics["confidence_scores"][-100:]
    
    async def _update_feedback_metrics(self, feedback: UserFeedback) -> None:
        """Update user satisfaction metrics based on feedback."""
        current_satisfaction = self.performance_metrics["user_satisfaction"]
        
        # Simple moving average (in production, would be more sophisticated)
        rating_normalized = feedback.rating / 5.0  # Normalize to 0-1
        self.performance_metrics["user_satisfaction"] = \
            (current_satisfaction * 0.9) + (rating_normalized * 0.1)
    
    async def _update_real_time_metrics(self) -> None:
        """Update real-time performance metrics."""
        # Calculate average confidence scores for each agent
        for agent_type, metrics in self.performance_metrics["agent_performance"].items():
            confidence_scores = metrics["confidence_scores"]
            if confidence_scores:
                metrics["average_confidence"] = sum(confidence_scores) / len(confidence_scores)
            else:
                metrics["average_confidence"] = 0.0
    
    async def _get_system_health(self) -> Dict[str, Any]:
        """Get overall system health status."""
        health_checks = []
        
        # Check each agent's health
        for agent_type, agent in self.agents.items():
            try:
                is_healthy = await agent.health_check()
                health_checks.append({
                    "agent": agent_type.value,
                    "healthy": is_healthy,
                    "last_check": datetime.utcnow().isoformat()
                })
            except Exception as e:
                health_checks.append({
                    "agent": agent_type.value,
                    "healthy": False,
                    "error": str(e),
                    "last_check": datetime.utcnow().isoformat()
                })
        
        # Calculate overall health
        healthy_agents = sum(1 for check in health_checks if check["healthy"])
        total_agents = len(health_checks)
        health_percentage = (healthy_agents / total_agents) if total_agents > 0 else 0.0
        
        return {
            "overall_health": health_percentage,
            "healthy_agents": healthy_agents,
            "total_agents": total_agents,
            "agent_health": health_checks,
            "system_status": "healthy" if health_percentage >= 0.8 else "degraded"
        }
    
    # Background monitoring tasks
    
    async def _performance_monitoring_loop(self) -> None:
        """Background task for performance monitoring."""
        while self.is_initialized:
            try:
                await self._update_real_time_metrics()
                await asyncio.sleep(60)  # Update every minute
            except Exception as e:
                self.logger.error("Performance monitoring error", error=str(e))
                await asyncio.sleep(60)
    
    async def _health_check_loop(self) -> None:
        """Background task for health monitoring."""
        while self.is_initialized:
            try:
                health_status = await self._get_system_health()
                
                if health_status["health_percentage"] < 0.5:
                    self.logger.warning("System health degraded", 
                                      health_percentage=health_status["health_percentage"])
                
                await asyncio.sleep(300)  # Check every 5 minutes
            except Exception as e:
                self.logger.error("Health check error", error=str(e))
                await asyncio.sleep(300)
    
    async def _cache_cleanup_loop(self) -> None:
        """Background task for cache cleanup."""
        while self.is_initialized:
            try:
                # Remove expired cache entries
                current_time = datetime.utcnow()
                expired_keys = []
                
                for cache_key, cached_entry in self.recommendation_cache.items():
                    cache_time = datetime.fromisoformat(cached_entry["timestamp"])
                    if (current_time - cache_time).seconds > 3600:  # 1 hour TTL
                        expired_keys.append(cache_key)
                
                for key in expired_keys:
                    del self.recommendation_cache[key]
                
                if expired_keys:
                    self.logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
                
                await asyncio.sleep(1800)  # Clean every 30 minutes
            except Exception as e:
                self.logger.error("Cache cleanup error", error=str(e))
                await asyncio.sleep(1800)
    
    async def shutdown(self) -> None:
        """Gracefully shutdown the orchestration manager."""
        try:
            self.logger.info("Shutting down Orchestration Manager")
            
            self.is_initialized = False
            
            # Shutdown all agents
            for agent_type, agent in self.agents.items():
                try:
                    await agent.cleanup()
                    self.logger.info(f"Agent shutdown completed", agent_type=agent_type.value)
                except Exception as e:
                    self.logger.error(f"Error shutting down agent", 
                                    agent_type=agent_type.value, error=str(e))
            
            # Clear caches and metrics
            self.recommendation_cache.clear()
            self.performance_metrics.clear()
            self.agents.clear()
            
            self.logger.info("Orchestration Manager shutdown completed")
            
        except Exception as e:
            self.logger.error("Error during orchestration manager shutdown", error=str(e))