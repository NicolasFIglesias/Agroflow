CREATE TABLE IF NOT EXISTS empresa_preferencias (
  empresa_id         UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  logo_base64        TEXT,
  logo_mime          VARCHAR(50)  DEFAULT 'image/png',
  sidebar_order      JSONB        DEFAULT '["clientes","imoveis","contratos","calendario"]',
  sidebar_hidden     JSONB        DEFAULT '[]',
  cor_primaria       VARCHAR(7),
  mensagem_boas_vindas TEXT,
  updated_at         TIMESTAMP    DEFAULT NOW()
);
