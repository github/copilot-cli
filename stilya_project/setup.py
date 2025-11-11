from setuptools import setup, find_packages

setup(
    name="stilya",
    version="0.1.0",
    description="Stilya - Personal Fashion AI Assistant",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Ali Maksad",
    author_email="alimaksad@example.com",
    url="https://github.com/alimaksad/stilya_project",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.9",
    install_requires=[
        "fastapi>=0.104.1",
        "uvicorn[standard]>=0.24.0",
        "pydantic>=2.5.0",
        "pydantic-settings>=2.1.0",
        "azure-identity>=1.15.0",
        "azure-keyvault-secrets>=4.7.0",
        "torch>=2.1.0",
        "transformers>=4.36.0",
        "sentence-transformers>=2.2.2",
        "faiss-cpu>=1.7.4",
        "chromadb>=0.4.20",
        "structlog>=23.2.0",
        "aiohttp>=3.9.0",
    ],
    extras_require={
        "dev": [
            "pytest>=7.4.3",
            "pytest-asyncio>=0.21.1",
            "pytest-cov>=4.1.0",
            "black>=23.11.0",
            "flake8>=6.1.0",
            "mypy>=1.7.1",
        ],
        "full": [
            "openai>=1.6.0",
            "langchain>=0.1.0",
            "opencv-python>=4.8.1.78",
            "mlflow>=2.8.1",
        ]
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
    ],
    entry_points={
        "console_scripts": [
            "stilya-server=stilya.communication.api:main",
        ],
    },
)