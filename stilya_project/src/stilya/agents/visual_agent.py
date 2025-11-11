"""
Visual Intelligence Agent for Stilya Fashion AI Assistant.
Handles visual element analysis, body pose detection, and CLIP embeddings.
"""

import asyncio
import numpy as np
import cv2
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
import torch
from transformers import CLIPModel, CLIPProcessor
import structlog

from .base import BaseAgent
from ..communication.models import (
    AgentRequest, AgentResponse, AgentType
)
from ..config.settings import get_settings

settings = get_settings()


class VisualIntelligenceAgent(BaseAgent):
    """
    Visual Intelligence Agent responsible for:
    - Visual element analysis (color, pattern, style)
    - Body pose detection using computer vision
    - CLIP embeddings for image-text matching
    - High-accuracy visual feature extraction
    """
    
    def __init__(self):
        super().__init__(AgentType.VISUAL, "Visual Intelligence Agent")
        self.clip_model: Optional[CLIPModel] = None
        self.clip_processor: Optional[CLIPProcessor] = None
        self.color_detector = None
        self.pattern_detector = None
        
    async def initialize(self) -> bool:
        """Initialize the visual intelligence agent with required models."""
        try:
            self.logger.info("Initializing Visual Intelligence Agent")
            
            # Initialize CLIP model
            await self._initialize_clip_model()
            
            # Initialize computer vision components
            await self._initialize_cv_components()
            
            self.logger.info("Visual Intelligence Agent initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error("Failed to initialize Visual Intelligence Agent", error=str(e))
            return False
    
    async def _initialize_clip_model(self) -> None:
        """Initialize CLIP model for image-text matching."""
        try:
            model_name = settings.models.clip_model
            self.clip_model = CLIPModel.from_pretrained(model_name)
            self.clip_processor = CLIPProcessor.from_pretrained(model_name)
            
            # Set to evaluation mode
            self.clip_model.eval()
            
            self.logger.info("CLIP model initialized", model=model_name)
            
        except Exception as e:
            self.logger.error("Failed to initialize CLIP model", error=str(e))
            raise
    
    async def _initialize_cv_components(self) -> None:
        """Initialize computer vision components."""
        try:
            # Initialize color detection (simplified HSV-based approach)
            self.color_detector = ColorDetector()
            
            # Initialize pattern detection (texture analysis)
            self.pattern_detector = PatternDetector()
            
            self.logger.info("Computer vision components initialized")
            
        except Exception as e:
            self.logger.error("Failed to initialize CV components", error=str(e))
            raise
    
    async def process_request(self, request: AgentRequest) -> AgentResponse:
        """Process visual intelligence requests."""
        try:
            task = request.task_description.lower()
            
            if "analyze_image" in task:
                return await self._handle_image_analysis(request)
            elif "extract_features" in task:
                return await self._handle_feature_extraction(request)
            elif "compare_images" in task:
                return await self._handle_image_comparison(request)
            elif "detect_pose" in task:
                return await self._handle_pose_detection(request)
            elif "clip_embedding" in task:
                return await self._handle_clip_embedding(request)
            else:
                return self._create_response(
                    success=False,
                    message=f"Unknown visual task: {task}"
                )
                
        except Exception as e:
            return self._create_response(
                success=False,
                message=f"Error processing visual request: {str(e)}"
            )
    
    async def _handle_image_analysis(self, request: AgentRequest) -> AgentResponse:
        """Handle comprehensive image analysis."""
        try:
            image_data = request.context.get("image_data")
            image_url = request.context.get("image_url")
            
            if not image_data and not image_url:
                return self._create_response(
                    success=False,
                    message="Image data or URL is required"
                )
            
            # Load image
            image = await self._load_image(image_data, image_url)
            if image is None:
                return self._create_response(
                    success=False,
                    message="Failed to load image"
                )
            
            # Perform comprehensive analysis
            analysis_results = {}
            
            # Color analysis
            colors = await self._analyze_colors(image)
            analysis_results["colors"] = colors
            
            # Pattern analysis
            patterns = await self._analyze_patterns(image)
            analysis_results["patterns"] = patterns
            
            # Style analysis using CLIP
            style_analysis = await self._analyze_style_with_clip(image)
            analysis_results["style"] = style_analysis
            
            # Composition analysis
            composition = await self._analyze_composition(image)
            analysis_results["composition"] = composition
            
            confidence = self._calculate_analysis_confidence(analysis_results)
            
            return self._create_response(
                success=True,
                result=analysis_results,
                confidence=confidence,
                message="Image analysis completed successfully"
            )
            
        except Exception as e:
            self.logger.error("Image analysis failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Image analysis failed: {str(e)}"
            )
    
    async def _handle_feature_extraction(self, request: AgentRequest) -> AgentResponse:
        """Handle visual feature extraction."""
        try:
            image_data = request.context.get("image_data")
            image_url = request.context.get("image_url")
            features_requested = request.parameters.get("features", ["all"])
            
            # Load image
            image = await self._load_image(image_data, image_url)
            if image is None:
                return self._create_response(
                    success=False,
                    message="Failed to load image"
                )
            
            features = {}
            
            if "all" in features_requested or "clip_embedding" in features_requested:
                clip_embedding = await self._get_clip_image_embedding(image)
                features["clip_embedding"] = clip_embedding.tolist()
            
            if "all" in features_requested or "color_histogram" in features_requested:
                color_histogram = await self._get_color_histogram(image)
                features["color_histogram"] = color_histogram.tolist()
            
            if "all" in features_requested or "texture_features" in features_requested:
                texture_features = await self._get_texture_features(image)
                features["texture_features"] = texture_features
            
            return self._create_response(
                success=True,
                result={"features": features},
                confidence=1.0,
                message="Feature extraction completed"
            )
            
        except Exception as e:
            self.logger.error("Feature extraction failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Feature extraction failed: {str(e)}"
            )
    
    async def _handle_image_comparison(self, request: AgentRequest) -> AgentResponse:
        """Handle image similarity comparison."""
        try:
            image1_data = request.context.get("image1_data")
            image1_url = request.context.get("image1_url")
            image2_data = request.context.get("image2_data")
            image2_url = request.context.get("image2_url")
            
            # Load images
            image1 = await self._load_image(image1_data, image1_url)
            image2 = await self._load_image(image2_data, image2_url)
            
            if image1 is None or image2 is None:
                return self._create_response(
                    success=False,
                    message="Failed to load one or both images"
                )
            
            # Calculate similarity using CLIP embeddings
            embedding1 = await self._get_clip_image_embedding(image1)
            embedding2 = await self._get_clip_image_embedding(image2)
            
            # Cosine similarity
            similarity = np.dot(embedding1, embedding2) / (
                np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
            )
            
            # Additional comparisons
            color_similarity = await self._compare_colors(image1, image2)
            composition_similarity = await self._compare_composition(image1, image2)
            
            comparison_results = {
                "overall_similarity": float(similarity),
                "color_similarity": color_similarity,
                "composition_similarity": composition_similarity,
                "similarity_category": self._categorize_similarity(similarity)
            }
            
            return self._create_response(
                success=True,
                result=comparison_results,
                confidence=float(abs(similarity)),
                message="Image comparison completed"
            )
            
        except Exception as e:
            self.logger.error("Image comparison failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Image comparison failed: {str(e)}"
            )
    
    async def _handle_pose_detection(self, request: AgentRequest) -> AgentResponse:
        """Handle body pose detection (simplified implementation)."""
        try:
            image_data = request.context.get("image_data")
            image_url = request.context.get("image_url")
            
            # Load image
            image = await self._load_image(image_data, image_url)
            if image is None:
                return self._create_response(
                    success=False,
                    message="Failed to load image"
                )
            
            # Simplified pose detection using body proportions
            pose_info = await self._detect_body_pose(image)
            
            return self._create_response(
                success=True,
                result={"pose_info": pose_info},
                confidence=pose_info.get("confidence", 0.5),
                message="Pose detection completed"
            )
            
        except Exception as e:
            self.logger.error("Pose detection failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"Pose detection failed: {str(e)}"
            )
    
    async def _handle_clip_embedding(self, request: AgentRequest) -> AgentResponse:
        """Handle CLIP embedding generation for images or text."""
        try:
            image_data = request.context.get("image_data")
            image_url = request.context.get("image_url")
            text = request.context.get("text")
            
            results = {}
            
            if image_data or image_url:
                image = await self._load_image(image_data, image_url)
                if image:
                    image_embedding = await self._get_clip_image_embedding(image)
                    results["image_embedding"] = image_embedding.tolist()
            
            if text:
                text_embedding = await self._get_clip_text_embedding(text)
                results["text_embedding"] = text_embedding.tolist()
            
            if not results:
                return self._create_response(
                    success=False,
                    message="No valid image or text provided"
                )
            
            return self._create_response(
                success=True,
                result=results,
                confidence=1.0,
                message="CLIP embeddings generated"
            )
            
        except Exception as e:
            self.logger.error("CLIP embedding failed", error=str(e))
            return self._create_response(
                success=False,
                message=f"CLIP embedding failed: {str(e)}"
            )
    
    async def _load_image(self, image_data: Optional[str], image_url: Optional[str]) -> Optional[np.ndarray]:
        """Load image from base64 data or URL."""
        try:
            if image_data:
                # Decode base64 image
                image_bytes = base64.b64decode(image_data)
                image = Image.open(BytesIO(image_bytes))
                return np.array(image)
            elif image_url:
                # In production, this would download from URL
                # For now, return None to indicate URL loading not implemented
                self.logger.warning("URL image loading not implemented in demo")
                return None
            
            return None
            
        except Exception as e:
            self.logger.error("Failed to load image", error=str(e))
            return None
    
    async def _analyze_colors(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze dominant colors in the image."""
        try:
            dominant_colors = self.color_detector.get_dominant_colors(image)
            color_palette = self.color_detector.extract_color_palette(image)
            
            return {
                "dominant_colors": dominant_colors,
                "color_palette": color_palette,
                "color_diversity": len(color_palette)
            }
            
        except Exception as e:
            self.logger.error("Color analysis failed", error=str(e))
            return {}
    
    async def _analyze_patterns(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze patterns and textures in the image."""
        try:
            pattern_type = self.pattern_detector.detect_pattern(image)
            texture_score = self.pattern_detector.calculate_texture_score(image)
            
            return {
                "pattern_type": pattern_type,
                "texture_score": texture_score,
                "pattern_confidence": self.pattern_detector.get_confidence()
            }
            
        except Exception as e:
            self.logger.error("Pattern analysis failed", error=str(e))
            return {}
    
    async def _analyze_style_with_clip(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze style using CLIP model."""
        try:
            # Style categories to test against
            style_categories = [
                "casual style", "formal style", "business style", "trendy style",
                "vintage style", "minimalist style", "bohemian style", "classic style"
            ]
            
            # Get image embedding
            pil_image = Image.fromarray(image)
            image_embedding = await self._get_clip_image_embedding(pil_image)
            
            # Compare with style categories
            style_scores = {}
            for style in style_categories:
                text_embedding = await self._get_clip_text_embedding(style)
                similarity = np.dot(image_embedding, text_embedding) / (
                    np.linalg.norm(image_embedding) * np.linalg.norm(text_embedding)
                )
                style_scores[style] = float(similarity)
            
            # Get top styles
            top_styles = sorted(style_scores.items(), key=lambda x: x[1], reverse=True)[:3]
            
            return {
                "style_scores": style_scores,
                "top_styles": top_styles,
                "primary_style": top_styles[0][0] if top_styles else "unknown"
            }
            
        except Exception as e:
            self.logger.error("Style analysis failed", error=str(e))
            return {}
    
    async def _analyze_composition(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyze image composition and layout."""
        try:
            height, width = image.shape[:2]
            
            # Calculate basic composition metrics
            aspect_ratio = width / height
            
            # Analyze brightness distribution
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
            brightness_mean = np.mean(gray)
            brightness_std = np.std(gray)
            
            # Analyze contrast
            contrast = brightness_std / brightness_mean if brightness_mean > 0 else 0
            
            return {
                "aspect_ratio": aspect_ratio,
                "brightness_mean": float(brightness_mean),
                "brightness_std": float(brightness_std),
                "contrast_ratio": float(contrast),
                "image_quality": "high" if contrast > 0.3 else "medium" if contrast > 0.1 else "low"
            }
            
        except Exception as e:
            self.logger.error("Composition analysis failed", error=str(e))
            return {}
    
    async def _get_clip_image_embedding(self, image: Image.Image) -> np.ndarray:
        """Get CLIP embedding for an image."""
        try:
            inputs = self.clip_processor(images=image, return_tensors="pt")
            
            with torch.no_grad():
                image_features = self.clip_model.get_image_features(**inputs)
                # Normalize the embedding
                image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
            return image_features.numpy().flatten()
            
        except Exception as e:
            self.logger.error("CLIP image embedding failed", error=str(e))
            raise
    
    async def _get_clip_text_embedding(self, text: str) -> np.ndarray:
        """Get CLIP embedding for text."""
        try:
            inputs = self.clip_processor(text=[text], return_tensors="pt", padding=True)
            
            with torch.no_grad():
                text_features = self.clip_model.get_text_features(inputs["input_ids"])
                # Normalize the embedding
                text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            
            return text_features.numpy().flatten()
            
        except Exception as e:
            self.logger.error("CLIP text embedding failed", error=str(e))
            raise
    
    async def _get_color_histogram(self, image: np.ndarray) -> np.ndarray:
        """Get color histogram features."""
        try:
            # Convert to HSV for better color representation
            hsv = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
            
            # Calculate histogram for each channel
            hist_h = cv2.calcHist([hsv], [0], None, [180], [0, 180])
            hist_s = cv2.calcHist([hsv], [1], None, [256], [0, 256])
            hist_v = cv2.calcHist([hsv], [2], None, [256], [0, 256])
            
            # Normalize and concatenate
            hist_h = hist_h.flatten() / hist_h.sum()
            hist_s = hist_s.flatten() / hist_s.sum()
            hist_v = hist_v.flatten() / hist_v.sum()
            
            return np.concatenate([hist_h, hist_s, hist_v])
            
        except Exception as e:
            self.logger.error("Color histogram extraction failed", error=str(e))
            return np.array([])
    
    async def _get_texture_features(self, image: np.ndarray) -> Dict[str, float]:
        """Extract texture features using statistical methods."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
            
            # Calculate Laplacian variance (measure of blurriness/sharpness)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Calculate local binary pattern approximation
            lbp_score = self._calculate_lbp_score(gray)
            
            # Calculate edge density
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            return {
                "sharpness": float(laplacian_var),
                "texture_complexity": float(lbp_score),
                "edge_density": float(edge_density)
            }
            
        except Exception as e:
            self.logger.error("Texture feature extraction failed", error=str(e))
            return {}
    
    def _calculate_lbp_score(self, gray_image: np.ndarray) -> float:
        """Calculate a simplified Local Binary Pattern score."""
        # This is a simplified version - in production, use skimage.feature.local_binary_pattern
        kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]])
        lbp = cv2.filter2D(gray_image, cv2.CV_64F, kernel)
        return np.std(lbp)
    
    async def _detect_body_pose(self, image: np.ndarray) -> Dict[str, Any]:
        """Simplified body pose detection."""
        try:
            # This is a placeholder for actual pose detection
            # In production, this would use DensePose or similar models
            
            height, width = image.shape[:2]
            
            # Simple body proportion analysis
            body_info = {
                "image_dimensions": {"width": width, "height": height},
                "estimated_pose": "standing",  # Placeholder
                "body_type_hints": {
                    "aspect_ratio": width / height,
                    "vertical_proportion": "standard"
                },
                "confidence": 0.6  # Low confidence for placeholder implementation
            }
            
            return body_info
            
        except Exception as e:
            self.logger.error("Body pose detection failed", error=str(e))
            return {"confidence": 0.0}
    
    async def _compare_colors(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """Compare color similarity between two images."""
        try:
            hist1 = await self._get_color_histogram(image1)
            hist2 = await self._get_color_histogram(image2)
            
            if len(hist1) == 0 or len(hist2) == 0:
                return 0.0
            
            # Calculate histogram correlation
            correlation = cv2.compareHist(hist1.astype(np.float32), hist2.astype(np.float32), cv2.HISTCMP_CORREL)
            return float(correlation)
            
        except Exception:
            return 0.0
    
    async def _compare_composition(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """Compare composition similarity between two images."""
        try:
            comp1 = await self._analyze_composition(image1)
            comp2 = await self._analyze_composition(image2)
            
            if not comp1 or not comp2:
                return 0.0
            
            # Compare aspect ratios and brightness
            aspect_diff = abs(comp1.get("aspect_ratio", 1.0) - comp2.get("aspect_ratio", 1.0))
            brightness_diff = abs(comp1.get("brightness_mean", 128) - comp2.get("brightness_mean", 128)) / 255
            
            # Normalize to similarity score
            similarity = 1.0 - min(1.0, (aspect_diff + brightness_diff) / 2)
            return similarity
            
        except Exception:
            return 0.0
    
    def _categorize_similarity(self, similarity: float) -> str:
        """Categorize similarity score."""
        if similarity >= 0.9:
            return "very_high"
        elif similarity >= 0.7:
            return "high"
        elif similarity >= 0.5:
            return "medium"
        elif similarity >= 0.3:
            return "low"
        else:
            return "very_low"
    
    def _calculate_analysis_confidence(self, analysis_results: Dict[str, Any]) -> float:
        """Calculate overall confidence based on analysis results."""
        scores = []
        
        if "colors" in analysis_results and analysis_results["colors"]:
            scores.append(0.9)  # Color analysis is usually reliable
        
        if "patterns" in analysis_results and analysis_results["patterns"]:
            pattern_conf = analysis_results["patterns"].get("pattern_confidence", 0.5)
            scores.append(pattern_conf)
        
        if "style" in analysis_results and analysis_results["style"]:
            top_styles = analysis_results["style"].get("top_styles", [])
            if top_styles:
                scores.append(min(1.0, top_styles[0][1] + 0.5))  # Boost style confidence
        
        return np.mean(scores) if scores else 0.5
    
    async def cleanup(self) -> None:
        """Clean up visual intelligence agent resources."""
        try:
            if self.clip_model:
                del self.clip_model
            if self.clip_processor:
                del self.clip_processor
            
            self.logger.info("Visual Intelligence agent cleaned up successfully")
            
        except Exception as e:
            self.logger.error("Error during visual intelligence agent cleanup", error=str(e))
    
    async def health_check(self) -> bool:
        """Check if the visual intelligence agent is healthy."""
        try:
            return (
                await super().health_check() and
                self.clip_model is not None and
                self.clip_processor is not None
            )
        except Exception:
            return False


class ColorDetector:
    """Helper class for color detection and analysis."""
    
    def get_dominant_colors(self, image: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:
        """Get dominant colors using K-means clustering."""
        try:
            # Reshape image to be a list of pixels
            pixels = image.reshape(-1, 3)
            
            # Use OpenCV's K-means
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
            _, labels, centers = cv2.kmeans(
                pixels.astype(np.float32), k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
            )
            
            # Calculate percentages
            unique, counts = np.unique(labels, return_counts=True)
            percentages = counts / len(labels)
            
            # Convert to color names and RGB
            dominant_colors = []
            for i, (center, percentage) in enumerate(zip(centers, percentages)):
                color_name = self._rgb_to_color_name(center)
                dominant_colors.append({
                    "rgb": center.astype(int).tolist(),
                    "color_name": color_name,
                    "percentage": float(percentage),
                    "rank": i + 1
                })
            
            return sorted(dominant_colors, key=lambda x: x["percentage"], reverse=True)
            
        except Exception as e:
            structlog.get_logger().error("Dominant color detection failed", error=str(e))
            return []
    
    def extract_color_palette(self, image: np.ndarray) -> List[str]:
        """Extract color palette as color names."""
        dominant_colors = self.get_dominant_colors(image)
        return [color["color_name"] for color in dominant_colors if color["percentage"] > 0.05]
    
    def _rgb_to_color_name(self, rgb: np.ndarray) -> str:
        """Convert RGB to approximate color name."""
        r, g, b = rgb.astype(int)
        
        # Simple color name mapping
        if r > 200 and g > 200 and b > 200:
            return "white"
        elif r < 50 and g < 50 and b < 50:
            return "black"
        elif r > g and r > b:
            if r > 150:
                return "red"
            else:
                return "dark_red"
        elif g > r and g > b:
            if g > 150:
                return "green"
            else:
                return "dark_green"
        elif b > r and b > g:
            if b > 150:
                return "blue"
            else:
                return "dark_blue" 
        elif r > 150 and g > 150 and b < 100:
            return "yellow"
        elif r > 150 and g < 100 and b > 150:
            return "purple"
        elif r < 100 and g > 150 and b > 150:
            return "cyan"
        elif r > 100 and g > 100 and b > 100:
            return "gray"
        else:
            return "unknown"


class PatternDetector:
    """Helper class for pattern and texture detection."""
    
    def __init__(self):
        self.confidence = 0.5
    
    def detect_pattern(self, image: np.ndarray) -> str:
        """Detect pattern type in the image."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
            
            # Calculate texture measures
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / edges.size
            
            # Simple pattern classification based on edge density and texture
            if edge_density > 0.3:
                self.confidence = 0.8
                return "striped"
            elif edge_density > 0.15:
                self.confidence = 0.7
                return "textured"
            elif edge_density > 0.05:
                self.confidence = 0.6
                return "patterned"
            else:
                self.confidence = 0.9
                return "solid"
                
        except Exception as e:
            structlog.get_logger().error("Pattern detection failed", error=str(e))
            self.confidence = 0.3
            return "unknown"
    
    def calculate_texture_score(self, image: np.ndarray) -> float:
        """Calculate texture complexity score."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY) if len(image.shape) == 3 else image
            
            # Use Laplacian variance as texture measure
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            
            # Normalize to 0-1 range
            return min(1.0, laplacian_var / 1000.0)
            
        except Exception:
            return 0.0
    
    def get_confidence(self) -> float:
        """Get confidence of the last pattern detection."""
        return self.confidence