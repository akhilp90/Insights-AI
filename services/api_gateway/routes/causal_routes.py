from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from services.api_gateway.auth import get_current_user
from services.api_gateway.database import get_db
from services.causal.scm import get_current_state, learn_edge_coefficients, simulate_fix, rank_all_fixes

router = APIRouter(tags=['causal'])


def _verify_product(product_id: int, current_user: dict, db: Session):
    product = db.execute(
        text('SELECT id, client_id, category FROM products WHERE id = :pid'),
        {'pid': product_id}
    ).fetchone()
    if not product or product.client_id != current_user['client_id']:
        raise HTTPException(status_code=403, detail='Access denied')
    return product


@router.get('/products/{product_id}/causal-graph')
def get_causal_graph(product_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the causal edge graph for a product."""
    _verify_product(product_id, current_user, db)

    edges = db.execute(text('''
        SELECT aspect_from, aspect_to, edge_type, strength, method,
               validated, validation_reason
        FROM causal_edges
        WHERE product_id = :pid
        ORDER BY strength DESC
    '''), {'pid': product_id}).fetchall()

    # Also fetch aspect state for node metadata
    state = get_current_state(product_id, db)

    nodes = []
    for asp, s in state.items():
        nodes.append({
            'id':        asp,
            'label':     asp.replace('_', ' ').title(),
            'total':     s['total'],
            'neg_ratio': s['neg_ratio'],
            'pos_ratio': s['pos_ratio'],
        })

    edge_list = [
        {
            'from':      e.aspect_from,
            'to':        e.aspect_to,
            'edge_type': e.edge_type,
            'strength':  float(e.strength) if e.strength else 0,
            'method':    e.method,
            'validated': e.validated,
            'reason':    e.validation_reason,
        }
        for e in edges
    ]

    return {'nodes': nodes, 'edges': edge_list}


class FixSimulationRequest(BaseModel):
    aspect: str


@router.post('/products/{product_id}/fix-simulation')
def simulate_fix_endpoint(product_id: int, req: FixSimulationRequest,
                          current_user: dict = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Simulate what happens if a specific aspect is fully resolved."""
    _verify_product(product_id, current_user, db)

    # Fetch causal edges
    edges_rows = db.execute(text('''
        SELECT aspect_from, aspect_to, strength, method
        FROM causal_edges
        WHERE product_id = :pid
    '''), {'pid': product_id}).fetchall()

    causal_edges = [
        {'from': e.aspect_from, 'to': e.aspect_to,
         'strength': float(e.strength), 'method': e.method}
        for e in edges_rows
    ]

    current_state = get_current_state(product_id, db)
    coefficients = learn_edge_coefficients(product_id, causal_edges, db)

    result = simulate_fix(req.aspect, current_state, causal_edges, coefficients)

    if 'error' in result:
        raise HTTPException(status_code=404, detail=result['error'])

    return result


@router.get('/products/{product_id}/fix-rankings')
def get_fix_rankings(product_id: int, current_user: dict = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    """Rank all possible fixes by predicted score improvement."""
    _verify_product(product_id, current_user, db)

    edges_rows = db.execute(text('''
        SELECT aspect_from, aspect_to, strength, method
        FROM causal_edges
        WHERE product_id = :pid
    '''), {'pid': product_id}).fetchall()

    causal_edges = [
        {'from': e.aspect_from, 'to': e.aspect_to,
         'strength': float(e.strength), 'method': e.method}
        for e in edges_rows
    ]

    rankings = rank_all_fixes(product_id, causal_edges, db)
    return {'rankings': rankings}


@router.post('/products/{product_id}/causal-validate')
def validate_causal_edges(product_id: int, current_user: dict = Depends(get_current_user),
                          db: Session = Depends(get_db)):
    """Trigger LLM validation of causal edges (on-demand, slow)."""
    product = _verify_product(product_id, current_user, db)
    category = product.category or 'smartphone'

    from services.causal.causal_engine import run_causal_analysis
    edges = run_causal_analysis(product_id, validate_with_llm=True, category=category)

    return {'validated': len([e for e in edges if e.get('validated')]), 'total': len(edges)}
