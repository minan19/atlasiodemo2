-- ==============================================================================
-- ATLASIO GLOBAL LANGUAGE HUB - ENTERPRISE DATABASE SCHEMA v2750
-- Hassasiyet: %0 Hata, Yüksek Performanslı İndeksleme, Kurumsal Veri Güvenliği
-- ==============================================================================

-- 1. KULLANICILAR VE ROLLER (Zırhlı Erişim Katmanı)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    role VARCHAR(50) NOT NULL CHECK (role IN ('yonetici', 'basegitmen', 'egitmen', 'ogrenci', 'veli')),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    language_level VARCHAR(10), -- Örn: 'A1', 'B2', 'C1'
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, ghost
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hızlı arama için indeksleme
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- 2. CANLI EĞİTİM OTURUMLARI VE SANAL ODALAR (WebRTC Senkronizasyonu)
CREATE TABLE live_sessions (
    id SERIAL PRIMARY KEY,
    instructor_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_code VARCHAR(50) NOT NULL UNIQUE, -- Örn: EN-B2-001
    language VARCHAR(50) NOT NULL,
    target_level VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'live', -- live, ended, scheduled
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE breakout_rooms (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    room_name VARCHAR(100) NOT NULL, -- Örn: "Oda 1 - Konuşma Pratiği"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. YAPAY ZEKA (AI) SORU BANKASI VE DOKÜMAN HAFIZASI
CREATE TABLE ai_question_bank (
    id SERIAL PRIMARY KEY,
    source_document VARCHAR(255), -- PDF'in referans adı
    target_level VARCHAR(10) NOT NULL, -- Örn: B2
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Şıklar JSON formatında güvenle saklanır
    correct_answer VARCHAR(5) NOT NULL, -- 'A', 'B', 'C', 'D'
    generated_by VARCHAR(50) DEFAULT 'ATLASIO_AI',
    is_verified BOOLEAN DEFAULT FALSE, -- Baş Eğitmen onayı
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_questions_level ON ai_question_bank(target_level);

-- 4. OTONOM SİSTEM LOGLARI (Self-Healing ve KPI Analizi İçin)
CREATE TABLE autonomous_logs (
    id SERIAL PRIMARY KEY,
    log_type VARCHAR(50) NOT NULL, -- 'security', 'optimization', 'error', 'ai_process'
    detail TEXT NOT NULL,
    resolved_autonomously BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. YOKLAMA VE AKADEMİK GELİŞİM (Heatmap Verileri İçin)
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INT NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    leave_time TIMESTAMP,
    total_xp_earned INT DEFAULT 0
);