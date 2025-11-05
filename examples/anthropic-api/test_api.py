import os
from anthropic import Anthropic

# Get API key from environment variable
api_key = os.environ.get("ANTHROPIC_API_KEY")

if not api_key:
    print("Error: ANTHROPIC_API_KEY environment variable not set")
    exit(1)

# Initialize the client
client = Anthropic(api_key=api_key)

print("Testing Anthropic API connection...")
print("=" * 50)

# Send a test message
try:
    response = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=1000,
        messages=[
            {"role": "user", "content": "Hello! How can I use the Anthropic API?"}
        ]
    )

    print("\n✓ API connection successful!")
    print("\nResponse from Claude:")
    print("-" * 50)
    print(response.content[0].text)
    print("-" * 50)

except Exception as e:
    print(f"\n✗ Error: {e}")
    exit(1)
