"""
Stilya - Personal Fashion AI Assistant
A comprehensive fashion recommendation system with multi-agent orchestration.
"""

__version__ = "1.0.0"
__author__ = "Stilya Development Team"

from .orchestration.manager import OrchestrationManager
from .communication.api import app
from .agents import (
    WardrobeAgent,
    VisualIntelligenceAgent,
    CreativityAgent,
    EmpathyAgent,
    LearningAgent,
    KnowledgeIntegrationAgent
)

__all__ = [
    "OrchestrationManager",
    "app",
    "WardrobeAgent",
    "VisualIntelligenceAgent", 
    "CreativityAgent",
    "EmpathyAgent",
    "LearningAgent",
    "KnowledgeIntegrationAgent"
]