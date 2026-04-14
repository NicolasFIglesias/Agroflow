const db     = require('../db');
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function _getMasterKey() {
  const hex = process.env.COFRE_MASTER_KEY || '';
  if (hex.length !== 64) {
    throw new Error('COFRE_MASTER_KEY deve ter 64 caracteres hexadecimais (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

function _encrypt(plaintext) {
  const key = _getMasterKey();
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    senha_criptografada: enc.toString('base64'),
    iv:  iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

function _decrypt(encBase64, ivBase64, tagBase64) {
  const key = _getMasterKey();
  const enc = Buffer.from(encBase64, 'base64');
  const iv  = Buffer.from(ivBase64,  'base64');
  const tag = Buffer.from(tagBase64, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc).toString('utf8') + decipher.final('utf8');
}

async function _logAuditoria(cofreId, usuarioId, acao, req) {
  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  await db.query(
    `INSERT INTO cofre_logs (cofre_id, usuario_id, acao, ip, user_agent) VALUES ($1,$2,$3,$4,$5)`,
    [cofreId, usuarioId, acao, ip.slice(0,45), ua.slice(0,500)]
  );
}

// GET /api/clientes/:id/cofre
exports.listar = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cs.id, cs.sistema, cs.login, cs.url, cs.observacao, cs.atualizado_em,
         u.nome AS criado_por_nome, ua.nome AS atualizado_por_nome
       FROM cofre_senhas cs
       JOIN usuarios u ON u.id = cs.criado_por
       LEFT JOIN usuarios ua ON ua.id = cs.atualizado_por
       WHERE cs.cliente_id = $1 AND cs.empresa_id = $2
       ORDER BY cs.sistema`,
      [req.params.id, req.usuario.empresa_id]
    );
    // Nunca retornar a senha na listagem
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar cofre:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/cofre (admin only)
exports.criar = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Apenas administradores podem criar credenciais' });

    const { sistema, login, senha, url, observacao } = req.body;
    if (!sistema || !login || !senha)
      return res.status(400).json({ error: 'sistema, login e senha são obrigatórios' });

    let enc;
    try { enc = _encrypt(senha); }
    catch (e) { return res.status(500).json({ error: 'Erro de criptografia: ' + e.message }); }

    const { rows: [entry] } = await db.query(
      `INSERT INTO cofre_senhas (empresa_id, cliente_id, sistema, login, senha_criptografada, iv, tag, url, observacao, criado_por, atualizado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id, sistema, login, url, observacao, atualizado_em`,
      [req.usuario.empresa_id, req.params.id, sistema, login,
       enc.senha_criptografada, enc.iv, enc.tag,
       url||null, observacao||null, req.usuario.id]
    );

    await _logAuditoria(entry.id, req.usuario.id, 'criou', req);

    // Entrada automática na timeline
    await db.query(
      `INSERT INTO timeline (empresa_id, cliente_id, tipo, texto, criado_por, is_sistema)
       VALUES ($1,$2,'automatica',$3,$4,true)`,
      [req.usuario.empresa_id, req.params.id, `Credencial "${sistema}" adicionada ao cofre por ${req.usuario.nome}`, req.usuario.id]
    );

    res.status(201).json(entry);
  } catch (err) {
    console.error('Erro ao criar credencial:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/clientes/:id/cofre/:cofreId/revelar (admin only)
exports.revelar = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Acesso negado' });

    const { rows: [entry] } = await db.query(
      `SELECT * FROM cofre_senhas WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    if (!entry) return res.status(404).json({ error: 'Credencial não encontrada' });

    let senha;
    try { senha = _decrypt(entry.senha_criptografada, entry.iv, entry.tag); }
    catch (e) { return res.status(500).json({ error: 'Erro ao descriptografar: ' + e.message }); }

    await _logAuditoria(entry.id, req.usuario.id, 'visualizou', req);
    await db.query(
      `INSERT INTO timeline (empresa_id, cliente_id, tipo, texto, criado_por, is_sistema)
       VALUES ($1,$2,'automatica',$3,$4,true)`,
      [req.usuario.empresa_id, req.params.id, `🔐 Credencial "${entry.sistema}" visualizada por ${req.usuario.nome}`, req.usuario.id]
    );

    res.json({ senha });
  } catch (err) {
    console.error('Erro ao revelar senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/cofre/:cofreId/copiar (admin only)
exports.copiar = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Acesso negado' });

    const { rows: [entry] } = await db.query(
      `SELECT * FROM cofre_senhas WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    if (!entry) return res.status(404).json({ error: 'Credencial não encontrada' });

    let senha;
    try { senha = _decrypt(entry.senha_criptografada, entry.iv, entry.tag); }
    catch (e) { return res.status(500).json({ error: 'Erro ao descriptografar: ' + e.message }); }

    await _logAuditoria(entry.id, req.usuario.id, 'copiou', req);
    await db.query(
      `INSERT INTO timeline (empresa_id, cliente_id, tipo, texto, criado_por, is_sistema)
       VALUES ($1,$2,'automatica',$3,$4,true)`,
      [req.usuario.empresa_id, req.params.id, `🔐 Credencial "${entry.sistema}" copiada por ${req.usuario.nome}`, req.usuario.id]
    );

    res.json({ senha });
  } catch (err) {
    console.error('Erro ao copiar senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/clientes/:id/cofre/:cofreId (admin only)
exports.editar = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Acesso negado' });

    const { sistema, login, senha, url, observacao } = req.body;
    const { rows: [entry] } = await db.query(
      `SELECT * FROM cofre_senhas WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    if (!entry) return res.status(404).json({ error: 'Credencial não encontrada' });

    let encFields = {};
    if (senha) {
      try { encFields = _encrypt(senha); }
      catch (e) { return res.status(500).json({ error: 'Erro de criptografia: ' + e.message }); }
    }

    const sets = ['sistema=$1','login=$2','url=$3','observacao=$4','atualizado_por=$5','atualizado_em=NOW()'];
    const vals = [sistema||entry.sistema, login||entry.login, url??entry.url, observacao??entry.observacao, req.usuario.id];
    let idx = 6;

    if (senha) {
      sets.push(`senha_criptografada=$${idx++}`, `iv=$${idx++}`, `tag=$${idx++}`);
      vals.push(encFields.senha_criptografada, encFields.iv, encFields.tag);
    }

    vals.push(req.params.cofreId, req.params.id, req.usuario.empresa_id);
    const { rows } = await db.query(
      `UPDATE cofre_senhas SET ${sets.join(',')}
       WHERE id=$${idx++} AND cliente_id=$${idx++} AND empresa_id=$${idx}
       RETURNING id, sistema, login, url, observacao, atualizado_em`,
      vals
    );

    await _logAuditoria(req.params.cofreId, req.usuario.id, 'editou', req);
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar credencial:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/clientes/:id/cofre/:cofreId (admin only)
exports.excluir = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Acesso negado' });

    await db.query(
      `DELETE FROM cofre_senhas WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir credencial:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/clientes/:id/cofre/:cofreId/logs (admin only)
exports.logs = async (req, res) => {
  try {
    if (req.usuario.role !== 'admin')
      return res.status(403).json({ error: 'Acesso negado' });

    const { rows } = await db.query(
      `SELECT cl.*, u.nome AS usuario_nome
       FROM cofre_logs cl
       JOIN usuarios u ON u.id = cl.usuario_id
       WHERE cl.cofre_id = $1
       ORDER BY cl.created_at DESC`,
      [req.params.cofreId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar logs:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
