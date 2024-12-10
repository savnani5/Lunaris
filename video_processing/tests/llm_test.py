import anthropic
from dotenv import load_dotenv, find_dotenv
import os

load_dotenv(find_dotenv())

ANTHROPIC_API_KEY = os.environ["ANTHROPIC_API_KEY"]

client = anthropic.Anthropic(
    api_key=ANTHROPIC_API_KEY,
)
message = client.messages.create(
    model="claude-3-5-sonnet-latest",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Return only 1 emoji to represent all the following words: 'iphone', 'ipad', 'macbook', 'airpods'"}
    ]
)
print(message.content)