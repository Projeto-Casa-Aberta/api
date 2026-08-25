-- ============================================================
-- CASA ABERTA SENAC
-- BANCO DE DADOS
-- PostgreSQL / Supabase
-- ============================================================

-- ============================================================
-- CASA ABERTA SENAC
-- BANCO DE DADOS
-- PostgreSQL / Supabase
-- ============================================================


-- ============================================================
-- 1. TABELA: EQUIPES
-- ============================================================

CREATE TABLE equipes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nome VARCHAR(100) NOT NULL,

    codigo_cor CHAR(6) NOT NULL,

    codigo_terminal_1 CHAR(2) NOT NULL,
    codigo_terminal_2 CHAR(2) NOT NULL,
    codigo_terminal_3 CHAR(2) NOT NULL,

    terminal_1_finalizado BOOLEAN NOT NULL DEFAULT FALSE,
    terminal_2_finalizado BOOLEAN NOT NULL DEFAULT FALSE,
    terminal_3_finalizado BOOLEAN NOT NULL DEFAULT FALSE,

    status VARCHAR(20) NOT NULL DEFAULT 'EM_ANDAMENTO',

    entrada_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalizada_em TIMESTAMPTZ,


    -- ========================================================
    -- VALIDAÇÕES
    -- ========================================================

    CONSTRAINT equipes_codigo_cor_hex_check
        CHECK (codigo_cor ~ '^[0-9A-Fa-f]{6}$'),

    CONSTRAINT equipes_codigo_terminal_1_hex_check
        CHECK (codigo_terminal_1 ~ '^[0-9A-Fa-f]{2}$'),

    CONSTRAINT equipes_codigo_terminal_2_hex_check
        CHECK (codigo_terminal_2 ~ '^[0-9A-Fa-f]{2}$'),

    CONSTRAINT equipes_codigo_terminal_3_hex_check
        CHECK (codigo_terminal_3 ~ '^[0-9A-Fa-f]{2}$'),

    CONSTRAINT equipes_status_check
        CHECK (
            status IN (
                'EM_ANDAMENTO',
                'FINALIZADO',
                'EXPIRADO'
            )
        )
);


-- ============================================================
-- 2. GARANTIR APENAS UMA EQUIPE EM ANDAMENTO
-- ============================================================

CREATE UNIQUE INDEX equipes_uma_em_andamento_idx
ON equipes (status)
WHERE status = 'EM_ANDAMENTO';


-- ============================================================
-- 3. TABELA: GENIUS COMPETITIVO
-- ============================================================

CREATE TABLE genius_competitivo (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    nome VARCHAR(100) NOT NULL,

    nivel_concluido INTEGER NOT NULL,

    cores_acertadas INTEGER NOT NULL,

    tempo INTEGER NOT NULL,

    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,


    -- ========================================================
    -- VALIDAÇÕES
    -- ========================================================

    CONSTRAINT genius_nivel_concluido_check
        CHECK (nivel_concluido >= 0),

    CONSTRAINT genius_cores_acertadas_check
        CHECK (cores_acertadas >= 0),

    CONSTRAINT genius_tempo_check
        CHECK (tempo > 0)
);