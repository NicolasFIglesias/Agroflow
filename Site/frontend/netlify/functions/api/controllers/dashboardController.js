const db = require('../db');

// GET /api/dashboard/kpis
exports.kpis = async (req, res) => {
  try {
    const eId = req.usuario.empresa_id;

    const [
      { rows: [clientes] },
      { rows: [imoveis] },
      { rows: [tarefas] },
      { rows: [colaboradores] },
    ] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM clientes WHERE empresa_id=$1 AND ativo=true`, [eId]),
      db.query(`SELECT COUNT(*) FROM imoveis  WHERE empresa_id=$1 AND ativo=true`, [eId]),
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status != 'concluida') AS abertas,
           COUNT(*) FILTER (WHERE status = 'concluida')  AS concluidas,
           COUNT(*) FILTER (WHERE status != 'concluida' AND data_inicio < CURRENT_DATE) AS atrasadas
         FROM tarefas WHERE empresa_id=$1`,
        [eId]
      ),
      db.query(`SELECT COUNT(*) FROM usuarios WHERE empresa_id=$1 AND ativo=true`, [eId]),
    ]);

    res.json({
      clientes:     parseInt(clientes.count),
      imoveis:      parseInt(imoveis.count),
      tarefas_abertas:    parseInt(tarefas.abertas),
      tarefas_concluidas: parseInt(tarefas.concluidas),
      tarefas_atrasadas:  parseInt(tarefas.atrasadas),
      colaboradores: parseInt(colaboradores.count),
    });
  } catch (err) {
    console.error('Erro ao buscar KPIs:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/dashboard/alertas
exports.alertas = async (req, res) => {
  try {
    const eId = req.usuario.empresa_id;
    const alertas = [];

    // CCIR vencido ou vencendo em 30 dias
    const { rows: ccir } = await db.query(
      `SELECT id, denominacao, municipio, uf, vencimento_ccir, situacao_ccir
       FROM imoveis
       WHERE empresa_id=$1 AND ativo=true
         AND vencimento_ccir IS NOT NULL
         AND vencimento_ccir <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY vencimento_ccir`,
      [eId]
    );
    ccir.forEach(i => alertas.push({
      tipo: 'ccir',
      nivel: i.vencimento_ccir < new Date() ? 'critico' : 'aviso',
      titulo: `CCIR vencendo — ${i.denominacao}`,
      descricao: `${i.municipio}/${i.uf} · vence ${new Date(i.vencimento_ccir).toLocaleDateString('pt-BR')}`,
      link: `/pages/imovel-ficha.html?id=${i.id}`,
    }));

    // Lembretes da timeline vencidos ou vencendo hoje
    const { rows: lembretes } = await db.query(
      `SELECT t.id, t.texto, t.data_lembrete, c.nome_completo, c.id AS cliente_id
       FROM timeline t
       JOIN clientes c ON c.id = t.cliente_id
       WHERE t.empresa_id=$1
         AND t.tipo = 'lembrete'
         AND t.data_lembrete IS NOT NULL
         AND t.data_lembrete <= NOW() + INTERVAL '1 day'
       ORDER BY t.data_lembrete
       LIMIT 10`,
      [eId]
    );
    lembretes.forEach(l => alertas.push({
      tipo: 'lembrete',
      nivel: new Date(l.data_lembrete) < new Date() ? 'critico' : 'aviso',
      titulo: `Lembrete: ${l.nome_completo}`,
      descricao: l.texto,
      link: `/pages/cliente-ficha.html?id=${l.cliente_id}&tab=timeline`,
    }));

    // Tarefas atrasadas (top 5)
    const { rows: atrasadas } = await db.query(
      `SELECT t.id, t.titulo, t.data_inicio, p.nome AS projeto_nome
       FROM tarefas t
       LEFT JOIN projetos p ON p.id = t.projeto_id
       WHERE t.empresa_id=$1
         AND t.status != 'concluida'
         AND t.data_inicio < CURRENT_DATE
       ORDER BY t.data_inicio
       LIMIT 5`,
      [eId]
    );
    atrasadas.forEach(t => alertas.push({
      tipo: 'tarefa',
      nivel: 'aviso',
      titulo: `Tarefa atrasada: ${t.titulo}`,
      descricao: t.projeto_nome ? `Projeto: ${t.projeto_nome}` : 'Sem projeto',
      link: `/pages/calendario.html`,
    }));

    res.json(alertas);
  } catch (err) {
    console.error('Erro ao buscar alertas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/dashboard/atividade
exports.atividade = async (req, res) => {
  try {
    const eId = req.usuario.empresa_id;

    // Últimas 20 entradas automáticas da timeline (atividade do sistema)
    const { rows } = await db.query(
      `SELECT t.id, t.texto, t.created_at, t.tipo,
         c.id AS cliente_id, c.nome_completo AS cliente_nome,
         u.nome AS usuario_nome
       FROM timeline t
       JOIN clientes c ON c.id = t.cliente_id
       LEFT JOIN usuarios u ON u.id = t.criado_por
       WHERE t.empresa_id=$1 AND t.is_sistema = true
       ORDER BY t.created_at DESC
       LIMIT 20`,
      [eId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar atividade:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
