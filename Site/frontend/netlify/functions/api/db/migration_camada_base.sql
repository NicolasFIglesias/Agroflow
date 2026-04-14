-- ============================================================
-- AgriFlow — Camada Base: Clientes · Imóveis · Timeline · Cofre · Documentos
-- Executar no Neon (psql ou dashboard)
-- ============================================================

-- ── CLIENTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  tipo_pessoa           VARCHAR(2)  NOT NULL CHECK (tipo_pessoa IN ('PF','PJ')),
  nome_completo         VARCHAR(255) NOT NULL,
  nome_fantasia         VARCHAR(255),
  cpf                   VARCHAR(14),
  cnpj                  VARCHAR(18),
  rg                    VARCHAR(30),
  orgao_emissor         VARCHAR(20),
  data_nascimento       DATE,
  nacionalidade         VARCHAR(50) DEFAULT 'Brasileiro(a)',
  estado_civil          VARCHAR(20) CHECK (estado_civil IN ('solteiro','casado','divorciado','viuvo','uniao_estavel')),
  profissao             VARCHAR(100),
  dap_caf               VARCHAR(50),
  inscricao_estadual    VARCHAR(30),
  nirf                  VARCHAR(30),
  cep                   VARCHAR(9),
  logradouro            VARCHAR(255),
  numero                VARCHAR(20),
  complemento           VARCHAR(255),
  bairro                VARCHAR(255),
  municipio             VARCHAR(255),
  uf                    CHAR(2),
  endereco_rural        TEXT,
  caixa_postal          VARCHAR(20),
  celular               VARCHAR(20) NOT NULL,
  celular2              VARCHAR(20),
  telefone_fixo         VARCHAR(20),
  email                 VARCHAR(255),
  email2                VARCHAR(255),
  contato_referencia_nome     VARCHAR(255),
  contato_referencia_telefone VARCHAR(20),
  avatar_url            VARCHAR(500),
  ativo                 BOOLEAN DEFAULT TRUE,
  criado_por            UUID REFERENCES usuarios(id),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cpf  ON clientes(empresa_id, cpf)  WHERE cpf  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(empresa_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX        IF NOT EXISTS idx_clientes_nome    ON clientes(empresa_id, nome_completo);

-- ── CÔNJUGES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conjuges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      UUID NOT NULL UNIQUE REFERENCES clientes(id) ON DELETE CASCADE,
  nome_completo   VARCHAR(255) NOT NULL,
  cpf             VARCHAR(14),
  rg              VARCHAR(30),
  data_nascimento DATE,
  profissao       VARCHAR(100),
  telefone        VARCHAR(20),
  email           VARCHAR(255),
  regime_bens     VARCHAR(50) CHECK (regime_bens IN ('comunhao_parcial','comunhao_universal','separacao_total','participacao_aquestos')),
  dap_caf         VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ── CONTAS BANCÁRIAS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contas_bancarias (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id       UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  banco            VARCHAR(100) NOT NULL,
  agencia          VARCHAR(20)  NOT NULL,
  numero_conta     VARCHAR(30)  NOT NULL,
  tipo_conta       VARCHAR(30)  NOT NULL CHECK (tipo_conta IN ('corrente','poupanca','salario','investimento')),
  titular          VARCHAR(255),
  cpf_cnpj_titular VARCHAR(18),
  chave_pix        VARCHAR(255),
  tipo_chave_pix   VARCHAR(20) CHECK (tipo_chave_pix IN ('cpf_cnpj','telefone','email','aleatoria')),
  observacao       TEXT,
  created_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contas_cliente ON contas_bancarias(cliente_id);

-- ── IMÓVEIS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS imoveis (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  denominacao           VARCHAR(255) NOT NULL,
  municipio             VARCHAR(255) NOT NULL,
  uf                    CHAR(2) NOT NULL,
  area_total_ha         DECIMAL(12,4) NOT NULL,
  tipo_imovel           VARCHAR(30) CHECK (tipo_imovel IN ('fazenda','sitio','chacara','gleba','lote_rural','outro')),
  localizacao           TEXT,
  distrito              VARCHAR(255),
  altitude_m            DECIMAL(8,2),
  bioma                 VARCHAR(30) CHECK (bioma IN ('amazonia','cerrado','pantanal','mata_atlantica','caatinga','pampa')),
  atividade_principal   VARCHAR(30) CHECK (atividade_principal IN ('agricultura','pecuaria','mista','reflorestamento','outro')),
  matricula             VARCHAR(50),
  cartorio_registro     VARCHAR(255),
  livro_folha           VARCHAR(50),
  data_registro         DATE,
  nirf                  VARCHAR(30),
  situacao_matricula    VARCHAR(30) CHECK (situacao_matricula IN ('regular','com_onus','com_pendencia','em_regularizacao')),
  obs_matricula         TEXT,
  numero_ccir           VARCHAR(50),
  situacao_ccir         VARCHAR(20) CHECK (situacao_ccir IN ('em_dia','vencido','em_renovacao')),
  vencimento_ccir       DATE,
  numero_itr            VARCHAR(50),
  ano_exercicio_itr     INTEGER,
  data_pagamento_itr    DATE,
  situacao_itr          VARCHAR(20) CHECK (situacao_itr IN ('em_dia','pendente','isento')),
  inscricao_car         VARCHAR(100),
  situacao_car          VARCHAR(30) CHECK (situacao_car IN ('ativo','pendente_analise','cancelado','suspenso')),
  data_inscricao_car    DATE,
  modulos_fiscais       DECIMAL(6,2),
  fracao_minima         DECIMAL(10,4),
  confrontante_norte    VARCHAR(255),
  confrontante_sul      VARCHAR(255),
  confrontante_leste    VARCHAR(255),
  confrontante_oeste    VARCHAR(255),
  obs_confrontantes     TEXT,
  latitude              DECIMAL(10,7),
  longitude             DECIMAL(10,7),
  datum                 VARCHAR(20) DEFAULT 'SIRGAS 2000',
  codigo_sncr           VARCHAR(50),
  link_google_maps      VARCHAR(500),
  ativo                 BOOLEAN DEFAULT TRUE,
  criado_por            UUID REFERENCES usuarios(id),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_imoveis_empresa   ON imoveis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_municipio ON imoveis(empresa_id, municipio);

-- ── VÍNCULO CLIENTE ↔ IMÓVEL ──────────────────────────────────
CREATE TABLE IF NOT EXISTS cliente_imovel (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id               UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  imovel_id                UUID NOT NULL REFERENCES imoveis(id)  ON DELETE CASCADE,
  percentual_participacao  DECIMAL(5,2) DEFAULT 100.00,
  tipo_vinculo             VARCHAR(30) DEFAULT 'proprietario'
    CHECK (tipo_vinculo IN ('proprietario','posseiro','arrendatario','comodatario','outro')),
  UNIQUE(cliente_id, imovel_id)
);
CREATE INDEX IF NOT EXISTS idx_ci_cliente ON cliente_imovel(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ci_imovel  ON cliente_imovel(imovel_id);

-- ── TIMELINE (IMUTÁVEL) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  cliente_id      UUID NOT NULL REFERENCES clientes(id)  ON DELETE CASCADE,
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('manual','automatica','anexo','lembrete')),
  texto           TEXT NOT NULL,
  arquivo_url     VARCHAR(500),
  arquivo_nome    VARCHAR(255),
  arquivo_tamanho BIGINT,
  data_lembrete   TIMESTAMP,
  criado_por      UUID REFERENCES usuarios(id),
  is_sistema      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMP DEFAULT NOW()
  -- SEM updated_at, SEM DELETE — tabela imutável
);
CREATE INDEX IF NOT EXISTS idx_timeline_cliente   ON timeline(cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_empresa   ON timeline(empresa_id);
CREATE INDEX IF NOT EXISTS idx_timeline_lembretes ON timeline(empresa_id, data_lembrete)
  WHERE tipo = 'lembrete' AND data_lembrete IS NOT NULL;

-- ── COFRE DE SENHAS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cofre_senhas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id            UUID NOT NULL REFERENCES empresas(id)  ON DELETE CASCADE,
  cliente_id            UUID NOT NULL REFERENCES clientes(id)  ON DELETE CASCADE,
  sistema               VARCHAR(100) NOT NULL,
  login                 VARCHAR(255) NOT NULL,
  senha_criptografada   TEXT NOT NULL,
  iv                    TEXT NOT NULL,
  tag                   TEXT NOT NULL,
  url                   VARCHAR(500),
  observacao            TEXT,
  criado_por            UUID NOT NULL REFERENCES usuarios(id),
  atualizado_por        UUID REFERENCES usuarios(id),
  atualizado_em         TIMESTAMP DEFAULT NOW(),
  created_at            TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cofre_empresa  ON cofre_senhas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_cofre_cliente  ON cofre_senhas(cliente_id);

-- ── COFRE LOGS (IMUTÁVEL) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS cofre_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cofre_id    UUID NOT NULL REFERENCES cofre_senhas(id) ON DELETE CASCADE,
  usuario_id  UUID NOT NULL REFERENCES usuarios(id),
  acao        VARCHAR(30) NOT NULL CHECK (acao IN ('visualizou','copiou','editou','criou')),
  ip          VARCHAR(45),
  user_agent  VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cofre_logs ON cofre_logs(cofre_id);

-- ── DOCUMENTOS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id      UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  entidade_tipo   VARCHAR(10) NOT NULL CHECK (entidade_tipo IN ('cliente','imovel')),
  entidade_id     UUID NOT NULL,
  tipo_documento  VARCHAR(100) NOT NULL,
  nome_arquivo    VARCHAR(255) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  tamanho_bytes   BIGINT,
  mime_type       VARCHAR(100),
  criado_por      UUID REFERENCES usuarios(id),
  created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_docs_entidade ON documentos(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_docs_empresa  ON documentos(empresa_id);
