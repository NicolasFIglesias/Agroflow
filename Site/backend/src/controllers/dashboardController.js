const db = require('../db');

// GET /api/dashboard
exports.index = async (req, res) => {
  try {
    const empresaId = req.usuario.empresa_id;

    const [
      kpisResult,
      alertasResult,
      clientesRecentesResult,
      proximasTarefasResult,
      atividadeRecenteResult,
    ] = await Promise.all([
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM clientes WHERE empresa_id=$1 AND ativo=true) AS total_clientes,
           (SELECT COUNT(*) FROM imoveis  WHERE empresa_id=$1 AND ativo=true) AS total_imoveis,
           (SELECT COUNT(*) FROM tarefas  WHERE empresa_id=$1 AND status NOT IN ('concluida','cancelada')) AS tarefas_ativas`,
        [empresaId]
      ),
      db.query(
        `SELECT id, denominacao, municipio, uf, situacao_ccir, vencimento_ccir, situacao_car
         FROM imoveis
         WHERE empresa_id=$1 AND ativo=true
           AND (
             situacao_ccir IN ('vencido','em_renovacao')
             OR situacao_car IN ('pendente_analise','cancelado','suspenso')
             OR (vencimento_ccir IS NOT NULL AND vencimento_ccir <= CURRENT_DATE + INTERVAL '90 days')
           )
         ORDER BY vencimento_ccir ASC NULLS LAST
         LIMIT 10`,
        [empresaId]
      ),
      db.query(
        `SELECT id, nome_completo, tipo_pessoa, municipio, uf, created_at
         FROM clientes
         WHERE empresa_id=$1 AND ativo=true
         ORDER BY created_at DESC
         LIMIT 5`,
        [empresaId]
      ),
      db.query(
        `SELECT id, titulo, data_inicio, hora, prioridade, status
         FROM tarefas
         WHERE empresa_id=$1
           AND status NOT IN ('concluida','cancelada')
           AND data_inicio >= CURRENT_DATE
         ORDER BY data_inicio ASC, hora ASC NULLS LAST
         LIMIT 5`,
        [empresaId]
      ),
      db.query(
        `SELECT tl.texto, tl.tipo, tl.created_at,
                c.nome_completo AS cliente_nome,
                u.nome AS usuario_nome
         FROM timeline tl
         JOIN clientes c ON c.id = tl.cliente_id
         LEFT JOIN usuarios u ON u.id = tl.criado_por
         WHERE tl.empresa_id=$1
         ORDER BY tl.created_at DESC
         LIMIT 8`,
        [empresaId]
      ),
    ]);

    res.json({
      kpis:              kpisResult.rows[0],
      alertas:           alertasResult.rows,
      clientes_recentes: clientesRecentesResult.rows,
      proximas_tarefas:  proximasTarefasResult.rows,
      atividade_recente: atividadeRecenteResult.rows,
    });
  } catch (err) {
    console.error('Erro ao carregar dashboard:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
