import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.api_gateway.auth import get_current_user
from services.api_gateway.database import get_db

router = APIRouter(tags=['upload'])

INGESTION_URL = 'http://localhost:8001'


@router.post('/products/{product_id}/upload')
async def upload_reviews(
    product_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Verify product belongs to user's client
    product = db.execute(
        text('SELECT id, sku, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    # Proxy to ingestion service
    content = await file.read()
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f'{INGESTION_URL}/upload',
            data={'sku': product.sku},
            files={'file': (file.filename, content, file.content_type)},
        )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail='Upload failed')

    return response.json()
