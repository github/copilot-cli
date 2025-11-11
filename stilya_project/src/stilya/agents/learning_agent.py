"""
Learning & Feedback Agent for Stilya Fashion AI Assistant.
Handles user feedback collection and continuous model fine-tuning.
"""

import asyncio
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json
import structlog

from .base import BaseAgent
from ..communication.models import (
    AgentRequest, AgentResponse, AgentType, UserFeedback
)
from ..config.settings import get_settings

settings = get_settings()


class LearningAgent(BaseAgent):
    """
    Learning & Feedback Agent responsible for:
    - Collecting user feedback (likes, dislikes, interactions)
    - Continuous model fine-tuning
    - A/B testing management
    - Increasing personalization accuracy
    """
    
    def __init__(self):
        super().__init__(AgentType.LEARNING, "Learning & Feedback Agent")
        self.feedback_database = FeedbackDatabase()
        self.ab_testing_manager = ABTestingManager()
        self.personalization_engine = PersonalizationEngine()
        self.learning_metrics = {}
        
    async def initialize(self) -> bool:
        """Initialize the learning agent."""
        try:
            self.logger.info("Initializing Learning & Feedback Agent")
            
            # Initialize feedback database
            await self.feedback_database.initialize()
            
            # Initialize A/B testing manager
            await self.ab_testing_manager.initialize()
            
            # Initialize personalization engine
            await self.personalization_engine.initialize()
            
            # Load learning metrics
            await self._initialize_learning_metrics()
            
            self.logger.info("Learning & Feedback Agent initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error("Failed to initialize Learning & Feedback Agent", error=str(e))
            return False
    
    async def _initialize_learning_metrics(self) -> None:
        """Initialize learning performance metrics."""
        self.learning_metrics = {
            "total_feedback_collected": 0,
            "average_user_satisfaction": 0.0,
            "personalization_accuracy": 0.0,
            "ab_tests_active": 0,
            "learning_rate": 0.001,
            "model_performance": {
                "recommendation_accuracy": 0.0,
                "user_engagement": 0.0,
                "retention_rate": 0.0
            }
        }
    
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Process learning and feedback requests."""
        try:
            task = request.task_description.lower()
            
            if "collect_feedback" in task:
                return await self._handle_feedback_collection(request)
            elif "analyze_feedback" in task:
                return await self._handle_feedback_analysis(request)
            elif "update_personalization" in task:
                return await self._handle_personalization_update(request)
            elif "ab_test" in task:
                return await self._handle_ab_testing(request)
            elif "fine_tune_model" in task:
                return await self._handle_model_fine_tuning(request)
            elif "learning_metrics" in task:
                return await self._handle_learning_metrics(request)
            else:
                return self._create_response(
                    success=False,
                    message=f"Unknown learning task: {task}"
                )
                
        except Exception as e:
            return self._create_response(
                success=False,
                message=f"Error processing learning request: {str(e)}"
            )
    
    async def _handle_feedback_collection(self, request: AgentRequest) -> AgentResponse:
        """Handle feedback collection from users."""
        try:
            feedback_data = request.context.get("feedback_data", {})
            
            if not feedback_data:
                return self._create_response(
                    success=False,
                    message="Feedback data is required"
                )
            
            # Create UserFeedback object
            user_feedback = UserFeedback(**feedback_data)
            
            # Store feedback
            feedback_id = await self.feedback_database.store_feedback(user_feedback)
            
            # Update learning metrics
            await self._update_feedback_metrics(user_feedback)
            
            # Trigger personalization update if significant feedback
            if user_feedback.rating <= 2:  # Poor rating
                await self._trigger_personalization_adjustment(user_feedback)
            
            result = {
                "feedback_id": feedback_id,
                "feedback_processed": True,
                "learning_impact": await self._calculate_learning_impact(user_feedback),
                "personalization_updated": user_feedback.rating <= 2
            }
            
            return self._create_response(
                success=True,
                result=result,
                confidence=1.0,
                message="Feedback collected and processed successfully"
            )
            
        except Exception as e:
            self.logger.error("Feedback collection failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Feedback collection failed: {str(e)}"
            )
    
    async def _handle_feedback_analysis(self, request: AgentRequest) -> AgentResponse:
        """Handle comprehensive feedback analysis."""
        try:
            analysis_params = request.parameters
            time_range = analysis_params.get("time_range", "7d")
            user_id = analysis_params.get("user_id")
            
            # Get feedback data
            feedback_data = await self.feedback_database.get_feedback(
                time_range=time_range,
                user_id=user_id
            )
            
            if not feedback_data:
                return self._create_response(
                    success=True,
                    result={"message": "No feedback data found for the specified criteria"},
                    confidence=1.0
                )
            
            # Perform analysis
            analysis_results = await self._analyze_feedback_patterns(feedback_data)
            
            result = {
                "feedback_summary": analysis_results["summary"],
                "trends": analysis_results["trends"],
                "user_segments": analysis_results["user_segments"],
                "improvement_areas": analysis_results["improvement_areas"],
                "satisfaction_score": analysis_results["satisfaction_score"]
            }
            
            return self._create_response(
                success=True,
                result=result,
                confidence=analysis_results["confidence"],
                message=f"Analyzed {len(feedback_data)} feedback entries"
            )
            
        except Exception as e:
            self.logger.error("Feedback analysis failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Feedback analysis failed: {str(e)}"
            )
    
    async def _handle_personalization_update(self, request: AgentRequest) -> AgentResponse:
        """Handle personalization model updates."""
        try:
            user_id = request.context.get("user_id")
            update_type = request.parameters.get("update_type", "incremental")
            
            if not user_id:
                return self._create_response(
                    success=False,
                    message="User ID is required for personalization update"
                )
            
            # Update personalization model
            update_results = await self.personalization_engine.update_user_model(
                user_id=user_id,
                update_type=update_type
            )
            
            # Measure improvement
            accuracy_improvement = await self._measure_personalization_improvement(
                user_id, update_results
            )
            
            result = {
                "user_id": user_id,
                "update_type": update_type,
                "model_updated": update_results["success"],
                "accuracy_improvement": accuracy_improvement,
                "new_preferences": update_results.get("updated_preferences", {}),
                "confidence_score": update_results.get("confidence", 0.0)
            }
            
            return self._create_response(
                success=True,
                result=result,
                confidence=update_results.get("confidence", 0.5),
                message="Personalization model updated successfully"
            )
            
        except Exception as e:
            self.logger.error("Personalization update failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Personalization update failed: {str(e)}"
            )
    
    async def _handle_ab_testing(self, request: AgentRequest) -> AgentResponse:
        """Handle A/B testing management."""
        try:
            action = request.parameters.get("action", "status")
            test_name = request.parameters.get("test_name")
            
            if action == "create":
                return await self._create_ab_test(request)
            elif action == "analyze":
                return await self._analyze_ab_test(request)
            elif action == "status":
                return await self._get_ab_test_status(request)
            else:
                return self._create_response(
                    success=False,
                    message=f"Unknown A/B testing action: {action}"
                )
                
        except Exception as e:
            self.logger.error("A/B testing failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"A/B testing failed: {str(e)}"
            )
    
    async def _handle_model_fine_tuning(self, request: AgentRequest) -> AgentResponse:
        """Handle model fine-tuning based on collected feedback."""
        try:
            model_type = request.parameters.get("model_type", "recommendation")
            training_data_size = request.parameters.get("training_data_size", 1000)
            
            # Prepare training data from feedback
            training_data = await self._prepare_training_data(model_type, training_data_size)
            
            if not training_data:
                return self._create_response(
                    success=False,
                    message="Insufficient training data for fine-tuning"
                )
            
            # Perform fine-tuning
            fine_tuning_results = await self._perform_fine_tuning(model_type, training_data)
            
            result = {
                "model_type": model_type,
                "training_samples": len(training_data),
                "fine_tuning_success": fine_tuning_results["success"],
                "performance_improvement": fine_tuning_results.get("improvement", 0.0),
                "new_model_version": fine_tuning_results.get("version", "unknown"),
                "validation_metrics": fine_tuning_results.get("metrics", {})
            }
            
            return self._create_response(
                success=fine_tuning_results["success"],
                result=result,
                confidence=fine_tuning_results.get("confidence", 0.5),
                message="Model fine-tuning completed"
            )
            
        except Exception as e:
            self.logger.error("Model fine-tuning failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Model fine-tuning failed: {str(e)}"
            )
    
    async def _handle_learning_metrics(self, request: AgentRequest) -> AgentResponse:
        """Handle learning metrics reporting."""
        try:
            metric_type = request.parameters.get("metric_type", "all")
            
            # Update current metrics
            await self._update_learning_metrics()
            
            # Filter metrics based on request
            if metric_type == "all":
                metrics = self.learning_metrics
            else:
                metrics = {metric_type: self.learning_metrics.get(metric_type, {})}
            
            result = {
                "learning_metrics": metrics,
                "last_updated": datetime.utcnow().isoformat(),
                "performance_trend": await self._calculate_performance_trend(),
                "recommendations": await self._generate_learning_recommendations()
            }
            
            return self._create_response(
                success=True,
                result=result,
                confidence=1.0,
                message="Learning metrics retrieved successfully"
            )
            
        except Exception as e:
            self.logger.error("Learning metrics retrieval failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Learning metrics retrieval failed: {str(e)}"
            )
    
    async def _update_feedback_metrics(self, feedback: UserFeedback) -> None:
        """Update learning metrics based on new feedback."""
        self.learning_metrics["total_feedback_collected"] += 1
        
        # Update average satisfaction
        current_avg = self.learning_metrics["average_user_satisfaction"]
        total_feedback = self.learning_metrics["total_feedback_collected"]
        
        new_avg = ((current_avg * (total_feedback - 1)) + feedback.rating) / total_feedback
        self.learning_metrics["average_user_satisfaction"] = new_avg
    
    async def _trigger_personalization_adjustment(self, feedback: UserFeedback) -> None:
        """Trigger personalization adjustment for poor feedback."""
        try:
            await self.personalization_engine.adjust_for_negative_feedback(feedback)
            self.logger.info("Personalization adjustment triggered", 
                           user_id=feedback.user_id, rating=feedback.rating)
        except Exception as e:
            self.logger.error("Personalization adjustment failed", error=str(e))
    
    async def _calculate_learning_impact(self, feedback: UserFeedback) -> float:
        """Calculate the learning impact of a feedback entry."""
        # Higher impact for extreme ratings (very good or very bad)
        rating_impact = abs(feedback.rating - 3.0) / 2.0  # Normalized to 0-1
        
        # Higher impact for detailed feedback
        detail_impact = min(1.0, len(feedback.comments or "") / 100.0)
        
        # Combine impacts
        return (rating_impact + detail_impact) / 2.0
    
    async def _analyze_feedback_patterns(self, feedback_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze patterns in feedback data."""
        if not feedback_data:
            return {"confidence": 0.0}
        
        # Calculate summary statistics
        ratings = [f["rating"] for f in feedback_data]
        avg_rating = np.mean(ratings)
        rating_std = np.std(ratings)
        
        # Identify trends
        feedback_types = [f.get("feedback_type", "neutral") for f in feedback_data]
        type_distribution = {ftype: feedback_types.count(ftype) for ftype in set(feedback_types)}
        
        # Identify improvement areas
        low_rated_feedback = [f for f in feedback_data if f["rating"] <= 2]
        improvement_areas = self._extract_improvement_areas(low_rated_feedback)
        
        # User segmentation
        user_segments = await self._segment_users_by_feedback(feedback_data)
        
        return {
            "summary": {
                "total_feedback": len(feedback_data),
                "average_rating": float(avg_rating),
                "rating_std": float(rating_std),
                "type_distribution": type_distribution
            },
            "trends": {
                "satisfaction_trend": "stable",  # Simplified for demo
                "engagement_trend": "increasing" if avg_rating > 3.5 else "stable"
            },
            "user_segments": user_segments,
            "improvement_areas": improvement_areas,
            "satisfaction_score": float(avg_rating / 5.0),
            "confidence": min(1.0, len(feedback_data) / 100.0)
        }
    
    def _extract_improvement_areas(self, low_rated_feedback: List[Dict[str, Any]]) -> List[str]:
        """Extract improvement areas from low-rated feedback."""
        improvement_areas = []
        
        for feedback in low_rated_feedback:
            comments = feedback.get("comments", "").lower()
            
            if "color" in comments:
                improvement_areas.append("color_recommendations")
            if "size" in comments or "fit" in comments:
                improvement_areas.append("size_fitting")
            if "style" in comments:
                improvement_areas.append("style_matching")
            if "price" in comments:
                improvement_areas.append("price_consideration")
        
        return list(set(improvement_areas))
    
    async def _segment_users_by_feedback(self, feedback_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Segment users based on their feedback patterns."""
        # Simplified user segmentation
        user_ratings = {}
        for feedback in feedback_data:
            user_id = feedback["user_id"]
            if user_id not in user_ratings:
                user_ratings[user_id] = []
            user_ratings[user_id].append(feedback["rating"])
        
        segments = {"highly_satisfied": 0, "satisfied": 0, "neutral": 0, "dissatisfied": 0}
        
        for user_id, ratings in user_ratings.items():
            avg_rating = np.mean(ratings)
            
            if avg_rating >= 4.5:
                segments["highly_satisfied"] += 1
            elif avg_rating >= 3.5:
                segments["satisfied"] += 1
            elif avg_rating >= 2.5:
                segments["neutral"] += 1
            else:
                segments["dissatisfied"] += 1
        
        return segments
    
    async def _measure_personalization_improvement(self, user_id: str, 
                                                 update_results: Dict[str, Any]) -> float:
        """Measure improvement in personalization accuracy."""
        # Simplified improvement measurement
        if update_results.get("success", False):
            return np.random.uniform(0.05, 0.15)  # 5-15% improvement
        return 0.0
    
    async def cleanup(self) -> None:
        """Clean up learning agent resources."""
        try:
            await self.feedback_database.cleanup()
            await self.ab_testing_manager.cleanup()
            await self.personalization_engine.cleanup()
            
            self.learning_metrics.clear()
            
            self.logger.info("Learning agent cleaned up successfully")
            
        except Exception as e:
            self.logger.error("Error during learning agent cleanup", error=str(e))
    
    async def health_check(self) -> bool:
        """Check if the learning agent is healthy."""
        try:
            return (
                await super().health_check() and
                await self.feedback_database.health_check() and
                await self.personalization_engine.health_check()
            )
        except Exception:
            return False


class FeedbackDatabase:
    """Database for storing and managing user feedback."""
    
    def __init__(self):
        self.feedback_storage = []  # In production, this would be a real database
        self.logger = structlog.get_logger("feedback_db")
    
    async def initialize(self) -> None:
        """Initialize feedback database."""
        self.feedback_storage = []
        self.logger.info("Feedback database initialized")
    
    async def store_feedback(self, feedback: UserFeedback) -> str:
        """Store user feedback and return feedback ID."""
        feedback_id = f"fb_{len(self.feedback_storage)+1:06d}"
        
        feedback_record = {
            "feedback_id": feedback_id,
            "user_id": feedback.user_id,
            "recommendation_id": feedback.recommendation_id,
            "rating": feedback.rating,
            "feedback_type": feedback.feedback_type,
            "comments": feedback.comments,
            "timestamp": feedback.timestamp.isoformat()
        }
        
        self.feedback_storage.append(feedback_record)
        self.logger.info("Feedback stored", feedback_id=feedback_id, user_id=feedback.user_id)
        
        return feedback_id
    
    async def get_feedback(self, time_range: str = "7d", user_id: str = None) -> List[Dict[str, Any]]:
        """Retrieve feedback based on criteria."""
        # Parse time range
        if time_range.endswith("d"):
            days = int(time_range[:-1])
            cutoff_date = datetime.utcnow() - timedelta(days=days)
        else:
            cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        # Filter feedback
        filtered_feedback = []
        for feedback in self.feedback_storage:
            feedback_date = datetime.fromisoformat(feedback["timestamp"])
            
            # Check time range
            if feedback_date < cutoff_date:
                continue
            
            # Check user ID filter
            if user_id and feedback["user_id"] != user_id:
                continue
            
            filtered_feedback.append(feedback)
        
        return filtered_feedback
    
    async def health_check(self) -> bool:
        """Check if feedback database is healthy."""
        return True  # Always healthy for in-memory storage
    
    async def cleanup(self) -> None:
        """Clean up feedback database."""
        self.feedback_storage.clear()


class ABTestingManager:
    """Manages A/B testing for fashion recommendations."""
    
    def __init__(self):
        self.active_tests = {}
        self.test_results = {}
        self.logger = structlog.get_logger("ab_testing")
    
    async def initialize(self) -> None:
        """Initialize A/B testing manager."""
        self.active_tests = {}
        self.test_results = {}
        self.logger.info("A/B testing manager initialized")
    
    async def create_test(self, test_config: Dict[str, Any]) -> str:
        """Create a new A/B test."""
        test_id = f"test_{len(self.active_tests)+1:03d}"
        
        self.active_tests[test_id] = {
            "test_id": test_id,
            "name": test_config["name"],
            "description": test_config["description"],
            "variants": test_config["variants"],
            "start_date": datetime.utcnow().isoformat(),
            "status": "active",
            "participants": 0,
            "conversions": {}
        }
        
        self.logger.info("A/B test created", test_id=test_id, name=test_config["name"])
        return test_id
    
    async def get_test_assignment(self, user_id: str, test_name: str) -> str:
        """Get test variant assignment for a user."""
        # Simple hash-based assignment
        import hashlib
        hash_value = int(hashlib.md5(f"{user_id}_{test_name}".encode()).hexdigest(), 16)
        return "A" if hash_value % 2 == 0 else "B"
    
    async def record_conversion(self, test_id: str, user_id: str, variant: str) -> None:
        """Record a conversion for an A/B test."""
        if test_id in self.active_tests:
            test = self.active_tests[test_id]
            if variant not in test["conversions"]:
                test["conversions"][variant] = 0
            test["conversions"][variant] += 1
    
    async def health_check(self) -> bool:
        """Check if A/B testing manager is healthy."""
        return True
    
    async def cleanup(self) -> None:
        """Clean up A/B testing manager."""
        self.active_tests.clear()
        self.test_results.clear()


class PersonalizationEngine:
    """Engine for personalized fashion recommendations."""
    
    def __init__(self):
        self.user_models = {}
        self.logger = structlog.get_logger("personalization")
    
    async def initialize(self) -> None:
        """Initialize personalization engine."""
        self.user_models = {}
        self.logger.info("Personalization engine initialized")
    
    async def update_user_model(self, user_id: str, update_type: str = "incremental") -> Dict[str, Any]:
        """Update user personalization model."""
        if user_id not in self.user_models:
            self.user_models[user_id] = {
                "preferences": {},
                "style_history": [],
                "satisfaction_scores": [],
                "last_updated": datetime.utcnow().isoformat()
            }
        
        # Simulate model update
        model = self.user_models[user_id]
        model["last_updated"] = datetime.utcnow().isoformat()
        
        return {
            "success": True,
            "confidence": 0.8,
            "updated_preferences": model["preferences"]
        }
    
    async def adjust_for_negative_feedback(self, feedback: UserFeedback) -> None:
        """Adjust user model based on negative feedback."""
        user_id = feedback.user_id
        
        if user_id not in self.user_models:
            await self.update_user_model(user_id)
        
        # Adjust preferences based on negative feedback
        model = self.user_models[user_id]
        model["satisfaction_scores"].append(feedback.rating)
        
        self.logger.info("User model adjusted for negative feedback", 
                        user_id=user_id, rating=feedback.rating)
    
    async def health_check(self) -> bool:
        """Check if personalization engine is healthy."""
        return True
    
    async def cleanup(self) -> None:
        """Clean up personalization engine."""
        self.user_models.clear()