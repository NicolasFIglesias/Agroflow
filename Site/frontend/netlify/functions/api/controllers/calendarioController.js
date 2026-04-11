const db = require('../db');

// GET /api/calendario?mes=4&ano=2026&usuario_id=...
exports.obter = async (req, res) => {
  try {
    const { mes, ano, usuario_id } = req.query;

    const m = parseInt(mes) || new Date().getMonth() + 1;
    const a = parseInt(ano)  || new Date().getFullYear();

    // Primeiro e último dia do mês
    const dataInicio = `${a}-${String(m).padStart(2,'0')}-01`;
    const dataFim    = new Date(a, m, 0).toISOString().slice(0, 10); // último dia do mês

    // Colaborador só vê suas próprias tarefas
    const filtroUsuario = req.usuario.role !== 'admin'
      ? req.usuario.id
      : (usuario_id || null);

    let tarefasQuery = `
      SELECT
        t.id, t.titulo, t.data_inicio, t.data_fim, t.hora, t.dia_inteiro,
        t.status, t.prioridade, t.tipo, t.projeto_id,
        a.id AS atribuido_id, a.nome AS atribuido_nome,
        p.id AS projeto_id, p.nome AS projeto_nome, p.cor AS projeto_cor
      FROM tarefas t
      JOIN usuarios a ON a.id = t.atribuido_a
      LEFT JOIN projetos p ON p.id = t.projeto_id
      WHERE t.empresa_id = $1
        AND t.status NOT IN ('cancelada')
        AND t.data_inicio IS NOT NULL
        AND t.data_inicio BETWEEN $2 AND $3
    `;
    const vals = [req.usuario.empresa_id, dataInicio, dataFim];
    let idx = 4;

    if (filtroUsuario) {
      tarefasQuery += ` AND t.atribuido_a = $${idx++}`;
      vals.push(filtroUsuario);
    }
    tarefasQuery += ` ORDER BY t.data_inicio, t.hora NULLS LAST`;

    const { rows: tarefas } = await db.query(tarefasQuery, vals);

    // Projetos ativos com progresso
    let projetosQuery = `
      SELECT
        p.id, p.nome, p.cor, p.data_fim, p.status,
        COUNT(DISTINCT t.id) AS tarefas_total,
        COUNT(DISTINCT CASE WHEN t.status = 'concluida' THEN t.id END) AS tarefas_concluidas
      FROM projetos p
      LEFT JOIN tarefas t ON t.projeto_id = p.id
      WHERE p.empresa_id = $1 AND p.status = 'ativo'
    `;
    const pVals = [req.usuario.empresa_id];
    let pIdx = 2;

    if (req.usuario.role !== 'admin') {
      projetosQuery += ` AND EXISTS (
        SELECT 1 FROM projeto_participantes pp
        WHERE pp.projeto_id = p.id AND pp.usuario_id = $${pIdx++}
      )`;
      pVals.push(req.usuario.id);
    } else if (filtroUsuario) {
      projetosQuery += ` AND EXISTS (
        SELECT 1 FROM projeto_participantes pp
        WHERE pp.projeto_id = p.id AND pp.usuario_id = $${pIdx++}
      )`;
      pVals.push(filtroUsuario);
    }

    projetosQuery += ` GROUP BY p.id ORDER BY p.data_fim NULLS LAST`;

    const { rows: projetosRaw } = await db.query(projetosQuery, pVals);

    const projetos_ativos = projetosRaw.map(p => ({
      ...p,
      tarefas_total:     parseInt(p.tarefas_total),
      tarefas_concluidas: parseInt(p.tarefas_concluidas),
      progresso_pct: p.tarefas_total > 0
        ? Math.round((p.tarefas_concluidas / p.tarefas_total) * 100)
        : 0
    }));

    // Formatar tarefas para o frontend
    const tarefasFormatadas = tarefas.map(t => ({
      id:           t.id,
      titulo:       t.titulo,
      data_inicio:  t.data_inicio,
      data_fim:     t.data_fim,
      hora:         t.hora,
      dia_inteiro:  t.dia_inteiro,
      status:       t.status,
      prioridade:   t.prioridade,
      tipo:         t.tipo,
      atribuido_a:  { id: t.atribuido_id, nome: t.atribuido_nome },
      projeto:      t.projeto_id ? {
        id:   t.projeto_id,
        nome: t.projeto_nome,
        cor:  t.projeto_cor
      } : null
    }));

    // Tarefas atrasadas (vencidas antes de hoje, não concluídas)
    const hoje = new Date().toISOString().slice(0, 10);
    let atrasadasQuery = `
      SELECT COUNT(*) AS total FROM tarefas t
      WHERE t.empresa_id = $1
        AND t.status NOT IN ('concluida','cancelada')
        AND t.data_inicio < $2
        AND t.data_inicio IS NOT NULL
    `;
    const atVals = [req.usuario.empresa_id, hoje];
    if (filtroUsuario) { atrasadasQuery += ` AND t.atribuido_a = $3`; atVals.push(filtroUsuario); }
    const { rows: [{ total: atrasadas }] } = await db.query(atrasadasQuery, atVals);

    res.json({
      tarefas:        tarefasFormatadas,
      projetos_ativos,
      meta: { mes: m, ano: a, atrasadas: parseInt(atrasadas) }
    });
  } catch (err) {
    console.error('Erro ao obter calendário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
