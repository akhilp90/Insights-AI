def build_prompt(question: str, reviews: list[dict], patterns: list[dict], aspect_summary: list[dict]) -> str:

    review_block = ''
    for i, r in enumerate(reviews, 1):
        rating = f'{r["rating"]}/5' if r['rating'] else 'N/A'
        review_block += f'{i}. [{rating}] {r["text"]}\n'

    pattern_block = ''
    for p in patterns:
        if p['pattern_type'] == 'conditional_prob':
            pattern_block += f'- When {p["aspect"]} is negative, {p["related_issue"]} is also negative {int(p["score"]*100)}% of the time\n'
        elif p['pattern_type'] == 'co_occurrence':
            pattern_block += f'- {p["aspect"]} and {p["related_issue"]} appear together in {int(p["score"]*100)}% of reviews\n'
        elif p['pattern_type'] == 'contrast' and p['related_issue'] == 'SELF':
            pattern_block += f'- {p["aspect"]} has mixed sentiment (contrast score: {p["score"]})\n'

    summary_block = ''
    for s in aspect_summary:
        total = s['total']
        pos   = s['positive']
        neg   = s['negative']
        summary_block += f'- {s["aspect"]}: {pos} positive, {neg} negative out of {total} mentions\n'

    prompt = f'''You are a product intelligence analyst. A product manager is asking about Samsung Galaxy S24 customer reviews.
Answer using ONLY the data provided below. Be specific, concise, and actionable.

QUESTION:
{question}

ASPECT SENTIMENT SUMMARY:
{summary_block}

STATISTICAL PATTERNS (root cause signals):
{pattern_block}

RELEVANT CUSTOMER REVIEWS (retrieved by semantic search):
{review_block}

INSTRUCTIONS:
- Answer the question directly in 3-5 sentences
- Reference specific patterns and reviews as evidence
- Identify the most likely root cause if asked why
- End with one concrete recommendation for the product team

ANSWER:'''

    return prompt
