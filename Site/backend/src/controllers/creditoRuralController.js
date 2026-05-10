const db = require('../db');

const ETAPAS = ['Captação','Documentos','Visita Técnica','Elaboração','Protocolo','Análise Banco','Contrato','Liberação','TRT'];
const MODALIDADE_LABEL = {
  custeio_agricola:'Custeio Agrícola', custeio_pecuario:'Custeio Pecuário',
  investimento:'Investimento', microcredito:'Microcrédito Rural', credito_fundiario:'Crédito Fundiário'
};

async function _proximoNum(empresaId) {
  const ano = new Date().getFullYear();
  const { rows } = await db.query(
    `SELECT COALESCE(MAX(numero_sequencial),0)+1 AS prox FROM projetos_credito WHERE empresa_id=$1 AND EXTRACT(year FROM created_at)=$2`,
    [empresaId, ano]
  );
  const seq = rows[0].prox;
  return { numero: `CR-${ano}-${String(seq).padStart(3,'0')}`, seq };
}

exports.dashboard = async (req, res) => {
  try {
    const eid = req.usuario.empresa_id;
    const [totais, porEtapa, porModalidade, comissoes] = await Promise.all([
      db.query(`SELECT COUNT(*) total, COUNT(*) FILTER (WHERE status='ativo') ativos, COUNT(*) FILTER (WHERE status='concluido') concluidos FROM projetos_credito WHERE empresa_id=$1`, [eid]),
      db.query(`SELECT etapa_atual, COUNT(*) total FROM projetos_credito WHERE empresa_id=$1 AND status='ativo' GROUP BY etapa_atual ORDER BY etapa_atual`, [eid]),
      db.query(`SELECT modalidade, COUNT(*) total FROM projetos_credito WHERE empresa_id=$1 GROUP BY modalidade`, [eid]),
      db.query(`SELECT COALESCE(SUM(valor_comissao),0) a_receber FROM projetos_credito WHERE empresa_id=$1 AND status_comissao='a_receber'`, [eid]),
    ]);
    res.json({
      totais: totais.rows[0],
      por_etapa: porEtapa.rows,
      por_modalidade: porModalidade.rows,
      comissoes_a_receber: comissoes.rows[0].a_receber,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.listar = async (req, res) => {
  try {
    const { busca='', modalidade, banco, etapa, status, status_comissao, tecnico_id, pagina=1, por_pagina=20 } = req.query;
    const limit = Math.min(100, parseInt(por_pagina));
    const offset = (Math.max(1, parseInt(pagina))-1)*limit;
    let q = `SELECT p.id, p.numero, p.modalidade, p.banco, p.etapa_atual, p.status,
               p.valor_solicitado, p.valor_liberado, p.percentual_comissao, p.valor_comissao,
               p.status_comissao, p.data_recebimento_comissao, p.data_abertura, p.updated_at,
               p.cliente_id,
               c.nome_completo AS cliente_nome, i.denominacao AS imovel_nome,
               u.nome AS tecnico_nome
             FROM projetos_credito p
             LEFT JOIN clientes c ON c.id=p.cliente_id
             LEFT JOIN imoveis i ON i.id=p.imovel_id
             LEFT JOIN usuarios u ON u.id=p.tecnico_id
             WHERE p.empresa_id=$1`;
    const vals=[req.usuario.empresa_id]; let idx=2;
    if (busca.trim())    { q+=` AND (c.nome_completo ILIKE $${idx} OR p.numero ILIKE $${idx})`; vals.push(`%${busca.trim()}%`); idx++; }
    if (modalidade)      { q+=` AND p.modalidade=$${idx++}`; vals.push(modalidade); }
    if (banco)           { q+=` AND p.banco=$${idx++}`; vals.push(banco); }
    if (etapa)           { q+=` AND p.etapa_atual=$${idx++}`; vals.push(parseInt(etapa)); }
    if (status)          { q+=` AND p.status=$${idx++}`; vals.push(status); }
    if (status_comissao) { q+=` AND p.status_comissao=$${idx++}`; vals.push(status_comissao); }
    if (tecnico_id)      { q+=` AND p.tecnico_id=$${idx++}`; vals.push(tecnico_id); }
    const { rows:[{count}] } = await db.query(`SELECT COUNT(*) FROM (${q}) sub`, vals);
    q+=` ORDER BY p.updated_at DESC LIMIT $${idx++} OFFSET $${idx}`;
    vals.push(limit,offset);
    const { rows } = await db.query(q, vals);
    res.json({ projetos: rows, total: parseInt(count), pagina: parseInt(pagina), total_paginas: Math.ceil(count/limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.criar = async (req, res) => {
  try {
    const { modalidade, programa, banco, agencia, gerente_banco, tecnico_id,
            cliente_id, conjuge_incluido, imovel_id, area_financiada, cultura, safra,
            produtividade_esperada, preco_venda_estimado,
            valor_solicitado, percentual_comissao=3.0, prazo_estimado } = req.body;
    if (!modalidade || !banco || !valor_solicitado) return res.status(400).json({ error: 'modalidade, banco e valor_solicitado são obrigatórios' });
    const { numero, seq } = await _proximoNum(req.usuario.empresa_id);
    const { rows:[p] } = await db.query(
      `INSERT INTO projetos_credito
         (empresa_id,numero,numero_sequencial,modalidade,programa,banco,agencia,gerente_banco,
          tecnico_id,cliente_id,conjuge_incluido,imovel_id,area_financiada,cultura,safra,
          produtividade_esperada,preco_venda_estimado,valor_solicitado,percentual_comissao,prazo_estimado,criado_por)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [req.usuario.empresa_id,numero,seq,modalidade,programa||null,banco,agencia||null,gerente_banco||null,
       tecnico_id||req.usuario.id,cliente_id||null,conjuge_incluido||false,imovel_id||null,
       area_financiada||null,cultura||null,safra||null,produtividade_esperada||null,preco_venda_estimado||null,
       parseFloat(valor_solicitado),parseFloat(percentual_comissao),prazo_estimado||null,req.usuario.id]
    );
    // Register first stage
    await db.query(
      `INSERT INTO etapas_projeto (projeto_id,etapa,status_etapa,data_inicio,alterado_por) VALUES ($1,1,'Novo',$2,$3)`,
      [p.id, new Date().toISOString().slice(0,10), req.usuario.id]
    );
    // Timeline
    if (cliente_id) {
      await db.query(
        `INSERT INTO timeline (empresa_id,cliente_id,tipo,texto,criado_por,is_sistema) VALUES ($1,$2,'automatica',$3,$4,true)`,
        [req.usuario.empresa_id, cliente_id, `📋 Projeto de crédito aberto — ${numero} (${MODALIDADE_LABEL[modalidade]||modalidade})`, req.usuario.id]
      ).catch(()=>{});
    }
    res.status(201).json(p);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.buscarPorId = async (req, res) => {
  try {
    const { rows:[p] } = await db.query(
      `SELECT p.*, c.nome_completo AS cliente_nome, c.cpf AS cliente_cpf,
              i.denominacao AS imovel_nome, i.area_total_ha AS imovel_area,
              u.nome AS tecnico_nome
       FROM projetos_credito p
       LEFT JOIN clientes c ON c.id=p.cliente_id
       LEFT JOIN imoveis i ON i.id=p.imovel_id
       LEFT JOIN usuarios u ON u.id=p.tecnico_id
       WHERE p.id=$1 AND p.empresa_id=$2`,
      [req.params.id, req.usuario.empresa_id]
    );
    if (!p) return res.status(404).json({ error: 'Projeto não encontrado' });
    const { rows: etapas } = await db.query(
      `SELECT * FROM etapas_projeto WHERE projeto_id=$1 ORDER BY etapa, created_at DESC`, [p.id]
    );
    res.json({ ...p, etapas });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.atualizar = async (req, res) => {
  try {
    const campos = ['modalidade','programa','banco','agencia','gerente_banco','tecnico_id',
      'cliente_id','conjuge_incluido','imovel_id','area_financiada','cultura','safra',
      'produtividade_esperada','preco_venda_estimado','valor_solicitado','valor_aprovado',
      'valor_liberado','percentual_comissao','valor_comissao','status_comissao',
      'data_recebimento_comissao','forma_recebimento','obs_financeiras','prazo_estimado','status'];
    const sets = []; const vals = []; let idx = 1;
    for (const c of campos) {
      if (req.body[c] !== undefined) { sets.push(`${c}=$${idx++}`); vals.push(req.body[c]); }
    }
    if (!sets.length) return res.json({ ok: true });
    sets.push(`updated_at=NOW()`);
    vals.push(req.params.id, req.usuario.empresa_id);
    await db.query(`UPDATE projetos_credito SET ${sets.join(',')} WHERE id=$${idx++} AND empresa_id=$${idx}`, vals);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.avancarEtapa = async (req, res) => {
  try {
    const { etapa, status_etapa, observacoes, pendencias } = req.body;
    const { rows:[p] } = await db.query(`SELECT * FROM projetos_credito WHERE id=$1 AND empresa_id=$2`, [req.params.id, req.usuario.empresa_id]);
    if (!p) return res.status(404).json({ error: 'Projeto não encontrado' });
    const hoje = new Date().toISOString().slice(0,10);
    // Close current stage
    await db.query(
      `UPDATE etapas_projeto SET data_conclusao=$1 WHERE projeto_id=$2 AND etapa=$3 AND data_conclusao IS NULL`,
      [hoje, p.id, p.etapa_atual]
    );
    // Open new stage
    await db.query(
      `INSERT INTO etapas_projeto (projeto_id,etapa,status_etapa,data_inicio,observacoes,pendencias,alterado_por) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [p.id, etapa, status_etapa||null, hoje, observacoes||null, pendencias||null, req.usuario.id]
    );
    await db.query(`UPDATE projetos_credito SET etapa_atual=$1, updated_at=NOW() WHERE id=$2`, [etapa, p.id]);
    // Timeline
    if (p.cliente_id) {
      await db.query(
        `INSERT INTO timeline (empresa_id,cliente_id,tipo,texto,criado_por,is_sistema) VALUES ($1,$2,'automatica',$3,$4,true)`,
        [req.usuario.empresa_id, p.cliente_id,
         `📋 ${p.numero} avançou para etapa ${etapa}: ${ETAPAS[etapa-1]||''}${status_etapa?' — '+status_etapa:''}`,
         req.usuario.id]
      ).catch(()=>{});
    }
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.excluir = async (req, res) => {
  try {
    const { rowCount } = await db.query(`DELETE FROM projetos_credito WHERE id=$1 AND empresa_id=$2`, [req.params.id, req.usuario.empresa_id]);
    if (!rowCount) return res.status(404).json({ error: 'Projeto não encontrado' });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
