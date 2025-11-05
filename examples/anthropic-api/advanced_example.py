import os
from anthropic import Anthropic

# Initialize the client with API key from environment variable
# This is the recommended approach for production code
client = Anthropic(
    api_key=os.environ.get("ANTHROPIC_API_KEY")
)

# Example 1: Simple conversation
def simple_conversation():
    response = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Hello! How can I use the Anthropic API?"}
        ]
    )
    print("Simple Conversation Response:")
    print(response.content[0].text)
    print("\n" + "="*50 + "\n")

# Example 2: Multi-turn conversation
def multi_turn_conversation():
    messages = [
        {"role": "user", "content": "What is the capital of France?"},
        {"role": "assistant", "content": "The capital of France is Paris."},
        {"role": "user", "content": "What is its population?"}
    ]

    response = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1024,
        messages=messages
    )
    print("Multi-turn Conversation Response:")
    print(response.content[0].text)
    print("\n" + "="*50 + "\n")

# Example 3: System prompt usage
def with_system_prompt():
    response = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1024,
        system="You are a helpful coding assistant that provides concise, clear explanations.",
        messages=[
            {"role": "user", "content": "Explain what Python list comprehensions are."}
        ]
    )
    print("System Prompt Response:")
    print(response.content[0].text)
    print("\n" + "="*50 + "\n")

# Example 4: Streaming response
def streaming_example():
    print("Streaming Response:")
    with client.messages.stream(
        model="claude-opus-4-1-20250805",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Count from 1 to 5 slowly."}
        ]
    ) as stream:
        for text in stream.text_stream:
            print(text, end="", flush=True)
    print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    # Make sure to set your ANTHROPIC_API_KEY environment variable
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: Please set the ANTHROPIC_API_KEY environment variable")
        print("Example: export ANTHROPIC_API_KEY='your-api-key-here'")
        exit(1)

    # Run examples
    simple_conversation()
    multi_turn_conversation()
    with_system_prompt()
    streaming_example()
