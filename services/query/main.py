from typing import Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from services.query.retriever import retrieve_similar_reviews, fetch_pattern_signals, fetch_aspect_summary
from services.query.prompt_builder import build_prompt
from services.llm.llm_service import generate

app = FastAPI(title='Query Service')


class QueryRequest(BaseModel):
    question:   str
    product_id: int = 1
    aspect:     Optional[str] = None
    top_k:      int = 5


@app.post('/query')
def query(req: QueryRequest):
    reviews  = retrieve_similar_reviews(req.question, req.product_id, req.top_k)
    patterns = fetch_pattern_signals(req.product_id, req.aspect)
    summary  = fetch_aspect_summary(req.product_id)

    if not reviews and not patterns:
        raise HTTPException(status_code=404, detail='No data found for this product')

    prompt = build_prompt(req.question, reviews, patterns, summary)
    answer = generate(prompt)

    return {
        'question':       req.question,
        'answer':         answer,
        'evidence':       reviews,
        'patterns_used':  patterns[:5],
        'aspect_summary': summary,
    }


@app.get('/summary/{product_id}')
def get_summary(product_id: int):
    summary  = fetch_aspect_summary(product_id)
    patterns = fetch_pattern_signals(product_id)
    return {
        'product_id':     product_id,
        'aspect_summary': summary,
        'top_patterns':   patterns[:10],
    }


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'query'}
