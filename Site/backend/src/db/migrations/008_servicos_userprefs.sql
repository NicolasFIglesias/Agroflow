-- Catálogo de serviços/produtos da empresa
CREATE TABLE IF NOT EXISTS servicos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id   UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome         VARCHAR(255) NOT NULL,
  descricao    TEXT,
  preco_custo  DECIMAL(14,2),
  preco_venda  DECIMAL(14,2) NOT NULL,
  ativo        BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_servicos_empresa ON servicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_servicos_nome    ON servicos(empresa_id, nome);

-- Preferências individuais por usuário (sidebar order é pessoal)
CREATE TABLE IF NOT EXISTS usuario_preferencias (
  usuario_id     UUID PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  sidebar_order  JSONB,
  sidebar_hidden JSONB,
  updated_at     TIMESTAMP DEFAULT NOW()
);
