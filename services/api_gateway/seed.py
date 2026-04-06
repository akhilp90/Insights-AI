"""Seed test users on gateway startup. Idempotent — safe to run multiple times."""

from sqlalchemy import text
from sqlalchemy.orm import Session
from services.api_gateway.auth import hash_password


SEED_USERS = [
    {'email': 'pm@samsung.com', 'password': 'samsung123', 'client_slug': 'samsung'},
    {'email': 'pm@apple.com',   'password': 'apple123',   'client_slug': 'apple'},
]


def seed_test_users(db: Session):
    for u in SEED_USERS:
        # Check if user exists
        existing = db.execute(
            text('SELECT id FROM users WHERE email = :email'),
            {'email': u['email']}
        ).fetchone()
        if existing:
            continue

        # Find client
        client = db.execute(
            text('SELECT id FROM clients WHERE slug = :slug'),
            {'slug': u['client_slug']}
        ).fetchone()
        if not client:
            continue

        pw_hash = hash_password(u['password'])
        db.execute(
            text('''INSERT INTO users (client_id, email, password_hash, role)
                    VALUES (:cid, :email, :hash, 'pm')'''),
            {'cid': client.id, 'email': u['email'], 'hash': pw_hash}
        )
        db.commit()
        print(f'[SEED] Created user {u["email"]}')
