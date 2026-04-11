const db     = require('../db');
const bcrypt = require('bcryptjs');

// GET /api/usuarios — lista usuários ativos da empresa
exports.listar = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, cargo, role, ativo, created_at
       FROM usuarios
       WHERE empresa_id = $1 AND ativo = true
       ORDER BY nome`,
      [req.usuario.empresa_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/usuarios — criar colaborador (admin only)
exports.criar = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { nome, email, senha, cargo, role = 'colaborador' } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const { rows } = await db.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nome, email, cargo, role`,
      [req.usuario.empresa_id, nome, email.toLowerCase().trim(), senhaHash, cargo, role]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }
    console.error('Erro ao criar usuário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/usuarios/:id — editar usuário (admin ou próprio)
exports.editar = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.usuario.role === 'admin';
    const isOwner = req.usuario.id === id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { nome, cargo, role } = req.body;

    const updates = [];
    const values  = [];
    let   idx     = 1;

    if (nome)  { updates.push(`nome = $${idx++}`);  values.push(nome); }
    if (cargo) { updates.push(`cargo = $${idx++}`); values.push(cargo); }
    if (role && isAdmin) { updates.push(`role = $${idx++}`); values.push(role); }

    updates.push(`updated_at = NOW()`);
    values.push(req.usuario.empresa_id, id);

    const { rows } = await db.query(
      `UPDATE usuarios SET ${updates.join(', ')}
       WHERE empresa_id = $${idx++} AND id = $${idx}
       RETURNING id, nome, email, cargo, role`,
      values
    );

    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar usuário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
