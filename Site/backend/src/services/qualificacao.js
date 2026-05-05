const EC = {
  solteiro:      'solteiro(a)', casado:         'casado(a)',
  divorciado:    'divorciado(a)', viuvo:          'viúvo(a)',
  uniao_estavel: 'em união estável',
};
const RB = {
  comunhao_parcial:      'pelo regime de comunhão parcial de bens',
  comunhao_universal:    'pelo regime de comunhão universal de bens',
  separacao_total:       'pelo regime de separação total de bens',
  participacao_aquestos: 'pelo regime de participação nos aquestos',
};

function _endereco(c) {
  const p = [];
  if (c.logradouro)         p.push(c.logradouro);
  if (c.numero)             p.push(`nº ${c.numero}`);
  if (c.bairro)             p.push(c.bairro);
  if (c.municipio && c.uf) p.push(`${c.municipio}-${c.uf}`);
  if (c.cep)                p.push(`CEP ${c.cep}`);
  return p.join(', ');
}

function buildQualificacao(cliente, conjuge = null) {
  if (!cliente) return '';
  const p = [];
  p.push((cliente.nacionalidade || 'brasileiro(a)').toLowerCase());
  if (EC[cliente.estado_civil])  p.push(EC[cliente.estado_civil]);
  if (cliente.profissao)         p.push(cliente.profissao.toLowerCase());
  if (cliente.rg)                p.push(`portador(a) do RG nº ${cliente.rg}${cliente.orgao_emissor ? ' ' + cliente.orgao_emissor : ''}`);
  if (cliente.cpf)               p.push(`inscrito(a) no CPF sob nº ${cliente.cpf}`);
  else if (cliente.cnpj)         p.push(`inscrita no CNPJ sob nº ${cliente.cnpj}`);
  const end = _endereco(cliente);
  if (end)                       p.push(`residente e domiciliado(a) em ${end}`);

  let q = p.join(', ');
  if (conjuge && ['casado', 'uniao_estavel'].includes(cliente.estado_civil)) {
    const rel = cliente.estado_civil === 'uniao_estavel' ? 'companheiro(a)' : 'cônjuge';
    const cj  = [];
    if (conjuge.nome_completo)   cj.push(conjuge.nome_completo);
    if (conjuge.cpf)             cj.push(`CPF ${conjuge.cpf}`);
    if (RB[conjuge.regime_bens]) cj.push(RB[conjuge.regime_bens]);
    q += `, e seu(sua) ${rel} ${cj.join(', ')}`;
  }
  return q;
}

module.exports = { buildQualificacao, _endereco };
