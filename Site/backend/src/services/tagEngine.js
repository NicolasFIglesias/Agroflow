const Docxtemplater = require('docxtemplater');
const PizZip        = require('pizzip');
const { valorPorExtenso, prazoPorExtenso, dataExtenso } = require('./extenso');
const { buildQualificacao, _endereco } = require('./qualificacao');

function detectarTags(base64) {
  try {
    const buf = Buffer.from(base64, 'base64');
    const zip = new PizZip(buf);

    // Extrair texto de cada parágrafo concatenando runs <w:t>
    // Isso garante que tags divididas entre runs (mas no mesmo parágrafo) sejam detectadas
    const tags = new Set();
    const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

    const xmlFiles = Object.keys(zip.files).filter(f =>
      /word\/(document|header\d*|footer\d*).*\.xml$/.test(f)
    );

    xmlFiles.forEach(filename => {
      try {
        const xmlStr = zip.files[filename].asText();
        // Abordagem 1: regex direto no XML (mais rápida, pega tags inteiras)
        const matches1 = [...xmlStr.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)];
        matches1.forEach(m => tags.add(m[1]));

        // Abordagem 2: concatenar texto por parágrafo e buscar tags divididas
        // Extrair conteúdo de <w:p>...</w:p>
        const paraMatches = xmlStr.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g);
        for (const pm of paraMatches) {
          // Extrair todo texto de <w:t>...</w:t> dentro do parágrafo
          const tMatches = [...pm[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
          const paraText = tMatches.map(tm => tm[1]).join('');
          const matches2 = [...paraText.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)];
          matches2.forEach(m => tags.add(m[1]));
        }
      } catch { /* pular arquivo com erro */ }
    });

    return [...tags];
  } catch { return []; }
}

// Corrige tags divididas entre runs usando regex direto no XML (sem deps externas)
// Estratégia: para cada parágrafo que contém tags divididas, colapsa todo o texto
// para o primeiro <w:t> e esvazia os demais — garante que docxtemplater veja a tag completa.
function _fixSplitTagsInPara(paraXml) {
  // Extrai todos os textos de <w:t>
  const tMatches = [...paraXml.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)];
  if (tMatches.length < 2) return paraXml;

  const textos = tMatches.map(m => m[1]);
  const combinado = textos.join('');

  if (!combinado.includes('{{') && !combinado.includes('}}')) return paraXml;

  // Verificar se algum run tem tag incompleta (dividida entre runs)
  const temDividida = textos.some(t =>
    (t.includes('{{') && !t.includes('}}')) ||
    (!t.includes('{{') && t.includes('}}')) ||
    /\{\{[A-Z_0-9]*$/.test(t) ||
    /^[A-Z_0-9]*\}\}/.test(t)
  );

  if (!temDividida) return paraXml;

  // Fix: colocar todo texto no primeiro <w:t>, esvaziar os outros
  let primeiro = true;
  const temEspaco = /[ \t]/.test(combinado);
  return paraXml.replace(/<w:t([^>]*)>([\s\S]*?)<\/w:t>/g, (match, attrs, texto) => {
    if (primeiro) {
      primeiro = false;
      const spaceAttr = temEspaco ? ' xml:space="preserve"' : '';
      return `<w:t${spaceAttr}>${combinado}</w:t>`;
    }
    return '<w:t></w:t>';
  });
}

function _fixDocxBase64(base64) {
  try {
    const buf = Buffer.from(base64, 'base64');
    const zip = new PizZip(buf);

    const xmlFiles = Object.keys(zip.files).filter(f =>
      /word\/(document|header\d*|footer\d*).*\.xml$/.test(f)
    );

    xmlFiles.forEach(filename => {
      try {
        const xmlStr = zip.files[filename].asText();
        // Processar cada parágrafo individualmente
        const fixed = xmlStr.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, para =>
          _fixSplitTagsInPara(para)
        );
        zip.file(filename, fixed);
      } catch { /* pular arquivo com erro */ }
    });

    return zip.generate({ type: 'base64', compression: 'DEFLATE' });
  } catch { return base64; }
}

// Mantido para compatibilidade (não usado mais)
function _fixParaRuns(para, W) {
  void para; void W;
  // replaced by _fixSplitTagsInPara
  function hasIncomplete(t) {
    return (t.includes('{{') && !t.includes('}}')) ||
           (!t.includes('{{') && t.includes('}}')) ||
           /\{\{[A-Z_0-9]*$/.test(t) ||
           /^[A-Z_0-9]*\}\}/.test(t);
  }

  if (!runs.some(r => hasIncomplete(runText(r)))) return;

  // Mesclar runs que formam tags incompletas
  let i = 0;
  while (i < runs.length) {
    const rt = runText(runs[i]);
    if (!hasIncomplete(rt)) { i++; continue; }

    // Acumular runs até fechar o }}
    let combined = rt;
    let j = i + 1;
    while (j < runs.length && !combined.includes('}}')) {
      combined += runText(runs[j]);
      j++;
    }

    // Colocar texto combinado no primeiro run
    const tNodes = runs[i].getElementsByTagNameNS(W, 't');
    if (tNodes.length > 0) {
      tNodes[0].textContent = combined;
      if (/\s/.test(combined)) tNodes[0].setAttribute('xml:space', 'preserve');
    }

    // Remover runs intermediários do DOM
    for (let k = i + 1; k < j && k < runs.length; k++) {
      try { runs[k].parentNode && runs[k].parentNode.removeChild(runs[k]); } catch {}
    }
    runs.splice(i + 1, j - i - 1);
    i++;
  }
}

function gerarDocx(base64Modelo, dados) {
  // Tentar primeiro sem pré-processamento
  function _tentarRender(b64) {
    const buf = Buffer.from(b64, 'base64');
    const zip = new PizZip(buf);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
    doc.render(dados);
    return doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  try {
    return _tentarRender(base64Modelo);
  } catch (err) {
    if (err.properties && err.properties.errors) {
      // Multi error: tentar com XML pré-processado (juntar tags divididas)
      try {
        const fixedB64 = _fixDocxBase64(base64Modelo);
        return _tentarRender(fixedB64);
      } catch (err2) {
        const msgs = (err2.properties?.errors || [])
          .map(e => e.properties?.explanation || e.properties?.tag || e.message || '')
          .filter(Boolean).join('; ');
        throw new Error(
          `Erro nas tags do modelo Word. Selecione cada {{TAG}} e aplique um único estilo (sem misturar negrito, cor, etc. dentro da tag). Detalhe: ${msgs || 'multi_error'}`
        );
      }
    }
    throw err;
  }
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
      VENDEDOR_NOME: cliente1.nome_completo || '', VENDEDOR_CPF: cliente1.cpf || '', VENDEDOR_QUALIFICACAO: q1,
      COMPRADOR_NOME: '', COMPRADOR_CPF: '', COMPRADOR_QUALIFICACAO: '',
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
      COMPRADOR_NOME: nome2, COMPRADOR_CPF: cpf2, COMPRADOR_QUALIFICACAO: q2,
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
