-- Projetos de Crédito Rural
CREATE TABLE IF NOT EXISTS projetos_credito (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id              UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero                  VARCHAR(20) NOT NULL,
  numero_sequencial       INTEGER NOT NULL DEFAULT 0,
  modalidade              VARCHAR(30) NOT NULL,
  programa                TEXT,
  banco                   VARCHAR(50) NOT NULL,
  agencia                 TEXT,
  gerente_banco           TEXT,
  tecnico_id              UUID REFERENCES usuarios(id),
  cliente_id              UUID REFERENCES clientes(id),
  conjuge_incluido        BOOLEAN DEFAULT false,
  imovel_id               UUID REFERENCES imoveis(id),
  area_financiada         NUMERIC(10,2),
  cultura                 TEXT,
  safra                   TEXT,
  produtividade_esperada  NUMERIC(10,2),
  preco_venda_estimado    NUMERIC(10,2),
  valor_solicitado        NUMERIC(12,2) NOT NULL,
  valor_aprovado          NUMERIC(12,2),
  valor_liberado          NUMERIC(12,2),
  percentual_comissao     NUMERIC(5,2) NOT NULL DEFAULT 3.0,
  valor_comissao          NUMERIC(12,2),
  status_comissao         VARCHAR(30) DEFAULT 'a_receber',
  data_recebimento_comissao DATE,
  forma_recebimento       VARCHAR(20),
  obs_financeiras         TEXT,
  etapa_atual             INTEGER NOT NULL DEFAULT 1,
  data_abertura           DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo_estimado          DATE,
  status                  VARCHAR(20) DEFAULT 'ativo',
  trt_numero              TEXT,
  trt_contrato_banco      TEXT,
  trt_data_assinatura     DATE,
  trt_valor_contrato      NUMERIC(12,2),
  trt_data_liberacao      DATE,
  trt_data_emissao        DATE,
  trt_prazo_meses         INTEGER,
  trt_data_vencimento     DATE,
  trt_obs                 TEXT,
  criado_por              UUID REFERENCES usuarios(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS etapas_projeto (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id    UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  etapa         INTEGER NOT NULL,
  status_etapa  VARCHAR(50),
  data_inicio   DATE,
  data_conclusao DATE,
  responsavel_id UUID REFERENCES usuarios(id),
  observacoes   TEXT,
  pendencias    TEXT,
  alterado_por  UUID REFERENCES usuarios(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS checklist_documentos_credito (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id  UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  observacao  TEXT,
  entregue    BOOLEAN DEFAULT false,
  data_entrega DATE,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  is_padrao   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patrimonio_terras (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id       UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  descricao        TEXT,
  imovel_id        UUID REFERENCES imoveis(id),
  area_ha          NUMERIC(10,2),
  situacao         VARCHAR(20),
  valor_estimado   NUMERIC(12,2),
  matricula        TEXT,
  tem_onus         BOOLEAN DEFAULT false,
  descricao_onus   TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patrimonio_maquinas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id       UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  descricao        TEXT NOT NULL,
  ano_fabricacao   INTEGER,
  marca_modelo     TEXT,
  quantidade       INTEGER DEFAULT 1,
  valor_estimado   NUMERIC(12,2),
  situacao         VARCHAR(20),
  saldo_devedor    NUMERIC(12,2),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patrimonio_rebanho (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id      UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  categoria       TEXT NOT NULL,
  raca            TEXT,
  quantidade      INTEGER,
  peso_medio      NUMERIC(8,2),
  valor_unitario  NUMERIC(10,2),
  valor_total     NUMERIC(12,2),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patrimonio_benfeitorias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id          UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  descricao           TEXT NOT NULL,
  area_capacidade     TEXT,
  ano_construcao      INTEGER,
  estado_conservacao  VARCHAR(20),
  valor_estimado      NUMERIC(12,2),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS servicos_extras_credito (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projeto_id           UUID NOT NULL REFERENCES projetos_credito(id) ON DELETE CASCADE,
  tipo                 VARCHAR(50),
  descricao            TEXT NOT NULL,
  valor                NUMERIC(10,2),
  data_realizacao      DATE,
  status_pagamento     VARCHAR(20) DEFAULT 'a_receber',
  data_recebimento     DATE,
  nota_fiscal_emitida  BOOLEAN DEFAULT false,
  numero_nf            TEXT,
  observacoes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
