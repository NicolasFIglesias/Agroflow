const db = require('../db');
// tagEngine (docxtemplater/pizzip) carregado lazy só no endpoint de download
// para não quebrar o resto do controller se os pacotes não estiverem instalados

const PREFIXOS = { arrendamento:'ARR', compra_venda:'CV', comodato:'COM', permuta:'PER', aluguel:'ALG', recibo:'REC', nota_promissoria:'NP' };
const TIPO_LABEL = { arrendamento:'Arrendamento Rural', compra_venda:'Compra e Venda', comodato:'Comodato', permuta:'Permuta', aluguel:'Aluguel', recibo:'Recibo', nota_promissoria:'Nota Promissória' };

async function _proximoNum(empresaId, tipo) {
  const ano = new Date().getFullYear();
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(numero_sequencial),0)+1 AS prox FROM contratos WHERE empresa_id=$1 AND tipo_contrato=$2 AND EXTRACT(year FROM created_at)=$3`,
    [empresaId, tipo, ano]
  );
  const seq = rows[0].prox;
  return { numero: `${PREFIXOS[tipo]||'DOC'}-${ano}-${String(seq).padStart(3,'0')}`, seq };
}

async function _getCliente(id, empresaId) {
  if (!id) return [null, null];
  const { rows: [c] } = await db.query(`SELECT * FROM clientes WHERE id=$1 AND empresa_id=$2 AND ativo=true`, [id, empresaId]);
  if (!c) return [null, null];
  const { rows: [conj] } = await db.query(`SELECT * FROM conjuges WHERE cliente_id=$1`, [id]);
  return [c, conj || null];
}

async function _getImovel(id, empresaId) {
  if (!id) return null;
  const { rows: [i] } = await db.query(`SELECT * FROM imoveis WHERE id=$1 AND empresa_id=$2 AND ativo=true`, [id, empresaId]);
  return i || null;
}

async function _getModelo(id, empresaId, tipo) {
  if (id) {
    const { rows: [m] } = await db.query(`SELECT * FROM modelos_documento WHERE id=$1 AND empresa_id=$2 AND ativo=true`, [id, empresaId]);
    if (m) return m;
  }
  const { rows: [m] } = await db.query(
    `SELECT * FROM modelos_documento WHERE empresa_id=$1 AND tipo_contrato=$2 AND ativo=true AND is_padrao=true LIMIT 1`,
    [empresaId, tipo]
  );
  return m || null;
}

exports.proximoNumero = async (req, res) => {
  try {
    const { tipo } = req.query;
    if (!tipo) return res.status(400).json({ error: 'tipo é obrigatório' });
    const { numero } = await _proximoNum(req.usuario.empresa_id, tipo);
    res.json({ numero });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.listar = async (req, res) => {
  try {
    const { busca = '', tipo, status, pagina = 1, por_pagina = 20 } = req.query;
    const limit  = Math.min(100, parseInt(por_pagina));
    const offset = (Math.max(1, parseInt(pagina)) - 1) * limit;
    let q = `SELECT id, numero, tipo_contrato, parte1_nome, parte2_nome, imovel_nome, data_assinatura, data_inicio, data_termino, status, valor, created_at
             FROM contratos WHERE empresa_id=$1`;
    const vals = [req.usuario.empresa_id]; let idx = 2;
    if (busca.trim()) { q += ` AND (parte1_nome ILIKE $${idx} OR parte2_nome ILIKE $${idx} OR numero ILIKE $${idx} OR imovel_nome ILIKE $${idx})`; vals.push(`%${busca.trim()}%`); idx++; }
    if (tipo)   { q += ` AND tipo_contrato=$${idx++}`; vals.push(tipo); }
    if (status) { q += ` AND status=$${idx++}`;        vals.push(status); }
    const countQ = `SELECT COUNT(*) FROM (${q}) sub`;
    const { rows: [{ count }] } = await db.query(countQ, vals);
    q += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    vals.push(limit, offset);
    const { rows } = await db.query(q, vals);
    res.json({ contratos: rows, total: parseInt(count), pagina: parseInt(pagina), total_paginas: Math.ceil(count / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.criar = async (req, res) => {
  try {
    const { tipo_contrato, cliente_id, cliente2_id, imovel_id, modelo_id, dados_formulario = {}, numero_custom } = req.body;
    if (!tipo_contrato) return res.status(400).json({ error: 'tipo_contrato é obrigatório' });

    const [c1, conj1] = await _getCliente(cliente_id,   req.usuario.empresa_id);
    const [c2]        = await _getCliente(cliente2_id,  req.usuario.empresa_id);
    const imovel      = await _getImovel(imovel_id,     req.usuario.empresa_id);
    const modelo      = await _getModelo(modelo_id,     req.usuario.empresa_id, tipo_contrato);

    const { numero, seq } = numero_custom
      ? { numero: numero_custom, seq: 0 }
      : await _proximoNum(req.usuario.empresa_id, tipo_contrato);

    const { rows: [ct] } = await db.query(
      `INSERT INTO contratos (empresa_id, numero, numero_sequencial, tipo_contrato, cliente_id, imovel_id, modelo_id,
         parte1_nome, parte1_cpf_cnpj, parte2_nome, parte2_cpf_cnpj, imovel_nome,
         data_assinatura, data_inicio, data_termino, status, valor, dados_formulario, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'ativo',$16,$17,$18) RETURNING *`,
      [
        req.usuario.empresa_id, numero, seq, tipo_contrato,
        cliente_id || null, imovel_id || null, modelo?.id || null,
        c1?.nome_completo || dados_formulario.parte1_nome || '',
        c1?.cpf || c1?.cnpj || '',
        c2?.nome_completo || dados_formulario.parte2_nome || '',
        c2?.cpf || c2?.cnpj || dados_formulario.parte2_cpf || '',
        imovel?.denominacao || dados_formulario.imovel_nome || '',
        dados_formulario.data_assinatura || null,
        dados_formulario.data_inicio     || null,
        dados_formulario.data_termino    || null,
        dados_formulario.valor ? parseFloat(dados_formulario.valor) : null,
        JSON.stringify(dados_formulario),
        req.usuario.id,
      ]
    );

    if (cliente_id) {
      await db.query(
        `INSERT INTO timeline (empresa_id, cliente_id, tipo, texto, criado_por, is_sistema) VALUES ($1,$2,'automatica',$3,$4,true)`,
        [req.usuario.empresa_id, cliente_id,
         `📄 Contrato de ${TIPO_LABEL[tipo_contrato]||tipo_contrato} gerado — Nº ${numero}${imovel ? ' · ' + imovel.denominacao : ''}`,
         req.usuario.id]
      ).catch(() => {});
    }

    await db.query(`DELETE FROM contratos_rascunhos WHERE usuario_id=$1 AND tipo_contrato=$2`, [req.usuario.id, tipo_contrato]);

    res.status(201).json({ ...ct, modelo_disponivel: !!modelo });
  } catch (err) {
    console.error('Erro ao criar contrato:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { rows: [c] } = await db.query(
      `SELECT ct.*, u.nome AS criado_por_nome FROM contratos ct LEFT JOIN usuarios u ON u.id=ct.criado_por WHERE ct.id=$1 AND ct.empresa_id=$2`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!c) return res.status(404).json({ error: 'Contrato não encontrado' });
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.download = async (req, res) => {
  try {
    const { gerarDocx, gerarDocxFromHtml, buildTags } = require('../services/tagEngine');
    const { rows: [ct] } = await db.query(`SELECT * FROM contratos WHERE id=$1 AND empresa_id=$2`, [req.params.id, req.usuario.empresa_id]);
    if (!ct) return res.status(404).json({ error: 'Contrato não encontrado' });

    const modelo = await _getModelo(ct.modelo_id, req.usuario.empresa_id, ct.tipo_contrato);
    if (!modelo || !modelo.arquivo_conteudo) {
      return res.status(400).json({ error: 'Nenhum modelo disponível para este tipo de contrato. Faça upload de um modelo primeiro.' });
    }

    const dados = ct.dados_formulario || {};
    const [c1, conj1] = await _getCliente(ct.cliente_id, req.usuario.empresa_id);
    const [c2]        = await _getCliente(dados.cliente2_id, req.usuario.empresa_id);
    const imovel      = await _getImovel(ct.imovel_id, req.usuario.empresa_id);

    const tags = buildTags(dados, c1, c2, imovel, conj1);
    const nomeArquivo = modelo.arquivo_nome || 'modelo.docx';
    const isHtml = nomeArquivo.toLowerCase().endsWith('.html') || nomeArquivo.toLowerCase().endsWith('.htm');

    if (isHtml) {
      const htmlTemplate = Buffer.from(modelo.arquivo_conteudo, 'base64').toString('utf8');
      const docxBuf = await gerarDocxFromHtml(htmlTemplate, tags);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${ct.numero}.docx"`);
      res.send(docxBuf);
    } else {
      const docxBuf = gerarDocx(modelo.arquivo_conteudo, tags);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${ct.numero}.docx"`);
      res.send(docxBuf);
    }
  } catch (err) {
    console.error('Erro no download:', err);
    res.status(500).json({ error: 'Erro ao gerar documento: ' + err.message });
  }
};

exports.duplicar = async (req, res) => {
  try {
    const { rows: [orig] } = await db.query(`SELECT * FROM contratos WHERE id=$1 AND empresa_id=$2`, [req.params.id, req.usuario.empresa_id]);
    if (!orig) return res.status(404).json({ error: 'Contrato não encontrado' });
    const { numero, seq } = await _proximoNum(req.usuario.empresa_id, orig.tipo_contrato);
    const { rows: [dup] } = await db.query(
      `INSERT INTO contratos (empresa_id, numero, numero_sequencial, tipo_contrato, cliente_id, imovel_id, modelo_id,
         parte1_nome, parte1_cpf_cnpj, parte2_nome, parte2_cpf_cnpj, imovel_nome, valor, dados_formulario, status, criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'rascunho',$15) RETURNING id, numero, tipo_contrato, dados_formulario`,
      [req.usuario.empresa_id, numero, seq, orig.tipo_contrato, orig.cliente_id, orig.imovel_id, orig.modelo_id,
       orig.parte1_nome, orig.parte1_cpf_cnpj, orig.parte2_nome, orig.parte2_cpf_cnpj, orig.imovel_nome,
       orig.valor, orig.dados_formulario, req.usuario.id]
    );
    res.status(201).json(dup);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.atualizar = async (req, res) => {
  try {
    const { dados_formulario, data_inicio, data_termino, data_assinatura, valor, parte1_nome, parte2_nome, imovel_nome } = req.body;
    const { rowCount } = await db.query(
      `UPDATE contratos SET
         dados_formulario = COALESCE($1, dados_formulario),
         data_inicio      = COALESCE($2, data_inicio),
         data_termino     = COALESCE($3, data_termino),
         data_assinatura  = COALESCE($4, data_assinatura),
         valor            = COALESCE($5, valor),
         parte1_nome      = COALESCE($6, parte1_nome),
         parte2_nome      = COALESCE($7, parte2_nome),
         imovel_nome      = COALESCE($8, imovel_nome),
         updated_at       = NOW()
       WHERE id=$9 AND empresa_id=$10`,
      [
        dados_formulario ? JSON.stringify(dados_formulario) : null,
        data_inicio || null, data_termino || null, data_assinatura || null,
        valor ? parseFloat(valor) : null,
        parte1_nome || null, parte2_nome || null, imovel_nome || null,
        req.params.id, req.usuario.empresa_id
      ]
    );
    if (!rowCount) return res.status(404).json({ error: 'Contrato não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.alterarStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { rowCount } = await db.query(`UPDATE contratos SET status=$1, updated_at=NOW() WHERE id=$2 AND empresa_id=$3`, [status, req.params.id, req.usuario.empresa_id]);
    if (!rowCount) return res.status(404).json({ error: 'Contrato não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.excluir = async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM contratos WHERE id=$1 AND empresa_id=$2`, [req.params.id, req.usuario.empresa_id]);
    if (!rowCount) return res.status(404).json({ error: 'Contrato não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
