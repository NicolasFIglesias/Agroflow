const db = require('../db');

exports.salvar = async (req, res) => {
  try {
    const { tipo_contrato, dados = {} } = req.body;
    if (!tipo_contrato) return res.status(400).json({ error: 'tipo_contrato é obrigatório' });
    const { rows: [r] } = await db.query(
      `INSERT INTO contratos_rascunhos (empresa_id, usuario_id, tipo_contrato, dados)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (usuario_id, tipo_contrato)
       DO UPDATE SET dados=$4, updated_at=NOW()
       RETURNING id`,
      [req.usuario.empresa_id, req.usuario.id, tipo_contrato, JSON.stringify(dados)]
    );
    res.json({ ok: true, id: r.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.buscar = async (req, res) => {
  try {
    const { tipo } = req.query;
    if (!tipo) return res.status(400).json({ error: 'tipo é obrigatório' });
    const { rows: [r] } = await db.query(
      `SELECT id, tipo_contrato, dados, updated_at FROM contratos_rascunhos WHERE usuario_id=$1 AND tipo_contrato=$2`,
      [req.usuario.id, tipo]
    );
    res.json(r || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.excluir = async (req, res) => {
  try {
    await db.query(`DELETE FROM contratos_rascunhos WHERE id=$1 AND usuario_id=$2`, [req.params.id, req.usuario.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
