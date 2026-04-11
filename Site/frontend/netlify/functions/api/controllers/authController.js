const db      = require('../db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const { rows } = await db.query(
      `SELECT u.*, e.nome AS empresa_nome FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.email = $1 AND u.ativo = true`,
      [email.toLowerCase().trim()]
    );

    if (!rows.length) return res.status(401).json({ error: 'Credenciais inválidas' });

    const usuario = rows[0];
    if (!await bcrypt.compare(senha, usuario.senha_hash))
      return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = jwt.sign(
      { id: usuario.id, empresa_id: usuario.empresa_id, nome: usuario.nome, email: usuario.email, role: usuario.role },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({ token, usuario: {
      id: usuario.id, nome: usuario.nome, email: usuario.email,
      cargo: usuario.cargo, role: usuario.role,
      empresa_id: usuario.empresa_id, empresa_nome: usuario.empresa_nome
    }});
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// POST /api/auth/register — cria empresa + admin (tipo:'admin')
//                          ou cria colaborador via convite (tipo:'colaborador')
exports.register = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { tipo } = req.body;

    if (tipo === 'colaborador') {
      // ── Colaborador via convite ──────────────────────────────
      const { convite_token, email, senha, cargo } = req.body;
      if (!convite_token || !email || !senha || !cargo)
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
      if (senha.length < 6)
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

      let decoded;
      try { decoded = jwt.verify(convite_token, process.env.JWT_SECRET); }
      catch { return res.status(400).json({ error: 'Link de convite inválido ou expirado' }); }
      if (decoded.type !== 'convite')
        return res.status(400).json({ error: 'Link de convite inválido' });

      const { rows: existe } = await client.query('SELECT id FROM usuarios WHERE email=$1', [email.toLowerCase().trim()]);
      if (existe.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Email já cadastrado' }); }

      const { rows: [empresa] } = await client.query('SELECT nome FROM empresas WHERE id=$1', [decoded.empresa_id]);
      if (!empresa) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Empresa não encontrada' }); }

      const senhaHash = await bcrypt.hash(senha, 10);
      const { rows: [usuario] } = await client.query(
        `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role)
         VALUES ($1, $2, $3, $4, $5, 'colaborador') RETURNING id, nome, email, cargo, role, empresa_id`,
        [decoded.empresa_id, email.split('@')[0].trim(), email.toLowerCase().trim(), senhaHash, cargo]
      );

      await client.query('COMMIT');
      const token = jwt.sign(
        { id: usuario.id, empresa_id: decoded.empresa_id, nome: usuario.nome, email: usuario.email, role: 'colaborador' },
        process.env.JWT_SECRET, { expiresIn: '7d' }
      );
      return res.status(201).json({ token, usuario: { ...usuario, empresa_nome: empresa.nome } });

    } else {
      // ── Admin: cria empresa + usuário admin ─────────────────
      const { empresa_nome, nome, email, senha, cargo, telefone } = req.body;
      if (!empresa_nome || !nome || !email || !senha)
        return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos' });
      if (senha.length < 6)
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

      const { rows: existe } = await client.query('SELECT id FROM usuarios WHERE email=$1', [email.toLowerCase().trim()]);
      if (existe.length) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Este email já está cadastrado' }); }

      const { rows: [empresa] } = await client.query(
        'INSERT INTO empresas (nome) VALUES ($1) RETURNING id, nome', [empresa_nome.trim()]
      );
      const senhaHash = await bcrypt.hash(senha, 10);
      const { rows: [usuario] } = await client.query(
        `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, cargo, role)
         VALUES ($1,$2,$3,$4,$5,'admin') RETURNING id, nome, email, cargo, role, empresa_id`,
        [empresa.id, nome.trim(), email.toLowerCase().trim(), senhaHash, cargo?.trim() || null]
      );

      await client.query('COMMIT');
      const token = jwt.sign(
        { id: usuario.id, empresa_id: empresa.id, nome: usuario.nome, email: usuario.email, role: 'admin' },
        process.env.JWT_SECRET, { expiresIn: '7d' }
      );
      return res.status(201).json({ token, usuario: { ...usuario, empresa_nome: empresa.nome } });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro no registro:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  } finally {
    client.release();
  }
};

// POST /api/auth/convite — admin gera link de convite
exports.gerarConvite = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Apenas administradores podem gerar convites' });

    const token = jwt.sign(
      { empresa_id: req.usuario.empresa_id, type: 'convite' },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    const baseUrl = req.headers.origin || 'https://agrflow.netlify.app';
    res.json({ token, link: `${baseUrl}/pages/login.html?convite=${token}` });
  } catch (err) {
    console.error('Erro ao gerar convite:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/auth/convite/:token — valida convite e retorna empresa
exports.verificarConvite = async (req, res) => {
  try {
    const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
    if (decoded.type !== 'convite') return res.status(400).json({ error: 'Token inválido' });

    const { rows } = await db.query('SELECT nome FROM empresas WHERE id=$1', [decoded.empresa_id]);
    if (!rows.length) return res.status(404).json({ error: 'Empresa não encontrada' });

    res.json({ empresa_id: decoded.empresa_id, empresa_nome: rows[0].nome });
  } catch (err) {
    res.status(400).json({ error: 'Link de convite inválido ou expirado' });
  }
};

// GET /api/auth/me
exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.nome, u.email, u.cargo, u.role, u.empresa_id, e.nome AS empresa_nome
       FROM usuarios u JOIN empresas e ON e.id = u.empresa_id WHERE u.id=$1`,
      [req.usuario.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro em /me:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
