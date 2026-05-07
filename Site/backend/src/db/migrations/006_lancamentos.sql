CREATE TABLE IF NOT EXISTS lancamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id       UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('venda','despesa')),
  cliente_id       UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome     VARCHAR(255),
  colaborador_id   UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  colaborador_nome VARCHAR(255),
  produto          VARCHAR(255),
  valor            DECIMAL(14,2) NOT NULL,
  forma_pagamento  VARCHAR(50),
  observacao       TEXT,
  data_lancamento  DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_por       UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data    ON lancamentos(empresa_id, data_lancamento DESC);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo    ON lancamentos(empresa_id, tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_colab   ON lancamentos(colaborador_id);
