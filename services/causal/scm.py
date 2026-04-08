"""
Structural Causal Model (SCM) for counterfactual fix estimation.

Given the causal graph (from discovery.py), this module:
  1. Learns edge coefficients via logistic regression
  2. Computes the current "state" of each aspect (negative ratio)
  3. Simulates do(aspect = positive) interventions
  4. Predicts score deltas and ranks fixes by impact
"""

import numpy as np
from sqlalchemy import text


def get_current_state(product_id: int, db) -> dict[str, dict]:
    """Fetch current sentiment breakdown per aspect."""
    rows = db.execute(text('''
        SELECT aspect_category,
               COUNT(*) as total,
               SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as pos,
               SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as neg,
               SUM(CASE WHEN sentiment = 'neutral'  THEN 1 ELSE 0 END) as neu
        FROM absa_outputs
        WHERE product_id = :pid
        GROUP BY aspect_category
    '''), {'pid': product_id}).fetchall()

    state = {}
    for r in rows:
        total = r.total or 1
        state[r.aspect_category] = {
            'total':     r.total,
            'positive':  r.pos,
            'negative':  r.neg,
            'neutral':   r.neu,
            'neg_ratio': round(r.neg / total, 4),
            'pos_ratio': round(r.pos / total, 4),
        }
    return state


def learn_edge_coefficients(product_id: int, causal_edges: list[dict], db) -> dict[tuple[str, str], float]:
    """Learn how much fixing aspect A reduces negative ratio in aspect B.

    For each causal edge A → B, compute:
        coefficient = P(B=neg | A=neg) - P(B=neg | A=not_neg)

    This is the Average Treatment Effect (ATE) — the difference in B's negative
    rate when A is negative vs. when A is not negative.
    """
    if not causal_edges:
        return {}

    # Fetch per-review aspect sentiments
    rows = db.execute(text('''
        SELECT review_id, aspect_category, sentiment
        FROM absa_outputs
        WHERE product_id = :pid
    '''), {'pid': product_id}).fetchall()

    # Build review → {aspect: sentiment} map
    review_map: dict[int, dict[str, str]] = {}
    for r in rows:
        if r.review_id not in review_map:
            review_map[r.review_id] = {}
        review_map[r.review_id][r.aspect_category] = r.sentiment

    coefficients = {}
    for edge in causal_edges:
        a_from = edge['from']
        a_to   = edge['to']

        # Count P(B=neg | A=neg) and P(B=neg | A=not_neg)
        b_neg_given_a_neg = 0
        a_neg_count       = 0
        b_neg_given_a_ok  = 0
        a_ok_count        = 0

        for review_id, aspects in review_map.items():
            if a_from not in aspects or a_to not in aspects:
                continue

            a_is_neg = aspects[a_from] == 'negative'
            b_is_neg = aspects[a_to]   == 'negative'

            if a_is_neg:
                a_neg_count += 1
                if b_is_neg:
                    b_neg_given_a_neg += 1
            else:
                a_ok_count += 1
                if b_is_neg:
                    b_neg_given_a_ok += 1

        p_b_neg_if_a_neg = b_neg_given_a_neg / a_neg_count if a_neg_count > 0 else 0
        p_b_neg_if_a_ok  = b_neg_given_a_ok  / a_ok_count  if a_ok_count  > 0 else 0

        # ATE: how much does A being negative increase B's negative rate
        ate = round(p_b_neg_if_a_neg - p_b_neg_if_a_ok, 4)
        coefficients[(a_from, a_to)] = max(ate, 0)  # Only positive causal effects

    return coefficients


def simulate_fix(aspect_to_fix: str, current_state: dict[str, dict],
                 causal_edges: list[dict], coefficients: dict[tuple[str, str], float]) -> dict:
    """
    Simulate do(aspect_to_fix = fully_positive).

    1. Set the fixed aspect's negative ratio to 0
    2. Propagate downstream: for each edge FROM this aspect,
       reduce downstream aspect's neg_ratio by the coefficient
    3. Also propagate 2nd-order effects (downstream of downstream)
    4. Compute new overall score from adjusted ratios
    """
    if aspect_to_fix not in current_state:
        return {'error': f'Aspect {aspect_to_fix} not found'}

    # Current overall score: (total_positive / total_aspects) * 10
    total_pos = sum(s['positive'] for s in current_state.values())
    total_all = sum(s['total'] for s in current_state.values())
    current_score = round((total_pos / total_all) * 10, 2) if total_all > 0 else 0

    # Build adjacency for downstream propagation
    downstream: dict[str, list[tuple[str, float]]] = {}
    for edge in causal_edges:
        a_from = edge['from']
        a_to   = edge['to']
        coeff  = coefficients.get((a_from, a_to), edge.get('strength', 0))
        if a_from not in downstream:
            downstream[a_from] = []
        downstream[a_from].append((a_to, coeff))

    # Simulate: compute new neg_ratio for each aspect
    new_state = {}
    for asp, s in current_state.items():
        new_state[asp] = dict(s)  # copy

    # Fix the target aspect: move all negatives to positive
    fixed = new_state[aspect_to_fix]
    neg_recovered = fixed['negative']
    fixed['negative'] = 0
    fixed['positive'] = fixed['positive'] + neg_recovered
    fixed['neg_ratio'] = 0.0
    fixed['pos_ratio'] = round(fixed['positive'] / fixed['total'], 4) if fixed['total'] > 0 else 0

    # Propagate downstream (BFS, max 3 hops)
    affected_chain = [aspect_to_fix]
    to_visit = [(aspect_to_fix, 1.0)]
    visited  = {aspect_to_fix}

    hop = 0
    while to_visit and hop < 3:
        next_visit = []
        for src, decay in to_visit:
            for dst, coeff in downstream.get(src, []):
                if dst in visited:
                    continue
                visited.add(dst)

                # Reduce downstream negative ratio by coeff * decay
                ds = new_state[dst]
                reduction = coeff * decay
                neg_reduced = int(round(ds['negative'] * reduction))
                if neg_reduced > 0 and ds['negative'] > neg_reduced:
                    ds['negative'] -= neg_reduced
                    ds['positive'] += neg_reduced
                    ds['neg_ratio'] = round(ds['negative'] / ds['total'], 4) if ds['total'] > 0 else 0
                    ds['pos_ratio'] = round(ds['positive'] / ds['total'], 4) if ds['total'] > 0 else 0
                    affected_chain.append(dst)
                    next_visit.append((dst, decay * 0.6))  # dampen propagation

        to_visit = next_visit
        hop += 1

    # Compute new overall score
    new_total_pos = sum(s['positive'] for s in new_state.values())
    predicted_score = round((new_total_pos / total_all) * 10, 2) if total_all > 0 else 0
    score_delta = round(predicted_score - current_score, 2)

    # Confidence based on sample size and number of edges involved
    base_confidence = min(0.95, 0.5 + (total_all / 2000) * 0.3)
    edge_bonus = min(0.15, len([e for e in causal_edges if e['from'] == aspect_to_fix]) * 0.05)
    confidence = round(min(0.95, base_confidence + edge_bonus), 2)

    return {
        'aspect_fixed':    aspect_to_fix,
        'current_score':   current_score,
        'predicted_score': predicted_score,
        'score_delta':     score_delta,
        'confidence':      confidence,
        'affected_chain':  affected_chain,
        'details': {
            asp: {
                'neg_ratio_before': round(current_state[asp]['neg_ratio'], 4),
                'neg_ratio_after':  round(new_state[asp]['neg_ratio'], 4),
            }
            for asp in affected_chain
        },
    }


def rank_all_fixes(product_id: int, causal_edges: list[dict], db) -> list[dict]:
    """Simulate fixing every negative aspect and rank by impact."""
    current_state = get_current_state(product_id, db)
    if not current_state:
        return []

    coefficients = learn_edge_coefficients(product_id, causal_edges, db)

    # Only simulate aspects that have meaningful negative ratio
    candidates = [
        asp for asp, s in current_state.items()
        if s['neg_ratio'] > 0.15 and s['total'] >= 5
    ]

    results = []
    for asp in candidates:
        sim = simulate_fix(asp, current_state, causal_edges, coefficients)
        if 'error' not in sim and sim['score_delta'] > 0:
            results.append(sim)

    # Sort by score impact descending
    results.sort(key=lambda r: r['score_delta'], reverse=True)
    return results
