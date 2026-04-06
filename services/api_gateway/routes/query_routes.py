from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.api_gateway.auth import get_current_user
from services.api_gateway.database import get_db

router = APIRouter(tags=['query'])

QUERY_URL = 'http://localhost:8002'


class QueryRequest(BaseModel):
    question: str
    product_id: int
    aspect: Optional[str] = None
    top_k: int = 5


@router.post('/query')
async def proxy_query(req: QueryRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify product belongs to user's client
    product = db.execute(
        text('SELECT id, client_id FROM products WHERE id = :pid'),
        {'pid': req.product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    payload = req.model_dump(exclude_none=True)

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.post(
            f'{QUERY_URL}/query',
            json=payload,
        )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


@router.get('/summary/{product_id}')
async def proxy_summary(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.execute(
        text('SELECT id, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(f'{QUERY_URL}/summary/{product_id}')

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()


@router.get('/reviews/{product_id}')
async def proxy_reviews(product_id: int, limit: int = 10, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    product = db.execute(
        text('SELECT id, client_id FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')

    async with httpx.AsyncClient(timeout=300.0) as client:
        response = await client.get(f'http://localhost:8001/reviews/{product_id}?limit={limit}')

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    return response.json()
