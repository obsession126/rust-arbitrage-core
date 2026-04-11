CREATE TYPE lead_status AS ENUM ('new', 'processing', 'completed', 'failed');
CREATE TYPE lead_rank AS ENUM ('silver', 'gold', 'platinum', 'none');

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Основна інфа
    target_name TEXT NOT NULL,
    target_url TEXT UNIQUE NOT NULL,
    
    -- Статуси (Твій запит)
    status lead_status DEFAULT 'new' NOT NULL,
    rank lead_rank DEFAULT 'none' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    
    -- Дані та мета
    raw_data JSONB, -- Сюди воркер запише весь техстек, пікселі тощо
    error_log TEXT, -- Якщо воркер впаде, запишемо причину сюди
    
    -- Часові мітки
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    last_scanned_at TIMESTAMPTZ
);


CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Авторизація
    email TEXT UNIQUE,
    tg_id BIGINT UNIQUE,
    username TEXT NOT NULL,
    
    -- Гемблінг та прогрів
    spins_count INTEGER DEFAULT 0 NOT NULL,
    referral_code TEXT UNIQUE NOT NULL,
    referrer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Статус
    subscription_type TEXT DEFAULT 'free' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Індекси для швидкого пошуку
CREATE INDEX idx_users_tg_id ON users(tg_id);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- Тригер для автоматичного оновлення updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();


DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM ('new', 'processing', 'completed', 'failed');
    CREATE TYPE lead_rank AS ENUM ('silver', 'gold', 'platinum', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE leads ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE;