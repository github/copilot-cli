"""
Azure-optimized configuration management for Stilya Fashion AI Assistant.
Implements secure credential management using Azure Key Vault and Managed Identity.
"""

import os
from functools import lru_cache
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential
from azure.keyvault.secrets import SecretClient
import structlog

logger = structlog.get_logger(__name__)


class DatabaseConfig(BaseModel):
    """Database configuration for Azure PostgreSQL and Redis."""
    postgres_url: Optional[str] = Field(default=None, description="Azure PostgreSQL connection string")
    redis_url: Optional[str] = Field(default=None, description="Azure Redis connection string")
    use_ssl: bool = Field(default=True, description="Use SSL for database connections")


class AzureConfig(BaseModel):
    """Azure service configuration with secure credential management."""
    key_vault_url: Optional[str] = Field(default=None, description="Azure Key Vault URL")
    tenant_id: Optional[str] = Field(default=None, description="Azure Tenant ID")
    client_id: Optional[str] = Field(default=None, description="Azure Client ID")
    storage_account_name: Optional[str] = Field(default=None, description="Azure Storage Account")
    storage_container_name: str = Field(default="fashion-data", description="Storage container for fashion data")
    service_bus_connection_string: Optional[str] = Field(default=None, description="Azure Service Bus connection")
    openai_endpoint: Optional[str] = Field(default=None, description="Azure OpenAI endpoint")
    openai_api_version: str = Field(default="2023-12-01-preview", description="Azure OpenAI API version")
    application_insights_connection_string: Optional[str] = Field(default=None, description="Application Insights connection")


class ModelConfig(BaseModel):
    """AI model configuration."""
    llm_model: str = Field(default="gpt-4", description="Primary LLM model")
    clip_model: str = Field(default="openai/clip-vit-base-patch32", description="CLIP model for visual processing")
    embedding_model: str = Field(default="sentence-transformers/all-MiniLM-L6-v2", description="Text embedding model")
    max_tokens: int = Field(default=4000, description="Maximum tokens for LLM responses")
    temperature: float = Field(default=0.7, description="Model temperature for creativity")


class APIConfig(BaseModel):
    """FastAPI application configuration."""
    host: str = Field(default="0.0.0.0", description="API host address")
    port: int = Field(default=8000, description="API port")
    prefix: str = Field(default="/api/v1", description="API route prefix")
    cors_origins: list[str] = Field(default=["*"], description="CORS allowed origins")
    docs_url: Optional[str] = Field(default="/docs", description="API documentation URL")


class Settings(BaseSettings):
    """
    Main application settings with Azure integration.
    Uses Azure Key Vault for secure credential management when available.
    """
    
    # Environment
    environment: str = Field(default="development", description="Application environment")
    debug: bool = Field(default=False, description="Debug mode")
    log_level: str = Field(default="INFO", description="Logging level")
    
    # Configuration sections
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    azure: AzureConfig = Field(default_factory=AzureConfig)
    models: ModelConfig = Field(default_factory=ModelConfig)
    api: APIConfig = Field(default_factory=APIConfig)
    
    # Agent configuration
    max_concurrent_agents: int = Field(default=6, description="Maximum concurrent agents")
    agent_timeout: int = Field(default=30, description="Agent timeout in seconds")
    
    # Performance settings
    vector_search_top_k: int = Field(default=10, description="Top K results for vector search")
    faiss_index_type: str = Field(default="IndexFlatL2", description="FAISS index type")
    
    class Config:
        env_file = ".env"
        env_nested_delimiter = "__"
        case_sensitive = False
        
        @classmethod
        def parse_env_var(cls, field_name: str, raw_val: str) -> Any:
            """Parse environment variables with proper type conversion."""
            if field_name.endswith("_LIST"):
                return [item.strip() for item in raw_val.split(",")]
            return raw_val

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._credential: Optional[DefaultAzureCredential] = None
        self._secret_client: Optional[SecretClient] = None
        self._initialize_azure_clients()
    
    def _initialize_azure_clients(self) -> None:
        """Initialize Azure clients with proper credential management."""
        try:
            # Use Managed Identity in Azure, fallback to Service Principal
            if os.getenv("AZURE_CLIENT_ID"):
                self._credential = DefaultAzureCredential()
            else:
                # For local development, use environment variables
                logger.info("Using environment-based authentication for local development")
                return
            
            if self.azure.key_vault_url:
                self._secret_client = SecretClient(
                    vault_url=self.azure.key_vault_url,
                    credential=self._credential
                )
                logger.info("Azure Key Vault client initialized", vault_url=self.azure.key_vault_url)
                
        except Exception as e:
            logger.warning("Failed to initialize Azure clients", error=str(e))
    
    async def get_secret(self, secret_name: str) -> Optional[str]:
        """
        Retrieve secret from Azure Key Vault with fallback to environment variables.
        
        Args:
            secret_name: Name of the secret to retrieve
            
        Returns:
            Secret value or None if not found
        """
        if self._secret_client:
            try:
                secret = await self._secret_client.get_secret(secret_name)
                return secret.value
            except Exception as e:
                logger.warning("Failed to retrieve secret from Key Vault", 
                             secret_name=secret_name, error=str(e))
        
        # Fallback to environment variable
        return os.getenv(secret_name.upper().replace("-", "_"))
    
    def get_database_url(self) -> str:
        """Get database URL with proper fallback mechanism."""
        return self.database.postgres_url or os.getenv("DATABASE_URL", "postgresql://localhost/stilya")
    
    def get_redis_url(self) -> str:
        """Get Redis URL with proper fallback mechanism."""
        return self.database.redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
    
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.environment.lower() == "production"
    
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.environment.lower() == "development"


@lru_cache()
def get_settings() -> Settings:
    """
    Get cached settings instance.
    Using lru_cache to ensure singleton behavior and better performance.
    """
    return Settings()


# Global settings instance
settings = get_settings()