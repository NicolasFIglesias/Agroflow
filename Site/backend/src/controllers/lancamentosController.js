const db = require('../db');

const FMT = v => parseFloat(v || 0);

// GET /api/lancamentos/resumo — admin only
exports.resumo = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin' && req.usuario.role !== 'superdev')
      return res.status(403).json({ error: 'Acesso restrito a administradores' });

    const { data_inicio, data_fim } = req.query;
    const hoje = new Date().toISOString().slice(0, 10);
    const primeiroDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const inicio = data_inicio || primeiroDiaMes;
    const fim    = data_fim    || hoje;

    const [totais, ranking, ultimos] = await Promise.all([
      db.query(
        `SELECT
          COALESCE(SUM(CASE WHEN tipo='venda'   THEN valor ELSE 0 END), 0) AS total_vendas,
          COALESCE(SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END), 0) AS total_despesas,
          COUNT(*)                                                          AS total_transacoes,
          COUNT(CASE WHEN tipo='venda'   THEN 1 END)                       AS qtd_vendas,
          COUNT(CASE WHEN tipo='despesa' THEN 1 END)                       AS qtd_despesas
         FROM lancamentos WHERE empresa_id=$1 AND data_lancamento BETWEEN $2 AND $3`,
        [req.usuario.empresa_id, inicio, fim]
      ),
      db.query(
        `SELECT colaborador_id, colaborador_nome,
            SUM(valor) AS total, COUNT(*) AS qtd
           FROM lancamentos
           WHERE empresa_id=$1 AND tipo='venda' AND data_lancamento BETWEEN $2 AND $3
             AND colaborador_id IS NOT NULL
           GROUP BY colaborador_id, colaborador_nome
           ORDER BY total DESC LIMIT 10`,
        [req.usuario.empresa_id, inicio, fim]
      ),
      db.query(
        `SELECT * FROM lancamentos WHERE empresa_id=$1 AND data_lancamento BETWEEN $2 AND $3
           ORDER BY created_at DESC LIMIT 20`,
        [req.usuario.empresa_id, inicio, fim]
      ),
    ]);

    const t = totais.rows[0];
    res.json({
      periodo:           { inicio, fim },
      total_vendas:      FMT(t.total_vendas),
      total_despesas:    FMT(t.total_despesas),
      lucro:             FMT(t.total_vendas) - FMT(t.total_despesas),
      total_transacoes:  parseInt(t.total_transacoes),
      qtd_vendas:        parseInt(t.qtd_vendas),
      qtd_despesas:      parseInt(t.qtd_despesas),
      ranking:           ranking.rows,
      ultimos:           ultimos.rows,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: err.message }); }
};

// GET /api/lancamentos
exports.listar = async (req, res) => {
  try {
    const { tipo, data_inicio, data_fim, colaborador_id, pagina = 1, por_pagina = 50 } = req.query;
    const limit  = Math.min(100, parseInt(por_pagina));
    const offset = (Math.max(1, parseInt(pagina)) - 1) * limit;

    let q = `SELECT l.* FROM lancamentos l WHERE l.empresa_id=$1`;
    const vals = [req.usuario.empresa_id]; let idx = 2;

    if (tipo)           { q += ` AND l.tipo=$${idx++}`;               vals.push(tipo); }
    if (colaborador_id) { q += ` AND l.colaborador_id=$${idx++}`;     vals.push(colaborador_id); }
    if (data_inicio)    { q += ` AND l.data_lancamento>=$${idx++}`;   vals.push(data_inicio); }
    if (data_fim)       { q += ` AND l.data_lancamento<=$${idx++}`;   vals.push(data_fim); }
    if (req.query.busca) { q += ` AND (l.cliente_nome ILIKE $${idx} OR l.produto ILIKE $${idx} OR l.descricao_despesa ILIKE $${idx} OR l.pago_para ILIKE $${idx})`; vals.push(`%${req.query.busca.trim()}%`); idx++; }
    if (req.query.status_pagamento) { q += ` AND l.status_pagamento=$${idx++}`; vals.push(req.query.status_pagamento); }
    if (req.usuario.role !== 'admin') { q += ` AND l.criado_por=$${idx++}`; vals.push(req.usuario.id); }

    const countQ = `SELECT COUNT(*) FROM (${q}) sub`;
    const { rows: [{ count }] } = await db.query(countQ, vals);
    q += ` ORDER BY l.data_lancamento DESC, l.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    vals.push(limit, offset);
    const { rows } = await db.query(q, vals);
    res.json({ lancamentos: rows, total: parseInt(count), pagina: parseInt(pagina), total_paginas: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/lancamentos/mensal — comparativo mensal para gráficos
exports.mensal = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin' && req.usuario.role !== 'superdev')
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    const meses = parseInt(req.query.meses || 6);
    const [mensal, produtos] = await Promise.all([
      db.query(`SELECT TO_CHAR(data_lancamento,'YYYY-MM') AS mes,
          SUM(CASE WHEN tipo='venda' THEN valor ELSE 0 END) AS vendas,
          SUM(CASE WHEN tipo='despesa' THEN valor ELSE 0 END) AS despesas
         FROM lancamentos WHERE empresa_id=$1 AND data_lancamento >= CURRENT_DATE - INTERVAL '1 month' * $2
         GROUP BY mes ORDER BY mes`, [req.usuario.empresa_id, meses]),
      db.query(`SELECT COALESCE(produto,'Sem produto') AS produto, SUM(valor) AS total, COUNT(*) AS qtd
         FROM lancamentos WHERE empresa_id=$1 AND tipo='venda' AND data_lancamento >= CURRENT_DATE - INTERVAL '1 month' * $2
         GROUP BY produto ORDER BY total DESC LIMIT 8`, [req.usuario.empresa_id, meses]),
    ]);
    res.json({ mensal: mensal.rows, produtos: produtos.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/lancamentos
exports.criar = async (req, res) => {
  try {
    const { tipo, cliente_id, cliente_nome, colaborador_id, produto, valor, forma_pagamento, observacao, data_lancamento,
            data_vencimento, status_pagamento, parcelas, status_venda, descricao_despesa, pago_para } = req.body;
    if (!tipo || !valor) return res.status(400).json({ error: 'tipo e valor são obrigatórios' });

    let colabNome = null;
    if (colaborador_id) {
      const { rows } = await db.query('SELECT nome FROM usuarios WHERE id=$1', [colaborador_id]);
      colabNome = rows[0]?.nome || null;
    }

    // If cliente_id provided but no nome, fetch it
    let cliNome = cliente_nome || null;
    if (cliente_id && !cliNome) {
      const { rows } = await db.query('SELECT nome_completo FROM clientes WHERE id=$1', [cliente_id]);
      cliNome = rows[0]?.nome_completo || null;
    }

    // Auto data_vencimento for cartão
    let dvenc = data_vencimento || null;
    if (!dvenc && forma_pagamento && forma_pagamento.toLowerCase().includes('cartão')) {
      const base = new Date((data_lancamento || new Date().toISOString().slice(0,10)) + 'T12:00:00');
      base.setDate(base.getDate() + 30);
      dvenc = base.toISOString().slice(0,10);
    }

    const { rows: [l] } = await db.query(
      `INSERT INTO lancamentos (empresa_id, tipo, cliente_id, cliente_nome, colaborador_id, colaborador_nome,
         produto, valor, forma_pagamento, observacao, data_lancamento, data_vencimento,
         status_pagamento, parcelas, status_venda, descricao_despesa, pago_para, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [req.usuario.empresa_id, tipo, cliente_id||null, cliNome, colaborador_id||null, colabNome,
       produto||null, FMT(valor), forma_pagamento||null, observacao||null,
       data_lancamento || new Date().toISOString().slice(0,10), dvenc,
       status_pagamento||'pendente', parseInt(parcelas)||1, status_venda||'finalizada',
       descricao_despesa||null, pago_para||null, req.usuario.id]
    );
    res.status(201).json(l);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/lancamentos/:id
exports.editar = async (req, res) => {
  try {
    const { produto, valor, forma_pagamento, observacao, data_lancamento, cliente_nome, colaborador_id } = req.body;
    let colabNome = null;
    if (colaborador_id) {
      const { rows } = await db.query('SELECT nome FROM usuarios WHERE id=$1', [colaborador_id]);
      colabNome = rows[0]?.nome || null;
    }
    const { rowCount } = await db.query(
      `UPDATE lancamentos SET produto=$1, valor=$2, forma_pagamento=$3, observacao=$4,
         data_lancamento=$5, cliente_nome=COALESCE($6,cliente_nome),
         colaborador_id=COALESCE($7,colaborador_id), colaborador_nome=COALESCE($8,colaborador_nome)
       WHERE id=$9 AND empresa_id=$10`,
      [produto||null, FMT(valor), forma_pagamento||null, observacao||null,
       data_lancamento||null, cliente_nome||null, colaborador_id||null, colabNome,
       req.params.id, req.usuario.empresa_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PATCH /api/lancamentos/:id/pago
exports.marcarPago = async (req, res) => {
  try {
    const hoje = new Date().toISOString().slice(0,10);
    const { rowCount } = await db.query(
      `UPDATE lancamentos SET status_pagamento='pago', data_vencimento=COALESCE(data_vencimento,$1) WHERE id=$2 AND empresa_id=$3`,
      [hoje, req.params.id, req.usuario.empresa_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// DELETE /api/lancamentos/:id
exports.excluir = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM lancamentos WHERE id=$1 AND empresa_id=$2`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
