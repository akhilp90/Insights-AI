from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
import pandas as pd
import hashlib
import io
import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from services.ingestion.database import get_db
from services.ingestion.models import Product, Dataset, Review
from shared.tasks import ingest_task

app = FastAPI(title='Ingestion Service')


def get_product(db: Session, sku: str):
    product = db.query(Product).filter(Product.sku == sku).first()
    if not product:
        raise HTTPException(status_code=404, detail=f'SKU {sku} not found')
    return product


def parse_file(file: UploadFile) -> pd.DataFrame:
    content = file.file.read()
    ext = file.filename.split('.')[-1].lower()

    if ext == 'csv':
        df = pd.read_csv(io.BytesIO(content))
    elif ext == 'json':
        df = pd.read_json(io.BytesIO(content))
    elif ext in ['xlsx', 'xls']:
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail='Only CSV, JSON, Excel supported')

    return df


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.lower().strip() for c in df.columns]

    column_map = {
        'review':       'body',
        'review_text':  'body',
        'text':         'body',
        'content':      'body',
        'comment':      'body',
        'reviewer':     'author',
        'reviewer_name':'author',
        'user':         'author',
        'stars':        'rating',
        'score':        'rating',
        'headline':     'title',
        'summary':      'title',
        'date':         'review_date',
        'reviewed_at':  'review_date',
    }
    df = df.rename(columns=column_map)

    if 'body' not in df.columns:
        raise HTTPException(status_code=400, detail='File must have a review body column')

    for col in ['title', 'author', 'rating', 'review_date']:
        if col not in df.columns:
            df[col] = None

    return df


@app.post('/upload')
async def upload_reviews(
    sku:  str        = Form(...),
    file: UploadFile = File(...),
    db:   Session    = Depends(get_db)
):
    product = get_product(db, sku)
    df      = parse_file(file)
    df      = normalize_columns(df)

    dataset = Dataset(
        client_id  = 1,
        product_id = product.id,
        name       = file.filename,
        file_type  = file.filename.split('.')[-1].lower(),
        row_count  = len(df),
    )
    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    saved      = 0
    duplicates = 0

    for _, row in df.iterrows():
        body = str(row.get('body', '')).strip()
        if not body or body == 'nan':
            continue

        external_id = hashlib.md5(body.encode()).hexdigest()

        existing = db.query(Review).filter(
            Review.source      == 'upload',
            Review.external_id == external_id
        ).first()

        if existing:
            duplicates += 1
            continue

        review = Review(
            product_id  = product.id,
            dataset_id  = dataset.id,
            source      = 'upload',
            external_id = external_id,
            author      = str(row.get('author', '')) or None,
            rating      = float(row['rating']) if pd.notna(row.get('rating')) else None,
            title       = str(row.get('title', '')) or None,
            body        = body,
            review_date = pd.to_datetime(row['review_date']).date() if pd.notna(row.get('review_date')) else None,
            raw_data    = row.to_dict(),
            is_processed= False,
        )
        db.add(review)
        db.commit()
        db.refresh(review)

        ingest_task.delay(review.id)
        saved += 1

    return {
        'status':     'success',
        'product':    product.name,
        'sku':        sku,
        'dataset_id': dataset.id,
        'saved':      saved,
        'duplicates': duplicates,
        'total_rows': len(df),
    }


@app.get('/products')
def list_products(db: Session = Depends(get_db)):
    products = db.query(Product).all()
    return [{'id': p.id, 'name': p.name, 'sku': p.sku, 'category': p.category} for p in products]


@app.get('/reviews/{product_id}')
def get_reviews(product_id: int, limit: int = 10, db: Session = Depends(get_db)):
    reviews = db.query(Review).filter(Review.product_id == product_id).limit(limit).all()
    return [{'id': r.id, 'body': r.body, 'rating': r.rating, 'source': r.source} for r in reviews]


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'ingestion'}
