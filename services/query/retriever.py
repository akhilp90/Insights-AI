import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from sentence_transformers import SentenceTransformer
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

engine       = create_engine(os.getenv('POSTGRES_URL'))
SessionLocal = sessionmaker(bind=engine)

qdrant   = QdrantClient(url=os.getenv('QDRANT_URL', 'http://localhost:6333'))
embedder = SentenceTransformer('all-MiniLM-L6-v2')


def retrieve_similar_reviews(query: str, product_id: int, top_k: int = 5) -> list[dict]:
    vector = embedder.encode(query).tolist()

    results = qdrant.query_points(
        collection_name='reviews',
        query=vector,
        limit=top_k,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key='product_id',
                    match=MatchValue(value=product_id)
                )
            ]
        )
    ).points

    reviews = []
    for r in results:
        reviews.append({
            'text':   r.payload.get('text', ''),
            'rating': r.payload.get('rating'),
            'score':  round(r.score, 4),
        })

    return reviews


def fetch_pattern_signals(product_id: int, aspect: str = None) -> list[dict]:
    db = SessionLocal()
    try:
        if aspect:
            rows = db.execute(text('''
                SELECT aspect, related_issue, pattern_type, score
                FROM pattern_results
                WHERE product_id = :product_id
                AND (aspect = :aspect OR related_issue = :aspect)
                ORDER BY score DESC
                LIMIT 10
            '''), {'product_id': product_id, 'aspect': aspect.upper()}).fetchall()
        else:
            rows = db.execute(text('''
                SELECT aspect, related_issue, pattern_type, score
                FROM pattern_results
                WHERE product_id = :product_id
                ORDER BY score DESC
                LIMIT 15
            '''), {'product_id': product_id}).fetchall()

        return [
            {
                'aspect':        r.aspect,
                'related_issue': r.related_issue,
                'pattern_type':  r.pattern_type,
                'score':         float(r.score),
            }
            for r in rows
        ]
    finally:
        db.close()


def fetch_aspect_summary(product_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        rows = db.execute(text('''
            SELECT aspect_category,
                   COUNT(*) as total,
                   SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
                   SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
                   SUM(CASE WHEN sentiment = 'neutral'  THEN 1 ELSE 0 END) as neutral,
                   ROUND(AVG(confidence), 3) as avg_confidence
            FROM absa_outputs
            WHERE product_id = :product_id
            GROUP BY aspect_category
            ORDER BY total DESC
        '''), {'product_id': product_id}).fetchall()

        return [
            {
                'aspect':         r.aspect_category,
                'total':          r.total,
                'positive':       r.positive,
                'negative':       r.negative,
                'neutral':        r.neutral,
                'avg_confidence': float(r.avg_confidence),
            }
            for r in rows
        ]
    finally:
        db.close()
