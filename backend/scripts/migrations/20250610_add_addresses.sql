-- User addresses table
-- Each user can have multiple saved delivery addresses.

CREATE TABLE IF NOT EXISTS addresses (
    id           VARCHAR(36)  PRIMARY KEY,
    user_id      VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(255) NOT NULL,
    phone        VARCHAR(20)  NOT NULL,
    address      TEXT         NOT NULL,
    city         VARCHAR(100) NOT NULL,
    state        VARCHAR(100) NOT NULL,
    postal_code  VARCHAR(10)  NOT NULL,
    is_default   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON addresses(user_id);
