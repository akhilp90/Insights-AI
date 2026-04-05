import re
import string

NOISE_PATTERNS = [
    r'http\S+',
    r'www\.\S+',
    r'[^\x00-\x7F]+',
    r'\s+',
]

def clean_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ''

    text = text.lower()
    text = re.sub(r'http\S+|www\.\S+', '', text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)
    text = text.translate(str.maketrans('', '', string.punctuation))
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def is_valid_review(text: str, min_words: int = 3) -> bool:
    if not text:
        return False
    words = text.split()
    return len(words) >= min_words
