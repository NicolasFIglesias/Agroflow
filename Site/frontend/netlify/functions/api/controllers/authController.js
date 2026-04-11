const db      = require('../db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { rows } = await db.query(
      `SELECT u.*, e.nome AS empresa_nome
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.email = $1 AND u.ativo = true`,
      [email.toLowerCase().trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        id:         usuario.id,
        empresa_id: usuario.empresa_id,
        nome:       usuario.nome,
        email:      usuario.email,
        role:       usuario.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      usuario: {
        id:           usuario.id,
        nome:         usuario.nome,
        email:        usuario.email,
        cargo:        usuario.cargo,
        role:         usuario.role,
        empresa_id:   usuario.empresa_id,
        empresa_nome: usuario.empresa_nome
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /api/auth/register — cria empresa + primeiro usuário admin
exports.register = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const { empresa_nome, nome, email, senha, cargo } = req.body;

    if (!empresa_nome || !nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
    }
    if (senha.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    // Verificar se email já existe
    const { rows: existe } = await client.query(
      'SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]
    );
    if (existe.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Este email já está cadastrado' });
    }

    // Criar empresa
    const { rows: [empresa] } = await client.query(
      'INSERT INTO empresas (nome) VALUES ($1) RETURNING id, nome',
      [empresa_nome.trim()]
    );

    // Criar usuário admin
    const senhaHash = await bcrypt.hash(senha, 10);
    const { rows: [usuario] } = await client.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role)
       VALUES ($1, $2, $3, $4, $5, 'admin')
       RETURNING id, nome, email, cargo, role, empresa_id`,
      [empresa.id, nome.trim(), email.toLowerCase().trim(), senhaHash, cargo?.trim() || null]
    );

    await client.query('COMMIT');

    // Gerar token e retornar sessão
    const token = require('jsonwebtoken').sign(
      { id: usuario.id, empresa_id: empresa.id, nome: usuario.nome, email: usuario.email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      usuario: { ...usuario, empresa_nome: empresa.nome }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.cargo, u.role, u.empresa_id,
              e.nome AS empresa_nome
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1`,
      [req.usuario.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro em /me:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
