from transformers import pipeline
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
from shared.constants import ASPECT_CATEGORIES

print('[NLP] Loading ABSA model...')
absa_pipeline = pipeline(
    'text-classification',
    model='yangheng/deberta-v3-base-absa-v1.1',
    tokenizer='yangheng/deberta-v3-base-absa-v1.1',
    top_k=None
)
print('[NLP] Model loaded.')


def extract_aspects(text: str) -> list[dict]:
    found = []
    text_lower = text.lower()

    matched = {}
    for keyword, category in ASPECT_CATEGORIES.items():
        if keyword in text_lower and category not in matched:
            matched[category] = keyword

    for category, keyword in matched.items():
        try:
            prompt = f"[CLS] {text} [SEP] {keyword} [SEP]"
            results = absa_pipeline(prompt)

            best = max(results[0], key=lambda x: x['score'])
            sentiment = best['label'].lower()
            confidence = round(best['score'], 4)

            if sentiment not in ['positive', 'negative', 'neutral']:
                sentiment = 'neutral'

            idx = text_lower.find(keyword)
            start = max(0, idx - 20)
            end = min(len(text), idx + 60)
            span = text[start:end].strip()

            found.append({
                'aspect_term':     keyword,
                'aspect_category': category,
                'sentiment':       sentiment,
                'confidence':      confidence,
                'span_text':       span,
            })

        except Exception as e:
            print(f'[NLP] Error on aspect {keyword}: {e}')
            continue

    return found
