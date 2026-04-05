import requests
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
MODEL      = os.getenv('LLM_MODEL', 'mistral')


def generate(prompt: str, max_tokens: int = 512) -> str:
    try:
        response = requests.post(
            f'{OLLAMA_URL}/api/generate',
            json={
                'model':  MODEL,
                'prompt': prompt,
                'stream': False,
                'options': {
                    'num_predict': max_tokens,
                    'temperature': 0.3,
                }
            },
            timeout=300
        )
        response.raise_for_status()
        return response.json().get('response', '').strip()

    except requests.exceptions.ConnectionError:
        return 'LLM service unavailable. Make sure Ollama is running.'
    except requests.exceptions.Timeout:
        return 'LLM timed out. Try again - model may be warming up.'
    except Exception as e:
        return f'LLM error: {str(e)}'
