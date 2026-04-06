from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.api_gateway.auth import get_current_user
from services.api_gateway.database import get_db

router = APIRouter(tags=['products'])


class CreateProductRequest(BaseModel):
    name: str
    sku: str
    category: str


@router.get('/clients/{slug}/products')
def get_client_products(slug: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify the slug matches the user's client
    client = db.execute(
        text('SELECT id, name, slug FROM clients WHERE slug = :slug'),
        {'slug': slug}
    ).fetchone()
    if not client or client.id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    products = db.execute(
        text('SELECT id, name, sku, category FROM products WHERE client_id = :cid ORDER BY id'),
        {'cid': client.id}
    ).fetchall()

    return [
        {'id': p.id, 'name': p.name, 'sku': p.sku, 'category': p.category}
        for p in products
    ]


@router.post('/products')
def create_product(req: CreateProductRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    client_id = current_user['client_id']

    # Check unique SKU for this client
    existing = db.execute(
        text('SELECT id FROM products WHERE sku = :sku AND client_id = :cid'),
        {'sku': req.sku, 'cid': client_id}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail='SKU already exists for this client')

    result = db.execute(
        text('''INSERT INTO products (client_id, name, sku, category)
                VALUES (:cid, :name, :sku, :cat) RETURNING id, name, sku, category'''),
        {'cid': client_id, 'name': req.name, 'sku': req.sku, 'cat': req.category}
    )
    product = result.fetchone()
    db.commit()

    return {'id': product.id, 'name': product.name, 'sku': product.sku, 'category': product.category}


@router.get('/products/{product_id}/score')
def get_product_score(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify product belongs to user's client
    product = db.execute(
        text('SELECT id, name, sku, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    # Count reviews
    review_count = db.execute(
        text('SELECT COUNT(*) as cnt FROM reviews WHERE product_id = :pid'),
        {'pid': product_id}
    ).fetchone().cnt

    # Sentiment breakdown from absa_outputs
    sentiments = db.execute(
        text('''SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
                    SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
                    SUM(CASE WHEN sentiment = 'neutral'  THEN 1 ELSE 0 END) as neutral
                FROM absa_outputs WHERE product_id = :pid'''),
        {'pid': product_id}
    ).fetchone()

    total = sentiments.total or 0
    positive = sentiments.positive or 0

    if total > 0:
        score = round((positive / total) * 10, 1)
    else:
        score = 0.0

    if score < 6.5:
        status = 'Critical'
    elif score < 7.5:
        status = 'Moderate'
    else:
        status = 'Stable'

    # Top negative aspects
    top_negative = db.execute(
        text('''SELECT aspect_category, COUNT(*) as cnt
                FROM absa_outputs
                WHERE product_id = :pid AND sentiment = 'negative'
                GROUP BY aspect_category ORDER BY cnt DESC LIMIT 3'''),
        {'pid': product_id}
    ).fetchall()

    # Top positive aspects
    top_positive = db.execute(
        text('''SELECT aspect_category, COUNT(*) as cnt
                FROM absa_outputs
                WHERE product_id = :pid AND sentiment = 'positive'
                GROUP BY aspect_category ORDER BY cnt DESC LIMIT 3'''),
        {'pid': product_id}
    ).fetchall()

    return {
        'product_id': product_id,
        'score': score,
        'review_count': review_count,
        'status': status,
        'total_aspects': total,
        'positive_count': positive,
        'negative_count': sentiments.negative or 0,
        'neutral_count': sentiments.neutral or 0,
        'top_negative': [{'aspect': r.aspect_category, 'count': r.cnt} for r in top_negative],
        'top_positive': [{'aspect': r.aspect_category, 'count': r.cnt} for r in top_positive],
    }


@router.get('/products/{product_id}/aspects/{aspect}')
def get_aspect_detail(product_id: int, aspect: str, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Full detail for one aspect: monthly trend, patterns, sample reviews."""
    product = db.execute(
        text('SELECT id, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    # Overall sentiment counts
    totals = db.execute(
        text('''SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
                    SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative,
                    SUM(CASE WHEN sentiment = 'neutral'  THEN 1 ELSE 0 END) as neutral,
                    ROUND(AVG(confidence), 3) as avg_confidence
                FROM absa_outputs
                WHERE product_id = :pid AND aspect_category = :aspect'''),
        {'pid': product_id, 'aspect': aspect}
    ).fetchone()

    # Monthly trend — group by year-month
    trend_rows = db.execute(
        text('''SELECT
                    TO_CHAR(created_at, 'YYYY-MM') as month,
                    COUNT(*) as total,
                    SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive,
                    SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative
                FROM absa_outputs
                WHERE product_id = :pid AND aspect_category = :aspect
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                ORDER BY month ASC
                LIMIT 12'''),
        {'pid': product_id, 'aspect': aspect}
    ).fetchall()

    # All patterns for this aspect
    patterns = db.execute(
        text('''SELECT aspect, related_issue, pattern_type, score
                FROM pattern_results
                WHERE product_id = :pid AND (aspect = :aspect OR related_issue = :aspect)
                ORDER BY score DESC LIMIT 10'''),
        {'pid': product_id, 'aspect': aspect}
    ).fetchall()

    # Sample reviews via absa join
    reviews = db.execute(
        text('''SELECT r.body, r.rating, r.source, a.sentiment, a.confidence
                FROM absa_outputs a
                JOIN reviews r ON a.review_id = r.id
                WHERE a.product_id = :pid AND a.aspect_category = :aspect
                ORDER BY a.confidence DESC LIMIT 8'''),
        {'pid': product_id, 'aspect': aspect}
    ).fetchall()

    trend = [
        {
            'month': row.month,
            'total': row.total,
            'positive': row.positive,
            'negative': row.negative,
            'pos_pct': round((row.positive / row.total) * 100) if row.total > 0 else 0,
        }
        for row in trend_rows
    ]

    total = totals.total or 0
    return {
        'aspect': aspect,
        'total': total,
        'positive': totals.positive or 0,
        'negative': totals.negative or 0,
        'neutral': totals.neutral or 0,
        'avg_confidence': float(totals.avg_confidence) if totals.avg_confidence else 0,
        'trend': trend,
        'patterns': [
            {'aspect': p.aspect, 'related_issue': p.related_issue, 'type': p.pattern_type, 'score': round(float(p.score) * 100)}
            for p in patterns
        ],
        'reviews': [
            {'body': r.body[:300] if r.body else '', 'rating': float(r.rating) if r.rating else None,
             'source': r.source, 'sentiment': r.sentiment, 'confidence': float(r.confidence)}
            for r in reviews
        ],
    }


@router.get('/products/{product_id}/overview')
def get_product_overview(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate a text summary from aspect data + patterns — no LLM needed."""
    product = db.execute(
        text('SELECT id, name, sku, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    review_count = db.execute(
        text('SELECT COUNT(*) as cnt FROM reviews WHERE product_id = :pid'),
        {'pid': product_id}
    ).fetchone().cnt

    # Aspect breakdown
    aspects = db.execute(
        text('''SELECT aspect_category,
                    COUNT(*) as total,
                    SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as pos,
                    SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as neg
                FROM absa_outputs WHERE product_id = :pid
                GROUP BY aspect_category ORDER BY total DESC'''),
        {'pid': product_id}
    ).fetchall()

    # Top patterns
    patterns = db.execute(
        text('''SELECT aspect, related_issue, pattern_type, score
                FROM pattern_results WHERE product_id = :pid
                ORDER BY score DESC LIMIT 5'''),
        {'pid': product_id}
    ).fetchall()

    # Recent reviews sample
    recent = db.execute(
        text('''SELECT body, rating FROM reviews
                WHERE product_id = :pid AND body IS NOT NULL
                ORDER BY created_at DESC LIMIT 5'''),
        {'pid': product_id}
    ).fetchall()

    # Build summary text
    if not aspects and review_count == 0:
        summary_text = f'No review data available for {product.name} yet. Upload a CSV to get started.'
        return {
            'product_id': product_id,
            'product_name': product.name,
            'sku': product.sku,
            'review_count': 0,
            'summary': summary_text,
            'strengths': [],
            'weaknesses': [],
            'patterns': [],
            'recent_reviews': [],
        }

    strengths = []
    weaknesses = []
    for a in aspects:
        pos_pct = round((a.pos / a.total) * 100) if a.total > 0 else 0
        neg_pct = round((a.neg / a.total) * 100) if a.total > 0 else 0
        entry = {'aspect': a.aspect_category, 'total': a.total, 'positive_pct': pos_pct, 'negative_pct': neg_pct}
        if neg_pct > 50:
            weaknesses.append(entry)
        elif pos_pct > 50:
            strengths.append(entry)

    # Text summary
    parts = [f'Based on {review_count} reviews with {len(aspects)} aspects analyzed.']
    if strengths:
        top_str = ', '.join(s['aspect'] for s in strengths[:3])
        parts.append(f'Customers are most positive about {top_str}.')
    if weaknesses:
        top_weak = ', '.join(w['aspect'] for w in weaknesses[:3])
        parts.append(f'Key pain points include {top_weak}.')
    if patterns:
        p = patterns[0]
        parts.append(f'Top signal: {p.aspect} and {p.related_issue} co-occur with {round(float(p.score) * 100)}% correlation.')

    pattern_list = [
        {'aspect': p.aspect, 'related_issue': p.related_issue, 'type': p.pattern_type, 'score': round(float(p.score) * 100)}
        for p in patterns
    ]

    recent_list = [
        {'body': r.body[:200], 'rating': float(r.rating) if r.rating else None}
        for r in recent
    ]

    return {
        'product_id': product_id,
        'product_name': product.name,
        'sku': product.sku,
        'review_count': review_count,
        'summary': ' '.join(parts),
        'strengths': strengths,
        'weaknesses': weaknesses,
        'patterns': pattern_list,
        'recent_reviews': recent_list,
    }


@router.get('/products/{product_id}/metrics')
def get_product_metrics(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.execute(
        text('SELECT id, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    metrics = db.execute(
        text('''SELECT aspect_category, period, avg_sentiment, review_count,
                       positive_count, negative_count, neutral_count
                FROM aggregated_metrics WHERE product_id = :pid ORDER BY computed_at DESC'''),
        {'pid': product_id}
    ).fetchall()

    return [
        {
            'aspect_category': m.aspect_category,
            'period': m.period,
            'avg_sentiment': float(m.avg_sentiment) if m.avg_sentiment else 0,
            'review_count': m.review_count,
            'positive_count': m.positive_count,
            'negative_count': m.negative_count,
            'neutral_count': m.neutral_count,
        }
        for m in metrics
    ]
