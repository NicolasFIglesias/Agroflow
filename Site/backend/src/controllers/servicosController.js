const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const { busca } = req.query;
    let q = `SELECT * FROM servicos WHERE empresa_id=$1 AND ativo=true`;
    const vals = [req.usuario.empresa_id];
    if (busca) { q += ` AND nome ILIKE $2`; vals.push(`%${busca.trim()}%`); }
    q += ` ORDER BY nome`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.criar = async (req, res) => {
  try {
    const { nome, descricao, preco_custo, preco_venda } = req.body;
    if (!nome || !preco_venda) return res.status(400).json({ error: 'nome e preco_venda são obrigatórios' });
    const { rows: [s] } = await db.query(
      `INSERT INTO servicos (empresa_id, nome, descricao, preco_custo, preco_venda)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.usuario.empresa_id, nome.trim(), descricao||null, preco_custo||null, parseFloat(preco_venda)]
    );
    res.status(201).json(s);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.editar = async (req, res) => {
  try {
    const { nome, descricao, preco_custo, preco_venda } = req.body;
    const { rowCount } = await db.query(
      `UPDATE servicos SET nome=$1, descricao=$2, preco_custo=$3, preco_venda=$4, updated_at=NOW()
       WHERE id=$5 AND empresa_id=$6`,
      [nome, descricao||null, preco_custo||null, parseFloat(preco_venda), req.params.id, req.usuario.empresa_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Serviço não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.excluir = async (req, res) => {
  try {
    await db.query(`UPDATE servicos SET ativo=false WHERE id=$1 AND empresa_id=$2`, [req.params.id, req.usuario.empresa_id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
