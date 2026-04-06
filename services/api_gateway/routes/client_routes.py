import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.api_gateway.auth import get_current_user, hash_password, create_token
from services.api_gateway.database import get_db

router = APIRouter(tags=['clients'])


class CreateClientRequest(BaseModel):
    company_name: str
    email: str
    password: str


@router.post('/clients')
def create_client(req: CreateClientRequest, db: Session = Depends(get_db)):
    # Auto-generate slug from company name
    slug = re.sub(r'[^a-z0-9]+', '-', req.company_name.lower()).strip('-')

    # Check if slug exists
    existing = db.execute(
        text('SELECT id FROM clients WHERE slug = :slug'),
        {'slug': slug}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail='Company already exists')

    # Check if email exists
    existing_user = db.execute(
        text('SELECT id FROM users WHERE email = :email'),
        {'email': req.email}
    ).fetchone()
    if existing_user:
        raise HTTPException(status_code=409, detail='Email already registered')

    # Create client
    client = db.execute(
        text('''INSERT INTO clients (name, slug)
                VALUES (:name, :slug) RETURNING id, name, slug'''),
        {'name': req.company_name, 'slug': slug}
    )
    client_row = client.fetchone()
    db.commit()

    # Create user
    password_hash = hash_password(req.password)
    user = db.execute(
        text('''INSERT INTO users (client_id, email, password_hash, role)
                VALUES (:cid, :email, :hash, 'pm') RETURNING id'''),
        {'cid': client_row.id, 'email': req.email, 'hash': password_hash}
    )
    user_id = user.fetchone().id
    db.commit()

    # Create token
    token, expires = create_token(user_id, client_row.id, req.email, 'pm')
    db.execute(
        text('''INSERT INTO sessions (user_id, token, expires_at)
                VALUES (:uid, :token, :exp)'''),
        {'uid': user_id, 'token': token, 'exp': expires}
    )
    db.commit()

    return {
        'token': token,
        'user': {
            'id': user_id,
            'email': req.email,
            'role': 'pm',
            'client_id': client_row.id,
            'client_name': client_row.name,
            'client_slug': client_row.slug,
        }
    }


@router.get('/clients')
def list_clients(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user['role'] != 'admin':
        raise HTTPException(status_code=403, detail='Admin only')

    clients = db.execute(text('SELECT id, name, slug, created_at FROM clients ORDER BY id')).fetchall()
    return [
        {'id': c.id, 'name': c.name, 'slug': c.slug, 'created_at': str(c.created_at)}
        for c in clients
    ]
