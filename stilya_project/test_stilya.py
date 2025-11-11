#!/usr/bin/env python3
"""
Test script for Stilya Fashion AI Assistant.
Tests the complete system functionality.
"""

import asyncio
import sys
import json
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from stilya.orchestration.manager import OrchestrationManager
from stilya.communication.models import RecommendationRequest, UserFeedback, UserProfile
from stilya.config.settings import get_settings


async def test_orchestration_manager():
    """Test the orchestration manager."""
    print("🧪 Testing Stilya Fashion AI Assistant")
    print("=" * 50)
    
    # Initialize orchestration manager
    print("1. Initializing Orchestration Manager...")
    manager = OrchestrationManager()
    
    if not await manager.initialize():
        print("❌ Failed to initialize orchestration manager")
        return False
    
    print("✅ Orchestration Manager initialized successfully")
    
    # Test recommendation request
    print("\n2. Testing Recommendation Request...")
    
    request = RecommendationRequest(
        user_id="test_user_001",
        occasion="business meeting",
        mood="confident",
        preferences={
            "style": "professional",
            "colors": ["navy", "gray", "white"],
            "budget": "medium"
        },
        style_preferences=["formal", "classic"],
        budget_range="$100-$300"
    )
    
    try:
        response = await manager.process_recommendation_request(request)
        
        if response.success:
            print("✅ Recommendation request processed successfully")
            print(f"   Confidence: {response.confidence_score:.2f}")
            print(f"   Processing time: {response.processing_time:.2f}s")
            print(f"   Recommendations: {len(response.recommendations)}")
        else:
            print("❌ Recommendation request failed")
            print(f"   Error: {response.metadata.get('error', 'Unknown error')}")
            
    except Exception as e:
        print(f"❌ Exception during recommendation: {e}")
    
    # Test feedback processing
    print("\n3. Testing Feedback Processing...")
    
    feedback = UserFeedback(
        user_id="test_user_001",
        recommendation_id="test_rec_001",
        rating=4.5,
        feedback_type="positive",
        comments="Great recommendations! I loved the professional look."
    )
    
    try:
        feedback_result = await manager.process_feedback(feedback)
        
        if feedback_result.get("feedback_processed"):
            print("✅ Feedback processed successfully")
            print(f"   Agents updated: {feedback_result.get('agents_updated', 0)}")
        else:
            print("❌ Feedback processing failed")
            
    except Exception as e:
        print(f"❌ Exception during feedback processing: {e}")
    
    # Test performance metrics
    print("\n4. Testing Performance Metrics...")
    
    try:
        metrics = await manager.get_performance_metrics()
        print("✅ Performance metrics retrieved successfully")
        print(f"   Total recommendations: {metrics['system_metrics']['total_recommendations']}")
        print(f"   Success rate: {metrics['system_metrics']['success_rate']:.2%}")
        print(f"   Average response time: {metrics['system_metrics']['average_response_time']:.2f}s")
        
    except Exception as e:
        print(f"❌ Exception during metrics retrieval: {e}")
    
    # Cleanup
    print("\n5. Cleaning up...")
    try:
        await manager.shutdown()
        print("✅ Orchestration Manager shutdown successfully")
    except Exception as e:
        print(f"❌ Exception during shutdown: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Stilya Fashion AI Assistant test completed!")
    
    return True


async def test_individual_agents():
    """Test individual agents."""
    print("\n🔍 Testing Individual Agents")
    print("=" * 30)
    
    from stilya.agents import (
        WardrobeAgent, VisualIntelligenceAgent, CreativityAgent,
        EmpathyAgent, LearningAgent, KnowledgeIntegrationAgent
    )
    from stilya.communication.models import AgentRequest, AgentType
    
    agents = [
        (WardrobeAgent(), "wardrobe", "Find fashion items matching casual style"),
        (VisualIntelligenceAgent(), "visual", "Analyze color preferences"),
        (CreativityAgent(), "creativity", "Generate creative outfit combinations"),
        (EmpathyAgent(), "empathy", "Analyze emotional needs for styling"),
        (LearningAgent(), "learning", "Collect feedback"),
        (KnowledgeIntegrationAgent(), "knowledge", "Detect knowledge files")
    ]
    
    for agent, name, task in agents:
        print(f"\nTesting {name.title()} Agent...")
        
        try:
            # Initialize agent
            if await agent.initialize():
                print(f"✅ {name.title()} Agent initialized")
                
                # Test basic functionality
                request = AgentRequest(
                    agent_type=getattr(AgentType, name.upper()),
                    task_description=task,
                    context={"user_id": "test_user"},
                    parameters={}
                )
                
                response = await agent.process_request(request)
                
                if response.success:
                    print(f"✅ {name.title()} Agent processed request successfully")
                    print(f"   Confidence: {response.confidence:.2f}")
                else:
                    print(f"❌ {name.title()} Agent request failed: {response.message}")
                
                # Health check
                if await agent.health_check():
                    print(f"✅ {name.title()} Agent health check passed")
                else:
                    print(f"❌ {name.title()} Agent health check failed")
                
                # Cleanup
                await agent.cleanup()
                
            else:
                print(f"❌ Failed to initialize {name.title()} Agent")
                
        except Exception as e:
            print(f"❌ Exception testing {name.title()} Agent: {e}")


async def test_api_endpoints():
    """Test API endpoints."""
    print("\n🌐 Testing API Endpoints")
    print("=" * 25)
    
    try:
        from stilya.communication.api import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test health endpoint
        print("Testing /health endpoint...")
        response = client.get("/health")
        if response.status_code == 200:
            print("✅ Health endpoint working")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
        
        # Test status endpoint
        print("Testing /status endpoint...")
        response = client.get("/status")
        if response.status_code == 200:
            print("✅ Status endpoint working")
        else:
            print(f"❌ Status endpoint failed: {response.status_code}")
        
        # Test recommendation endpoint (will fail without proper setup, but should validate structure)
        print("Testing /recommend endpoint structure...")
        test_request = {
            "user_id": "test_user",
            "occasion": "casual",
            "preferences": {"style": "relaxed"}
        }
        
        response = client.post("/recommend", json=test_request)
        print(f"📝 Recommendation endpoint response: {response.status_code}")
        
    except ImportError as e:
        print(f"❌ Cannot test API endpoints: {e}")
    except Exception as e:
        print(f"❌ Exception testing API endpoints: {e}")


def test_configuration():
    """Test configuration loading."""
    print("\n⚙️  Testing Configuration")
    print("=" * 25)
    
    try:
        settings = get_settings()
        print("✅ Configuration loaded successfully")
        print(f"   Environment: {settings.environment}")
        print(f"   Debug mode: {settings.debug}")
        print(f"   Log level: {settings.log_level}")
        
        # Test Azure configuration
        if hasattr(settings, 'azure'):
            print("✅ Azure configuration found")
        else:
            print("❌ Azure configuration missing")
            
    except Exception as e:
        print(f"❌ Configuration test failed: {e}")


async def main():
    """Main test function."""
    print("🚀 Starting Stilya Fashion AI Assistant Tests")
    print("=" * 60)
    
    # Test configuration first
    test_configuration()
    
    # Test individual components
    await test_individual_agents()
    
    # Test API endpoints
    await test_api_endpoints()
    
    # Test full orchestration
    await test_orchestration_manager()
    
    print("\n" + "=" * 60)
    print("✨ All tests completed!")
    print("\nNote: Some tests may show warnings or errors if external")
    print("services (Azure, OpenAI, etc.) are not configured.")
    print("This is expected in a test environment.")


if __name__ == "__main__":
    # Run tests
    asyncio.run(main())