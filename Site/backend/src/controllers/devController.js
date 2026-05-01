// ============================================================
// AgriFlow — Controller do Painel do Desenvolvedor
// Acesso superdev apenas
// ============================================================
const db     = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

exports.overview = async (_req, res) => {
  try {
    const [{ rows: empresas }, { rows: counts }] = await Promise.all([
      db.query(`SELECT e.id, e.nome, e.created_at,
          COUNT(DISTINCT u.id) FILTER (WHERE u.ativo = true) AS total_usuarios,
          COUNT(DISTINCT c.id) FILTER (WHERE c.ativo = true) AS total_clientes,
          COUNT(DISTINCT i.id) FILTER (WHERE i.ativo = true) AS total_imoveis,
          COUNT(DISTINCT t.id) AS total_tarefas
        FROM empresas e
        LEFT JOIN usuarios u ON u.empresa_id = e.id
        LEFT JOIN clientes c ON c.empresa_id = e.id
        LEFT JOIN imoveis  i ON i.empresa_id = e.id
        LEFT JOIN tarefas  t ON t.empresa_id = e.id
        GROUP BY e.id
        ORDER BY e.created_at DESC`),
      db.query(`SELECT
          COUNT(*)                                           AS total_empresas,
          (SELECT COUNT(*) FROM usuarios WHERE ativo=true)  AS total_usuarios,
          (SELECT COUNT(*) FROM clientes WHERE ativo=true)  AS total_clientes,
          (SELECT COUNT(*) FROM imoveis  WHERE ativo=true)  AS total_imoveis,
          (SELECT COUNT(*) FROM tarefas)                    AS total_tarefas
        FROM empresas`),
    ]);
    res.json({ empresas, totais: counts[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.usuarios = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, nome, email, cargo, role, ativo, created_at
       FROM usuarios
       WHERE empresa_id = $1
       ORDER BY created_at`,
      [req.params.empresaId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.atualizarUsuario = async (req, res) => {
  try {
    const { nome, email, cargo, role, ativo } = req.body;
    const sets = [];
    const vals = [];
    let i = 1;

    if (nome  !== undefined) { sets.push(`nome  = $${i++}`); vals.push(nome); }
    if (email !== undefined) { sets.push(`email = $${i++}`); vals.push(email); }
    if (cargo !== undefined) { sets.push(`cargo = $${i++}`); vals.push(cargo); }
    if (role  !== undefined) { sets.push(`role  = $${i++}`); vals.push(role); }
    if (ativo !== undefined) { sets.push(`ativo = $${i++}`); vals.push(ativo); }

    if (sets.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    vals.push(req.params.usuarioId);
    const { rowCount } = await db.query(
      `UPDATE usuarios SET ${sets.join(', ')} WHERE id = $${i}`,
      vals
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'E-mail já em uso' });
    res.status(500).json({ error: err.message });
  }
};

exports.resetarSenha = async (req, res) => {
  try {
    const { nova_senha } = req.body;
    if (!nova_senha || nova_senha.length < 4)
      return res.status(400).json({ error: 'Senha deve ter ao menos 4 caracteres' });

    const hash = await bcrypt.hash(nova_senha, 8);
    const { rowCount } = await db.query(
      `UPDATE usuarios SET senha_hash = $1 WHERE id = $2`,
      [hash, req.params.usuarioId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.dadosEmpresa = async (req, res) => {
  try {
    const eId = req.params.empresaId;
    const [
      { rows: clientes },
      { rows: imoveis },
      { rows: tarefas },
      { rows: projetos },
    ] = await Promise.all([
      db.query(`SELECT id, nome_completo, tipo_pessoa, cpf, cnpj, celular, email, municipio, uf, ativo, created_at
                FROM clientes WHERE empresa_id=$1 ORDER BY nome_completo`, [eId]),
      db.query(`SELECT id, denominacao, municipio, uf, area_total_ha, situacao_car, vencimento_ccir, ativo, created_at
                FROM imoveis WHERE empresa_id=$1 ORDER BY denominacao`, [eId]),
      db.query(`SELECT id, titulo, status, prioridade, tipo, data_inicio, atribuido_a, created_at
                FROM tarefas WHERE empresa_id=$1 ORDER BY created_at DESC LIMIT 100`, [eId]),
      db.query(`SELECT id, nome, status, cor, created_at
                FROM projetos WHERE empresa_id=$1 ORDER BY created_at DESC`, [eId]),
    ]);
    res.json({ clientes, imoveis, tarefas, projetos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.cofre = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id, titulo, login, senha_enc, url, notas, created_at
       FROM cofre_senhas WHERE cliente_id=$1 ORDER BY titulo`,
      [req.params.clienteId]
    );

    const ALGORITHM = 'aes-256-gcm';
    const hex = process.env.COFRE_MASTER_KEY || '';
    if (hex.length !== 64) {
      return res.json(rows.map(r => ({ ...r, senha_dec: '[COFRE_MASTER_KEY não configurado]' })));
    }
    const masterKey = Buffer.from(hex, 'hex');

    const decryptados = rows.map(r => {
      try {
        const raw = Buffer.from(r.senha_enc, 'base64');
        const iv  = raw.slice(0, 16);
        const tag = raw.slice(16, 32);
        const enc = raw.slice(32);
        const decipher = crypto.createDecipheriv(ALGORITHM, masterKey, iv);
        decipher.setAuthTag(tag);
        const senha_dec = decipher.update(enc) + decipher.final('utf8');
        return { ...r, senha_dec };
      } catch {
        return { ...r, senha_dec: '[erro ao descriptografar]' };
      }
    });
    res.json(decryptados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
