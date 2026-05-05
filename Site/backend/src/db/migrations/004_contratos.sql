CREATE TABLE IF NOT EXISTS modelos_documento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_contrato   VARCHAR(30) NOT NULL CHECK (tipo_contrato IN ('arrendamento','compra_venda','comodato','permuta','aluguel','recibo','nota_promissoria')),
  nome            VARCHAR(255) NOT NULL,
  descricao       TEXT,
  arquivo_nome    VARCHAR(255),
  arquivo_conteudo TEXT,
  tags_detectadas JSONB,
  is_padrao       BOOLEAN DEFAULT FALSE,
  is_sistema      BOOLEAN DEFAULT FALSE,
  ativo           BOOLEAN DEFAULT TRUE,
  criado_por      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_modelos_empresa ON modelos_documento(empresa_id);
CREATE INDEX IF NOT EXISTS idx_modelos_tipo    ON modelos_documento(empresa_id, tipo_contrato) WHERE ativo = TRUE;

CREATE TABLE IF NOT EXISTS contratos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id        UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero            VARCHAR(30) NOT NULL,
  numero_sequencial INTEGER NOT NULL,
  tipo_contrato     VARCHAR(30) NOT NULL CHECK (tipo_contrato IN ('arrendamento','compra_venda','comodato','permuta','aluguel','recibo','nota_promissoria')),
  cliente_id        UUID REFERENCES clientes(id) ON DELETE SET NULL,
  imovel_id         UUID REFERENCES imoveis(id) ON DELETE SET NULL,
  modelo_id         UUID REFERENCES modelos_documento(id) ON DELETE SET NULL,
  parte1_nome       VARCHAR(255) NOT NULL,
  parte1_cpf_cnpj   VARCHAR(18),
  parte2_nome       VARCHAR(255),
  parte2_cpf_cnpj   VARCHAR(18),
  imovel_nome       VARCHAR(255),
  data_assinatura   DATE,
  data_inicio       DATE,
  data_termino      DATE,
  status            VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('rascunho','ativo','vencido','encerrado')),
  valor             DECIMAL(14,2),
  dados_formulario  JSONB NOT NULL DEFAULT '{}',
  criado_por        UUID REFERENCES usuarios(id),
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contratos_empresa ON contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_contratos_tipo    ON contratos(empresa_id, tipo_contrato);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status  ON contratos(empresa_id, status);
CREATE INDEX IF NOT EXISTS idx_contratos_venc    ON contratos(empresa_id, data_termino) WHERE data_termino IS NOT NULL AND status = 'ativo';

CREATE TABLE IF NOT EXISTS contratos_rascunhos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_contrato   VARCHAR(30) NOT NULL,
  dados           JSONB NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(usuario_id, tipo_contrato)
);
CREATE INDEX IF NOT EXISTS idx_rascunhos_usuario ON contratos_rascunhos(usuario_id);
