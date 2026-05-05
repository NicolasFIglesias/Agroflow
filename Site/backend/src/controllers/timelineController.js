const db = require('../db');

// GET /api/clientes/:id/timeline
exports.listar = async (req, res) => {
  try {
    const { tipo, pagina = 1 } = req.query;
    const limit  = 30;
    const offset = (Math.max(1, parseInt(pagina)) - 1) * limit;

    const vals = [req.params.id, req.usuario.empresa_id];
    let idx = 3;
    let filtroTipo = '';

    if (tipo) {
      filtroTipo = ` AND t.tipo = $${idx++}`;
      vals.push(tipo);
    }

    const q = `
      SELECT t.*, u.nome AS usuario_nome
      FROM timeline t
      LEFT JOIN usuarios u ON u.id = t.criado_por
      WHERE t.cliente_id = $1 AND t.empresa_id = $2${filtroTipo}
      ORDER BY t.created_at DESC
      LIMIT $${idx++} OFFSET $${idx}
    `;
    vals.push(limit, offset);

    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar timeline:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/timeline
exports.criar = async (req, res) => {
  try {
    const { tipo, texto, data_lembrete } = req.body;

    if (!tipo) return res.status(400).json({ error: 'tipo é obrigatório' });
    if (!texto) return res.status(400).json({ error: 'texto é obrigatório' });
    if (texto.length > 5000) return res.status(400).json({ error: 'texto não pode ter mais de 5000 caracteres' });

    const tiposValidos = ['manual', 'lembrete', 'automatica'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `tipo deve ser um de: ${tiposValidos.join(', ')}` });
    }

    const { rows: [entry] } = await db.query(
      `INSERT INTO timeline (cliente_id, empresa_id, tipo, texto, data_lembrete, criado_por)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.params.id,
        req.usuario.empresa_id,
        tipo,
        texto,
        data_lembrete || null,
        req.usuario.id,
      ]
    );

    res.status(201).json(entry);
  } catch (err) {
    console.error('Erro ao criar entrada na timeline:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
