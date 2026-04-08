"""
Causal discovery over aspect sentiment signals.

Implements:
  1. PC Algorithm  – learn a causal DAG from per-review binary aspect-sentiment
                     indicators using chi-squared conditional independence tests.
  2. Granger test  – (optional) when ≥8 monthly data points exist, test whether
                     past values of aspect A predict future values of aspect B.
"""

import os
import sys
import itertools
from collections import defaultdict

import numpy as np
from scipy import stats

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from sqlalchemy import text


# ────────────────────────────────────────────────────────────────
# 1.  Build a binary matrix:  rows = reviews, cols = aspects
#     Cell = 1 if that aspect is negative in this review, else 0
# ────────────────────────────────────────────────────────────────

def build_aspect_matrix(product_id: int, db):
    """Return (matrix, aspect_names) from absa_outputs."""
    rows = db.execute(text('''
        SELECT review_id, aspect_category, sentiment
        FROM absa_outputs
        WHERE product_id = :pid
        ORDER BY review_id
    '''), {'pid': product_id}).fetchall()

    if not rows:
        return None, []

    # Group by review
    reviews: dict[int, dict[str, str]] = defaultdict(dict)
    all_aspects: set[str] = set()
    for r in rows:
        reviews[r.review_id][r.aspect_category] = r.sentiment
        all_aspects.add(r.aspect_category)

    aspect_names = sorted(all_aspects)
    aspect_idx   = {a: i for i, a in enumerate(aspect_names)}
    n_reviews    = len(reviews)
    n_aspects    = len(aspect_names)

    matrix = np.zeros((n_reviews, n_aspects), dtype=np.int8)
    for row_i, (_, aspect_map) in enumerate(reviews.items()):
        for aspect, sentiment in aspect_map.items():
            if sentiment == 'negative':
                matrix[row_i, aspect_idx[aspect]] = 1

    return matrix, aspect_names


# ────────────────────────────────────────────────────────────────
# 2.  Conditional independence test  (chi-squared)
# ────────────────────────────────────────────────────────────────

def _chi2_test(x: np.ndarray, y: np.ndarray, alpha: float = 0.05) -> tuple[bool, float]:
    """Test marginal independence between binary vectors x, y.
    Returns (is_independent, p_value)."""
    ct = np.zeros((2, 2), dtype=int)
    ct[0, 0] = np.sum((x == 0) & (y == 0))
    ct[0, 1] = np.sum((x == 0) & (y == 1))
    ct[1, 0] = np.sum((x == 1) & (y == 0))
    ct[1, 1] = np.sum((x == 1) & (y == 1))

    # Need minimum expected frequency ≥ 5 for chi2; fall back to Fisher if not
    expected_min = min(ct.sum(axis=0).min(), ct.sum(axis=1).min())
    if expected_min < 5 or ct.sum() < 20:
        _, p = stats.fisher_exact(ct)
    else:
        _, p, _, _ = stats.chi2_contingency(ct, correction=True)

    return (p > alpha), p


def _conditional_independence(matrix: np.ndarray, i: int, j: int,
                              cond_set: list[int], alpha: float = 0.05) -> tuple[bool, float]:
    """Test X_i ⊥ X_j | X_{cond_set} using stratified chi-squared.
    Combines p-values across strata using Fisher's method."""
    if not cond_set:
        return _chi2_test(matrix[:, i], matrix[:, j], alpha)

    # Stratify by unique value combinations of conditioning variables
    cond_cols = matrix[:, cond_set]
    # For binary data, strata are 2^|cond_set| groups
    strata_keys = [tuple(row) for row in cond_cols]
    strata = defaultdict(list)
    for idx, key in enumerate(strata_keys):
        strata[key].append(idx)

    p_values = []
    for indices in strata.values():
        if len(indices) < 10:  # skip tiny strata
            continue
        sub_x = matrix[indices, i]
        sub_y = matrix[indices, j]
        # Skip if no variation
        if sub_x.sum() == 0 or sub_x.sum() == len(sub_x):
            continue
        if sub_y.sum() == 0 or sub_y.sum() == len(sub_y):
            continue
        _, p = _chi2_test(sub_x, sub_y, alpha)
        p_values.append(p)

    if not p_values:
        return True, 1.0  # treat as independent if untestable

    # Fisher's method to combine p-values
    stat = -2 * sum(np.log(max(p, 1e-300)) for p in p_values)
    combined_p = 1.0 - stats.chi2.cdf(stat, df=2 * len(p_values))

    return (combined_p > alpha), combined_p


# ────────────────────────────────────────────────────────────────
# 3.  PC Algorithm
# ────────────────────────────────────────────────────────────────

def pc_algorithm(matrix: np.ndarray, aspect_names: list[str],
                 alpha: float = 0.05, max_cond_size: int = 2) -> list[dict]:
    """
    Learn a causal skeleton + orient v-structures.

    Returns list of directed edges:
        [{'from': 'HEATING', 'to': 'BATTERY_LIFE', 'strength': 0.72, 'p_value': 0.003}, ...]
    """
    n = len(aspect_names)
    if n < 2:
        return []

    # Adjacency: adj[i][j] = True means edge exists
    adj = [[True] * n for _ in range(n)]
    for i in range(n):
        adj[i][i] = False

    # Separation sets: sep[i][j] = set of conditioning variable indices
    sep = [[set() for _ in range(n)] for _ in range(n)]

    # Phase 1: Remove edges via conditional independence tests
    for cond_size in range(max_cond_size + 1):
        for i in range(n):
            for j in range(i + 1, n):
                if not adj[i][j]:
                    continue

                # Neighbours of i excluding j
                neighbours = [k for k in range(n) if k != i and k != j and adj[i][k]]

                if len(neighbours) < cond_size:
                    continue

                for cond_set in itertools.combinations(neighbours, cond_size):
                    is_indep, p = _conditional_independence(
                        matrix, i, j, list(cond_set), alpha
                    )
                    if is_indep:
                        adj[i][j] = False
                        adj[j][i] = False
                        sep[i][j] = set(cond_set)
                        sep[j][i] = set(cond_set)
                        break

    # Phase 2: Orient v-structures  (X — Z — Y, X and Y not adjacent)
    # directed[i][j] = True means i → j
    directed = [[False] * n for _ in range(n)]

    for i in range(n):
        for j in range(n):
            if i == j or not adj[i][j]:
                continue
            directed[i][j] = False  # start undirected

    for z in range(n):
        # Find all pairs (x, y) both adjacent to z but not to each other
        neighbours_z = [k for k in range(n) if k != z and adj[z][k]]
        for x, y in itertools.combinations(neighbours_z, 2):
            if adj[x][y]:  # x and y ARE adjacent → not a v-structure
                continue
            # V-structure if z NOT in sep(x, y)
            if z not in sep[x][y]:
                directed[x][z] = True
                directed[y][z] = True

    # Phase 3: Apply Meek's orientation rules (simplified)
    # Rule 1: If X → Z — Y and X,Y not adjacent → Z → Y
    changed = True
    while changed:
        changed = False
        for z in range(n):
            for y in range(n):
                if z == y or not adj[z][y]:
                    continue
                if directed[z][y] or directed[y][z]:
                    continue  # already oriented
                # Check if any x → z exists where x,y not adjacent
                for x in range(n):
                    if x == z or x == y:
                        continue
                    if directed[x][z] and not adj[x][y]:
                        directed[z][y] = True
                        changed = True
                        break

    # Build edge list with strength = ATE (average treatment effect)
    # ATE = P(j=neg | i=neg) - P(j=neg | i=not_neg)
    # This measures actual causal impact, not just conditional probability.
    # Minimum support: need ≥ 10 reviews where cause aspect is negative
    MIN_SUPPORT = 10

    edges = []
    n_rows = matrix.shape[0]

    for i in range(n):
        for j in range(n):
            if i == j:
                continue

            if directed[i][j] or (adj[i][j] and not directed[j][i] and i < j):
                i_neg_mask  = matrix[:, i] == 1
                i_ok_mask   = matrix[:, i] == 0
                count_i_neg = int(i_neg_mask.sum())
                count_i_ok  = int(i_ok_mask.sum())

                # Skip if not enough support
                if count_i_neg < MIN_SUPPORT or count_i_ok < MIN_SUPPORT:
                    continue

                # Both i and j negative together
                both_neg = int((i_neg_mask & (matrix[:, j] == 1)).sum())

                # Skip if co-occurrence is too rare (< 5 reviews)
                if both_neg < 5:
                    continue

                p_j_neg_given_i_neg = both_neg / count_i_neg
                p_j_neg_given_i_ok  = float((i_ok_mask & (matrix[:, j] == 1)).sum()) / count_i_ok

                # ATE: how much does i being negative INCREASE j's negative rate
                ate = p_j_neg_given_i_neg - p_j_neg_given_i_ok

                # Only keep edges with meaningful positive ATE
                if ate < 0.05:
                    continue

                # For undirected edges, pick direction by which ATE is stronger
                if not directed[i][j] and adj[i][j] and i < j:
                    j_neg_mask = matrix[:, j] == 1
                    j_ok_mask  = matrix[:, j] == 0
                    count_j_neg = int(j_neg_mask.sum())
                    count_j_ok  = int(j_ok_mask.sum())

                    if count_j_neg >= MIN_SUPPORT and count_j_ok >= MIN_SUPPORT:
                        ate_reverse = (float((j_neg_mask & (matrix[:, i] == 1)).sum()) / count_j_neg) - \
                                      (float((j_ok_mask  & (matrix[:, i] == 1)).sum()) / count_j_ok)
                    else:
                        ate_reverse = 0

                    if ate_reverse > ate:
                        # Reverse direction: j causes i
                        edges.append({
                            'from':     aspect_names[j],
                            'to':       aspect_names[i],
                            'strength': round(ate_reverse, 4),
                            'method':   'pc_algorithm',
                        })
                        continue

                edges.append({
                    'from':     aspect_names[i],
                    'to':       aspect_names[j],
                    'strength': round(ate, 4),
                    'method':   'pc_algorithm',
                })

    return edges


# ────────────────────────────────────────────────────────────────
# 4.  Granger-style temporal test (simplified for short series)
# ────────────────────────────────────────────────────────────────

def build_monthly_series(product_id: int, db) -> tuple[dict[str, list[float]], list[str]]:
    """Build monthly negative-ratio time series per aspect."""
    rows = db.execute(text('''
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
               aspect_category,
               COUNT(*) as total,
               SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as neg
        FROM absa_outputs
        WHERE product_id = :pid
        GROUP BY month, aspect_category
        ORDER BY month
    '''), {'pid': product_id}).fetchall()

    if not rows:
        return {}, []

    # Collect all months
    months_set = sorted(set(r.month for r in rows))
    aspects_set = sorted(set(r.aspect_category for r in rows))

    # Build series: aspect → [neg_ratio_month1, neg_ratio_month2, ...]
    series: dict[str, list[float]] = {}
    month_data: dict[tuple[str, str], float] = {}
    for r in rows:
        ratio = r.neg / r.total if r.total > 0 else 0.0
        month_data[(r.aspect_category, r.month)] = ratio

    for asp in aspects_set:
        series[asp] = [month_data.get((asp, m), 0.0) for m in months_set]

    return series, months_set


def granger_test(series: dict[str, list[float]], max_lag: int = 1,
                 alpha: float = 0.10) -> list[dict]:
    """Simplified Granger test: does lagged X help predict Y beyond Y's own lag?
    Uses OLS F-test.  Only runs if series length ≥ 6."""
    aspects = sorted(series.keys())
    n = len(next(iter(series.values())))

    if n < 6:
        return []

    edges = []
    for a_from in aspects:
        for a_to in aspects:
            if a_from == a_to:
                continue

            y = np.array(series[a_to])
            x = np.array(series[a_from])

            for lag in range(1, max_lag + 1):
                if n - lag < 4:
                    continue

                y_t    = y[lag:]
                y_lag  = y[:-lag] if lag > 0 else y
                x_lag  = x[:-lag] if lag > 0 else x

                T = len(y_t)

                # Restricted model: y_t ~ y_lag
                X_r = np.column_stack([np.ones(T), y_lag[:T]])
                # Unrestricted model: y_t ~ y_lag + x_lag
                X_u = np.column_stack([np.ones(T), y_lag[:T], x_lag[:T]])

                try:
                    # OLS residuals
                    beta_r = np.linalg.lstsq(X_r, y_t, rcond=None)[0]
                    beta_u = np.linalg.lstsq(X_u, y_t, rcond=None)[0]

                    rss_r = np.sum((y_t - X_r @ beta_r) ** 2)
                    rss_u = np.sum((y_t - X_u @ beta_u) ** 2)

                    df1 = 1  # one extra predictor
                    df2 = T - X_u.shape[1]
                    if df2 <= 0 or rss_u <= 0:
                        continue

                    f_stat = ((rss_r - rss_u) / df1) / (rss_u / df2)
                    p_val  = 1.0 - stats.f.cdf(f_stat, df1, df2)

                    if p_val < alpha and f_stat > 0:
                        # Strength = how much variance x_lag explains
                        strength = max(0, min(1, 1 - rss_u / max(rss_r, 1e-10)))
                        edges.append({
                            'from':     a_from,
                            'to':       a_to,
                            'strength': round(strength, 4),
                            'method':   'granger',
                            'lag':      lag,
                            'p_value':  round(p_val, 4),
                        })
                except np.linalg.LinAlgError:
                    continue

    return edges


# ────────────────────────────────────────────────────────────────
# 5.  Public entry point
# ────────────────────────────────────────────────────────────────

def discover_causal_graph(product_id: int, db) -> list[dict]:
    """Run both PC algorithm and (if data allows) Granger test.
    Merge results, preferring PC edges. Returns unified edge list."""

    # PC Algorithm on cross-sectional data
    matrix, aspect_names = build_aspect_matrix(product_id, db)
    if matrix is None or len(aspect_names) < 2:
        return []

    pc_edges = pc_algorithm(matrix, aspect_names, alpha=0.05, max_cond_size=2)

    # Granger on temporal data (optional enhancement)
    series, months = build_monthly_series(product_id, db)
    granger_edges = granger_test(series, max_lag=1, alpha=0.10) if series else []

    # Merge: PC edges are primary, Granger adds confirmation or new edges
    edge_key = lambda e: (e['from'], e['to'])
    pc_set = {edge_key(e) for e in pc_edges}

    merged = list(pc_edges)
    for ge in granger_edges:
        key = edge_key(ge)
        if key in pc_set:
            # Granger confirms PC edge — boost strength
            for e in merged:
                if edge_key(e) == key:
                    e['strength'] = round(min(1.0, e['strength'] * 1.15), 4)
                    e['method'] = 'pc+granger'
                    break
        else:
            # Granger-only edge — add with lower confidence
            ge['method'] = 'granger'
            merged.append(ge)

    # Sort by strength descending
    merged.sort(key=lambda e: e['strength'], reverse=True)

    return merged
