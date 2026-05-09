const db = require('../db');

exports.listar = async (req, res) => {
  try {
    const { tipo } = req.query;
    let q = `SELECT id, tipo_contrato, nome, descricao, arquivo_nome, tags_detectadas, is_padrao, is_sistema, ativo, criado_por, created_at
             FROM modelos_documento WHERE empresa_id=$1 AND ativo=true`;
    const vals = [req.usuario.empresa_id];
    if (tipo) { q += ` AND tipo_contrato=$2`; vals.push(tipo); }
    q += ` ORDER BY tipo_contrato, is_padrao DESC, nome`;
    const { rows } = await db.query(q, vals);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// Accepts: { tipo_contrato, nome, descricao?, arquivo_nome, arquivo_base64 }
exports.upload = async (req, res) => {
  try {
    const { tipo_contrato, nome, descricao, arquivo_nome, arquivo_base64 } = req.body;
    if (!tipo_contrato || !nome)          return res.status(400).json({ error: 'tipo_contrato e nome são obrigatórios' });
    if (!arquivo_base64)                  return res.status(400).json({ error: 'arquivo_base64 é obrigatório' });
    const ext = (arquivo_nome || '').toLowerCase().split('.').pop();
    if (!['docx', 'html', 'htm'].includes(ext))
      return res.status(400).json({ error: 'Apenas arquivos .docx ou .html são aceitos' });

    let tags = [];
    try {
      const { detectarTags, detectarTagsHtml } = require('../services/tagEngine');
      if (ext === 'docx') {
        tags = detectarTags(arquivo_base64);
      } else {
        const htmlText = Buffer.from(arquivo_base64, 'base64').toString('utf8');
        tags = detectarTagsHtml(htmlText);
      }
    } catch {}

    const { rows: [m] } = await db.query(
      `INSERT INTO modelos_documento (empresa_id, tipo_contrato, nome, descricao, arquivo_nome, arquivo_conteudo, tags_detectadas, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, tipo_contrato, nome, tags_detectadas, is_padrao`,
      [req.usuario.empresa_id, tipo_contrato, nome, descricao || null, arquivo_nome || 'modelo.docx', arquivo_base64, JSON.stringify(tags), req.usuario.id]
    );
    res.status(201).json({ ...m, tags_detectadas: tags });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.download = async (req, res) => {
  try {
    const { rows: [m] } = await db.query(
      `SELECT arquivo_nome, arquivo_conteudo FROM modelos_documento WHERE id=$1 AND empresa_id=$2`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!m || !m.arquivo_conteudo) return res.status(404).json({ error: 'Modelo não encontrado' });
    const nome = m.arquivo_nome || 'modelo.docx';
    const isHtml = nome.toLowerCase().endsWith('.html') || nome.toLowerCase().endsWith('.htm');
    if (isHtml) {
      const html = Buffer.from(m.arquivo_conteudo, 'base64').toString('utf8');
      const nomeDoc = nome.replace(/\.html?$/i, '.doc');
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="${nomeDoc}"`);
      res.send(html);
    } else {
      const buf = Buffer.from(m.arquivo_conteudo, 'base64');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
      res.send(buf);
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.atualizar = async (req, res) => {
  try {
    const { nome, descricao, is_padrao } = req.body;
    if (is_padrao) {
      const { rows: [m] } = await db.query(`SELECT tipo_contrato FROM modelos_documento WHERE id=$1`, [req.params.id]);
      if (m) await db.query(`UPDATE modelos_documento SET is_padrao=false WHERE empresa_id=$1 AND tipo_contrato=$2`, [req.usuario.empresa_id, m.tipo_contrato]);
    }
    const { rows } = await db.query(
      `UPDATE modelos_documento SET nome=COALESCE($1,nome), descricao=COALESCE($2,descricao), is_padrao=COALESCE($3,is_padrao), updated_at=NOW()
       WHERE id=$4 AND empresa_id=$5 AND is_sistema=false RETURNING id, nome, is_padrao`,
      [nome || null, descricao ?? null, is_padrao ?? null, req.params.id, req.usuario.empresa_id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Modelo não encontrado ou é de sistema' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.desativar = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `UPDATE modelos_documento SET ativo=false WHERE id=$1 AND empresa_id=$2 AND is_sistema=false`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Modelo não encontrado ou é de sistema' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
