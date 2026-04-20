CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    tg_id BIGINT UNIQUE,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_free_lead_at TIMESTAMPTZ NULL,
    is_new BOOLEAN DEFAULT true
);

CREATE TYPE lead_rank AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE lead_status AS ENUM ('idle', 'processing', 'completed', 'failed');

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    rank lead_rank NOT NULL,
    target_url TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    status lead_status DEFAULT 'idle',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    amount INT NOT NULL,
    quantity BIGINT DEFAULT 1,
    order_id TEXT,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

DROP TABLE IF EXISTS leads;

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_name TEXT NOT NULL,       
    target_url TEXT NOT NULL UNIQUE, 
    category TEXT NOT NULL,
    rank lead_rank NOT NULL DEFAULT 'bronze',
    status TEXT DEFAULT 'new',
    raw_data JSONB,                 
    user_id UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


ALTER TYPE lead_rank ADD VALUE 'none';
ALTER TYPE lead_rank ADD VALUE 'local_star'; -- Бізнес без сайту, але з активністю

ALTER TABLE users ADD COLUMN password_hash TEXT;