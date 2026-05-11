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

// GET /api/auth/convite/:token — verifica token (chamado pelo login.js do colaborador)
exports.verificarConviteGet = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (decoded.tipo !== 'convite') return res.status(400).json({ error: 'Token inválido' });
    const { rows } = await db.query('SELECT nome FROM empresas WHERE id=$1', [decoded.empresa_id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ empresa_id: decoded.empresa_id, empresa_nome: rows[0].nome });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Convite expirado' });
    res.status(400).json({ error: 'Link de convite inválido' });
  }
};

// POST /api/auth/register — cria empresa + admin, OU colaborador via convite
exports.register = async (req, res) => {
  // Colaborador via convite
  if (req.body.tipo === 'colaborador') {
    try {
      const { convite_token, email, senha, cargo } = req.body;
      if (!convite_token || !email || !senha) return res.status(400).json({ error: 'Dados incompletos' });
      const decoded = jwt.verify(convite_token, process.env.JWT_SECRET);
      if (decoded.tipo !== 'convite') return res.status(400).json({ error: 'Token de convite inválido' });
      const { rows: existe } = await db.query('SELECT id FROM usuarios WHERE email=$1', [email.toLowerCase().trim()]);
      if (existe.length > 0) return res.status(409).json({ error: 'E-mail já cadastrado' });
      const senhaHash = await bcrypt.hash(senha, 10);
      const nomePadrao = email.split('@')[0];
      const { rows: [u] } = await db.query(
        `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role) VALUES ($1,$2,$3,$4,$5,'colaborador') RETURNING id, nome, email, cargo, role, empresa_id`,
        [decoded.empresa_id, nomePadrao, email.toLowerCase().trim(), senhaHash, cargo?.trim() || null]
      );
      const { rows: [e] } = await db.query('SELECT nome FROM empresas WHERE id=$1', [decoded.empresa_id]);
      const token = jwt.sign({ id: u.id, empresa_id: u.empresa_id, nome: u.nome, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
      return res.status(201).json({ token, usuario: { ...u, empresa_nome: e?.nome || '' } });
    } catch (err) {
      if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Convite expirado' });
      return res.status(400).json({ error: err.message });
    }
  }

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

// POST /api/auth/convite — admin gera link de convite para colaborador
exports.gerarConvite = async (req, res) => {
  try {
    const token = jwt.sign(
      { empresa_id: req.usuario.empresa_id, empresa_nome: req.usuario.empresa_nome, tipo: 'convite' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const base = process.env.FRONTEND_URL || 'https://frontend-peach-beta-chh2ammsv3.vercel.app';
    res.json({ token, link: `${base}/pages/login.html?convite=${token}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/auth/verificar-convite — verifica token e retorna empresa
exports.verificarConvite = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token é obrigatório' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tipo !== 'convite') return res.status(400).json({ error: 'Token inválido' });
    const { rows } = await db.query('SELECT nome FROM empresas WHERE id=$1', [decoded.empresa_id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ empresa_id: decoded.empresa_id, empresa_nome: rows[0].nome });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Convite expirado' });
    res.status(400).json({ error: 'Token inválido' });
  }
};

// POST /api/auth/registrar-colaborador — cria usuário a partir de convite
exports.registrarColaborador = async (req, res) => {
  try {
    const { token, nome, email, senha, cargo } = req.body;
    if (!token || !nome || !email || !senha) return res.status(400).json({ error: 'Campos obrigatórios incompletos' });
    if (senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tipo !== 'convite') return res.status(400).json({ error: 'Token inválido' });
    const { rows: existe } = await db.query('SELECT id FROM usuarios WHERE email=$1', [email.toLowerCase().trim()]);
    if (existe.length > 0) return res.status(409).json({ error: 'E-mail já cadastrado' });
    const senhaHash = await bcrypt.hash(senha, 10);
    const { rows: [u] } = await db.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role) VALUES ($1,$2,$3,$4,$5,'colaborador') RETURNING id, nome, email, cargo, role, empresa_id`,
      [decoded.empresa_id, nome.trim(), email.toLowerCase().trim(), senhaHash, cargo?.trim() || null]
    );
    const { rows: [e] } = await db.query('SELECT nome FROM empresas WHERE id=$1', [decoded.empresa_id]);
    const novoToken = jwt.sign({ id: u.id, empresa_id: u.empresa_id, nome: u.nome, email: u.email, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token: novoToken, usuario: { ...u, empresa_nome: e?.nome || '' } });
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ error: 'Convite expirado' });
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/redefinir-senha — redefine senha direto pelo email, sem código
exports.redefinirSenha = async (req, res) => {
  try {
    const { email, nova_senha } = req.body;
    if (!email || !nova_senha) return res.status(400).json({ error: 'Email e nova senha são obrigatórios' });
    if (nova_senha.length < 6)  return res.status(400).json({ error: 'A senha deve ter ao menos 6 caracteres' });
    const { rows } = await db.query(
      `SELECT id FROM usuarios WHERE email=$1 AND ativo=true`,
      [email.toLowerCase().trim()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nenhum usuário ativo encontrado com este e-mail' });
    const senhaHash = await bcrypt.hash(nova_senha, 10);
    await db.query(`UPDATE usuarios SET senha_hash=$1 WHERE id=$2`, [senhaHash, rows[0].id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/auth/setup-dev — cria conta superdev se não existir (endpoint único de setup)
exports.setupDev = async (req, res) => {
  try {
    const EMAIL = 'dev@agriflow.app';
    const SENHA = 'Dev@2025#Agri';

    const { rows: existe } = await db.query(`SELECT id FROM usuarios WHERE email=$1`, [EMAIL]);
    if (existe.length) {
      return res.json({ ok: true, msg: 'Conta dev já existe', email: EMAIL });
    }

    let empresaId;
    const { rows: emp } = await db.query(`SELECT id FROM empresas WHERE nome='AgriFlow Dev'`);
    if (emp.length) {
      empresaId = emp[0].id;
    } else {
      const { rows: [e] } = await db.query(
        `INSERT INTO empresas (nome) VALUES ('AgriFlow Dev') RETURNING id`
      );
      empresaId = e.id;
    }

    const hash = await bcrypt.hash(SENHA, 10);
    await db.query(
      `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role, ativo)
       VALUES ($1, 'Dev Admin', $2, $3, 'Desenvolvedor', 'superdev', true)`,
      [empresaId, EMAIL, hash]
    );

    res.json({ ok: true, email: EMAIL, senha: SENHA });
  } catch (err) { res.status(500).json({ error: err.message }); }
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
