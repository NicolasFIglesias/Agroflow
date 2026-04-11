-- ============================================================
-- AgriFlow — Migração Inicial
-- Execute este script no banco PostgreSQL antes de subir a API
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: empresas
-- ============================================================
CREATE TABLE IF NOT EXISTS empresas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        VARCHAR(255) NOT NULL,
  cnpj        VARCHAR(18),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABELA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        VARCHAR(255) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  cargo       VARCHAR(100),
  role        VARCHAR(20) DEFAULT 'colaborador'
              CHECK (role IN ('admin', 'colaborador')),
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABELA: projetos
-- ============================================================
CREATE TABLE IF NOT EXISTS projetos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id  UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome        VARCHAR(255) NOT NULL,
  descricao   TEXT,
  cor         VARCHAR(7) NOT NULL DEFAULT '#639922',
  data_inicio DATE NOT NULL,
  data_fim    DATE,
  status      VARCHAR(20) DEFAULT 'ativo'
              CHECK (status IN ('ativo', 'concluido', 'cancelado', 'pausado')),
  criado_por  UUID NOT NULL REFERENCES usuarios(id),
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABELA: projeto_participantes
-- ============================================================
CREATE TABLE IF NOT EXISTS projeto_participantes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id   UUID NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  usuario_id   UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  adicionado_em TIMESTAMP DEFAULT NOW(),
  UNIQUE(projeto_id, usuario_id)
);

-- ============================================================
-- TABELA: tarefas
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefas (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  projeto_id    UUID REFERENCES projetos(id) ON DELETE CASCADE,
  titulo        VARCHAR(255) NOT NULL,
  descricao     TEXT,
  tipo          VARCHAR(10) NOT NULL DEFAULT 'equipe'
                CHECK (tipo IN ('pessoal', 'equipe')),
  data_inicio   DATE,
  data_fim      DATE,
  hora          TIME,
  dia_inteiro   BOOLEAN DEFAULT TRUE,
  atribuido_a   UUID NOT NULL REFERENCES usuarios(id),
  criado_por    UUID NOT NULL REFERENCES usuarios(id),
  delegado_por  UUID REFERENCES usuarios(id),
  ordem         INTEGER DEFAULT 0,
  status        VARCHAR(20) DEFAULT 'aguardando'
                CHECK (status IN ('aguardando', 'ativa', 'em_andamento', 'concluida', 'cancelada')),
  prioridade    VARCHAR(10) DEFAULT 'normal'
                CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente')),
  concluida_em  TIMESTAMP,
  concluida_por UUID REFERENCES usuarios(id),
  obs_conclusao TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TABELA: tarefa_historico
-- ============================================================
CREATE TABLE IF NOT EXISTS tarefa_historico (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id  UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  acao       VARCHAR(50) NOT NULL,
  descricao  TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_projetos_empresa   ON projetos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_projetos_status    ON projetos(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_part_projeto       ON projeto_participantes(projeto_id);
CREATE INDEX IF NOT EXISTS idx_part_usuario       ON projeto_participantes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_empresa    ON tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_projeto    ON tarefas(projeto_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_atribuido  ON tarefas(atribuido_a, data_inicio);
CREATE INDEX IF NOT EXISTS idx_tarefas_status     ON tarefas(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_historico_tarefa   ON tarefa_historico(tarefa_id);

-- ============================================================
-- DADOS DE TESTE (remova em produção)
-- ============================================================
-- Empresa de exemplo
INSERT INTO empresas (id, nome, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Escritório Rural Ltda', '12.345.678/0001-90')
ON CONFLICT DO NOTHING;

-- Admin padrão: admin@agriflow.com / senha: admin123
INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, cargo, role) VALUES
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Rafael Admin',
   'admin@agriflow.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Administrador',
   'admin')
ON CONFLICT DO NOTHING;

-- Colaboradores de exemplo
INSERT INTO usuarios (id, empresa_id, nome, email, senha_hash, cargo, role) VALUES
  ('00000000-0000-0000-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'Ana Souza',
   'ana@agriflow.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Aux. Administrativa',
   'colaborador'),
  ('00000000-0000-0000-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'João Santos',
   'joao@agriflow.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Topógrafo',
   'colaborador'),
  ('00000000-0000-0000-0000-000000000013',
   '00000000-0000-0000-0000-000000000001',
   'Maria Aparecida',
   'maria@agriflow.com',
   '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
   'Técnica Agrícola',
   'colaborador')
ON CONFLICT DO NOTHING;
-- Senha padrão de todos os usuários de teste: admin123
