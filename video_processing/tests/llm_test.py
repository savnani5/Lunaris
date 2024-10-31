import anthropic
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

client = anthropic.Anthropic(
    api_key=ANTHROPIC_API_KEY,
)
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude"}
    ]
)
print(message.content)