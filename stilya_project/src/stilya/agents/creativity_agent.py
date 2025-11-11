"""
Creativity Agent for Stilya Fashion AI Assistant.
Generates innovative fashion combinations using AURORA module with intentional deviation.
"""

import asyncio
import random
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import itertools
import structlog
from sentence_transformers import SentenceTransformer

from .base import BaseAgent
from ..communication.models import (
    AgentRequest, AgentResponse, AgentType, FashionItem, OutfitRecommendation
)
from ..config.settings import get_settings

settings = get_settings()


class CreativityAgent(BaseAgent):
    """
    Creativity Agent responsible for:
    - Generating innovative fashion combinations using AURORA module
    - Applying intentional deviation and semantic innovation
    - Cultural synthesis for diverse fashion expressions
    - Achieving 84%+ creativity score target
    """
    
    def __init__(self):
        super().__init__(AgentType.CREATIVITY, "Creativity Agent")
        self.aurora_module: Optional[AuroraModule] = None
        self.style_combinations_db: Dict[str, List[Dict]] = {}
        self.cultural_style_matrix: Dict[str, Dict[str, float]] = {}
        self.creativity_patterns: List[Dict[str, Any]] = []
        
    async def initialize(self) -> bool:
        """Initialize the creativity agent with AURORA module and style databases."""
        try:
            self.logger.info("Initializing Creativity Agent")
            
            # Initialize AURORA module
            await self._initialize_aurora_module()
            
            # Load style combination database
            await self._load_style_combinations()
            
            # Initialize cultural style matrix
            await self._initialize_cultural_matrix()
            
            # Load creativity patterns
            await self._load_creativity_patterns()
            
            self.logger.info("Creativity Agent initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error("Failed to initialize Creativity Agent", error=str(e))
            return False
    
    async def _initialize_aurora_module(self) -> None:
        """Initialize the AURORA (Adaptive Unsupervised Recommendation for Original Approaches) module."""
        try:
            self.aurora_module = AuroraModule()
            await self.aurora_module.initialize()
            self.logger.info("AURORA module initialized")
            
        except Exception as e:
            self.logger.error("Failed to initialize AURORA module", error=str(e))
            raise
    
    async def _load_style_combinations(self) -> None:
        """Load style combination database for creative inspiration."""
        try:
            # In production, this would load from a comprehensive database
            # For now, create sample combinations
            self.style_combinations_db = {
                "classic_modern": [
                    {"base": "classic", "accent": "modern", "fusion_score": 0.85},
                    {"base": "vintage", "accent": "contemporary", "fusion_score": 0.78}
                ],
                "cultural_fusion": [
                    {"base": "western", "accent": "eastern", "fusion_score": 0.92},
                    {"base": "traditional", "accent": "urban", "fusion_score": 0.88}
                ],
                "unexpected_pairs": [
                    {"base": "formal", "accent": "casual", "fusion_score": 0.83},
                    {"base": "minimalist", "accent": "bohemian", "fusion_score": 0.79}
                ]
            }
            
            self.logger.info("Style combinations loaded", 
                           categories=len(self.style_combinations_db))
            
        except Exception as e:
            self.logger.error("Failed to load style combinations", error=str(e))
            raise
    
    async def _initialize_cultural_matrix(self) -> None:
        """Initialize cultural style compatibility matrix."""
        try:
            # Sample cultural style matrix - in production, this would be more comprehensive
            self.cultural_style_matrix = {
                "western": {
                    "minimalist": 0.9, "bohemian": 0.7, "classic": 0.85, "modern": 0.95
                },
                "eastern": {
                    "traditional": 0.95, "modern": 0.8, "fusion": 0.9, "contemporary": 0.75
                },
                "mediterranean": {
                    "casual": 0.9, "elegant": 0.85, "colorful": 0.95, "relaxed": 0.9
                },
                "scandinavian": {
                    "minimalist": 0.95, "functional": 0.9, "clean": 0.95, "neutral": 0.9
                }
            }
            
            self.logger.info("Cultural style matrix initialized")
            
        except Exception as e:
            self.logger.error("Failed to initialize cultural matrix", error=str(e))
            raise
    
    async def _load_creativity_patterns(self) -> None:
        """Load creativity patterns for systematic innovation."""
        try:
            self.creativity_patterns = [
                {
                    "name": "contrasting_textures",
                    "description": "Combine smooth and textured materials",
                    "weight": 0.8,
                    "application": "material_mixing"
                },
                {
                    "name": "color_temperature_mix",
                    "description": "Mix warm and cool color temperatures",
                    "weight": 0.85,
                    "application": "color_coordination"
                },
                {
                    "name": "formal_casual_blend",
                    "description": "Blend formal and casual elements",
                    "weight": 0.9,
                    "application": "style_mixing"
                },
                {
                    "name": "proportional_play",
                    "description": "Play with proportions and silhouettes",
                    "weight": 0.75,
                    "application": "silhouette_design"
                },
                {
                    "name": "cultural_fusion",
                    "description": "Fuse elements from different cultures",
                    "weight": 0.95,
                    "application": "cultural_blend"
                }
            ]
            
            self.logger.info("Creativity patterns loaded", 
                           patterns_count=len(self.creativity_patterns))
            
        except Exception as e:
            self.logger.error("Failed to load creativity patterns", error=str(e))
            raise
    
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Process creativity-related requests."""
        try:
            task = request.task_description.lower()
            
            if "generate_creative_outfit" in task:
                return await self._handle_creative_outfit_generation(request)
            elif "innovative_combination" in task:
                return await self._handle_innovative_combination(request)
            elif "cultural_fusion" in task:
                return await self._handle_cultural_fusion(request)
            elif "style_deviation" in task:
                return await self._handle_style_deviation(request)
            elif "creativity_score" in task:
                return await self._handle_creativity_scoring(request)
            else:
                return self._create_response(
                    success=False,
                    message=f"Unknown creativity task: {task}"
                )
                
        except Exception as e:
            return self._create_response(
                success=False,
                message=f"Error processing creativity request: {str(e)}"
            )
    
    async def _handle_creative_outfit_generation(self, request: AgentRequest) -> AgentResponse:
        """Handle creative outfit generation using AURORA module."""
        try:
            user_preferences = request.context.get("preferences", {})
            available_items = request.context.get("available_items", [])
            creativity_level = request.parameters.get("creativity_level", "high")
            cultural_context = request.context.get("cultural_context", "western")
            
            if not available_items:
                return self._create_response(
                    success=False,
                    message="Available items are required for creative outfit generation"
                )
            
            # Convert item dictionaries to FashionItem objects
            items = [FashionItem(**item) if isinstance(item, dict) else item 
                    for item in available_items]
            
            # Generate creative combinations using AURORA
            creative_outfits = await self.aurora_module.generate_creative_combinations(
                items=items,
                preferences=user_preferences,
                creativity_level=creativity_level,
                cultural_context=cultural_context
            )
            
            # Score creativity for each outfit
            scored_outfits = []
            for outfit in creative_outfits:
                creativity_score = await self._calculate_creativity_score(
                    outfit, user_preferences, cultural_context
                )
                
                outfit_recommendation = OutfitRecommendation(
                    outfit_id=f"creative_{len(scored_outfits)+1}",
                    items=outfit["items"],
                    style_description=outfit["style_description"],
                    occasion=outfit["occasion"],
                    confidence_score=outfit["confidence"],
                    creativity_score=creativity_score,
                    explanation=outfit["explanation"],
                    styling_tips=outfit.get("styling_tips", [])
                )
                
                scored_outfits.append({
                    "outfit": outfit_recommendation.dict(),
                    "creativity_score": creativity_score,
                    "innovation_aspects": outfit.get("innovation_aspects", [])
                })
            
            # Sort by creativity score
            scored_outfits.sort(key=lambda x: x["creativity_score"], reverse=True)
            
            # Calculate overall confidence
            avg_creativity = np.mean([o["creativity_score"] for o in scored_outfits])
            confidence = min(1.0, avg_creativity)
            
            return self._create_response(
                success=True,
                result={
                    "creative_outfits": scored_outfits,
                    "average_creativity_score": float(avg_creativity),
                    "total_combinations": len(scored_outfits),
                    "creativity_level": creativity_level
                },
                confidence=confidence,
                message=f"Generated {len(scored_outfits)} creative outfit combinations"
            )
            
        except Exception as e:
            self.logger.error("Creative outfit generation failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Creative outfit generation failed: {str(e)}"
            )
    
    async def _handle_innovative_combination(self, request: AgentRequest) -> AgentResponse:
        """Handle innovative combination generation with intentional deviation."""
        try:
            base_style = request.context.get("base_style", "classic")
            target_deviation = request.parameters.get("deviation_level", 0.3)
            items = request.context.get("items", [])
            
            if not items:
                return self._create_response(
                    success=False,
                    message="Items are required for innovative combination"
                )
            
            # Apply intentional deviation
            innovative_combinations = await self._apply_intentional_deviation(
                items, base_style, target_deviation
            )
            
            # Evaluate innovation for each combination
            evaluated_combinations = []
            for combo in innovative_combinations:
                innovation_score = await self._evaluate_innovation(combo, base_style)
                semantic_coherence = await self._evaluate_semantic_coherence(combo)
                
                evaluated_combinations.append({
                    "combination": combo,
                    "innovation_score": innovation_score,
                    "semantic_coherence": semantic_coherence,
                    "overall_score": (innovation_score + semantic_coherence) / 2
                })
            
            # Sort by overall score
            evaluated_combinations.sort(key=lambda x: x["overall_score"], reverse=True)
            
            return self._create_response(
                success=True,
                result={
                    "innovative_combinations": evaluated_combinations,
                    "base_style": base_style,
                    "target_deviation": target_deviation,
                    "combinations_count": len(evaluated_combinations)
                },
                confidence=float(np.mean([c["overall_score"] for c in evaluated_combinations])),
                message="Innovative combinations generated successfully"
            )
            
        except Exception as e:
            self.logger.error("Innovative combination generation failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Innovative combination generation failed: {str(e)}"
            )
    
    async def _handle_cultural_fusion(self, request: AgentRequest) -> AgentResponse:
        """Handle cultural fusion style generation."""
        try:
            primary_culture = request.context.get("primary_culture", "western")
            secondary_culture = request.context.get("secondary_culture", "eastern")
            fusion_intensity = request.parameters.get("fusion_intensity", 0.5)
            items = request.context.get("items", [])
            
            # Generate cultural fusion combinations
            fusion_combinations = await self._generate_cultural_fusion(
                items, primary_culture, secondary_culture, fusion_intensity
            )
            
            # Evaluate cultural authenticity and innovation
            evaluated_fusions = []
            for fusion in fusion_combinations:
                authenticity_score = await self._evaluate_cultural_authenticity(
                    fusion, primary_culture, secondary_culture
                )
                innovation_score = await self._evaluate_cultural_innovation(fusion)
                
                evaluated_fusions.append({
                    "fusion": fusion,
                    "authenticity_score": authenticity_score,
                    "innovation_score": innovation_score,
                    "fusion_harmony": (authenticity_score + innovation_score) / 2
                })
            
            return self._create_response(
                success=True,
                result={
                    "cultural_fusions": evaluated_fusions,
                    "primary_culture": primary_culture,
                    "secondary_culture": secondary_culture,
                    "fusion_intensity": fusion_intensity
                },
                confidence=float(np.mean([f["fusion_harmony"] for f in evaluated_fusions])),
                message="Cultural fusion combinations generated"
            )
            
        except Exception as e:
            self.logger.error("Cultural fusion generation failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Cultural fusion generation failed: {str(e)}"
            )
    
    async def _handle_style_deviation(self, request: AgentRequest) -> AgentResponse:
        """Handle systematic style deviation for creative exploration."""
        try:
            base_outfit = request.context.get("base_outfit", {})
            deviation_patterns = request.parameters.get("patterns", ["all"])
            
            if not base_outfit:
                return self._create_response(
                    success=False,
                    message="Base outfit is required for style deviation"
                )
            
            # Apply deviation patterns
            deviations = []
            for pattern in self.creativity_patterns:
                if "all" in deviation_patterns or pattern["name"] in deviation_patterns:
                    deviation_result = await self._apply_deviation_pattern(
                        base_outfit, pattern
                    )
                    if deviation_result:
                        deviations.append(deviation_result)
            
            return self._create_response(
                success=True,
                result={
                    "deviations": deviations,
                    "base_outfit": base_outfit,
                    "patterns_applied": len(deviations)
                },
                confidence=0.85,
                message=f"Applied {len(deviations)} deviation patterns"
            )
            
        except Exception as e:
            self.logger.error("Style deviation failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Style deviation failed: {str(e)}"
            )
    
    async def _handle_creativity_scoring(self, request: AgentRequest) -> AgentResponse:
        """Handle creativity scoring for outfit combinations."""
        try:
            outfit = request.context.get("outfit", {})
            context = request.context.get("scoring_context", {})
            
            if not outfit:
                return self._create_response(
                    success=False,
                    message="Outfit is required for creativity scoring"
                )
            
            # Calculate comprehensive creativity score
            creativity_score = await self._calculate_creativity_score(
                outfit, context.get("preferences", {}), context.get("cultural_context", "western")
            )
            
            # Detailed scoring breakdown
            scoring_breakdown = await self._get_creativity_breakdown(outfit)
            
            return self._create_response(
                success=True,
                result={
                    "creativity_score": creativity_score,
                    "scoring_breakdown": scoring_breakdown,
                    "meets_target": creativity_score >= 0.84,
                    "target_score": 0.84
                },
                confidence=1.0,
                message=f"Creativity score: {creativity_score:.3f}"
            )
            
        except Exception as e:
            self.logger.error("Creativity scoring failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Creativity scoring failed: {str(e)}"
            )
    
    async def _calculate_creativity_score(self, outfit: Dict[str, Any], 
                                        preferences: Dict[str, Any], 
                                        cultural_context: str) -> float:
        """Calculate comprehensive creativity score for an outfit."""
        try:
            scores = []
            
            # Novelty score - how unusual is this combination
            novelty_score = await self._calculate_novelty_score(outfit)
            scores.append(("novelty", novelty_score, 0.3))
            
            # Innovation score - how creatively does it solve the fashion need
            innovation_score = await self._calculate_innovation_score(outfit)
            scores.append(("innovation", innovation_score, 0.25))
            
            # Coherence score - does the creative combination make sense
            coherence_score = await self._evaluate_semantic_coherence(outfit)
            scores.append(("coherence", coherence_score, 0.2))
            
            # Cultural fusion score - how well does it blend cultural elements
            cultural_score = await self._calculate_cultural_fusion_score(outfit, cultural_context)
            scores.append(("cultural_fusion", cultural_score, 0.15))
            
            # Aesthetic harmony score - visual appeal despite creativity
            aesthetic_score = await self._calculate_aesthetic_harmony(outfit)
            scores.append(("aesthetic_harmony", aesthetic_score, 0.1))
            
            # Calculate weighted average
            weighted_score = sum(score * weight for _, score, weight in scores)
            
            self.logger.debug("Creativity score calculated",
                            outfit_id=outfit.get("outfit_id", "unknown"),
                            scores={name: score for name, score, _ in scores},
                            final_score=weighted_score)
            
            return min(1.0, max(0.0, weighted_score))
            
        except Exception as e:
            self.logger.error("Creativity score calculation failed", error=str(e))
            return 0.5
    
    async def _calculate_novelty_score(self, outfit: Dict[str, Any]) -> float:
        """Calculate how novel/unusual the outfit combination is."""
        try:
            items = outfit.get("items", [])
            if len(items) < 2:
                return 0.0
            
            # Check for unusual combinations
            categories = [item.get("category") for item in items]
            colors = [color for item in items for color in item.get("color", [])]
            styles = [style for item in items for style in item.get("style", [])]
            
            # Novelty factors
            novelty_factors = []
            
            # Category combination novelty
            category_pairs = list(itertools.combinations(categories, 2))
            for pair in category_pairs:
                # Simple heuristic: some combinations are more novel
                if self._is_novel_category_combination(pair):
                    novelty_factors.append(0.8)
                else:
                    novelty_factors.append(0.3)
            
            # Color combination novelty
            if len(set(colors)) > 3:  # Many different colors
                novelty_factors.append(0.7)
            elif len(set(colors)) == 1:  # Monochrome
                novelty_factors.append(0.6)
            
            # Style mixing novelty
            if len(set(styles)) > 2:  # Multiple styles mixed
                novelty_factors.append(0.8)
            
            return np.mean(novelty_factors) if novelty_factors else 0.5
            
        except Exception:
            return 0.5
    
    async def _calculate_innovation_score(self, outfit: Dict[str, Any]) -> float:
        """Calculate how innovative the outfit solution is."""
        try:
            # Check for innovative elements
            innovation_elements = []
            
            items = outfit.get("items", [])
            
            # Material mixing innovation
            materials = [item.get("material") for item in items if item.get("material")]
            if len(set(materials)) > 2:
                innovation_elements.append(0.8)
            
            # Pattern mixing innovation
            patterns = [item.get("pattern") for item in items if item.get("pattern")]
            if len(set(patterns)) > 1 and "solid" not in patterns:
                innovation_elements.append(0.9)
            
            # Occasion appropriateness with creative twist
            occasions = [occ for item in items for occ in item.get("occasion", [])]
            if len(set(occasions)) > 1:  # Multi-occasion versatility
                innovation_elements.append(0.7)
            
            return np.mean(innovation_elements) if innovation_elements else 0.4
            
        except Exception:
            return 0.4
    
    async def _evaluate_semantic_coherence(self, outfit: Dict[str, Any]) -> float:
        """Evaluate if the creative combination maintains semantic coherence."""
        try:
            items = outfit.get("items", [])
            if len(items) < 2:
                return 0.5
            
            # Check coherence factors
            coherence_scores = []
            
            # Color harmony
            all_colors = [color for item in items for color in item.get("color", [])]
            color_harmony = self._calculate_color_harmony(all_colors)
            coherence_scores.append(color_harmony)
            
            # Style consistency (can be diverse but should be intentional)
            all_styles = [style for item in items for style in item.get("style", [])]
            style_coherence = self._calculate_style_coherence(all_styles)
            coherence_scores.append(style_coherence)
            
            # Occasion appropriateness
            all_occasions = [occ for item in items for occ in item.get("occasion", [])]
            occasion_coherence = self._calculate_occasion_coherence(all_occasions)
            coherence_scores.append(occasion_coherence)
            
            return np.mean(coherence_scores)
            
        except Exception:
            return 0.5
    
    def _is_novel_category_combination(self, category_pair: Tuple[str, str]) -> bool:
        """Check if a category combination is considered novel."""
        # Define some novel combinations
        novel_combinations = {
            ("formal", "casual"), ("dress", "jacket"), ("accessories", "shoes"),
            ("traditional", "modern"), ("vintage", "contemporary")
        }
        
        return category_pair in novel_combinations or category_pair[::-1] in novel_combinations
    
    def _calculate_color_harmony(self, colors: List[str]) -> float:
        """Calculate color harmony score."""
        if len(colors) <= 1:
            return 1.0
        
        # Simple harmony rules
        unique_colors = list(set(colors))
        
        if len(unique_colors) == 1:  # Monochrome
            return 0.9
        elif len(unique_colors) == 2:  # Two colors can be harmonious
            return 0.8
        elif len(unique_colors) == 3:  # Triadic can work
            return 0.7
        else:  # Many colors - need careful handling
            return 0.5
    
    def _calculate_style_coherence(self, styles: List[str]) -> float:
        """Calculate style coherence score."""
        if len(styles) <= 1:
            return 1.0
        
        unique_styles = list(set(styles))
        
        # Some style combinations work well together
        compatible_style_groups = [
            {"classic", "elegant", "sophisticated"},
            {"casual", "relaxed", "comfortable"},
            {"modern", "contemporary", "minimalist"},
            {"bohemian", "artistic", "creative"},
            {"vintage", "retro", "traditional"}
        ]
        
        # Check if styles are from compatible groups
        for group in compatible_style_groups:
            if all(style in group for style in unique_styles):
                return 0.9
        
        # Mixed styles can be creative
        return 0.6 if len(unique_styles) <= 3 else 0.4
    
    def _calculate_occasion_coherence(self, occasions: List[str]) -> float:
        """Calculate occasion coherence score."""
        if len(occasions) <= 1:
            return 1.0
        
        unique_occasions = list(set(occasions))
        
        # Some occasions are compatible
        compatible_occasions = [
            {"casual", "vacation", "weekend"},
            {"business", "formal", "professional"},
            {"party", "evening", "social"},
            {"sports", "active", "fitness"}
        ]
        
        for group in compatible_occasions:
            if all(occ in group for occ in unique_occasions):
                return 0.9
        
        # Versatile pieces that work for multiple occasions
        return 0.7 if len(unique_occasions) <= 3 else 0.5
    
    async def _apply_intentional_deviation(self, items: List[Dict], 
                                         base_style: str, 
                                         deviation_level: float) -> List[Dict[str, Any]]:
        """Apply intentional deviation to create innovative combinations."""
        try:
            combinations = []
            
            # Select items that deviate from base style
            deviating_items = []
            for item in items:
                item_styles = item.get("style", [])
                if base_style not in item_styles:
                    deviation_score = random.uniform(0.3, 1.0)
                    if deviation_score >= deviation_level:
                        deviating_items.append({
                            "item": item,
                            "deviation_score": deviation_score
                        })
            
            # Create combinations with deviating items
            base_items = [item for item in items if base_style in item.get("style", [])]
            
            for base_item in base_items[:3]:  # Limit to top 3 base items
                for dev_item in deviating_items[:5]:  # Limit to top 5 deviating items
                    combination = {
                        "items": [base_item, dev_item["item"]],
                        "base_style": base_style,
                        "deviation_applied": dev_item["deviation_score"],
                        "combination_type": "intentional_deviation"
                    }
                    combinations.append(combination)
            
            return combinations[:10]  # Return top 10 combinations
            
        except Exception as e:
            self.logger.error("Intentional deviation failed", error=str(e))
            return []
    
    async def _evaluate_innovation(self, combination: Dict[str, Any], base_style: str) -> float:
        """Evaluate the innovation level of a combination."""
        try:
            items = combination.get("items", [])
            if len(items) < 2:
                return 0.0
            
            # Innovation factors
            innovation_factors = []
            
            # Style mixing
            all_styles = [style for item in items for style in item.get("style", [])]
            style_diversity = len(set(all_styles))
            if style_diversity > 2:
                innovation_factors.append(0.8)
            elif style_diversity == 2:
                innovation_factors.append(0.6)
            
            # Category combination
            categories = [item.get("category") for item in items]
            if len(set(categories)) == len(categories):  # All different categories
                innovation_factors.append(0.9)
            
            # Color innovation
            all_colors = [color for item in items for color in item.get("color", [])]
            color_diversity = len(set(all_colors))
            if color_diversity > 3:
                innovation_factors.append(0.7)
            
            return np.mean(innovation_factors) if innovation_factors else 0.4
            
        except Exception:
            return 0.4
    
    async def _generate_cultural_fusion(self, items: List[Dict], 
                                      primary_culture: str, 
                                      secondary_culture: str, 
                                      fusion_intensity: float) -> List[Dict[str, Any]]:
        """Generate cultural fusion combinations."""
        try:
            fusions = []
            
            # Get cultural style preferences
            primary_styles = self.cultural_style_matrix.get(primary_culture, {})
            secondary_styles = self.cultural_style_matrix.get(secondary_culture, {})
            
            # Find items that match each culture
            primary_items = []
            secondary_items = []
            
            for item in items:
                item_styles = item.get("style", [])
                
                # Check primary culture match
                primary_match = sum(primary_styles.get(style, 0) for style in item_styles)
                if primary_match > 0.5:
                    primary_items.append((item, primary_match))
                
                # Check secondary culture match
                secondary_match = sum(secondary_styles.get(style, 0) for style in item_styles)
                if secondary_match > 0.5:
                    secondary_items.append((item, secondary_match))
            
            # Create fusion combinations
            for primary_item, p_score in primary_items[:5]:
                for secondary_item, s_score in secondary_items[:5]:
                    if primary_item != secondary_item:
                        fusion_score = (p_score + s_score) / 2 * fusion_intensity
                        
                        fusion = {
                            "items": [primary_item, secondary_item],
                            "primary_culture": primary_culture,
                            "secondary_culture": secondary_culture,
                            "fusion_intensity": fusion_intensity,
                            "fusion_score": fusion_score,
                            "combination_type": "cultural_fusion"
                        }
                        fusions.append(fusion)
            
            return sorted(fusions, key=lambda x: x["fusion_score"], reverse=True)[:8]
            
        except Exception as e:
            self.logger.error("Cultural fusion generation failed", error=str(e))
            return []
    
    async def _evaluate_cultural_authenticity(self, fusion: Dict[str, Any], 
                                            primary_culture: str, 
                                            secondary_culture: str) -> float:
        """Evaluate cultural authenticity of fusion."""
        try:
            items = fusion.get("items", [])
            
            # Check if items maintain cultural integrity
            authenticity_scores = []
            
            for item in items:
                item_styles = item.get("style", [])
                
                # Check against cultural style matrix
                primary_auth = sum(self.cultural_style_matrix.get(primary_culture, {}).get(style, 0) 
                                 for style in item_styles)
                secondary_auth = sum(self.cultural_style_matrix.get(secondary_culture, {}).get(style, 0) 
                                   for style in item_styles)
                
                item_authenticity = max(primary_auth, secondary_auth)
                authenticity_scores.append(item_authenticity)
            
            return np.mean(authenticity_scores) if authenticity_scores else 0.5
            
        except Exception:
            return 0.5
    
    async def _evaluate_cultural_innovation(self, fusion: Dict[str, Any]) -> float:
        """Evaluate cultural innovation in fusion."""
        try:
            # Innovation comes from successful blending of different cultural elements
            items = fusion.get("items", [])
            
            # Check for innovative cultural mixing
            all_styles = [style for item in items for style in item.get("style", [])]
            
            # Innovation score based on style diversity and cultural bridge
            style_diversity = len(set(all_styles))
            innovation_score = min(1.0, style_diversity / 4.0)  # Normalize by max expected styles
            
            return innovation_score
            
        except Exception:
            return 0.5
    
    async def _apply_deviation_pattern(self, base_outfit: Dict[str, Any], 
                                     pattern: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """Apply a specific deviation pattern to a base outfit."""
        try:
            pattern_name = pattern["name"]
            application = pattern["application"]
            
            # Apply pattern based on its type
            if application == "material_mixing":
                return await self._apply_material_mixing(base_outfit, pattern)
            elif application == "color_coordination":
                return await self._apply_color_temperature_mix(base_outfit, pattern)
            elif application == "style_mixing":
                return await self._apply_style_mixing(base_outfit, pattern)
            elif application == "silhouette_design":
                return await self._apply_proportional_play(base_outfit, pattern)
            elif application == "cultural_blend":
                return await self._apply_cultural_blend(base_outfit, pattern)
            
            return None
            
        except Exception as e:
            self.logger.error("Deviation pattern application failed", 
                            pattern=pattern["name"], error=str(e))
            return None
    
    async def _apply_material_mixing(self, base_outfit: Dict[str, Any], 
                                   pattern: Dict[str, str]) -> Dict[str, Any]:
        """Apply contrasting textures pattern."""
        base_items = base_outfit.get("items", [])
        
        # Find items with different materials
        materials = [item.get("material") for item in base_items if item.get("material")]
        
        deviation = {
            "pattern_applied": pattern["name"],
            "original_materials": materials,
            "recommendation": "Mix smooth materials (silk, cotton) with textured ones (wool, leather)",
            "creative_impact": pattern["weight"]
        }
        
        return deviation
    
    async def _apply_color_temperature_mix(self, base_outfit: Dict[str, Any], 
                                         pattern: Dict[str, str]) -> Dict[str, Any]:
        """Apply color temperature mixing pattern."""
        base_items = base_outfit.get("items", [])
        
        # Analyze color temperatures
        all_colors = [color for item in base_items for color in item.get("color", [])]
        
        deviation = {
            "pattern_applied": pattern["name"],
            "original_colors": all_colors,
            "recommendation": "Combine warm colors (red, orange, yellow) with cool colors (blue, green, purple)",
            "creative_impact": pattern["weight"]
        }
        
        return deviation
    
    async def _apply_style_mixing(self, base_outfit: Dict[str, Any], 
                                pattern: Dict[str, str]) -> Dict[str, Any]:
        """Apply formal-casual blend pattern."""
        base_items = base_outfit.get("items", [])
        
        all_styles = [style for item in base_items for style in item.get("style", [])]
        
        deviation = {
            "pattern_applied": pattern["name"],
            "original_styles": all_styles,
            "recommendation": "Blend formal elements (blazer, dress shoes) with casual ones (jeans, sneakers)",
            "creative_impact": pattern["weight"]
        }
        
        return deviation
    
    async def _apply_proportional_play(self, base_outfit: Dict[str, Any], 
                                     pattern: Dict[str, str]) -> Dict[str, Any]:
        """Apply proportional play pattern."""
        deviation = {
            "pattern_applied": pattern["name"],
            "recommendation": "Play with proportions: oversized top with fitted bottom, or vice versa",
            "creative_impact": pattern["weight"]
        }
        
        return deviation
    
    async def _apply_cultural_blend(self, base_outfit: Dict[str, Any], 
                                  pattern: Dict[str, str]) -> Dict[str, Any]:
        """Apply cultural fusion pattern."""
        deviation = {
            "pattern_applied": pattern["name"],
            "recommendation": "Blend elements from different cultures while maintaining respect and authenticity",
            "creative_impact": pattern["weight"]
        }
        
        return deviation
    
    async def _calculate_cultural_fusion_score(self, outfit: Dict[str, Any], 
                                             cultural_context: str) -> float:
        """Calculate cultural fusion score."""
        try:
            items = outfit.get("items", [])
            
            # Check for cultural elements
            cultural_elements = []
            
            for item in items:
                item_styles = item.get("style", [])
                
                # Check against cultural style matrix
                for culture, styles in self.cultural_style_matrix.items():
                    if culture != cultural_context:  # Different culture
                        cultural_match = sum(styles.get(style, 0) for style in item_styles)
                        if cultural_match > 0.3:
                            cultural_elements.append(cultural_match)
            
            return min(1.0, np.mean(cultural_elements)) if cultural_elements else 0.2
            
        except Exception:
            return 0.2
    
    async def _calculate_aesthetic_harmony(self, outfit: Dict[str, Any]) -> float:
        """Calculate aesthetic harmony despite creative choices."""
        try:
            items = outfit.get("items", [])
            
            # Basic harmony checks
            harmony_factors = []
            
            # Color harmony
            all_colors = [color for item in items for color in item.get("color", [])]
            color_harmony = self._calculate_color_harmony(all_colors)
            harmony_factors.append(color_harmony)
            
            # Style coherence (can be diverse but harmonious)
            all_styles = [style for item in items for style in item.get("style", [])]
            style_harmony = self._calculate_style_coherence(all_styles)
            harmony_factors.append(style_harmony)
            
            # Proportion balance (simplified)
            categories = [item.get("category") for item in items]
            if len(set(categories)) == len(categories):  # Good variety
                harmony_factors.append(0.8)
            else:
                harmony_factors.append(0.6)
            
            return np.mean(harmony_factors)
            
        except Exception:
            return 0.5
    
    async def _get_creativity_breakdown(self, outfit: Dict[str, Any]) -> Dict[str, float]:
        """Get detailed creativity score breakdown."""
        try:
            breakdown = {}
            
            # Calculate individual components
            breakdown["novelty"] = await self._calculate_novelty_score(outfit)
            breakdown["innovation"] = await self._calculate_innovation_score(outfit)
            breakdown["coherence"] = await self._evaluate_semantic_coherence(outfit)
            breakdown["cultural_fusion"] = await self._calculate_cultural_fusion_score(outfit, "western")
            breakdown["aesthetic_harmony"] = await self._calculate_aesthetic_harmony(outfit)
            
            return breakdown
            
        except Exception as e:
            self.logger.error("Creativity breakdown failed", error=str(e))
            return {}
    
    async def cleanup(self) -> None:
        """Clean up creativity agent resources."""
        try:
            if self.aurora_module:
                await self.aurora_module.cleanup()
            
            self.style_combinations_db.clear()
            self.cultural_style_matrix.clear()
            self.creativity_patterns.clear()
            
            self.logger.info("Creativity agent cleaned up successfully")
            
        except Exception as e:
            self.logger.error("Error during creativity agent cleanup", error=str(e))
    
    async def health_check(self) -> bool:
        """Check if the creativity agent is healthy."""
        try:
            return (
                await super().health_check() and
                self.aurora_module is not None and
                len(self.style_combinations_db) > 0 and
                len(self.creativity_patterns) > 0
            )
        except Exception:
            return False


class AuroraModule:
    """
    AURORA (Adaptive Unsupervised Recommendation for Original Approaches) module
    for generating creative fashion combinations.
    """
    
    def __init__(self):
        self.logger = structlog.get_logger("aurora")
        self.combination_patterns: List[Dict[str, Any]] = []
        self.creative_weights: Dict[str, float] = {}
    
    async def initialize(self) -> None:
        """Initialize AURORA module."""
        try:
            # Load creative combination patterns
            self.combination_patterns = [
                {"name": "unexpected_pairs", "weight": 0.9, "exploration_factor": 0.8},
                {"name": "cultural_bridge", "weight": 0.85, "exploration_factor": 0.7},
                {"name": "temporal_fusion", "weight": 0.8, "exploration_factor": 0.6},
                {"name": "material_contrast", "weight": 0.75, "exploration_factor": 0.5},
                {"name": "color_adventure", "weight": 0.7, "exploration_factor": 0.4}
            ]
            
            self.creative_weights = {
                "novelty": 0.3,
                "coherence": 0.25,
                "aesthetic": 0.2,
                "cultural": 0.15,
                "innovation": 0.1
            }
            
            self.logger.info("AURORA module initialized")
            
        except Exception as e:
            self.logger.error("AURORA initialization failed", error=str(e))
            raise
    
    async def generate_creative_combinations(self, 
                                          items: List[FashionItem],
                                          preferences: Dict[str, Any],
                                          creativity_level: str,
                                          cultural_context: str) -> List[Dict[str, Any]]:
        """Generate creative outfit combinations using AURORA algorithms."""
        try:
            combinations = []
            
            # Adjust creativity parameters based on level
            exploration_factor = {
                "low": 0.3,
                "medium": 0.6,
                "high": 0.9,
                "extreme": 1.2
            }.get(creativity_level, 0.6)
            
            # Generate combinations using different patterns
            for pattern in self.combination_patterns:
                pattern_combinations = await self._apply_aurora_pattern(
                    items, pattern, preferences, cultural_context, exploration_factor
                )
                combinations.extend(pattern_combinations)
            
            # Score and rank combinations
            scored_combinations = []
            for combo in combinations:
                score = await self._score_aurora_combination(combo, preferences, cultural_context)
                combo["confidence"] = score
                scored_combinations.append(combo)
            
            # Sort by score and return top combinations
            scored_combinations.sort(key=lambda x: x["confidence"], reverse=True)
            
            return scored_combinations[:10]  # Return top 10
            
        except Exception as e:
            self.logger.error("AURORA combination generation failed", error=str(e))
            return []
    
    async def _apply_aurora_pattern(self, 
                                  items: List[FashionItem],
                                  pattern: Dict[str, Any],
                                  preferences: Dict[str, Any],
                                  cultural_context: str,
                                  exploration_factor: float) -> List[Dict[str, Any]]:
        """Apply specific AURORA pattern to generate combinations."""
        try:
            pattern_name = pattern["name"]
            
            if pattern_name == "unexpected_pairs":
                return await self._generate_unexpected_pairs(items, exploration_factor)
            elif pattern_name == "cultural_bridge":
                return await self._generate_cultural_bridges(items, cultural_context, exploration_factor)
            elif pattern_name == "temporal_fusion":
                return await self._generate_temporal_fusions(items, exploration_factor)
            elif pattern_name == "material_contrast":
                return await self._generate_material_contrasts(items, exploration_factor)
            elif pattern_name == "color_adventure":
                return await self._generate_color_adventures(items, exploration_factor)
            
            return []
            
        except Exception as e:
            self.logger.error("AURORA pattern application failed", 
                            pattern=pattern_name, error=str(e))
            return []
    
    async def _generate_unexpected_pairs(self, items: List[FashionItem], 
                                       exploration_factor: float) -> List[Dict[str, Any]]:
        """Generate unexpected but harmonious item pairs."""
        combinations = []
        
        # Find items from different style categories
        style_groups = {}
        for item in items:
            for style in item.style:
                if style not in style_groups:
                    style_groups[style] = []
                style_groups[style].append(item)
        
        # Create unexpected pairs between different style groups
        style_list = list(style_groups.keys())
        for i in range(len(style_list)):
            for j in range(i + 1, len(style_list)):
                style1, style2 = style_list[i], style_list[j]
                
                # Calculate style distance (how unexpected the combination is)
                style_distance = self._calculate_style_distance(style1, style2)
                
                if style_distance * exploration_factor > 0.5:  # Threshold for unexpectedness
                    for item1 in style_groups[style1][:3]:  # Limit items per group
                        for item2 in style_groups[style2][:3]:
                            combination = {
                                "items": [item1, item2],
                                "style_description": f"Unexpected fusion of {style1} and {style2}",
                                "occasion": "creative_expression",
                                "explanation": f"Bold combination mixing {style1} with {style2} for unique style",
                                "innovation_aspects": ["style_mixing", "unexpected_pairing"],
                                "aurora_pattern": "unexpected_pairs"
                            }
                            combinations.append(combination)
        
        return combinations[:5]  # Return top 5
    
    async def _generate_cultural_bridges(self, items: List[FashionItem], 
                                       cultural_context: str, 
                                       exploration_factor: float) -> List[Dict[str, Any]]:
        """Generate cultural bridge combinations."""
        combinations = []
        
        # This would use the cultural style matrix in a real implementation
        # For now, create some sample cultural bridges
        
        traditional_items = [item for item in items if "traditional" in item.style or "classic" in item.style]
        modern_items = [item for item in items if "modern" in item.style or "contemporary" in item.style]
        
        for trad_item in traditional_items[:3]:
            for mod_item in modern_items[:3]:
                combination = {
                    "items": [trad_item, mod_item],
                    "style_description": "Cultural bridge between traditional and modern",
                    "occasion": "cultural_event",
                    "explanation": "Respectful fusion of traditional elements with modern aesthetics",
                    "innovation_aspects": ["cultural_fusion", "temporal_bridge"],
                    "aurora_pattern": "cultural_bridge"
                }
                combinations.append(combination)
        
        return combinations[:4]
    
    async def _generate_temporal_fusions(self, items: List[FashionItem], 
                                       exploration_factor: float) -> List[Dict[str, Any]]:
        """Generate temporal fusion combinations (vintage + contemporary)."""
        combinations = []
        
        vintage_items = [item for item in items if "vintage" in item.style or "retro" in item.style]
        contemporary_items = [item for item in items if "contemporary" in item.style or "trendy" in item.style]
        
        for vintage_item in vintage_items[:3]:
            for contemp_item in contemporary_items[:3]:
                combination = {
                    "items": [vintage_item, contemp_item],
                    "style_description": "Temporal fusion of vintage and contemporary",
                    "occasion": "fashion_forward",
                    "explanation": "Time-traveling style mixing past and present",
                    "innovation_aspects": ["temporal_mixing", "era_fusion"],
                    "aurora_pattern": "temporal_fusion"
                }
                combinations.append(combination)
        
        return combinations[:4]
    
    async def _generate_material_contrasts(self, items: List[FashionItem], 
                                         exploration_factor: float) -> List[Dict[str, Any]]:
        """Generate material contrast combinations."""
        combinations = []
        
        # Group items by material
        material_groups = {}
        for item in items:
            if item.material:
                if item.material not in material_groups:
                    material_groups[item.material] = []
                material_groups[item.material].append(item)
        
        # Create contrasting material combinations
        materials = list(material_groups.keys())
        for i in range(len(materials)):
            for j in range(i + 1, len(materials)):
                mat1, mat2 = materials[i], materials[j]
                
                # Check if materials provide good contrast
                if self._materials_contrast_well(mat1, mat2):
                    for item1 in material_groups[mat1][:2]:
                        for item2 in material_groups[mat2][:2]:
                            combination = {
                                "items": [item1, item2],
                                "style_description": f"Material contrast: {mat1} meets {mat2}",
                                "occasion": "artistic_expression",
                                "explanation": f"Textural play between {mat1} and {mat2}",
                                "innovation_aspects": ["material_mixing", "texture_contrast"],
                                "aurora_pattern": "material_contrast"
                            }
                            combinations.append(combination)
        
        return combinations[:4]
    
    async def _generate_color_adventures(self, items: List[FashionItem], 
                                       exploration_factor: float) -> List[Dict[str, Any]]:
        """Generate adventurous color combinations."""
        combinations = []
        
        # Group items by color
        color_groups = {}
        for item in items:
            for color in item.color:
                if color not in color_groups:
                    color_groups[color] = []
                color_groups[color].append(item)
        
        # Create adventurous color combinations
        colors = list(color_groups.keys())
        for i in range(len(colors)):
            for j in range(i + 1, len(colors)):
                color1, color2 = colors[i], colors[j]
                
                # Check if colors create interesting combination
                if self._colors_create_adventure(color1, color2, exploration_factor):
                    for item1 in color_groups[color1][:2]:
                        for item2 in color_groups[color2][:2]:
                            combination = {
                                "items": [item1, item2],
                                "style_description": f"Color adventure: {color1} and {color2}",
                                "occasion": "bold_statement",
                                "explanation": f"Adventurous color pairing of {color1} with {color2}",
                                "innovation_aspects": ["color_mixing", "bold_combinations"],
                                "aurora_pattern": "color_adventure"
                            }
                            combinations.append(combination)
        
        return combinations[:4]
    
    def _calculate_style_distance(self, style1: str, style2: str) -> float:
        """Calculate semantic distance between two styles."""
        # Simple style distance matrix - in production this would be more sophisticated
        style_distances = {
            ("formal", "casual"): 0.9,
            ("vintage", "modern"): 0.8,
            ("bohemian", "minimalist"): 0.85,
            ("traditional", "trendy"): 0.9,
            ("elegant", "edgy"): 0.7
        }
        
        pair = (style1, style2) if style1 < style2 else (style2, style1)
        return style_distances.get(pair, 0.5)
    
    def _materials_contrast_well(self, mat1: str, mat2: str) -> bool:
        """Check if two materials provide good contrast."""
        contrasting_materials = {
            ("silk", "leather"), ("cotton", "wool"), ("denim", "satin"),
            ("linen", "velvet"), ("polyester", "cashmere")
        }
        
        pair = (mat1, mat2) if mat1 < mat2 else (mat2, mat1)
        return pair in contrasting_materials
    
    def _colors_create_adventure(self, color1: str, color2: str, exploration_factor: float) -> bool:
        """Check if color combination creates an adventurous look."""
        # Adventurous color combinations
        adventurous_pairs = {
            ("red", "purple"), ("orange", "blue"), ("yellow", "green"),
            ("pink", "green"), ("purple", "yellow")
        }
        
        pair = (color1, color2) if color1 < color2 else (color2, color1)
        base_adventure = 1.0 if pair in adventurous_pairs else 0.3
        
        return base_adventure * exploration_factor > 0.5
    
    async def _score_aurora_combination(self, combination: Dict[str, Any], 
                                      preferences: Dict[str, Any], 
                                      cultural_context: str) -> float:
        """Score AURORA-generated combination."""
        try:
            scores = []
            
            # Innovation score
            innovation_aspects = combination.get("innovation_aspects", [])
            innovation_score = min(1.0, len(innovation_aspects) * 0.3)
            scores.append(innovation_score * self.creative_weights["innovation"])
            
            # Novelty score (based on aurora pattern)
            pattern_novelty = {
                "unexpected_pairs": 0.9,
                "cultural_bridge": 0.85,
                "temporal_fusion": 0.8,
                "material_contrast": 0.75,
                "color_adventure": 0.8
            }
            pattern = combination.get("aurora_pattern", "")
            novelty_score = pattern_novelty.get(pattern, 0.5)
            scores.append(novelty_score * self.creative_weights["novelty"])
            
            # Coherence score (ensure it still makes sense)
            items = combination.get("items", [])
            coherence_score = await self._evaluate_combination_coherence(items)
            scores.append(coherence_score * self.creative_weights["coherence"])
            
            # Aesthetic score
            aesthetic_score = await self._evaluate_aesthetic_appeal(items)
            scores.append(aesthetic_score * self.creative_weights["aesthetic"])
            
            # Cultural appropriateness
            cultural_score = await self._evaluate_cultural_sensitivity(combination, cultural_context)
            scores.append(cultural_score * self.creative_weights["cultural"])
            
            return sum(scores)
            
        except Exception as e:
            self.logger.error("AURORA scoring failed", error=str(e))
            return 0.5
    
    async def _evaluate_combination_coherence(self, items: List[FashionItem]) -> float:
        """Evaluate if the creative combination maintains coherence."""
        if len(items) < 2:
            return 0.5
        
        # Check for basic coherence factors
        coherence_factors = []
        
        # Occasion compatibility
        all_occasions = [occ for item in items for occ in item.occasion]
        if len(set(all_occasions)) > 0:  # Has compatible occasions
            coherence_factors.append(0.7)
        
        # Color harmony (creative combinations can be bold but should work)
        all_colors = [color for item in items for color in item.color]
        if len(set(all_colors)) <= 4:  # Not too many colors
            coherence_factors.append(0.8)
        
        return np.mean(coherence_factors) if coherence_factors else 0.5
    
    async def _evaluate_aesthetic_appeal(self, items: List[FashionItem]) -> float:
        """Evaluate aesthetic appeal of combination."""
        # Simplified aesthetic evaluation
        appeal_factors = []
        
        # Category diversity
        categories = [item.category for item in items]
        if len(set(categories)) == len(categories):  # All different categories
            appeal_factors.append(0.8)
        
        # Style diversity (can be good for creative combinations)
        all_styles = [style for item in items for style in item.style]
        style_diversity = len(set(all_styles))
        appeal_factors.append(min(1.0, style_diversity * 0.3))
        
        return np.mean(appeal_factors) if appeal_factors else 0.6
    
    async def _evaluate_cultural_sensitivity(self, combination: Dict[str, Any], 
                                           cultural_context: str) -> float:
        """Evaluate cultural sensitivity of the combination."""
        # Ensure cultural fusion is respectful and appropriate
        # This is a simplified check - in production, this would be more comprehensive
        
        aurora_pattern = combination.get("aurora_pattern", "")
        
        if aurora_pattern == "cultural_bridge":
            # Cultural bridges should be respectful
            return 0.8  # Assume respectful for demo
        
        return 0.9  # Default high score for non-cultural patterns
    
    async def cleanup(self) -> None:
        """Clean up AURORA module resources."""
        try:
            self.combination_patterns.clear()
            self.creative_weights.clear()
            self.logger.info("AURORA module cleaned up")
        except Exception as e:
            self.logger.error("AURORA cleanup failed", error=str(e))