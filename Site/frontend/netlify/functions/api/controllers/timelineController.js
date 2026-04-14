const db = require('../db');

// GET /api/clientes/:id/timeline
exports.listar = async (req, res) => {
  try {
    const { pagina = 1, por_pagina = 30, tipo } = req.query;
    const limit  = Math.min(100, parseInt(por_pagina));
    const offset = (Math.max(1, parseInt(pagina)) - 1) * limit;

    let q = `
      SELECT t.*, u.nome AS criado_por_nome
      FROM timeline t
      LEFT JOIN usuarios u ON u.id = t.criado_por
      WHERE t.cliente_id = $1 AND t.empresa_id = $2
    `;
    const vals = [req.params.id, req.usuario.empresa_id];
    let idx = 3;

    if (tipo) { q += ` AND t.tipo = $${idx++}`; vals.push(tipo); }

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*) FROM (${q}) sub`, vals
    );

    q += ` ORDER BY t.created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    vals.push(limit, offset);

    const { rows } = await db.query(q, vals);
    res.json({ entradas: rows, total: parseInt(count) });
  } catch (err) {
    console.error('Erro ao listar timeline:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/timeline
exports.criar = async (req, res) => {
  try {
    const { tipo = 'manual', texto, arquivo_url, arquivo_nome, arquivo_tamanho, data_lembrete } = req.body;

    if (!texto && tipo !== 'anexo')
      return res.status(400).json({ error: 'texto é obrigatório' });
    if (tipo === 'anexo' && !arquivo_url)
      return res.status(400).json({ error: 'arquivo_url é obrigatório para anexos' });
    if (tipo === 'lembrete' && !data_lembrete)
      return res.status(400).json({ error: 'data_lembrete é obrigatório para lembretes' });

    // Verificar que o cliente pertence à empresa
    const { rows: [cliente] } = await db.query(
      `SELECT id FROM clientes WHERE id=$1 AND empresa_id=$2 AND ativo=true`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!cliente) return res.status(404).json({ error: 'Cliente não encontrado' });

    const { rows: [entrada] } = await db.query(
      `INSERT INTO timeline (empresa_id, cliente_id, tipo, texto, arquivo_url, arquivo_nome, arquivo_tamanho, data_lembrete, criado_por, is_sistema)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false) RETURNING *`,
      [
        req.usuario.empresa_id, req.params.id, tipo,
        texto || (arquivo_nome ? `Arquivo anexado: ${arquivo_nome}` : ''),
        arquivo_url || null, arquivo_nome || null, arquivo_tamanho || null,
        data_lembrete || null, req.usuario.id,
      ]
    );

    const { rows: [completa] } = await db.query(
      `SELECT t.*, u.nome AS criado_por_nome FROM timeline t
       LEFT JOIN usuarios u ON u.id = t.criado_por WHERE t.id=$1`,
      [entrada.id]
    );
    res.status(201).json(completa);
  } catch (err) {
    console.error('Erro ao criar entrada na timeline:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
