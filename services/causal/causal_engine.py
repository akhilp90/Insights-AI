"""
Main orchestrator for causal analysis.

Called by the causal_task in the pipeline, or directly via seed scripts.
Runs: discovery → validation → save to causal_edges table.
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

engine       = create_engine(os.getenv('POSTGRES_URL'))
SessionLocal = sessionmaker(bind=engine)

from services.causal.discovery import discover_causal_graph
from services.causal.validator import validate_all_edges


def save_causal_edges(product_id: int, edges: list[dict], db):
    """Delete old edges and insert new ones."""
    db.execute(text('DELETE FROM causal_edges WHERE product_id = :pid'),
               {'pid': product_id})

    for e in edges:
        db.execute(text('''
            INSERT INTO causal_edges
                (product_id, aspect_from, aspect_to, edge_type, strength,
                 method, validated, validation_reason)
            VALUES
                (:pid, :a_from, :a_to, :edge_type, :strength,
                 :method, :validated, :reason)
        '''), {
            'pid':       product_id,
            'a_from':    e['from'],
            'a_to':      e['to'],
            'edge_type': e.get('edge_type', 'causal'),
            'strength':  float(e.get('strength', 0)),
            'method':    e.get('method', 'pc_algorithm'),
            'validated': e.get('validated', False),
            'reason':    e.get('validation_reason', ''),
        })

    db.commit()
    print(f'[CAUSAL] saved {len(edges)} causal edges for product {product_id}')


def run_causal_analysis(product_id: int, validate_with_llm: bool = False,
                        category: str = 'smartphone') -> list[dict]:
    """Full causal analysis pipeline for a product.

    Args:
        product_id: The product to analyze
        validate_with_llm: Whether to call LLM for edge validation (slow, optional)
        category: Product category for LLM validation context
    """
    db = SessionLocal()
    try:
        print(f'[CAUSAL] starting causal discovery for product {product_id}')

        # Step 1: Discover causal graph
        edges = discover_causal_graph(product_id, db)

        if not edges:
            print(f'[CAUSAL] no causal edges found for product {product_id}')
            return []

        print(f'[CAUSAL] discovered {len(edges)} edges')

        # Step 2: Validate with LLM (optional — skip in pipeline for speed)
        if validate_with_llm:
            print(f'[CAUSAL] validating edges with LLM...')
            edges = validate_all_edges(edges, category)
            validated_count = sum(1 for e in edges if e.get('validated'))
            print(f'[CAUSAL] {validated_count}/{len(edges)} edges validated by LLM')
        else:
            for e in edges:
                e['edge_type'] = 'causal'
                e['validated'] = False
                e['validation_reason'] = 'LLM validation not run'

        # Step 3: Save to DB
        save_causal_edges(product_id, edges, db)

        return edges

    finally:
        db.close()
