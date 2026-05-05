const db     = require('../db');
const crypto = require('crypto');

function _getKey() {
  const hex = process.env.COFRE_MASTER_KEY;
  if (!hex || hex.length !== 64) throw new Error('COFRE_MASTER_KEY inválida ou ausente');
  return Buffer.from(hex, 'hex');
}

function _encrypt(text) {
  const key = _getKey();
  const iv  = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    senha_criptografada: encrypted.toString('base64'),
    iv:  iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

function _decrypt(b64, ivHex, tagHex) {
  const key       = _getKey();
  const iv        = Buffer.from(ivHex, 'hex');
  const tag       = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(b64, 'base64');
  const decipher  = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function _adminOnly(req, res) {
  if (req.usuario.role !== 'admin' && req.usuario.role !== 'superdev') {
    res.status(403).json({ error: 'Acesso restrito a administradores' });
    return false;
  }
  return true;
}

async function _log(cofreId, usuarioId, acao, ip, userAgent) {
  await db.query(
    `INSERT INTO cofre_logs (cofre_id, usuario_id, acao, ip, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [cofreId, usuarioId, acao, ip, userAgent]
  );
}

// GET /api/clientes/:id/cofre
exports.listar = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT cs.id, cs.sistema, cs.login, cs.url, cs.observacao,
              u.nome AS criado_por_nome, cs.atualizado_em, cs.created_at
       FROM cofre_senhas cs
       LEFT JOIN usuarios u ON u.id = cs.criado_por
       WHERE cs.cliente_id = $1 AND cs.empresa_id = $2
       ORDER BY cs.sistema ASC`,
      [req.params.id, req.usuario.empresa_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar cofre:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/cofre
exports.criar = async (req, res) => {
  try {
    if (!_adminOnly(req, res)) return;

    const { sistema, login, senha, url, observacao } = req.body;
    if (!sistema || !login || !senha) {
      return res.status(400).json({ error: 'sistema, login e senha são obrigatórios' });
    }

    const { senha_criptografada, iv, tag } = _encrypt(senha);

    const { rows: [entrada] } = await db.query(
      `INSERT INTO cofre_senhas
         (cliente_id, empresa_id, sistema, login, senha_criptografada, iv, tag, url, observacao, criado_por, atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
       RETURNING id, sistema, login, url, observacao, created_at`,
      [
        req.params.id, req.usuario.empresa_id,
        sistema, login, senha_criptografada, iv, tag,
        url || null, observacao || null, req.usuario.id,
      ]
    );

    await _log(entrada.id, req.usuario.id, 'criou', req.ip, req.headers['user-agent']);

    res.status(201).json(entrada);
  } catch (err) {
    console.error('Erro ao criar entrada no cofre:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/clientes/:id/cofre/:cofreId/revelar
exports.revelar = async (req, res) => {
  try {
    if (!_adminOnly(req, res)) return;

    const { rows: [entrada] } = await db.query(
      `SELECT senha_criptografada, iv, tag FROM cofre_senhas
       WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    if (!entrada) return res.status(404).json({ error: 'Entrada não encontrada' });

    const senha = _decrypt(entrada.senha_criptografada, entrada.iv, entrada.tag);
    await _log(req.params.cofreId, req.usuario.id, 'visualizou', req.ip, req.headers['user-agent']);

    res.json({ senha });
  } catch (err) {
    console.error('Erro ao revelar senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/cofre/:cofreId/copiar
exports.copiar = async (req, res) => {
  try {
    if (!_adminOnly(req, res)) return;

    const { rows: [entrada] } = await db.query(
      `SELECT senha_criptografada, iv, tag FROM cofre_senhas
       WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    if (!entrada) return res.status(404).json({ error: 'Entrada não encontrada' });

    const senha = _decrypt(entrada.senha_criptografada, entrada.iv, entrada.tag);
    await _log(req.params.cofreId, req.usuario.id, 'copiou', req.ip, req.headers['user-agent']);

    res.json({ senha });
  } catch (err) {
    console.error('Erro ao copiar senha:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/clientes/:id/cofre/:cofreId
exports.editar = async (req, res) => {
  try {
    if (!_adminOnly(req, res)) return;

    const { sistema, login, url, observacao, senha } = req.body;

    let senhaFields = '';
    const vals = [sistema, login, url || null, observacao || null];
    let idx = 5;

    if (senha) {
      const enc = _encrypt(senha);
      senhaFields = `, senha_criptografada=$${idx++}, iv=$${idx++}, tag=$${idx++}`;
      vals.push(enc.senha_criptografada, enc.iv, enc.tag);
    }

    vals.push(req.params.cofreId, req.params.id, req.usuario.empresa_id);

    const { rows } = await db.query(
      `UPDATE cofre_senhas
       SET sistema=$1, login=$2, url=$3, observacao=$4${senhaFields}, atualizado_em=NOW()
       WHERE id=$${idx++} AND cliente_id=$${idx++} AND empresa_id=$${idx}
       RETURNING id, sistema, login, url, observacao, atualizado_em`,
      vals
    );
    if (!rows.length) return res.status(404).json({ error: 'Entrada não encontrada' });

    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar cofre:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/clientes/:id/cofre/:cofreId
exports.excluir = async (req, res) => {
  try {
    if (!_adminOnly(req, res)) return;

    const { rowCount } = await db.query(
      `DELETE FROM cofre_senhas WHERE id=$1 AND cliente_id=$2 AND empresa_id=$3`,
      [req.params.cofreId, req.params.id, req.usuario.empresa_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Entrada não encontrada' });

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir entrada do cofre:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
