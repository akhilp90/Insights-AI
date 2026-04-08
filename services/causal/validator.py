"""
LLM-based validation of discovered causal edges.

For each edge A → B, asks the LLM whether there is a plausible physical /
logical causal mechanism.  Edges confirmed by LLM are marked validated=True.
Edges rejected are marked edge_type='correlated' (kept for reference).
"""

import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from services.llm.llm_service import generate


VALIDATION_PROMPT = """You are a product engineering expert. Given two product aspects from customer reviews, determine if there is a plausible causal relationship.

Aspect A: {aspect_from}
Aspect B: {aspect_to}
Product category: {category}

Question: In a {category}, can issues with {aspect_from} physically or logically CAUSE issues with {aspect_to}?

Rules:
- Only say YES if there is a direct or well-known indirect causal mechanism
- Correlation alone is NOT causation
- Consider physical, engineering, and user-experience causal pathways

Respond in exactly this format:
VERDICT: YES or NO
REASON: One sentence explanation of the causal mechanism (or why there isn't one)"""


def validate_edge(aspect_from: str, aspect_to: str, category: str = 'smartphone') -> dict:
    """Ask LLM whether edge A → B is causally plausible."""
    prompt = VALIDATION_PROMPT.format(
        aspect_from=aspect_from.replace('_', ' ').title(),
        aspect_to=aspect_to.replace('_', ' ').title(),
        category=category,
    )

    response = generate(prompt, max_tokens=100)

    # Parse response
    validated = False
    reason = response.strip()

    lines = response.strip().split('\n')
    for line in lines:
        line_upper = line.strip().upper()
        if line_upper.startswith('VERDICT:'):
            verdict = line_upper.replace('VERDICT:', '').strip()
            validated = 'YES' in verdict
        elif line_upper.startswith('REASON:'):
            reason = line.strip().replace('REASON:', '').strip()

    return {
        'validated': validated,
        'reason':    reason,
    }


def validate_all_edges(edges: list[dict], category: str = 'smartphone') -> list[dict]:
    """Validate each edge via LLM, updating edge_type and validation_reason."""
    for edge in edges:
        try:
            result = validate_edge(edge['from'], edge['to'], category)
            edge['validated']         = result['validated']
            edge['validation_reason'] = result['reason']
            edge['edge_type']         = 'causal' if result['validated'] else 'correlated'
        except Exception:
            # If LLM is unavailable, mark as unvalidated but keep the edge
            edge['validated']         = False
            edge['validation_reason'] = 'LLM validation unavailable'
            edge['edge_type']         = 'unvalidated'

    return edges
