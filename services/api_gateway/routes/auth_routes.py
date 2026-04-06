from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.api_gateway.auth import (
    hash_password, verify_password, create_token, get_current_user,
)
from services.api_gateway.database import get_db

router = APIRouter(prefix='/auth', tags=['auth'])


class SignupRequest(BaseModel):
    email: str
    password: str
    client_slug: str


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post('/signup')
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    # Find client
    client = db.execute(
        text('SELECT id, name, slug FROM clients WHERE slug = :slug'),
        {'slug': req.client_slug}
    ).fetchone()
    if not client:
        raise HTTPException(status_code=404, detail='Company not found. Check your company code.')

    # Check existing user
    existing = db.execute(
        text('SELECT id FROM users WHERE email = :email'),
        {'email': req.email}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail='Email already registered')

    # Create user
    password_hash = hash_password(req.password)
    result = db.execute(
        text('''INSERT INTO users (client_id, email, password_hash, role)
                VALUES (:client_id, :email, :hash, 'pm') RETURNING id'''),
        {'client_id': client.id, 'email': req.email, 'hash': password_hash}
    )
    user_id = result.fetchone().id
    db.commit()

    # Create token + session
    token, expires = create_token(user_id, client.id, req.email, 'pm')
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
            'client_id': client.id,
            'client_name': client.name,
            'client_slug': client.slug,
        }
    }


@router.post('/login')
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text('''SELECT u.id, u.email, u.password_hash, u.role, u.client_id,
                       c.name as client_name, c.slug as client_slug
                FROM users u JOIN clients c ON u.client_id = c.id
                WHERE u.email = :email'''),
        {'email': req.email}
    ).fetchone()

    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail='Invalid email or password')

    token, expires = create_token(user.id, user.client_id, user.email, user.role)
    db.execute(
        text('''INSERT INTO sessions (user_id, token, expires_at)
                VALUES (:uid, :token, :exp)'''),
        {'uid': user.id, 'token': token, 'exp': expires}
    )
    db.commit()

    return {
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role,
            'client_id': user.client_id,
            'client_name': user.client_name,
            'client_slug': user.client_slug,
        }
    }


@router.get('/me')
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.execute(
        text('''SELECT u.id, u.email, u.role, u.client_id,
                       c.name as client_name, c.slug as client_slug
                FROM users u JOIN clients c ON u.client_id = c.id
                WHERE u.id = :uid'''),
        {'uid': current_user['user_id']}
    ).fetchone()

    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    return {
        'id': user.id,
        'email': user.email,
        'role': user.role,
        'client_id': user.client_id,
        'client_name': user.client_name,
        'client_slug': user.client_slug,
    }


@router.post('/logout')
def logout(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    db.execute(
        text('DELETE FROM sessions WHERE user_id = :uid'),
        {'uid': current_user['user_id']}
    )
    db.commit()
    return {'status': 'logged out'}
