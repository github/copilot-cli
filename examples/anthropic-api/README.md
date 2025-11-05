# Anthropic API Examples

This directory contains examples demonstrating how to use the Anthropic API with Python.

## Prerequisites

Before running these examples, you'll need:

1. **Python 3.7+** installed on your system
2. **Anthropic Python SDK** installed:
   ```bash
   pip install anthropic
   ```
3. **Anthropic API key** - Get one at https://console.anthropic.com/

## Setting Up Your API Key

### Option 1: Environment Variable (Recommended)

Set your API key as an environment variable:

```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

For Windows (PowerShell):
```powershell
$env:ANTHROPIC_API_KEY='your-api-key-here'
```

### Option 2: Direct in Code (For Testing Only)

Replace `"your-api-key-here"` in the example files with your actual API key. **Note:** This is not recommended for production code or code that will be committed to version control.

## Examples

### 1. Basic Example (`basic_example.py`)

The simplest way to get started with the Anthropic API:

```bash
python basic_example.py
```

This example demonstrates:
- Initializing the Anthropic client
- Sending a single message
- Receiving and printing the response

### 2. Advanced Example (`advanced_example.py`)

A more comprehensive example showcasing various features:

```bash
python advanced_example.py
```

This example demonstrates:
- **Simple Conversation**: Basic single-turn interaction
- **Multi-turn Conversation**: Maintaining context across multiple exchanges
- **System Prompts**: Customizing Claude's behavior and personality
- **Streaming Responses**: Receiving responses in real-time as they're generated

## Available Models

The examples use `claude-opus-4-1-20250805`, but you can use other models:

- `claude-opus-4-1-20250805` - Most capable model for complex tasks
- `claude-sonnet-4-5-20250929` - Great balance of intelligence and speed
- `claude-sonnet-4-2-20250514` - Fast and efficient for most tasks
- `claude-haiku-4-20250514` - Fastest model for simple tasks

## Additional Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [API Reference](https://docs.anthropic.com/en/api/messages)
- [Python SDK on GitHub](https://github.com/anthropics/anthropic-sdk-python)
- [Anthropic Console](https://console.anthropic.com/)

## Common Issues

### ImportError: No module named 'anthropic'

Install the Anthropic SDK:
```bash
pip install anthropic
```

### Authentication Error

Make sure your API key is set correctly:
```bash
echo $ANTHROPIC_API_KEY  # Should display your key
```

If not set, export it again:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

## Support

For issues with the Anthropic API, visit:
- [Anthropic Support](https://support.anthropic.com/)
- [API Status Page](https://status.anthropic.com/)
