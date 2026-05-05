// Brazilian Portuguese number → words + date/period helpers

const UNI = ['','um','dois','três','quatro','cinco','seis','sete','oito','nove',
              'dez','onze','doze','treze','quatorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
const DEC = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
const CEN = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];

function numExtenso(n) {
  n = Math.floor(n);
  if (n === 0)   return 'zero';
  if (n < 0)     return 'menos ' + numExtenso(-n);
  const p = [];
  if (n >= 1000000) { const m = Math.floor(n/1e6); p.push(numExtenso(m)+(m===1?' milhão':' milhões')); n%=1e6; }
  if (n >= 1000)    { const k = Math.floor(n/1000); p.push(k===1?'mil':numExtenso(k)+' mil'); n%=1000; }
  if (n >= 100)     { p.push(n===100?'cem':CEN[Math.floor(n/100)]); n%=100; }
  if (n >= 20)      { const u=n%10; p.push(DEC[Math.floor(n/10)]+(u?` e ${UNI[u]}`:'')); n=0; }
  else if (n > 0)   p.push(UNI[n]);
  return p.join(' e ');
}

function valorPorExtenso(valor) {
  if (!valor || valor === 0) return 'zero reais';
  const v = parseFloat(valor);
  const inteiro  = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);
  let r = numExtenso(inteiro) + (inteiro === 1 ? ' real' : ' reais');
  if (centavos > 0) r += ' e ' + numExtenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return r;
}

function prazoPorExtenso(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return '';
  const a = new Date(dataInicio + 'T12:00:00');
  const b = new Date(dataFim   + 'T12:00:00');
  const diffMeses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  const diffDias  = Math.round((b - a) / 86400000);
  if (diffMeses >= 12 && diffMeses % 12 === 0) {
    const y = Math.floor(diffMeses / 12);
    return `${y} (${numExtenso(y)}) ${y === 1 ? 'ano' : 'anos'}`;
  }
  if (diffMeses >= 1) return `${diffMeses} (${numExtenso(diffMeses)}) ${diffMeses === 1 ? 'mês' : 'meses'}`;
  return `${diffDias} (${numExtenso(diffDias)}) dias`;
}

const MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function dataExtenso(data) {
  if (!data) return '';
  const d = new Date(data.slice(0,10) + 'T12:00:00');
  return `${d.getDate()} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

module.exports = { valorPorExtenso, prazoPorExtenso, dataExtenso, numExtenso };
