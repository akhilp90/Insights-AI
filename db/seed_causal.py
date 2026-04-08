"""
Seed causal edges for all products that have absa_outputs.

Run:  python db/seed_causal.py
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

engine       = create_engine(os.getenv('POSTGRES_URL'))
SessionLocal = sessionmaker(bind=engine)

# Ensure causal_edges table exists
db = SessionLocal()
try:
    db.execute(text('''
        CREATE TABLE IF NOT EXISTS causal_edges (
            id                  SERIAL PRIMARY KEY,
            product_id          INTEGER REFERENCES products(id),
            aspect_from         VARCHAR(100) NOT NULL,
            aspect_to           VARCHAR(100) NOT NULL,
            edge_type           VARCHAR(50)  NOT NULL DEFAULT 'causal',
            strength            NUMERIC(5,4),
            method              VARCHAR(50),
            validated           BOOLEAN DEFAULT FALSE,
            validation_reason   TEXT,
            computed_at         TIMESTAMP DEFAULT NOW()
        )
    '''))
    db.commit()
    print('[SEED] causal_edges table ready')
except Exception as e:
    db.rollback()
    print(f'[SEED] table check: {e}')
finally:
    db.close()


from services.causal.causal_engine import run_causal_analysis

# Find all products with ABSA data
db = SessionLocal()
try:
    products = db.execute(text('''
        SELECT DISTINCT product_id
        FROM absa_outputs
    ''')).fetchall()

    print(f'[SEED] found {len(products)} products with ABSA data')

    for row in products:
        pid = row.product_id
        print(f'\n[SEED] Running causal discovery for product {pid}...')
        edges = run_causal_analysis(pid, validate_with_llm=False)
        print(f'[SEED] Product {pid}: {len(edges)} causal edges discovered')

        if edges:
            for e in edges[:5]:
                print(f'       {e["from"]} → {e["to"]}: {e["strength"]:.2%} ({e["method"]})')
            if len(edges) > 5:
                print(f'       ... and {len(edges) - 5} more')

finally:
    db.close()

print('\n[SEED] Causal seeding complete!')
