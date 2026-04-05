CREATE TABLE clients (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(50)  NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO clients (name, slug) VALUES ('Samsung', 'samsung');

CREATE TABLE products (
    id         SERIAL PRIMARY KEY,
    client_id  INTEGER REFERENCES clients(id),
    name       VARCHAR(200) NOT NULL,
    sku        VARCHAR(100) NOT NULL UNIQUE,
    category   VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO products (client_id, name, sku, category) VALUES
    (1, 'Samsung Galaxy S24',       'SAM-S24-2024',    'mobile'),
    (1, 'Samsung Galaxy S24 Ultra', 'SAM-S24U-2024',   'mobile'),
    (1, 'Samsung Galaxy A55',       'SAM-A55-2024',    'mobile'),
    (1, 'Samsung Galaxy Tab S9',    'SAM-TABS9-2024',  'tablet'),
    (1, 'Samsung Galaxy Watch 6',   'SAM-WATCH6-2024', 'wearable');

CREATE TABLE datasets (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER REFERENCES clients(id),
    product_id  INTEGER REFERENCES products(id),
    name        VARCHAR(200),
    file_type   VARCHAR(20),
    row_count   INTEGER,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reviews (
    id           SERIAL PRIMARY KEY,
    product_id   INTEGER REFERENCES products(id),
    dataset_id   INTEGER REFERENCES datasets(id),
    source       VARCHAR(50),
    external_id  VARCHAR(200),
    author       VARCHAR(200),
    rating       NUMERIC(2,1),
    title        TEXT,
    body         TEXT NOT NULL,
    review_date  DATE,
    raw_data     JSONB,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW(),
    UNIQUE(source, external_id)
);

CREATE INDEX idx_reviews_product   ON reviews(product_id);
CREATE INDEX idx_reviews_dataset   ON reviews(dataset_id);
CREATE INDEX idx_reviews_processed ON reviews(is_processed);
CREATE INDEX idx_reviews_source    ON reviews(source);
CREATE INDEX idx_reviews_date      ON reviews(review_date);

CREATE TABLE absa_outputs (
    id               SERIAL PRIMARY KEY,
    review_id        INTEGER REFERENCES reviews(id),
    product_id       INTEGER REFERENCES products(id),
    dataset_id       INTEGER REFERENCES datasets(id),
    aspect_term      VARCHAR(100),
    aspect_category  VARCHAR(100),
    sentiment        VARCHAR(20),
    confidence       NUMERIC(4,3),
    span_text        TEXT,
    created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_absa_product   ON absa_outputs(product_id);
CREATE INDEX idx_absa_category  ON absa_outputs(aspect_category);
CREATE INDEX idx_absa_sentiment ON absa_outputs(sentiment);

CREATE TABLE clusters (
    id                  SERIAL PRIMARY KEY,
    product_id          INTEGER REFERENCES products(id),
    dataset_id          INTEGER REFERENCES datasets(id),
    label               VARCHAR(200),
    review_count        INTEGER,
    representative_text TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE pattern_results (
    id            SERIAL PRIMARY KEY,
    product_id    INTEGER REFERENCES products(id),
    dataset_id    INTEGER REFERENCES datasets(id),
    aspect        VARCHAR(100),
    related_issue VARCHAR(100),
    pattern_type  VARCHAR(50),
    score         NUMERIC(5,4),
    computed_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pattern_product ON pattern_results(product_id);
CREATE INDEX idx_pattern_aspect  ON pattern_results(aspect);

CREATE TABLE aggregated_metrics (
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER REFERENCES products(id),
    aspect_category  VARCHAR(100),
    period           VARCHAR(20),
    avg_sentiment    NUMERIC(4,3),
    review_count     INTEGER,
    positive_count   INTEGER,
    negative_count   INTEGER,
    neutral_count    INTEGER,
    computed_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_metrics_product ON aggregated_metrics(product_id);
CREATE INDEX idx_metrics_period  ON aggregated_metrics(period);
