const db = require('../db');

async function _buscarClienteCompleto(id, empresaId) {
  const { rows: [c] } = await db.query(
    `SELECT c.*,
       u.nome AS criado_por_nome,
       (SELECT COUNT(*) FROM cliente_imovel ci WHERE ci.cliente_id = c.id) AS total_imoveis
     FROM clientes c
     LEFT JOIN usuarios u ON u.id = c.criado_por
     WHERE c.id = $1 AND c.empresa_id = $2 AND c.ativo = true`,
    [id, empresaId]
  );
  if (!c) return null;

  const [{ rows: conjuge }, { rows: contas }, { rows: imoveis }] = await Promise.all([
    db.query(`SELECT * FROM conjuges WHERE cliente_id = $1`, [id]),
    db.query(`SELECT * FROM contas_bancarias WHERE cliente_id = $1 ORDER BY created_at`, [id]),
    db.query(
      `SELECT i.*, ci.percentual_participacao, ci.tipo_vinculo
       FROM imoveis i
       JOIN cliente_imovel ci ON ci.imovel_id = i.id
       WHERE ci.cliente_id = $1 AND i.ativo = true
       ORDER BY i.denominacao`,
      [id]
    ),
  ]);

  return { ...c, conjuge: conjuge[0] || null, contas, imoveis };
}

// GET /api/clientes
exports.listar = async (req, res) => {
  try {
    const { busca = '', pagina = 1, por_pagina = 20, municipio, tipo_pessoa } = req.query;
    const limit  = Math.min(100, parseInt(por_pagina));
    const offset = (Math.max(1, parseInt(pagina)) - 1) * limit;

    let q = `
      SELECT c.id, c.nome_completo, c.tipo_pessoa, c.cpf, c.cnpj,
        c.municipio, c.uf, c.celular, c.email, c.created_at,
        COUNT(DISTINCT ci.imovel_id) AS total_imoveis
      FROM clientes c
      LEFT JOIN cliente_imovel ci ON ci.cliente_id = c.id
      WHERE c.empresa_id = $1 AND c.ativo = true
    `;
    const vals = [req.usuario.empresa_id];
    let idx = 2;

    if (busca.trim()) {
      q += ` AND (
        c.nome_completo ILIKE $${idx} OR
        c.cpf ILIKE $${idx} OR
        c.cnpj ILIKE $${idx} OR
        c.municipio ILIKE $${idx} OR
        c.email ILIKE $${idx}
      )`;
      vals.push(`%${busca.trim()}%`);
      idx++;
    }
    if (municipio)   { q += ` AND c.municipio ILIKE $${idx++}`;  vals.push(`%${municipio}%`); }
    if (tipo_pessoa) { q += ` AND c.tipo_pessoa = $${idx++}`;     vals.push(tipo_pessoa); }

    q += ` GROUP BY c.id ORDER BY c.nome_completo`;

    const countQ = `SELECT COUNT(*) FROM (${q}) sub`;
    const { rows: [{ count }] } = await db.query(countQ, vals);

    q += ` LIMIT $${idx++} OFFSET $${idx}`;
    vals.push(limit, offset);

    const { rows } = await db.query(q, vals);
    res.json({
      clientes: rows.map(c => ({
        ...c,
        total_imoveis:  parseInt(c.total_imoveis),
        cpf_mascarado:  c.cpf  ? '•••.' + c.cpf.slice(4)  : null,
        cnpj_mascarado: c.cnpj ? '•••.' + c.cnpj.slice(4) : null,
      })),
      total: parseInt(count),
      pagina: parseInt(pagina),
      por_pagina: limit,
      total_paginas: Math.ceil(count / limit),
    });
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes
exports.criar = async (req, res) => {
  try {
    const {
      tipo_pessoa, nome_completo, nome_fantasia, cpf, cnpj, rg, orgao_emissor,
      data_nascimento, nacionalidade, estado_civil, profissao, dap_caf,
      inscricao_estadual, nirf,
      cep, logradouro, numero, complemento, bairro, municipio, uf,
      endereco_rural, caixa_postal,
      celular, celular2, telefone_fixo, email, email2,
      contato_referencia_nome, contato_referencia_telefone,
    } = req.body;

    if (!tipo_pessoa || !nome_completo || !celular)
      return res.status(400).json({ error: 'tipo_pessoa, nome_completo e celular são obrigatórios' });

    const { rows: [c] } = await db.query(
      `INSERT INTO clientes (
        empresa_id, tipo_pessoa, nome_completo, nome_fantasia, cpf, cnpj,
        rg, orgao_emissor, data_nascimento, nacionalidade, estado_civil, profissao,
        dap_caf, inscricao_estadual, nirf,
        cep, logradouro, numero, complemento, bairro, municipio, uf,
        endereco_rural, caixa_postal,
        celular, celular2, telefone_fixo, email, email2,
        contato_referencia_nome, contato_referencia_telefone, criado_por
       ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,$31,$32
       ) RETURNING id, nome_completo`,
      [
        req.usuario.empresa_id, tipo_pessoa, nome_completo, nome_fantasia || null,
        cpf || null, cnpj || null, rg || null, orgao_emissor || null,
        data_nascimento || null, nacionalidade || 'Brasileiro(a)', estado_civil || null,
        profissao || null, dap_caf || null, inscricao_estadual || null, nirf || null,
        cep || null, logradouro || null, numero || null, complemento || null,
        bairro || null, municipio || null, uf || null,
        endereco_rural || null, caixa_postal || null,
        celular, celular2 || null, telefone_fixo || null,
        email || null, email2 || null,
        contato_referencia_nome || null, contato_referencia_telefone || null,
        req.usuario.id,
      ]
    );

    const completo = await _buscarClienteCompleto(c.id, req.usuario.empresa_id);
    res.status(201).json(completo);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'CPF ou CNPJ já cadastrado nesta empresa' });
    }
    console.error('Erro ao criar cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/clientes/:id
exports.buscarPorId = async (req, res) => {
  try {
    const c = await _buscarClienteCompleto(req.params.id, req.usuario.empresa_id);
    if (!c) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json(c);
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/clientes/:id
exports.editar = async (req, res) => {
  try {
    const {
      tipo_pessoa, nome_completo, nome_fantasia, cpf, cnpj, rg, orgao_emissor,
      data_nascimento, nacionalidade, estado_civil, profissao, dap_caf,
      inscricao_estadual, nirf,
      cep, logradouro, numero, complemento, bairro, municipio, uf,
      endereco_rural, caixa_postal,
      celular, celular2, telefone_fixo, email, email2,
      contato_referencia_nome, contato_referencia_telefone,
    } = req.body;

    const { rows } = await db.query(
      `UPDATE clientes SET
        tipo_pessoa=$1, nome_completo=$2, nome_fantasia=$3, cpf=$4, cnpj=$5,
        rg=$6, orgao_emissor=$7, data_nascimento=$8, nacionalidade=$9,
        estado_civil=$10, profissao=$11, dap_caf=$12, inscricao_estadual=$13, nirf=$14,
        cep=$15, logradouro=$16, numero=$17, complemento=$18, bairro=$19,
        municipio=$20, uf=$21, endereco_rural=$22, caixa_postal=$23,
        celular=$24, celular2=$25, telefone_fixo=$26, email=$27, email2=$28,
        contato_referencia_nome=$29, contato_referencia_telefone=$30, updated_at=NOW()
       WHERE id=$31 AND empresa_id=$32 AND ativo=true
       RETURNING id`,
      [
        tipo_pessoa, nome_completo, nome_fantasia || null, cpf || null, cnpj || null,
        rg || null, orgao_emissor || null, data_nascimento || null,
        nacionalidade || 'Brasileiro(a)', estado_civil || null, profissao || null,
        dap_caf || null, inscricao_estadual || null, nirf || null,
        cep || null, logradouro || null, numero || null, complemento || null,
        bairro || null, municipio || null, uf || null,
        endereco_rural || null, caixa_postal || null,
        celular, celular2 || null, telefone_fixo || null,
        email || null, email2 || null,
        contato_referencia_nome || null, contato_referencia_telefone || null,
        req.params.id, req.usuario.empresa_id,
      ]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });

    const completo = await _buscarClienteCompleto(req.params.id, req.usuario.empresa_id);
    res.json(completo);
  } catch (err) {
    console.error('Erro ao editar cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/clientes/:id (soft delete)
exports.excluir = async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE clientes SET ativo=false, updated_at=NOW()
       WHERE id=$1 AND empresa_id=$2 RETURNING id`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir cliente:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/clientes/:id/conjuge
exports.upsertConjuge = async (req, res) => {
  try {
    const { nome_completo, cpf, rg, data_nascimento, profissao, telefone, email, regime_bens, dap_caf } = req.body;
    if (!nome_completo) return res.status(400).json({ error: 'nome_completo é obrigatório' });

    const { rows: [row] } = await db.query(
      `INSERT INTO conjuges (cliente_id, nome_completo, cpf, rg, data_nascimento, profissao, telefone, email, regime_bens, dap_caf)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (cliente_id) DO UPDATE SET
         nome_completo=$2, cpf=$3, rg=$4, data_nascimento=$5, profissao=$6,
         telefone=$7, email=$8, regime_bens=$9, dap_caf=$10, updated_at=NOW()
       RETURNING *`,
      [req.params.id, nome_completo, cpf||null, rg||null, data_nascimento||null,
       profissao||null, telefone||null, email||null, regime_bens||null, dap_caf||null]
    );
    res.json(row);
  } catch (err) {
    console.error('Erro ao salvar cônjuge:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/clientes/:id/conjuge
exports.excluirConjuge = async (req, res) => {
  try {
    await db.query(`DELETE FROM conjuges WHERE cliente_id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir cônjuge:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// GET /api/clientes/:id/contas
exports.listarContas = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT * FROM contas_bancarias WHERE cliente_id=$1 ORDER BY created_at`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar contas:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// POST /api/clientes/:id/contas
exports.criarConta = async (req, res) => {
  try {
    const { banco, agencia, numero_conta, tipo_conta, titular, cpf_cnpj_titular, chave_pix, tipo_chave_pix, observacao } = req.body;
    if (!banco || !agencia || !numero_conta || !tipo_conta)
      return res.status(400).json({ error: 'banco, agencia, numero_conta e tipo_conta são obrigatórios' });

    const { rows: [conta] } = await db.query(
      `INSERT INTO contas_bancarias
         (cliente_id, banco, agencia, numero_conta, tipo_conta, titular, cpf_cnpj_titular, chave_pix, tipo_chave_pix, observacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.params.id, banco, agencia, numero_conta, tipo_conta,
        titular || null, cpf_cnpj_titular || null,
        chave_pix || null, tipo_chave_pix || null, observacao || null,
      ]
    );
    res.status(201).json(conta);
  } catch (err) {
    console.error('Erro ao criar conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// PUT /api/clientes/:id/contas/:contaId
exports.editarConta = async (req, res) => {
  try {
    const { banco, agencia, numero_conta, tipo_conta, titular, cpf_cnpj_titular, chave_pix, tipo_chave_pix, observacao } = req.body;
    const { rows } = await db.query(
      `UPDATE contas_bancarias
       SET banco=$1, agencia=$2, numero_conta=$3, tipo_conta=$4, titular=$5,
           cpf_cnpj_titular=$6, chave_pix=$7, tipo_chave_pix=$8, observacao=$9
       WHERE id=$10 AND cliente_id=$11
       RETURNING *`,
      [
        banco, agencia, numero_conta, tipo_conta,
        titular || null, cpf_cnpj_titular || null,
        chave_pix || null, tipo_chave_pix || null, observacao || null,
        req.params.contaId, req.params.id,
      ]
    );
    if (!rows.length) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Erro ao editar conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// DELETE /api/clientes/:id/contas/:contaId
exports.excluirConta = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      `DELETE FROM contas_bancarias WHERE id=$1 AND cliente_id=$2`,
      [req.params.contaId, req.params.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Conta não encontrada' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    res.status(500).json({ error: 'Erro interno' });
  }
};
