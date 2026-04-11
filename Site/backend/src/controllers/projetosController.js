const db = require('../db');

// POST /api/projetos
exports.criar = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const {
      nome, descricao, cor = '#639922',
      data_inicio, data_fim,
      participantes = [], tarefas = []
    } = req.body;

    if (!nome || !data_inicio) {
      return res.status(400).json({ error: 'nome e data_inicio são obrigatórios' });
    }

    // 1. Criar projeto
    const { rows: [projeto] } = await client.query(
      `INSERT INTO projetos (empresa_id, nome, descricao, cor, data_inicio, data_fim, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [req.usuario.empresa_id, nome, descricao, cor, data_inicio, data_fim || null, req.usuario.id]
    );

    // 2. Participantes (incluir criador automaticamente)
    const todosParticipantes = [...new Set([req.usuario.id, ...participantes])];
    for (const uid of todosParticipantes) {
      await client.query(
        `INSERT INTO projeto_participantes (projeto_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [projeto.id, uid]
      );
    }

    // 3. Tarefas iniciais
    for (let i = 0; i < tarefas.length; i++) {
      const t = tarefas[i];
      const status = i === 0 ? 'ativa' : (t.status || 'aguardando');
      const { rows: [tarefa] } = await client.query(
        `INSERT INTO tarefas
           (empresa_id, projeto_id, titulo, descricao, tipo, data_inicio, data_fim, hora,
            dia_inteiro, atribuido_a, criado_por, ordem, status, prioridade)
         VALUES ($1,$2,$3,$4,'equipe',$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING id`,
        [
          req.usuario.empresa_id, projeto.id, t.titulo, t.descricao || null,
          t.data_inicio || null, t.data_fim || null, t.hora || null,
          t.dia_inteiro !== false,
          t.atribuido_a, req.usuario.id, i,
          status, t.prioridade || 'normal'
        ]
      );
      await client.query(
        `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao)
         VALUES ($1,$2,'criado',$3)`,
        [tarefa.id, req.usuario.id, `Tarefa criada ao criar o projeto por ${req.usuario.nome}`]
      );
    }

    // 4. Histórico do projeto
    await client.query(
      `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao)
       SELECT t.id, $1, 'projeto_criado', $2
       FROM tarefas t WHERE t.projeto_id = $3 LIMIT 0`,
      [req.usuario.id, `Projeto criado por ${req.usuario.nome}`, projeto.id]
    );

    await client.query('COMMIT');

    // Buscar projeto completo
    const completo = await _buscarProjetoCompleto(projeto.id, req.usuario.empresa_id);
    res.status(201).json(completo);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar projeto:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
};

// GET /api/projetos
exports.listar = async (req, res) => {
  try {
    const { status = 'ativo', usuario_id } = req.query;

    let baseQuery = `
      SELECT p.*,
        u.nome AS criado_por_nome,
        COUNT(DISTINCT t.id) AS tarefas_total,
        COUNT(DISTINCT CASE WHEN t.status = 'concluida' THEN t.id END) AS tarefas_concluidas
      FROM projetos p
      JOIN usuarios u ON u.id = p.criado_por
      LEFT JOIN tarefas t ON t.projeto_id = p.id
      WHERE p.empresa_id = $1
    `;

    const values = [req.usuario.empresa_id];
    let idx = 2;

    if (status !== 'todos') {
      baseQuery += ` AND p.status = $${idx++}`;
      values.push(status);
    }

    // Se colaborador, filtrar apenas projetos em que participa
    if (req.usuario.role !== 'admin') {
      baseQuery += ` AND EXISTS (
        SELECT 1 FROM projeto_participantes pp
        WHERE pp.projeto_id = p.id AND pp.usuario_id = $${idx++}
      )`;
      values.push(req.usuario.id);
    } else if (usuario_id) {
      baseQuery += ` AND EXISTS (
        SELECT 1 FROM projeto_participantes pp
        WHERE pp.projeto_id = p.id AND pp.usuario_id = $${idx++}
      )`;
      values.push(usuario_id);
    }

    baseQuery += `
      GROUP BY p.id, u.nome
      ORDER BY p.created_at DESC
    `;

    const { rows } = await db.query(baseQuery, values);

    const projetos = rows.map(p => ({
      ...p,
      tarefas_total:     parseInt(p.tarefas_total),
      tarefas_concluidas: parseInt(p.tarefas_concluidas),
      progresso_pct: p.tarefas_total > 0
        ? Math.round((p.tarefas_concluidas / p.tarefas_total) * 100)
        : 0
    }));

    res.json(projetos);
  } catch (err) {
    console.error('Erro ao listar projetos:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/projetos/:id
exports.buscarPorId = async (req, res) => {
  try {
    const projeto = await _buscarProjetoCompleto(req.params.id, req.usuario.empresa_id);
    if (!projeto) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(projeto);
  } catch (err) {
    console.error('Erro ao buscar projeto:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/projetos/:id
exports.editar = async (req, res) => {
  try {
    const { nome, descricao, cor, data_inicio, data_fim } = req.body;
    const { rows } = await db.query(
      `UPDATE projetos
       SET nome=$1, descricao=$2, cor=$3, data_inicio=$4, data_fim=$5, updated_at=NOW()
       WHERE id=$6 AND empresa_id=$7
       RETURNING *`,
      [nome, descricao, cor, data_inicio, data_fim || null, req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar projeto:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/projetos/:id/status
exports.alterarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const statusValidos = ['ativo', 'concluido', 'cancelado', 'pausado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const { rows } = await db.query(
      `UPDATE projetos SET status=$1, updated_at=NOW()
       WHERE id=$2 AND empresa_id=$3 RETURNING *`,
      [status, req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao alterar status do projeto:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/projetos/:id/participantes
exports.adicionarParticipante = async (req, res) => {
  try {
    const { usuario_id } = req.body;
    await db.query(
      `INSERT INTO projeto_participantes (projeto_id, usuario_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, usuario_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao adicionar participante:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/projetos/:id/participantes/:uid
exports.removerParticipante = async (req, res) => {
  try {
    await db.query(
      `DELETE FROM projeto_participantes WHERE projeto_id=$1 AND usuario_id=$2`,
      [req.params.id, req.params.uid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao remover participante:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── Helper interno ─────────────────────────────────────────────
async function _buscarProjetoCompleto(projetoId, empresaId) {
  const { rows: [projeto] } = await db.query(
    `SELECT p.*, u.nome AS criado_por_nome,
       COUNT(DISTINCT t.id) AS tarefas_total,
       COUNT(DISTINCT CASE WHEN t.status = 'concluida' THEN t.id END) AS tarefas_concluidas
     FROM projetos p
     JOIN usuarios u ON u.id = p.criado_por
     LEFT JOIN tarefas t ON t.projeto_id = p.id
     WHERE p.id=$1 AND p.empresa_id=$2
     GROUP BY p.id, u.nome`,
    [projetoId, empresaId]
  );

  if (!projeto) return null;

  const { rows: participantes } = await db.query(
    `SELECT u.id, u.nome, u.cargo, u.role
     FROM projeto_participantes pp
     JOIN usuarios u ON u.id = pp.usuario_id
     WHERE pp.projeto_id=$1
     ORDER BY u.nome`,
    [projetoId]
  );

  const { rows: tarefas } = await db.query(
    `SELECT t.*,
       atrib.nome AS atribuido_nome,
       criad.nome AS criado_por_nome,
       deleg.nome AS delegado_por_nome,
       conc.nome  AS concluida_por_nome
     FROM tarefas t
     JOIN usuarios atrib ON atrib.id = t.atribuido_a
     JOIN usuarios criad ON criad.id = t.criado_por
     LEFT JOIN usuarios deleg ON deleg.id = t.delegado_por
     LEFT JOIN usuarios conc  ON conc.id  = t.concluida_por
     WHERE t.projeto_id=$1
     ORDER BY t.ordem, t.created_at`,
    [projetoId]
  );

  return {
    ...projeto,
    tarefas_total:     parseInt(projeto.tarefas_total),
    tarefas_concluidas: parseInt(projeto.tarefas_concluidas),
    progresso_pct: projeto.tarefas_total > 0
      ? Math.round((projeto.tarefas_concluidas / projeto.tarefas_total) * 100)
      : 0,
    participantes,
    tarefas
  };
}
