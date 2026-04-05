import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from collections import defaultdict
import itertools

load_dotenv()

engine       = create_engine(os.getenv('POSTGRES_URL'))
SessionLocal = sessionmaker(bind=engine)


def fetch_absa_data(product_id: int, db) -> list[dict]:
    rows = db.execute(text('''
        SELECT review_id, aspect_category, sentiment
        FROM absa_outputs
        WHERE product_id = :product_id
        ORDER BY review_id
    '''), {'product_id': product_id}).fetchall()

    reviews = defaultdict(list)
    for row in rows:
        reviews[row.review_id].append({
            'aspect':    row.aspect_category,
            'sentiment': row.sentiment,
        })

    return dict(reviews)


def compute_co_occurrence(reviews: dict) -> list[dict]:
    pair_counts    = defaultdict(int)
    aspect_counts  = defaultdict(int)
    total_reviews  = len(reviews)

    for review_id, aspects in reviews.items():
        neg_aspects = [a['aspect'] for a in aspects if a['sentiment'] == 'negative']

        for aspect in neg_aspects:
            aspect_counts[aspect] += 1

        for a, b in itertools.combinations(sorted(set(neg_aspects)), 2):
            pair_counts[(a, b)] += 1

    results = []
    for (a, b), count in pair_counts.items():
        score = round(count / total_reviews, 4)
        if score > 0:
            results.append({
                'aspect':        a,
                'related_issue': b,
                'pattern_type':  'co_occurrence',
                'score':         score,
            })
            results.append({
                'aspect':        b,
                'related_issue': a,
                'pattern_type':  'co_occurrence',
                'score':         score,
            })

    return results


def compute_conditional_probability(reviews: dict) -> list[dict]:
    aspect_neg_counts = defaultdict(int)
    co_neg_counts     = defaultdict(int)

    for review_id, aspects in reviews.items():
        neg_aspects = set(a['aspect'] for a in aspects if a['sentiment'] == 'negative')

        for aspect in neg_aspects:
            aspect_neg_counts[aspect] += 1

        for a, b in itertools.permutations(neg_aspects, 2):
            co_neg_counts[(a, b)] += 1

    results = []
    for (a, b), count in co_neg_counts.items():
        if aspect_neg_counts[a] > 0:
            prob  = round(count / aspect_neg_counts[a], 4)
            results.append({
                'aspect':        a,
                'related_issue': b,
                'pattern_type':  'conditional_prob',
                'score':         prob,
            })

    return results


def compute_contrast(reviews: dict) -> list[dict]:
    aspect_sentiments = defaultdict(lambda: {'positive': 0, 'negative': 0, 'neutral': 0})

    for review_id, aspects in reviews.items():
        for a in aspects:
            aspect_sentiments[a['aspect']][a['sentiment']] += 1

    results = []
    for aspect, counts in aspect_sentiments.items():
        total = counts['positive'] + counts['negative'] + counts['neutral']
        if total == 0:
            continue

        neg_ratio = round(counts['negative'] / total, 4)
        pos_ratio = round(counts['positive'] / total, 4)
        contrast  = round(abs(pos_ratio - neg_ratio), 4)

        if contrast > 0:
            results.append({
                'aspect':        aspect,
                'related_issue': 'SELF',
                'pattern_type':  'contrast',
                'score':         contrast,
            })

    return results


def save_patterns(product_id: int, dataset_id: int, patterns: list[dict], db):
    db.execute(text('''
        DELETE FROM pattern_results
        WHERE product_id = :product_id AND dataset_id = :dataset_id
    '''), {'product_id': product_id, 'dataset_id': dataset_id})

    for p in patterns:
        db.execute(text('''
            INSERT INTO pattern_results
                (product_id, dataset_id, aspect, related_issue, pattern_type, score)
            VALUES
                (:product_id, :dataset_id, :aspect, :related_issue, :pattern_type, :score)
        '''), {
            'product_id':    product_id,
            'dataset_id':    dataset_id,
            'aspect':        p['aspect'],
            'related_issue': p['related_issue'],
            'pattern_type':  p['pattern_type'],
            'score':         p['score'],
        })

    db.commit()
    print(f'[PATTERNS] saved {len(patterns)} patterns for product {product_id}')


def run_pattern_detection(product_id: int, dataset_id: int):
    db = SessionLocal()
    try:
        reviews  = fetch_absa_data(product_id, db)

        if not reviews:
            print(f'[PATTERNS] no ABSA data for product {product_id}')
            return

        print(f'[PATTERNS] analyzing {len(reviews)} reviews for product {product_id}')

        co_occ   = compute_co_occurrence(reviews)
        cond_prob = compute_conditional_probability(reviews)
        contrast  = compute_contrast(reviews)

        all_patterns = co_occ + cond_prob + contrast

        save_patterns(product_id, dataset_id, all_patterns, db)

        print(f'[PATTERNS] co_occurrence: {len(co_occ)} | conditional_prob: {len(cond_prob)} | contrast: {len(contrast)}')

        return {
            'co_occurrence':    co_occ,
            'conditional_prob': cond_prob,
            'contrast':         contrast,
        }

    finally:
        db.close()
