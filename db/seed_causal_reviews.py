"""
Seed multi-aspect reviews that create strong causal signals.

Each review mentions MULTIPLE aspects, so the PC algorithm can detect
which aspects co-occur and which are conditionally independent.

Run:  python db/seed_causal_reviews.py
"""

import os, sys, hashlib, random
from datetime import datetime, timedelta
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

load_dotenv()
engine       = create_engine(os.getenv('POSTGRES_URL'))
SessionLocal = sessionmaker(bind=engine)

now = datetime.now()

# ── Multi-aspect review templates ────────────────────────────────────────────
# Each tuple: (body, rating, [(aspect, sentiment, confidence), ...])
# These encode realistic causal patterns:
#   HEATING → BATTERY_LIFE  (overheating drains battery)
#   HEATING → PERFORMANCE   (thermal throttling hurts performance)
#   SOFTWARE_UX → BATTERY_LIFE  (bad software drains battery)
#   SOFTWARE_UX → PERFORMANCE   (bloatware slows things down)
#   BATTERY_LIFE → SOFTWARE_UX  (poor battery = bad user experience)

MULTI_REVIEWS_S24 = [
    # ── HEATING causes BATTERY + PERFORMANCE (strong causal chain) ──
    ("Phone overheats badly during gaming. Battery drains in 2 hours and everything starts lagging.",
     1, [("HEATING", "negative", 0.92), ("BATTERY_LIFE", "negative", 0.90), ("PERFORMANCE", "negative", 0.85)]),
    ("Extreme heat during video calls. Battery drops 30% in an hour. Apps become sluggish.",
     2, [("HEATING", "negative", 0.89), ("BATTERY_LIFE", "negative", 0.87), ("PERFORMANCE", "negative", 0.83)]),
    ("Gets very hot running navigation. Battery dies by noon, maps freezes constantly.",
     2, [("HEATING", "negative", 0.91), ("BATTERY_LIFE", "negative", 0.88), ("PERFORMANCE", "negative", 0.84)]),
    ("Terrible thermal management. Heat kills the battery and makes the phone stutter.",
     1, [("HEATING", "negative", 0.93), ("BATTERY_LIFE", "negative", 0.91), ("PERFORMANCE", "negative", 0.86)]),
    ("Overheats within 20 min of heavy use. Battery plummets and games start dropping frames.",
     2, [("HEATING", "negative", 0.90), ("BATTERY_LIFE", "negative", 0.87), ("PERFORMANCE", "negative", 0.82)]),

    # ── HEATING causes BATTERY only (no performance impact) ──
    ("Phone runs hot but battery is the real victim. Drains way too fast when warm.",
     2, [("HEATING", "negative", 0.88), ("BATTERY_LIFE", "negative", 0.90)]),
    ("Heat is unbearable in summer. Battery barely lasts 4 hours outdoors.",
     2, [("HEATING", "negative", 0.87), ("BATTERY_LIFE", "negative", 0.86)]),
    ("Gets hot during charging and battery health is degrading fast.",
     2, [("HEATING", "negative", 0.85), ("BATTERY_LIFE", "negative", 0.84)]),
    ("Overheating is the main problem. It causes rapid battery drain every single time.",
     2, [("HEATING", "negative", 0.91), ("BATTERY_LIFE", "negative", 0.89)]),

    # ── SOFTWARE causes BATTERY + PERFORMANCE ──
    ("One UI is bloated with garbage apps that drain battery and slow everything down.",
     2, [("SOFTWARE_UX", "negative", 0.88), ("BATTERY_LIFE", "negative", 0.85), ("PERFORMANCE", "negative", 0.83)]),
    ("Too many background services eating battery. Phone lags when memory is full.",
     2, [("SOFTWARE_UX", "negative", 0.86), ("BATTERY_LIFE", "negative", 0.87), ("PERFORMANCE", "negative", 0.81)]),
    ("Software update broke battery optimization. Draining faster and apps crash more.",
     1, [("SOFTWARE_UX", "negative", 0.90), ("BATTERY_LIFE", "negative", 0.88), ("PERFORMANCE", "negative", 0.84)]),
    ("Bloatware is killing this phone. Battery and performance both suffer.",
     2, [("SOFTWARE_UX", "negative", 0.87), ("BATTERY_LIFE", "negative", 0.85), ("PERFORMANCE", "negative", 0.82)]),

    # ── SOFTWARE causes PERFORMANCE only ──
    ("Software feels sluggish. Too many animations and unnecessary features slowing things down.",
     3, [("SOFTWARE_UX", "negative", 0.84), ("PERFORMANCE", "negative", 0.86)]),
    ("One UI needs optimization badly. Stutters everywhere despite good hardware.",
     3, [("SOFTWARE_UX", "negative", 0.82), ("PERFORMANCE", "negative", 0.85)]),

    # ── BATTERY negative alone (no heating) — shows battery has independent causes too ──
    ("Battery life is disappointing for a 2024 flagship. Can't last a full day.",
     2, [("BATTERY_LIFE", "negative", 0.89)]),
    ("Have to charge twice daily. Battery is the weakest point.",
     2, [("BATTERY_LIFE", "negative", 0.87)]),
    ("Battery health dropped to 91% in just 3 months of normal use.",
     3, [("BATTERY_LIFE", "negative", 0.83)]),

    # ── HEATING negative alone — shows heating happens independently ──
    ("Gets uncomfortably warm even during light browsing.",
     3, [("HEATING", "negative", 0.85)]),
    ("Phone is a hand warmer. Not ideal in tropical climates.",
     3, [("HEATING", "negative", 0.83)]),

    # ── PERFORMANCE negative alone ──
    ("Noticeable lag when switching between apps. Expected better for this price.",
     3, [("PERFORMANCE", "negative", 0.84)]),

    # ── CAMERA positive (independent of heating/battery causal chain) ──
    ("Camera is phenomenal. Best in class zoom and night mode.",
     5, [("CAMERA", "positive", 0.95)]),
    ("Photos are consistently amazing. Camera never disappoints.",
     5, [("CAMERA", "positive", 0.93)]),
    ("Portrait mode is stunning. Camera is the reason I bought this phone.",
     5, [("CAMERA", "positive", 0.91)]),
    ("Camera quality is incredible even in low light conditions.",
     5, [("CAMERA", "positive", 0.94)]),
    ("Video recording quality is cinema-level. Very impressed.",
     5, [("CAMERA", "positive", 0.92)]),

    # ── DISPLAY positive (independent) ──
    ("Display is gorgeous. Best screen on any phone I've owned.",
     5, [("DISPLAY", "positive", 0.94)]),
    ("Screen brightness and color accuracy are top notch.",
     5, [("DISPLAY", "positive", 0.92)]),
    ("120Hz makes everything buttery smooth. Love this display.",
     5, [("DISPLAY", "positive", 0.90)]),

    # ── BUILD positive (independent) ──
    ("Premium build quality. Feels solid and well-made.",
     5, [("BUILD_QUALITY", "positive", 0.91)]),
    ("Great build. Survived a few drops without damage.",
     4, [("BUILD_QUALITY", "positive", 0.87)]),

    # ── All positive reviews (good product experience) ──
    ("Amazing phone overall. Camera is great, battery lasts all day, runs smooth.",
     5, [("CAMERA", "positive", 0.92), ("BATTERY_LIFE", "positive", 0.88), ("PERFORMANCE", "positive", 0.86)]),
    ("Excellent phone. No heating issues, battery is solid, software is clean.",
     5, [("HEATING", "positive", 0.85), ("BATTERY_LIFE", "positive", 0.90), ("SOFTWARE_UX", "positive", 0.87)]),
    ("Best Samsung yet. Performance, display, camera — all top tier.",
     5, [("PERFORMANCE", "positive", 0.91), ("DISPLAY", "positive", 0.93), ("CAMERA", "positive", 0.94)]),
    ("Love everything about this phone. Battery, camera, build quality — all great.",
     5, [("BATTERY_LIFE", "positive", 0.89), ("CAMERA", "positive", 0.93), ("BUILD_QUALITY", "positive", 0.90)]),
    ("Phone runs cool, battery lasts long, software is snappy. Highly recommend.",
     5, [("HEATING", "positive", 0.87), ("BATTERY_LIFE", "positive", 0.91), ("SOFTWARE_UX", "positive", 0.88)]),
    ("Smooth performance, gorgeous display, great software experience.",
     5, [("PERFORMANCE", "positive", 0.90), ("DISPLAY", "positive", 0.92), ("SOFTWARE_UX", "positive", 0.86)]),

    # ── Mixed reviews (some good, some bad — realistic) ──
    ("Camera is amazing but battery life is terrible. Drains too fast.",
     3, [("CAMERA", "positive", 0.93), ("BATTERY_LIFE", "negative", 0.88)]),
    ("Great display but phone overheats during long video sessions.",
     3, [("DISPLAY", "positive", 0.90), ("HEATING", "negative", 0.86)]),
    ("Build quality is premium but software needs a lot of work.",
     3, [("BUILD_QUALITY", "positive", 0.88), ("SOFTWARE_UX", "negative", 0.84)]),
    ("Camera and display are stellar but battery and heating are serious issues.",
     3, [("CAMERA", "positive", 0.91), ("DISPLAY", "positive", 0.89), ("BATTERY_LIFE", "negative", 0.87), ("HEATING", "negative", 0.85)]),
    ("Performance is fine but battery dies too quick. Software drains in background.",
     3, [("PERFORMANCE", "positive", 0.84), ("BATTERY_LIFE", "negative", 0.86), ("SOFTWARE_UX", "negative", 0.82)]),

    # ── PRICE_VALUE reviews ──
    ("Overpriced for a phone that overheats and has poor battery life.",
     1, [("PRICE_VALUE", "negative", 0.88), ("HEATING", "negative", 0.85), ("BATTERY_LIFE", "negative", 0.86)]),
    ("Not worth the flagship price. Too many thermal issues.",
     2, [("PRICE_VALUE", "negative", 0.85), ("HEATING", "negative", 0.83)]),
    ("Good value if you care about camera. Battery is the compromise.",
     3, [("PRICE_VALUE", "positive", 0.82), ("CAMERA", "positive", 0.90), ("BATTERY_LIFE", "negative", 0.84)]),
    ("Decent phone for the price but heating is a deal breaker.",
     3, [("PRICE_VALUE", "neutral", 0.78), ("HEATING", "negative", 0.87)]),

    # ── PRICE_VALUE negative ALONE (no heating) — breaks spurious price→heating link ──
    ("Way too expensive for a mid-range experience. Not worth the premium.",
     2, [("PRICE_VALUE", "negative", 0.90)]),
    ("Samsung is charging flagship prices for incremental upgrades. Disappointing.",
     2, [("PRICE_VALUE", "negative", 0.87)]),
    ("Competitors offer better specs at half the price. Bad value.",
     2, [("PRICE_VALUE", "negative", 0.86)]),
    ("Price is ridiculous. You're paying for the brand, not the phone.",
     1, [("PRICE_VALUE", "negative", 0.91)]),
    ("I expected more for $900. Not worth upgrading from last year's model.",
     2, [("PRICE_VALUE", "negative", 0.84)]),
    ("Overpriced compared to Pixel and iPhone. Features don't justify the cost.",
     2, [("PRICE_VALUE", "negative", 0.88)]),
    ("Price keeps going up but the experience stays the same. Losing trust.",
     2, [("PRICE_VALUE", "negative", 0.85)]),
    ("Would be a great phone at $600 but at $900 it's a hard sell.",
     3, [("PRICE_VALUE", "negative", 0.82)]),

    # ── BUILD_QUALITY negative alone ──
    ("Glass back cracked on the first drop. Fragile build for this price.",
     1, [("BUILD_QUALITY", "negative", 0.89)]),
    ("Phone feels slippery without a case. Build doesn't inspire confidence.",
     3, [("BUILD_QUALITY", "negative", 0.81)]),

    # ── DISPLAY negative alone ──
    ("Screen has noticeable green tint at low brightness. Disappointing for AMOLED.",
     2, [("DISPLAY", "negative", 0.84)]),
    ("Display scratches easily even with careful use. Expected better.",
     3, [("DISPLAY", "negative", 0.80)]),

    # ── More HEATING→BATTERY causal pairs to strengthen the real signal ──
    ("Phone is a furnace. Battery tanks every time it heats up. Clearly related.",
     2, [("HEATING", "negative", 0.93), ("BATTERY_LIFE", "negative", 0.91)]),
    ("Thermal issues are destroying my battery life. Loses 1% per minute when hot.",
     1, [("HEATING", "negative", 0.94), ("BATTERY_LIFE", "negative", 0.92)]),
    ("The hotter it gets the faster battery drains. It's a vicious cycle.",
     2, [("HEATING", "negative", 0.90), ("BATTERY_LIFE", "negative", 0.89)]),
    ("Every time the phone overheats the battery nosedives. Has to be connected.",
     2, [("HEATING", "negative", 0.92), ("BATTERY_LIFE", "negative", 0.90)]),
]


def seed():
    db = SessionLocal()
    try:
        # Get Samsung S24 product
        product = db.execute(
            text("SELECT id, client_id FROM products WHERE sku = 'SAM-S24-2024'")
        ).fetchone()

        if not product:
            print('[ERROR] Product SAM-S24-2024 not found')
            return

        # Get or create dataset
        dataset = db.execute(
            text("SELECT id FROM datasets WHERE name = 'causal_seed_s24.csv' AND product_id = :pid"),
            {'pid': product.id}
        ).fetchone()

        if not dataset:
            dataset = db.execute(
                text("""INSERT INTO datasets (client_id, product_id, name, file_type, row_count)
                        VALUES (:cid, :pid, 'causal_seed_s24.csv', 'csv', :rc) RETURNING id"""),
                {'cid': product.client_id, 'pid': product.id, 'rc': len(MULTI_REVIEWS_S24) * 4}
            ).fetchone()
            db.commit()

        total_reviews = 0
        total_absa = 0

        # Insert each template 4 times with slight variation, spread across 6 months
        for repeat in range(4):
            for body, rating, aspects in MULTI_REVIEWS_S24:
                days_ago = random.randint(0, 180)
                review_date = now - timedelta(days=days_ago)
                varied_body = body + (f" [v{repeat}]" if repeat > 0 else "")
                external_id = hashlib.md5(varied_body.encode()).hexdigest()

                # Skip duplicates
                existing = db.execute(
                    text("SELECT id FROM reviews WHERE source = 'seed' AND external_id = :eid"),
                    {'eid': external_id}
                ).fetchone()
                if existing:
                    continue

                review = db.execute(
                    text("""INSERT INTO reviews
                            (product_id, dataset_id, source, external_id, rating, body,
                             review_date, is_processed, created_at)
                            VALUES (:pid, :did, 'seed', :eid, :rating, :body,
                                    :rdate, true, :created)
                            RETURNING id"""),
                    {'pid': product.id, 'did': dataset.id, 'eid': external_id,
                     'rating': rating, 'body': varied_body,
                     'rdate': review_date.date(), 'created': review_date}
                ).fetchone()
                db.commit()
                total_reviews += 1

                # Insert ALL aspects for this review (the key difference!)
                for aspect, sentiment, confidence in aspects:
                    db.execute(
                        text("""INSERT INTO absa_outputs
                                (review_id, product_id, dataset_id, aspect_term,
                                 aspect_category, sentiment, confidence, span_text, created_at)
                                VALUES (:rid, :pid, :did, :term, :cat, :sent, :conf, :span, :created)"""),
                        {'rid': review.id, 'pid': product.id, 'did': dataset.id,
                         'term': aspect.lower(), 'cat': aspect,
                         'sent': sentiment, 'conf': confidence,
                         'span': varied_body[:80], 'created': review_date}
                    )
                    total_absa += 1

                db.commit()

        print(f'[OK] Inserted {total_reviews} multi-aspect reviews, {total_absa} ABSA outputs')

        # Now re-run causal discovery
        print('\n[CAUSAL] Re-running causal discovery on product...')
        from services.causal.causal_engine import run_causal_analysis
        edges = run_causal_analysis(product.id, validate_with_llm=False)
        print(f'[CAUSAL] Discovered {len(edges)} causal edges:')
        for e in edges:
            print(f'   {e["from"]:20s} → {e["to"]:20s}  strength={e["strength"]:.2%}  ({e["method"]})')

        # Also re-run pattern detection so patterns stay consistent
        print('\n[PATTERNS] Re-running pattern detection...')
        from services.pattern_detection.patterns import run_pattern_detection
        ds_id = dataset.id
        run_pattern_detection(product.id, ds_id)

    except Exception as e:
        db.rollback()
        print(f'[ERROR] {e}')
        raise
    finally:
        db.close()

    print('\nDone! Refresh the browser to see causal graph and fix rankings.')


if __name__ == '__main__':
    seed()
