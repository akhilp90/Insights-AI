-- Causal edges discovered between product aspects
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
);

CREATE INDEX IF NOT EXISTS idx_causal_product ON causal_edges(product_id);
CREATE INDEX IF NOT EXISTS idx_causal_from    ON causal_edges(aspect_from);
CREATE INDEX IF NOT EXISTS idx_causal_to      ON causal_edges(aspect_to);
