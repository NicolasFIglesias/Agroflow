const db = require('../db');

// POST /api/tarefas
exports.criar = async (req, res) => {
  try {
    const {
      projeto_id, titulo, descricao, tipo = 'equipe',
      data_inicio, data_fim, hora, dia_inteiro = true,
      atribuido_a, status = 'ativa', prioridade = 'normal'
    } = req.body;

    if (!titulo || !atribuido_a) {
      return res.status(400).json({ error: 'titulo e atribuido_a são obrigatórios' });
    }

    // Colaborador só pode atribuir a si mesmo em tarefas pessoais
    const responsavel = tipo === 'pessoal' ? req.usuario.id : atribuido_a;

    // Calcular próxima ordem no projeto
    let ordem = 0;
    if (projeto_id) {
      const { rows } = await db.query(
        `SELECT COALESCE(MAX(ordem), -1) + 1 AS prox FROM tarefas WHERE projeto_id = $1`,
        [projeto_id]
      );
      ordem = rows[0].prox;
    }

    const { rows: [tarefa] } = await db.query(
      `INSERT INTO tarefas
         (empresa_id, projeto_id, titulo, descricao, tipo, data_inicio, data_fim,
          hora, dia_inteiro, atribuido_a, criado_por, ordem, status, prioridade)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        req.usuario.empresa_id, projeto_id || null, titulo, descricao || null, tipo,
        data_inicio || null, data_fim || null, hora || null, dia_inteiro,
        responsavel, req.usuario.id, ordem, status, prioridade
      ]
    );

    await db.query(
      `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao)
       VALUES ($1,$2,'criado',$3)`,
      [tarefa.id, req.usuario.id, `Tarefa criada por ${req.usuario.nome}`]
    );

    const completa = await _buscarTarefaCompleta(tarefa.id, req.usuario.empresa_id);
    res.status(201).json(completa);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/tarefas
exports.listar = async (req, res) => {
  try {
    const { projeto_id, status, usuario_id, data_inicio, data_fim } = req.query;

    let q = `
      SELECT t.*,
        a.nome AS atribuido_nome, a.cargo AS atribuido_cargo,
        p.nome AS projeto_nome, p.cor AS projeto_cor
      FROM tarefas t
      JOIN usuarios a ON a.id = t.atribuido_a
      LEFT JOIN projetos p ON p.id = t.projeto_id
      WHERE t.empresa_id = $1
    `;
    const vals = [req.usuario.empresa_id];
    let idx = 2;

    // Colaborador só vê as próprias tarefas
    const filtroUsuario = req.usuario.role !== 'admin'
      ? req.usuario.id
      : (usuario_id || null);

    if (filtroUsuario) {
      q += ` AND t.atribuido_a = $${idx++}`;
      vals.push(filtroUsuario);
    }

    if (projeto_id) { q += ` AND t.projeto_id = $${idx++}`; vals.push(projeto_id); }
    if (status)     { q += ` AND t.status = $${idx++}`;     vals.push(status); }
    if (data_inicio){ q += ` AND t.data_inicio >= $${idx++}`; vals.push(data_inicio); }
    if (data_fim)   { q += ` AND t.data_inicio <= $${idx++}`; vals.push(data_fim); }

    q += ` ORDER BY t.data_inicio NULLS LAST, t.hora NULLS LAST, t.created_at`;

    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar tarefas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/tarefas/:id
exports.buscarPorId = async (req, res) => {
  try {
    const tarefa = await _buscarTarefaCompleta(req.params.id, req.usuario.empresa_id);
    if (!tarefa) return res.status(404).json({ error: 'Tarefa não encontrada' });
    res.json(tarefa);
  } catch (err) {
    console.error('Erro ao buscar tarefa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/tarefas/:id
exports.editar = async (req, res) => {
  try {
    const {
      titulo, descricao, data_inicio, data_fim,
      hora, dia_inteiro, prioridade, atribuido_a
    } = req.body;

    const { rows } = await db.query(
      `UPDATE tarefas SET
         titulo=$1, descricao=$2, data_inicio=$3, data_fim=$4,
         hora=$5, dia_inteiro=$6, prioridade=$7, atribuido_a=$8,
         updated_at=NOW()
       WHERE id=$9 AND empresa_id=$10 RETURNING *`,
      [titulo, descricao, data_inicio || null, data_fim || null,
       hora || null, dia_inteiro, prioridade, atribuido_a,
       req.params.id, req.usuario.empresa_id]
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });

    await db.query(
      `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao) VALUES ($1,$2,'editado',$3)`,
      [req.params.id, req.usuario.id, `Tarefa editada por ${req.usuario.nome}`]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar tarefa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/tarefas/:id/status
exports.alterarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { rows } = await db.query(
      `UPDATE tarefas SET status=$1, updated_at=NOW()
       WHERE id=$2 AND empresa_id=$3 RETURNING *`,
      [status, req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });

    await db.query(
      `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao) VALUES ($1,$2,'status_alterado',$3)`,
      [req.params.id, req.usuario.id, `${req.usuario.nome} marcou como "${status}"`]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao alterar status:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/tarefas/:id/concluir
exports.concluir = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { obs_conclusao, acao_seguinte, proxima_tarefa } = req.body;
    const tarefaId = req.params.id;

    // Verificar tarefa
    const { rows: [tarefa] } = await client.query(
      `SELECT * FROM tarefas WHERE id=$1 AND empresa_id=$2`,
      [tarefaId, req.usuario.empresa_id]
    );
    if (!tarefa) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // 1. Concluir tarefa atual
    await client.query(
      `UPDATE tarefas SET
         status='concluida', concluida_em=NOW(),
         concluida_por=$1, obs_conclusao=$2, updated_at=NOW()
       WHERE id=$3`,
      [req.usuario.id, obs_conclusao || null, tarefaId]
    );

    let descHistorico = `${req.usuario.nome} concluiu a tarefa`;
    let novaTarefa = null;

    // 2. Ação seguinte
    if (acao_seguinte === 'delegar' && proxima_tarefa) {
      // Calcular próxima ordem
      const { rows: [{ prox }] } = await client.query(
        `SELECT COALESCE(MAX(ordem), 0) + 1 AS prox FROM tarefas WHERE projeto_id=$1`,
        [tarefa.projeto_id]
      );

      const { rows: [nova] } = await client.query(
        `INSERT INTO tarefas
           (empresa_id, projeto_id, titulo, descricao, tipo, data_inicio, data_fim,
            hora, dia_inteiro, atribuido_a, criado_por, delegado_por, ordem, status, prioridade)
         VALUES ($1,$2,$3,$4,'equipe',$5,$6,$7,$8,$9,$10,$11,$12,'ativa',$13)
         RETURNING *`,
        [
          req.usuario.empresa_id, tarefa.projeto_id,
          proxima_tarefa.titulo, proxima_tarefa.descricao || null,
          proxima_tarefa.data_inicio || null, proxima_tarefa.data_fim || null,
          proxima_tarefa.hora || null, proxima_tarefa.dia_inteiro !== false,
          proxima_tarefa.atribuido_a, req.usuario.id, req.usuario.id,
          prox, proxima_tarefa.prioridade || 'normal'
        ]
      );
      novaTarefa = nova;

      // Buscar nome do responsável
      const { rows: [resp] } = await client.query(
        `SELECT nome FROM usuarios WHERE id=$1`, [proxima_tarefa.atribuido_a]
      );

      descHistorico += ` e delegou próxima tarefa para ${resp?.nome || 'colaborador'}`;

      await client.query(
        `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao) VALUES ($1,$2,'criado',$3)`,
        [nova.id, req.usuario.id, `Tarefa criada por delegação de ${req.usuario.nome}`]
      );

    } else if (acao_seguinte === 'finalizar_projeto' && tarefa.projeto_id) {
      await client.query(
        `UPDATE projetos SET status='concluido', updated_at=NOW() WHERE id=$1`,
        [tarefa.projeto_id]
      );
      descHistorico += `. Projeto finalizado.`;
    }

    await client.query(
      `INSERT INTO tarefa_historico (tarefa_id, usuario_id, acao, descricao) VALUES ($1,$2,'concluido',$3)`,
      [tarefaId, req.usuario.id, descHistorico]
    );

    await client.query('COMMIT');
    res.json({ ok: true, nova_tarefa: novaTarefa });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao concluir tarefa:', err);
    res.status(500).json({ error: 'Erro interno' });
  } finally {
    client.release();
  }
};

// DELETE /api/tarefas/:id
exports.excluir = async (req, res) => {
  try {
    const { rows } = await db.query(
      `DELETE FROM tarefas WHERE id=$1 AND empresa_id=$2 RETURNING id`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Tarefa não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir tarefa:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// ── Helper interno ─────────────────────────────────────────────
async function _buscarTarefaCompleta(id, empresaId) {
  const { rows: [t] } = await db.query(
    `SELECT t.*,
       a.nome AS atribuido_nome, a.cargo AS atribuido_cargo,
       cr.nome AS criado_por_nome,
       dl.nome AS delegado_por_nome,
       cn.nome AS concluida_por_nome,
       p.nome AS projeto_nome, p.cor AS projeto_cor
     FROM tarefas t
     JOIN usuarios a   ON a.id = t.atribuido_a
     JOIN usuarios cr  ON cr.id = t.criado_por
     LEFT JOIN usuarios dl ON dl.id = t.delegado_por
     LEFT JOIN usuarios cn ON cn.id = t.concluida_por
     LEFT JOIN projetos p  ON p.id  = t.projeto_id
     WHERE t.id=$1 AND t.empresa_id=$2`,
    [id, empresaId]
  );

  if (!t) return null;

  const { rows: historico } = await db.query(
    `SELECT h.*, u.nome AS usuario_nome
     FROM tarefa_historico h
     JOIN usuarios u ON u.id = h.usuario_id
     WHERE h.tarefa_id=$1
     ORDER BY h.created_at DESC`,
    [id]
  );

  return { ...t, historico };
}
