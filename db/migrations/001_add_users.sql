CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    client_id     INTEGER REFERENCES clients(id),
    email         VARCHAR(200) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    role          VARCHAR(50) DEFAULT 'pm',
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_users_email  ON users(email);
