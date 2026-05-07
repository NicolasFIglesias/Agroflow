const db = require('../db');

// Preferências individuais do usuário (sidebar order pessoal)
exports.buscarUsuario = async (req, res) => {
  try {
    const { rows } = await db.query(`SELECT * FROM usuario_preferencias WHERE usuario_id=$1`, [req.usuario.id]);
    res.json(rows[0] || { sidebar_order: null, sidebar_hidden: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.salvarUsuario = async (req, res) => {
  try {
    const { sidebar_order, sidebar_hidden } = req.body;
    await db.query(
      `INSERT INTO usuario_preferencias (usuario_id, sidebar_order, sidebar_hidden)
       VALUES ($1,$2,$3)
       ON CONFLICT (usuario_id) DO UPDATE SET sidebar_order=$2, sidebar_hidden=$3, updated_at=NOW()`,
      [req.usuario.id, JSON.stringify(sidebar_order||[]), JSON.stringify(sidebar_hidden||[])]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

const DEFAULTS = {
  sidebar_order:  ['clientes','imoveis','contratos','calendario'],
  sidebar_hidden: [],
  cor_primaria:   null,
  logo_base64:    null,
  logo_mime:      'image/png',
  mensagem_boas_vindas: null,
};

exports.buscar = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM empresa_preferencias WHERE empresa_id=$1`,
      [req.usuario.empresa_id]
    );
    res.json(rows[0] || DEFAULTS);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.salvar = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin' && req.usuario.role !== 'superdev')
      return res.status(403).json({ error: 'Apenas administradores podem alterar preferências' });

    const {
      logo_base64, logo_mime,
      sidebar_order, sidebar_hidden,
      cor_primaria, mensagem_boas_vindas,
    } = req.body;

    await db.query(
      `INSERT INTO empresa_preferencias
         (empresa_id, logo_base64, logo_mime, sidebar_order, sidebar_hidden, cor_primaria, mensagem_boas_vindas)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (empresa_id) DO UPDATE SET
         logo_base64          = EXCLUDED.logo_base64,
         logo_mime            = EXCLUDED.logo_mime,
         sidebar_order        = EXCLUDED.sidebar_order,
         sidebar_hidden       = EXCLUDED.sidebar_hidden,
         cor_primaria         = EXCLUDED.cor_primaria,
         mensagem_boas_vindas = EXCLUDED.mensagem_boas_vindas,
         updated_at           = NOW()`,
      [
        req.usuario.empresa_id,
        logo_base64  || null,
        logo_mime    || 'image/png',
        JSON.stringify(sidebar_order  || DEFAULTS.sidebar_order),
        JSON.stringify(sidebar_hidden || []),
        cor_primaria || null,
        mensagem_boas_vindas || null,
      ]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
