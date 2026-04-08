import requests
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434')
MODEL      = os.getenv('LLM_MODEL', 'mistral')


class LLMError(Exception):
    """Raised when the LLM service fails."""
    pass


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
            timeout=480
        )
        response.raise_for_status()
        return response.json().get('response', '').strip()

    except requests.exceptions.ConnectionError:
        raise LLMError('LLM service unavailable. Make sure Ollama is running.')
    except requests.exceptions.Timeout:
        raise LLMError('LLM timed out. Try again — the model may be loading.')
    except requests.exceptions.HTTPError as e:
        # Ollama returned a non-2xx status — include the response body for debugging
        body = ''
        if e.response is not None:
            body = e.response.text[:200]
        raise LLMError(f'Ollama returned {e.response.status_code if e.response else "unknown"}: {body}')
    except Exception as e:
        raise LLMError(f'LLM error: {str(e)}')
