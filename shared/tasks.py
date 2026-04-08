import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from shared.celery_app import celery_app
from services.preprocessing.cleaner import clean_text, is_valid_review
from services.embedding.embedder import embed_and_store
from services.nlp.absa import extract_aspects
from services.pattern_detection.patterns import run_pattern_detection
from services.causal.causal_engine import run_causal_analysis
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

engine       = create_engine(os.getenv('POSTGRES_URL'))
SessionLocal = sessionmaker(bind=engine)


@celery_app.task(name='tasks.ingest')
def ingest_task(review_id: int):
    print(f'[INGEST] review {review_id} received')
    preprocess_task.delay(review_id)


@celery_app.task(name='tasks.preprocess')
def preprocess_task(review_id: int):
    db = SessionLocal()
    try:
        result = db.execute(
            text('SELECT id, body, product_id, dataset_id, source, rating FROM reviews WHERE id = :id'),
            {'id': review_id}
        ).fetchone()

        if not result:
            print(f'[PREPROCESS] review {review_id} not found')
            return

        cleaned = clean_text(result.body)

        if not is_valid_review(cleaned):
            print(f'[PREPROCESS] review {review_id} invalid, skipping')
            return

        db.execute(
            text('UPDATE reviews SET body = :body WHERE id = :id'),
            {'body': cleaned, 'id': review_id}
        )
        db.commit()
        print(f'[PREPROCESS] review {review_id} cleaned')
        embed_task.delay(review_id)

    finally:
        db.close()


@celery_app.task(name='tasks.embed')
def embed_task(review_id: int):
    db = SessionLocal()
    try:
        result = db.execute(
            text('SELECT id, body, product_id, dataset_id, source, rating FROM reviews WHERE id = :id'),
            {'id': review_id}
        ).fetchone()

        if not result:
            print(f'[EMBED] review {review_id} not found')
            return

        metadata = {
            'product_id': result.product_id,
            'dataset_id': result.dataset_id,
            'source':     result.source,
            'rating':     float(result.rating) if result.rating else None,
        }

        embed_and_store(review_id, result.body, metadata)
        nlp_task.delay(review_id)

    finally:
        db.close()


@celery_app.task(name='tasks.nlp')
def nlp_task(review_id: int):
    db = SessionLocal()
    try:
        result = db.execute(
            text('SELECT id, body, product_id, dataset_id FROM reviews WHERE id = :id'),
            {'id': review_id}
        ).fetchone()

        if not result:
            print(f'[NLP] review {review_id} not found')
            return

        aspects = extract_aspects(result.body)

        for asp in aspects:
            db.execute(text('''
                INSERT INTO absa_outputs
                    (review_id, product_id, dataset_id, aspect_term, aspect_category, sentiment, confidence, span_text)
                VALUES
                    (:review_id, :product_id, :dataset_id, :aspect_term, :aspect_category, :sentiment, :confidence, :span_text)
            '''), {
                'review_id':       review_id,
                'product_id':      result.product_id,
                'dataset_id':      result.dataset_id,
                'aspect_term':     asp['aspect_term'],
                'aspect_category': asp['aspect_category'],
                'sentiment':       asp['sentiment'],
                'confidence':      asp['confidence'],
                'span_text':       asp['span_text'],
            })

        db.execute(
            text('UPDATE reviews SET is_processed = TRUE WHERE id = :id'),
            {'id': review_id}
        )
        db.commit()

        print(f'[NLP] review {review_id} - {len(aspects)} aspects extracted')
        cluster_task.delay(review_id)

    finally:
        db.close()


@celery_app.task(name='tasks.cluster')
def cluster_task(review_id: int):
    print(f'[CLUSTER] review {review_id} - coming in phase 6')
    pattern_task.delay(review_id)


@celery_app.task(name='tasks.patterns')
def pattern_task(review_id: int):
    db = SessionLocal()
    try:
        result = db.execute(
            text('SELECT product_id, dataset_id FROM reviews WHERE id = :id'),
            {'id': review_id}
        ).fetchone()

        if not result:
            print(f'[PATTERNS] review {review_id} not found')
            return

        run_pattern_detection(result.product_id, result.dataset_id)
        causal_task.delay(review_id)

    finally:
        db.close()


@celery_app.task(name='tasks.causal')
def causal_task(review_id: int):
    db = SessionLocal()
    try:
        result = db.execute(
            text('SELECT product_id FROM reviews WHERE id = :id'),
            {'id': review_id}
        ).fetchone()

        if not result:
            print(f'[CAUSAL] review {review_id} not found')
            return

        run_causal_analysis(result.product_id, validate_with_llm=False)

    finally:
        db.close()
