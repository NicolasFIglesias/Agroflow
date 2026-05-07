ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS data_vencimento   DATE;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS status_pagamento  VARCHAR(20) DEFAULT 'pendente' CHECK (status_pagamento IN ('pendente','pago'));
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS parcelas          INTEGER DEFAULT 1;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS status_venda      VARCHAR(20) DEFAULT 'finalizada' CHECK (status_venda IN ('em_execucao','finalizada'));
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS descricao_despesa TEXT;
ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS pago_para         VARCHAR(255);
