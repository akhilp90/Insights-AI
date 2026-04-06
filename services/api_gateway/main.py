import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from services.api_gateway.database import engine, SessionLocal
from services.api_gateway.seed import seed_test_users
from services.api_gateway.routes.auth_routes import router as auth_router
from services.api_gateway.routes.product_routes import router as product_router
from services.api_gateway.routes.client_routes import router as client_router
from services.api_gateway.routes.upload_routes import router as upload_router
from services.api_gateway.routes.query_routes import router as query_router


def run_migrations():
    """Run SQL migration files in order."""
    migrations_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'db', 'migrations')
    if not os.path.exists(migrations_dir):
        return

    with engine.connect() as conn:
        for filename in sorted(os.listdir(migrations_dir)):
            if not filename.endswith('.sql'):
                continue
            filepath = os.path.join(migrations_dir, filename)
            with open(filepath, 'r') as f:
                sql = f.read()
            try:
                for statement in sql.split(';'):
                    statement = statement.strip()
                    if statement and not statement.startswith('--'):
                        conn.execute(text(statement))
                conn.commit()
                print(f'[MIGRATION] Applied {filename}')
            except Exception as e:
                conn.rollback()
                print(f'[MIGRATION] {filename} skipped or already applied: {e}')


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: run migrations and seed
    run_migrations()
    db = SessionLocal()
    try:
        seed_test_users(db)
    finally:
        db.close()
    yield


app = FastAPI(title='Insights AI Gateway', version='1.0.0', lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(client_router)
app.include_router(upload_router)
app.include_router(query_router)


@app.get('/health')
def health():
    return {'status': 'ok', 'service': 'api_gateway'}
