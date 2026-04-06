CREATE TABLE IF NOT EXISTS sessions (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER REFERENCES users(id),
    token       VARCHAR(500) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user  ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
