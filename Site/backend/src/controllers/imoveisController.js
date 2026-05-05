const db = require('../db');

async function _buscarImovelCompleto(id, empresaId) {
  const { rows: [im] } = await db.query(
    `SELECT i.*, u.nome AS criado_por_nome
     FROM imoveis i
     LEFT JOIN usuarios u ON u.id = i.criado_por
     WHERE i.id = $1 AND i.empresa_id = $2 AND i.ativo = true`,
    [id, empresaId]
  );
  if (!im) return null;

  const { rows: proprietarios } = await db.query(
    `SELECT c.id, c.nome_completo, c.cpf, c.cnpj, c.celular,
       ci.percentual_participacao, ci.tipo_vinculo, ci.id AS vinculo_id
     FROM clientes c
     JOIN cliente_imovel ci ON ci.cliente_id = c.id
     WHERE ci.imovel_id = $1 AND c.ativo = true
     ORDER BY c.nome_completo`,
    [id]
  );

  return { ...im, proprietarios };
}

// GET /api/imoveis
exports.listar = async (req, res) => {
  try {
    const { busca = '', pagina = 1, por_pagina = 20, municipio, tipo } = req.query;
    const limit  = Math.min(100, parseInt(por_pagina));
    const offset = (Math.max(1, parseInt(pagina)) - 1) * limit;

    let q = `
      SELECT i.id, i.denominacao, i.municipio, i.uf, i.area_total_ha,
        i.tipo_imovel, i.situacao_ccir, i.vencimento_ccir, i.situacao_car,
        i.matricula, i.created_at,
        COUNT(DISTINCT ci.cliente_id) AS total_proprietarios
      FROM imoveis i
      LEFT JOIN cliente_imovel ci ON ci.imovel_id = i.id
      WHERE i.empresa_id = $1 AND i.ativo = true
    `;
    const vals = [req.usuario.empresa_id];
    let idx = 2;

    if (busca.trim()) {
      q += ` AND (i.denominacao ILIKE $${idx} OR i.municipio ILIKE $${idx} OR i.matricula ILIKE $${idx})`;
      vals.push(`%${busca.trim()}%`);
      idx++;
    }
    if (municipio) { q += ` AND i.municipio ILIKE $${idx++}`; vals.push(`%${municipio}%`); }
    if (tipo)      { q += ` AND i.tipo_imovel = $${idx++}`;   vals.push(tipo); }

    q += ` GROUP BY i.id ORDER BY i.denominacao`;

    const countQ = `SELECT COUNT(*) FROM (${q}) sub`;
    const { rows: [{ count }] } = await db.query(countQ, vals);

    q += ` LIMIT $${idx++} OFFSET $${idx}`;
    vals.push(limit, offset);

    const { rows } = await db.query(q, vals);
    res.json({
      imoveis: rows.map(i => ({ ...i, total_proprietarios: parseInt(i.total_proprietarios) })),
      total: parseInt(count),
      pagina: parseInt(pagina),
      por_pagina: limit,
      total_paginas: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Erro ao listar imóveis:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/imoveis
exports.criar = async (req, res) => {
  try {
    const {
      denominacao, municipio, uf, area_total_ha, tipo_imovel, localizacao,
      distrito, bioma, atividade_principal,
      matricula, cartorio_registro, livro_folha, data_registro, nirf,
      situacao_matricula, obs_matricula,
      numero_ccir, situacao_ccir, vencimento_ccir,
      numero_itr, ano_exercicio_itr, data_pagamento_itr, situacao_itr,
      inscricao_car, situacao_car, data_inscricao_car,
      modulos_fiscais, fracao_minima,
      confrontante_norte, confrontante_sul, confrontante_leste, confrontante_oeste, obs_confrontantes,
      latitude, longitude, datum, codigo_sncr, link_google_maps,
    } = req.body;

    if (!denominacao || !municipio || !uf || !area_total_ha)
      return res.status(400).json({ error: 'denominacao, municipio, uf e area_total_ha são obrigatórios' });

    const { rows: [im] } = await db.query(
      `INSERT INTO imoveis (
        empresa_id, denominacao, municipio, uf, area_total_ha, tipo_imovel, localizacao,
        distrito, bioma, atividade_principal,
        matricula, cartorio_registro, livro_folha, data_registro, nirf,
        situacao_matricula, obs_matricula,
        numero_ccir, situacao_ccir, vencimento_ccir,
        numero_itr, ano_exercicio_itr, data_pagamento_itr, situacao_itr,
        inscricao_car, situacao_car, data_inscricao_car,
        modulos_fiscais, fracao_minima,
        confrontante_norte, confrontante_sul, confrontante_leste, confrontante_oeste, obs_confrontantes,
        latitude, longitude, datum, codigo_sncr, link_google_maps, criado_por
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
        $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40
      ) RETURNING id`,
      [
        req.usuario.empresa_id, denominacao, municipio, uf, area_total_ha,
        tipo_imovel||null, localizacao||null, distrito||null, bioma||null, atividade_principal||null,
        matricula||null, cartorio_registro||null, livro_folha||null, data_registro||null, nirf||null,
        situacao_matricula||null, obs_matricula||null,
        numero_ccir||null, situacao_ccir||null, vencimento_ccir||null,
        numero_itr||null, ano_exercicio_itr||null, data_pagamento_itr||null, situacao_itr||null,
        inscricao_car||null, situacao_car||null, data_inscricao_car||null,
        modulos_fiscais||null, fracao_minima||null,
        confrontante_norte||null, confrontante_sul||null,
        confrontante_leste||null, confrontante_oeste||null, obs_confrontantes||null,
        latitude||null, longitude||null, datum||'SIRGAS 2000',
        codigo_sncr||null, link_google_maps||null, req.usuario.id,
      ]
    );

    const completo = await _buscarImovelCompleto(im.id, req.usuario.empresa_id);
    res.status(201).json(completo);
  } catch (err) {
    console.error('Erro ao criar imóvel:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/imoveis/:id
exports.buscarPorId = async (req, res) => {
  try {
    const im = await _buscarImovelCompleto(req.params.id, req.usuario.empresa_id);
    if (!im) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json(im);
  } catch (err) {
    console.error('Erro ao buscar imóvel:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/imoveis/:id
exports.editar = async (req, res) => {
  try {
    const fields = [
      'denominacao','municipio','uf','area_total_ha','tipo_imovel','localizacao',
      'distrito','bioma','atividade_principal',
      'matricula','cartorio_registro','livro_folha','data_registro','nirf',
      'situacao_matricula','obs_matricula',
      'numero_ccir','situacao_ccir','vencimento_ccir',
      'numero_itr','ano_exercicio_itr','data_pagamento_itr','situacao_itr',
      'inscricao_car','situacao_car','data_inscricao_car',
      'modulos_fiscais','fracao_minima',
      'confrontante_norte','confrontante_sul','confrontante_leste','confrontante_oeste','obs_confrontantes',
      'latitude','longitude','datum','codigo_sncr','link_google_maps',
    ];
    const vals = fields.map(f => req.body[f] ?? null);
    const sets = fields.map((f, i) => `${f}=$${i+1}`).join(',');

    const { rows } = await db.query(
      `UPDATE imoveis SET ${sets}, updated_at=NOW()
       WHERE id=$${fields.length+1} AND empresa_id=$${fields.length+2} AND ativo=true
       RETURNING id`,
      [...vals, req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado' });

    const completo = await _buscarImovelCompleto(req.params.id, req.usuario.empresa_id);
    res.json(completo);
  } catch (err) {
    console.error('Erro ao editar imóvel:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/imoveis/:id
exports.excluir = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE imoveis SET ativo=false, updated_at=NOW() WHERE id=$1 AND empresa_id=$2 RETURNING id`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Imóvel não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir imóvel:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/imoveis/:id/proprietarios
exports.vincularProprietario = async (req, res) => {
  try {
    const { cliente_id, percentual_participacao = 100, tipo_vinculo = 'proprietario' } = req.body;
    if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório' });

    const { rows: [v] } = await db.query(
      `INSERT INTO cliente_imovel (cliente_id, imovel_id, percentual_participacao, tipo_vinculo)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (cliente_id, imovel_id) DO UPDATE SET
         percentual_participacao=$3, tipo_vinculo=$4
       RETURNING *`,
      [cliente_id, req.params.id, percentual_participacao, tipo_vinculo]
    );
    res.status(201).json(v);
  } catch (err) {
    console.error('Erro ao vincular proprietário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/imoveis/:id/proprietarios/:vinculoId
exports.desvincularProprietario = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM cliente_imovel WHERE id=$1 AND imovel_id=$2`,
      [req.params.vinculoId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Vínculo não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao desvincular proprietário:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/imoveis/:id/proprietarios/:vinculoId
exports.editarVinculo = async (req, res) => {
  try {
    const { percentual_participacao, tipo_vinculo } = req.body;
    const { rows } = await db.query(
      `UPDATE cliente_imovel
       SET percentual_participacao=$1, tipo_vinculo=$2
       WHERE id=$3 AND imovel_id=$4
       RETURNING *`,
      [percentual_participacao, tipo_vinculo, req.params.vinculoId, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Vínculo não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar vínculo:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
