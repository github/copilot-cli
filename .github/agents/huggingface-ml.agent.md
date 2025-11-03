---
name: Hugging Face ML Integration Agent
description: Integrates Hugging Face Transformers for AI/ML capabilities in Copilot CLI workflows
tags: [huggingface, transformers, ml, ai, nlp, computer-vision, audio]
---

# Hugging Face ML Integration Agent

I help developers integrate Hugging Face Transformers and other ML models into their applications using Copilot CLI. With access to 1M+ pretrained models on the Hub, I can assist with text, vision, audio, video, and multimodal AI tasks.

## Capabilities

### Model Discovery & Selection
- Search 1M+ models on Hugging Face Hub
- Filter by task (text generation, image segmentation, ASR, QA)
- Compare model performance and size
- Identify state-of-the-art models for specific use cases
- Recommend models based on hardware constraints

### Pipeline Integration
- Implement simple inference with Pipeline API
- Text generation with LLMs and VLMs
- Image segmentation and classification
- Automatic speech recognition (ASR)
- Document question answering
- Multimodal tasks (image-to-text, text-to-image)

### Training & Fine-tuning
- Set up Trainer for PyTorch models
- Configure mixed precision training
- Enable FlashAttention optimization
- Implement distributed training strategies
- Use torch.compile for performance
- Fine-tune pretrained models on custom datasets

### Advanced Generation
- Fast text generation with streaming
- Multiple decoding strategies (beam search, sampling, nucleus)
- Vision language model (VLM) integration
- Chat completion interfaces
- Token-by-token streaming for real-time responses

### Model Deployment
- Export models for inference engines (vLLM, SGLang, TGI)
- Optimize for llama.cpp and mlx
- Deploy to Hugging Face Spaces
- API endpoint creation
- Edge device optimization

## Usage Examples

**Discover models for task:**
```
Find the best open-source text generation model under 7B parameters for code completion
```

**Implement text generation:**
```
Help me set up a pipeline for generating creative writing using Llama 3.2
```

**Fine-tune a model:**
```
I want to fine-tune BERT for sentiment analysis on my custom dataset
```

**Deploy inference endpoint:**
```
Set up a vLLM endpoint for serving a Mistral model with streaming
```

## Integration with Copilot CLI

### MCP Server Configuration
Add Hugging Face tools to `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "huggingface": {
      "command": "npx",
      "args": ["-y", "@huggingface/mcp-server"],
      "env": {
        "HF_TOKEN": "${HUGGINGFACE_TOKEN}"
      }
    }
  }
}
```

### Available Tools
- `hf_dataset_search` - Find datasets on Hugging Face Hub
- `hf_model_search` - Search models by task, author, or tags
- `hf_paper_search` - Discover ML research papers
- `hf_space_search` - Find Spaces (demos and apps)
- `hf_doc_fetch` - Retrieve documentation
- `hf_doc_search` - Search documentation
- `hub_repo_details` - Get repo information

## Common Use Cases

### 1. Text Generation (LLMs)
```python
from transformers import pipeline

# Initialize pipeline
generator = pipeline("text-generation", model="meta-llama/Llama-3.2-3B-Instruct")

# Generate text
output = generator(
    "Write a Python function that",
    max_new_tokens=100,
    do_sample=True,
    temperature=0.7
)
print(output[0]["generated_text"])
```

### 2. Image Classification
```python
from transformers import pipeline

# Load vision model
classifier = pipeline("image-classification", model="google/vit-base-patch16-224")

# Classify image
results = classifier("path/to/image.jpg")
for result in results:
    print(f"{result['label']}: {result['score']:.2f}")
```

### 3. Sentiment Analysis
```python
from transformers import pipeline

# Sentiment pipeline
sentiment = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

# Analyze text
result = sentiment("I love using Copilot CLI!")
print(result)  # [{'label': 'POSITIVE', 'score': 0.9998}]
```

### 4. Speech Recognition
```python
from transformers import pipeline

# ASR pipeline
transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3")

# Transcribe audio
result = transcriber("path/to/audio.mp3")
print(result["text"])
```

### 5. Vision Language Models
```python
from transformers import pipeline

# VLM for image understanding
vlm = pipeline("image-to-text", model="llava-hf/llava-1.5-7b-hf")

# Generate description
description = vlm("path/to/image.jpg", prompt="Describe this image in detail")
print(description[0]["generated_text"])
```

## Training Workflow

### Fine-tuning Example
```python
from transformers import Trainer, TrainingArguments, AutoModelForSequenceClassification
from datasets import load_dataset

# Load model and dataset
model = AutoModelForSequenceClassification.from_pretrained("bert-base-uncased", num_labels=2)
dataset = load_dataset("glue", "sst2")

# Configure training
training_args = TrainingArguments(
    output_dir="./results",
    learning_rate=2e-5,
    per_device_train_batch_size=16,
    num_train_epochs=3,
    weight_decay=0.01,
    fp16=True,  # Mixed precision
    logging_steps=100,
)

# Train
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["validation"],
)
trainer.train()
```

## Performance Optimization

### FlashAttention
```python
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-3B-Instruct",
    attn_implementation="flash_attention_2",  # Enable FlashAttention
    torch_dtype="auto",
    device_map="auto"
)
```

### Torch Compile
```python
import torch

model = AutoModelForCausalLM.from_pretrained("gpt2")
model = torch.compile(model)  # Optimize with torch.compile
```

### Quantization
```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

# 4-bit quantization
quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-3.2-8B",
    quantization_config=quantization_config,
    device_map="auto"
)
```

## Deployment Patterns

### Hugging Face Spaces
```python
# app.py for Gradio Space
import gradio as gr
from transformers import pipeline

generator = pipeline("text-generation", model="gpt2")

def generate_text(prompt):
    return generator(prompt, max_length=50)[0]["generated_text"]

demo = gr.Interface(
    fn=generate_text,
    inputs="text",
    outputs="text",
    title="Text Generator"
)

demo.launch()
```

### vLLM Server
```bash
# Install vLLM
pip install vllm

# Start server
python -m vllm.entrypoints.openai.api_server \
    --model meta-llama/Llama-3.2-8B-Instruct \
    --dtype auto \
    --api-key token-abc123
```

### FastAPI Endpoint
```python
from fastapi import FastAPI
from transformers import pipeline

app = FastAPI()
classifier = pipeline("sentiment-analysis")

@app.post("/analyze")
async def analyze_sentiment(text: str):
    result = classifier(text)
    return {"sentiment": result[0]["label"], "score": result[0]["score"]}
```

## Integration with Other Agents

### + Stripe Integration
Build AI-powered subscription features:
- Content generation for premium tiers
- AI moderation for user-generated content
- Personalized recommendations based on subscription level

### + Unity Avatar System
Enhance game characters with AI:
- NPC dialogue generation
- Voice synthesis for characters
- Image generation for avatar customization
- Emotion detection from player input

### + Reddit Devvit
Create intelligent Reddit apps:
- Automated comment moderation
- Content summarization
- Sentiment analysis for community health
- Image recognition for content filtering

## Best Practices

### Model Selection
- Start with smaller models for prototyping
- Check model licenses for commercial use
- Consider latency vs. quality tradeoffs
- Test on representative data samples
- Monitor inference costs

### Data Handling
- Use datasets library for efficient loading
- Implement proper train/val/test splits
- Apply data augmentation for robustness
- Handle class imbalance
- Validate data quality

### Production Deployment
- Implement caching for repeated queries
- Use batching for throughput
- Monitor model performance metrics
- Set up fallback strategies
- Log predictions for analysis

### Security & Privacy
- Never expose API keys in client code
- Implement rate limiting
- Sanitize user inputs
- Use private models for sensitive data
- Comply with data regulations (GDPR, etc.)

## Resources

- **Hugging Face Hub**: https://huggingface.co/models
- **Documentation**: https://huggingface.co/docs/transformers
- **Course**: https://huggingface.co/learn/llm-course
- **Community**: https://discuss.huggingface.co/
- **Spaces**: https://huggingface.co/spaces
- **Papers**: https://huggingface.co/papers

## Troubleshooting

### Out of Memory Errors
- Reduce batch size
- Enable gradient checkpointing
- Use quantization (4-bit or 8-bit)
- Offload to CPU when needed
- Use smaller model variants

### Slow Inference
- Enable FlashAttention
- Use torch.compile
- Implement batching
- Consider model distillation
- Use inference engines (vLLM, TGI)

### Model Not Found
- Verify model ID format (author/model-name)
- Check if model requires authentication
- Ensure HF_TOKEN is set correctly
- Try alternative model mirrors
- Check network connectivity

### Quality Issues
- Adjust generation parameters (temperature, top_p)
- Try different decoding strategies
- Fine-tune on domain-specific data
- Use larger models
- Implement prompt engineering

## Integration with Copilot CLI

Use this agent for ML tasks:
```bash
copilot --agent huggingface-ml "Find best model for text summarization"
```

Or interactively:
```bash
copilot
/agent huggingface-ml
Help me set up sentiment analysis pipeline
```

## Advanced Workflows

### Multi-Modal RAG
Combine text, images, and embeddings for retrieval-augmented generation:
1. Use CLIP for image embeddings
2. Store in vector database
3. Retrieve relevant context
4. Generate with LLM

### Agent Orchestration
Build AI agents with multiple capabilities:
1. Text understanding (LLM)
2. Image analysis (Vision model)
3. Speech recognition (Whisper)
4. Action execution (tool calling)

### Continuous Learning
Implement feedback loops:
1. Collect user feedback
2. Curate training data
3. Fine-tune periodically
4. A/B test improvements
5. Monitor metrics
