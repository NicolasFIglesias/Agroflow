-- Add grupo_recorrencia to group recurring tasks together
ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS grupo_recorrencia UUID;
CREATE INDEX IF NOT EXISTS idx_tarefas_grupo ON tarefas(grupo_recorrencia)
  WHERE grupo_recorrencia IS NOT NULL;
