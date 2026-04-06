"""
Seed realistic reviews + absa_outputs across 6 months for all Samsung products.
Run from the project root:
    python db/seed_reviews.py
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

# ── Review templates per product ─────────────────────────────────────────────

REVIEWS = {
    'SAM-S24-2024': [
        # battery negative
        ("Battery life is really disappointing. It barely lasts a full day with moderate use.", 2, "BATTERY_LIFE", "negative", 0.91),
        ("The phone heats up a lot and the battery drains super fast when gaming.", 2, "BATTERY_LIFE", "negative", 0.88),
        ("Charged it overnight and by 3pm it's already at 20%. Unacceptable.", 2, "BATTERY_LIFE", "negative", 0.85),
        ("Battery drain is terrible. Worse than my old S22.", 2, "BATTERY_LIFE", "negative", 0.87),
        ("Need to charge twice a day. Battery is the biggest weakness.", 3, "BATTERY_LIFE", "negative", 0.84),
        # camera positive
        ("Camera is absolutely stunning. Best photos I've taken on a phone.", 5, "CAMERA", "positive", 0.95),
        ("The night mode is incredible. Clear shots even in low light.", 5, "CAMERA", "positive", 0.93),
        ("Photo quality is exceptional, especially portrait mode.", 5, "CAMERA", "positive", 0.92),
        ("Videos look cinematic. Camera is the best feature of this phone.", 5, "CAMERA", "positive", 0.90),
        ("Zoom quality is outstanding for a non-ultra model.", 4, "CAMERA", "positive", 0.89),
        # heating negative
        ("Phone gets super hot during gaming sessions. Thermal throttling is noticeable.", 2, "HEATING", "negative", 0.90),
        ("Overheats when using navigation and camera simultaneously.", 2, "HEATING", "negative", 0.88),
        ("Heat is a real issue. Can't hold it comfortably after extended use.", 3, "HEATING", "negative", 0.86),
        ("Overheating causes the camera to shut down sometimes.", 2, "HEATING", "negative", 0.89),
        # display positive
        ("Display is gorgeous. Colours are vivid and the refresh rate is smooth.", 5, "DISPLAY", "positive", 0.94),
        ("Brightness outdoors is fantastic. No issues reading in sunlight.", 5, "DISPLAY", "positive", 0.91),
        ("The adaptive refresh rate is silky smooth for scrolling.", 4, "DISPLAY", "positive", 0.88),
        # performance mixed
        ("Performance is great for daily tasks but stutters under heavy load.", 3, "PERFORMANCE", "neutral", 0.80),
        ("Apps open instantly. Performance is top notch.", 5, "PERFORMANCE", "positive", 0.87),
        ("Some lag noticed after the latest software update.", 3, "PERFORMANCE", "negative", 0.83),
        # software
        ("One UI feels bloated with too many pre-installed apps.", 3, "SOFTWARE_UX", "negative", 0.82),
        ("Software updates are timely and fix bugs quickly.", 4, "SOFTWARE_UX", "positive", 0.85),
        # build
        ("Build quality feels premium. Glass back looks sleek.", 5, "BUILD_QUALITY", "positive", 0.90),
        ("Feels solid in hand. Great build for the price.", 4, "BUILD_QUALITY", "positive", 0.87),
        # price
        ("Overpriced for what you get compared to competitors.", 2, "PRICE_VALUE", "negative", 0.83),
        ("Good value if you catch it on sale.", 4, "PRICE_VALUE", "positive", 0.80),
    ],
    'SAM-S24U-2024': [
        ("S-Pen is a game changer for note-taking and productivity.", 5, "SOFTWARE_UX", "positive", 0.93),
        ("Camera zoom is unreal. 200x zoom works better than expected.", 5, "CAMERA", "positive", 0.95),
        ("Battery lasts two full days. Impressive for a powerful phone.", 5, "BATTERY_LIFE", "positive", 0.92),
        ("Overheats quickly when using the camera for extended shoots.", 2, "HEATING", "negative", 0.89),
        ("Display is the best I've ever seen on a phone. Colors are perfect.", 5, "DISPLAY", "positive", 0.96),
        ("Very expensive but worth every penny for power users.", 4, "PRICE_VALUE", "positive", 0.84),
        ("Performance is flawless. No stutter or lag at all.", 5, "PERFORMANCE", "positive", 0.91),
        ("Build feels ultra premium. Titanium frame is a nice touch.", 5, "BUILD_QUALITY", "positive", 0.92),
        ("Camera AI features are gimmicky and get old fast.", 3, "CAMERA", "negative", 0.81),
        ("S-Pen latency is slightly noticeable but usable.", 3, "SOFTWARE_UX", "neutral", 0.78),
        ("Battery drains faster than expected under heavy gaming.", 3, "BATTERY_LIFE", "negative", 0.85),
        ("Night mode photos are slightly over-processed.", 3, "CAMERA", "neutral", 0.79),
        ("The phone gets warm but not uncomfortably hot.", 3, "HEATING", "neutral", 0.76),
        ("Price is hard to justify when competitors offer similar specs.", 2, "PRICE_VALUE", "negative", 0.82),
        ("Software experience is polished and intuitive.", 4, "SOFTWARE_UX", "positive", 0.87),
    ],
    'SAM-A55-2024': [
        ("Best budget phone I've used. Great value for the price.", 5, "PRICE_VALUE", "positive", 0.94),
        ("Camera is surprisingly good for a mid-range phone.", 4, "CAMERA", "positive", 0.88),
        ("Battery life is excellent. Easily lasts two days.", 5, "BATTERY_LIFE", "positive", 0.92),
        ("Display is bright and colorful. Very impressed.", 4, "DISPLAY", "positive", 0.87),
        ("Performance is good for everyday use but struggles with heavy games.", 3, "PERFORMANCE", "neutral", 0.80),
        ("Build quality feels solid for the price point.", 4, "BUILD_QUALITY", "positive", 0.86),
        ("Software has too many ads in Samsung apps.", 2, "SOFTWARE_UX", "negative", 0.83),
        ("Phone gets warm but doesn't overheat.", 3, "HEATING", "neutral", 0.75),
        ("Camera low light performance is poor.", 2, "CAMERA", "negative", 0.85),
        ("Storage fills up fast, limited internal options.", 3, "SOFTWARE_UX", "negative", 0.79),
        ("Excellent daily driver for non-gamers.", 4, "PERFORMANCE", "positive", 0.84),
        ("Price is unbeatable for these specs.", 5, "PRICE_VALUE", "positive", 0.93),
    ],
    'SAM-TABS9-2024': [
        ("Perfect tablet for productivity and creativity.", 5, "PERFORMANCE", "positive", 0.93),
        ("DeX mode is great for laptop-like experience.", 5, "SOFTWARE_UX", "positive", 0.91),
        ("Display is stunning. AMOLED panel on a tablet is a treat.", 5, "DISPLAY", "positive", 0.95),
        ("Battery life could be better for such a large device.", 3, "BATTERY_LIFE", "negative", 0.84),
        ("Gets warm during video calls and heavy usage.", 3, "HEATING", "negative", 0.82),
        ("Very expensive compared to iPad. Hard to justify.", 2, "PRICE_VALUE", "negative", 0.86),
        ("Build quality is exceptional. Feels premium.", 5, "BUILD_QUALITY", "positive", 0.90),
        ("S-Pen included is a big plus for artists.", 5, "SOFTWARE_UX", "positive", 0.89),
        ("Performance is desktop-class. Apps run flawlessly.", 5, "PERFORMANCE", "positive", 0.94),
        ("Camera quality is not great for a flagship tablet.", 3, "CAMERA", "negative", 0.80),
        ("Display brightness outdoors is just adequate.", 3, "DISPLAY", "neutral", 0.77),
        ("Excellent for watching movies and shows.", 5, "DISPLAY", "positive", 0.91),
    ],
    'SAM-WATCH6-2024': [
        ("Sleep tracking is very accurate. Love the insights.", 5, "HEALTH_TRACKING", "positive", 0.93),
        ("Battery lasts about 2 days which is fine for a smartwatch.", 4, "BATTERY_LIFE", "positive", 0.88),
        ("The strap is comfortable even during workouts.", 5, "WEARABLE_COMFORT", "positive", 0.91),
        ("Heart rate monitoring is reliable and consistent.", 5, "HEALTH_TRACKING", "positive", 0.92),
        ("Fitness tracking is comprehensive. Tracks all my activities.", 5, "HEALTH_TRACKING", "positive", 0.94),
        ("The strap irritates skin after extended wear.", 2, "WEARABLE_COMFORT", "negative", 0.85),
        ("Battery life is poor. Barely makes it through the day.", 2, "BATTERY_LIFE", "negative", 0.87),
        ("Display is sharp and always-on mode works great.", 4, "DISPLAY", "positive", 0.86),
        ("GPS accuracy is excellent for outdoor runs.", 5, "HEALTH_TRACKING", "positive", 0.90),
        ("Software is smooth but lacks third-party apps.", 3, "SOFTWARE_UX", "neutral", 0.78),
        ("Build feels durable and premium.", 4, "BUILD_QUALITY", "positive", 0.87),
        ("Overheats slightly during GPS-intensive workouts.", 3, "HEATING", "negative", 0.82),
        ("Health data syncs seamlessly with Samsung Health.", 5, "HEALTH_TRACKING", "positive", 0.91),
        ("Strap buckle broke after 2 months of use.", 1, "WEARABLE_COMFORT", "negative", 0.89),
    ],
}

SOURCES = ['amazon', 'flipkart', 'reddit', 'upload']

def seed():
    db = SessionLocal()
    try:
        # Get all Samsung products
        products = db.execute(
            text("SELECT id, sku, client_id FROM products WHERE client_id = (SELECT id FROM clients WHERE slug = 'samsung')")
        ).fetchall()

        product_map = {p.sku: p for p in products}

        # We'll spread reviews across 6 months: from 6 months ago to now
        now = datetime.now()
        months_back = 6

        total_inserted = 0
        total_absa = 0

        for sku, review_templates in REVIEWS.items():
            product = product_map.get(sku)
            if not product:
                print(f"[SKIP] Product not found: {sku}")
                continue

            # Create one dataset per SKU for seed data
            dataset = db.execute(
                text("""INSERT INTO datasets (client_id, product_id, name, file_type, row_count)
                        VALUES (:cid, :pid, :name, 'csv', :rc) RETURNING id"""),
                {'cid': product.client_id, 'pid': product.id,
                 'name': f'seed_data_{sku}.csv', 'rc': len(review_templates) * months_back}
            ).fetchone()
            db.commit()

            # Insert each review N times spread across different months
            repeats = max(1, 60 // len(review_templates))  # aim for ~60 reviews per SKU

            for repeat in range(repeats):
                for body, rating, aspect, sentiment, confidence in review_templates:
                    # Spread across the last 6 months with some randomness
                    days_ago = random.randint(0, months_back * 30)
                    review_date = now - timedelta(days=days_ago)
                    # Add small variation to body so dedup doesn't block it
                    varied_body = body + (f" (ref:{repeat})" if repeat > 0 else "")
                    external_id = hashlib.md5(varied_body.encode()).hexdigest()

                    # Skip if duplicate
                    existing = db.execute(
                        text("SELECT id FROM reviews WHERE source = 'seed' AND external_id = :eid"),
                        {'eid': external_id}
                    ).fetchone()
                    if existing:
                        continue

                    source = random.choice(SOURCES)
                    review = db.execute(
                        text("""INSERT INTO reviews
                                (product_id, dataset_id, source, external_id, rating, body, review_date, is_processed, created_at)
                                VALUES (:pid, :did, 'seed', :eid, :rating, :body, :rdate, true, :created)
                                RETURNING id"""),
                        {'pid': product.id, 'did': dataset.id, 'eid': external_id,
                         'rating': rating, 'body': varied_body,
                         'rdate': review_date.date(), 'created': review_date}
                    ).fetchone()
                    db.commit()
                    total_inserted += 1

                    # Insert absa_output directly
                    db.execute(
                        text("""INSERT INTO absa_outputs
                                (review_id, product_id, dataset_id, aspect_term, aspect_category, sentiment, confidence, span_text, created_at)
                                VALUES (:rid, :pid, :did, :term, :cat, :sent, :conf, :span, :created)"""),
                        {'rid': review.id, 'pid': product.id, 'did': dataset.id,
                         'term': aspect.lower(), 'cat': aspect,
                         'sent': sentiment, 'conf': confidence,
                         'span': varied_body[:80], 'created': review_date}
                    )
                    db.commit()
                    total_absa += 1

            print(f"[OK] {sku}: reviews inserted so far → {total_inserted}")

        print(f"\n✓ Done. Total reviews: {total_inserted}, ABSA outputs: {total_absa}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    seed()
