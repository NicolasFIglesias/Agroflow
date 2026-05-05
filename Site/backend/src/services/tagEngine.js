const Docxtemplater = require('docxtemplater');
const PizZip        = require('pizzip');
const { valorPorExtenso, prazoPorExtenso, dataExtenso } = require('./extenso');
const { buildQualificacao, _endereco } = require('./qualificacao');

function detectarTags(base64) {
  try {
    const buf = Buffer.from(base64, 'base64');
    const zip = new PizZip(buf);
    const doc = new Docxtemplater(zip, { nullGetter: () => '' });
    const txt = doc.getFullText();
    const m   = [...txt.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)];
    return [...new Set(m.map(x => x[1]))];
  } catch { return []; }
}

function gerarDocx(base64Modelo, dados) {
  const buf = Buffer.from(base64Modelo, 'base64');
  const zip = new PizZip(buf);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
  doc.render(dados);
  return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function buildTags(dados, cliente1, cliente2, imovel, conjuge1) {
  const hoje = new Date().toISOString().slice(0, 10);
  const tags = {
    DATA_HOJE:            dataExtenso(hoje),
    DATA_HOJE_NUMERICO:   new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR'),
    DATA_ASSINATURA:      dados.data_assinatura ? dataExtenso(dados.data_assinatura) : '',
    LOCAL_ASSINATURA:     dados.local_assinatura || '',
    FORO:                 dados.foro || '',
    CLAUSULAS_ADICIONAIS: dados.clausulas_adicionais || '',
    TESTEMUNHA1_NOME:     dados.testemunha1_nome || '',
    TESTEMUNHA1_CPF:      dados.testemunha1_cpf || '',
    TESTEMUNHA2_NOME:     dados.testemunha2_nome || '',
    TESTEMUNHA2_CPF:      dados.testemunha2_cpf || '',
    DATA_INICIO:          dados.data_inicio  ? dataExtenso(dados.data_inicio)  : '',
    DATA_TERMINO:         dados.data_termino ? dataExtenso(dados.data_termino) : '',
    PRAZO_EXTENSO:        dados.data_inicio && dados.data_termino ? prazoPorExtenso(dados.data_inicio, dados.data_termino) : (dados.prazo_extenso || ''),
    VALOR_EXTENSO:        dados.valor ? valorPorExtenso(dados.valor) : (dados.valor_extenso || ''),
    FORMA_PAGAMENTO:      dados.forma_pagamento || '',
    // passthrough todos os campos do formulário como MAIÚSCULA
    ...Object.fromEntries(Object.entries(dados).map(([k, v]) => [k.toUpperCase(), v ?? ''])),
  };

  if (cliente1) {
    const q1 = buildQualificacao(cliente1, conjuge1);
    Object.assign(tags, {
      CLIENTE1_NOME: cliente1.nome_completo || '', CLIENTE1_CPF: cliente1.cpf || '', CLIENTE1_CNPJ: cliente1.cnpj || '',
      CLIENTE1_QUALIFICACAO: q1,
      ARRENDADOR_NOME: cliente1.nome_completo || '', ARRENDADOR_CPF: cliente1.cpf || '', ARRENDADOR_QUALIFICACAO: q1,
      VENDEDOR_NOME: cliente1.nome_completo || '', VENDEDOR_CPF: cliente1.cpf || '',
      COMODANTE_NOME: cliente1.nome_completo || '', PARTE_A_NOME: cliente1.nome_completo || '',
      LOCADOR_NOME: cliente1.nome_completo || '',
      RECEBEDOR_NOME: cliente1.nome_completo || '', RECEBEDOR_CPF: cliente1.cpf || '',
      EMITENTE_NOME: cliente1.nome_completo || '', EMITENTE_CPF: cliente1.cpf || '',
      EMITENTE_ENDERECO: _endereco(cliente1),
    });
  }

  const nome2 = (cliente2 && cliente2.nome_completo) || dados.parte2_nome || '';
  const cpf2  = (cliente2 && (cliente2.cpf || cliente2.cnpj)) || dados.parte2_cpf || '';
  const q2    = cliente2 ? buildQualificacao(cliente2) : '';
  if (nome2) {
    Object.assign(tags, {
      CLIENTE2_NOME: nome2, CLIENTE2_CPF: cpf2, CLIENTE2_QUALIFICACAO: q2,
      ARRENDATARIO_NOME: nome2, ARRENDATARIO_CPF: cpf2, ARRENDATARIO_QUALIFICACAO: q2,
      COMPRADOR_NOME: nome2, COMPRADOR_CPF: cpf2,
      COMODATARIO_NOME: nome2, PARTE_B_NOME: nome2,
      LOCATARIO_NOME: nome2,
      PAGADOR_NOME: nome2, PAGADOR_CPF: cpf2,
      BENEFICIARIO_NOME: nome2, BENEFICIARIO_CPF: cpf2,
    });
  }

  if (imovel) {
    const confront = [
      imovel.confrontante_norte && `Norte: ${imovel.confrontante_norte}`,
      imovel.confrontante_sul   && `Sul: ${imovel.confrontante_sul}`,
      imovel.confrontante_leste && `Leste: ${imovel.confrontante_leste}`,
      imovel.confrontante_oeste && `Oeste: ${imovel.confrontante_oeste}`,
    ].filter(Boolean).join('; ');
    Object.assign(tags, {
      IMOVEL_NOME:          imovel.denominacao || '',
      IMOVEL_MATRICULA:     imovel.matricula || '',
      IMOVEL_AREA:          imovel.area_total_ha ? parseFloat(imovel.area_total_ha).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '',
      IMOVEL_MUNICIPIO:     imovel.municipio && imovel.uf ? `${imovel.municipio} - ${imovel.uf}` : (imovel.municipio || ''),
      IMOVEL_CARTORIO:      imovel.cartorio_registro || '',
      IMOVEL_CCIR:          imovel.numero_ccir || '',
      IMOVEL_CAR:           imovel.inscricao_car || '',
      IMOVEL_CONFRONTANTES: confront,
      IMOVEL_NIRF:          imovel.nirf || '',
    });
  }
  if (conjuge1) {
    Object.assign(tags, { CONJUGE1_NOME: conjuge1.nome_completo || '', CONJUGE1_CPF: conjuge1.cpf || '' });
  }
  return tags;
}

module.exports = { detectarTags, gerarDocx, buildTags };
