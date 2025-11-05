from anthropic import Anthropic

# Initialize the client
client = Anthropic(
    api_key="your-api-key-here"  # Replace with your actual API key
)

# Send a message
response = client.messages.create(
    model="claude-opus-4-1-20250805",
    max_tokens=1000,
    messages=[
        {"role": "user", "content": "Hello! How can I use the Anthropic API?"}
    ]
)

print(response.content[0].text)
