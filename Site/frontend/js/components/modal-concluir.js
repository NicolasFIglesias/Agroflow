// ============================================================
// AgriFlow — Modal de Conclusão e Delegação
// ============================================================

const ModalConcluir = (() => {
  let _tarefa       = null;
  let _participantes = [];
  let _onSucesso    = null;

  async function abrir(tarefa, { onSucesso } = {}) {
    _tarefa    = tarefa;
    _onSucesso = onSucesso;

    document.getElementById('concluir-titulo').textContent = tarefa.titulo;
    document.getElementById('concluir-obs').value = '';

    // Carregar participantes do projeto
    if (tarefa.projeto_id) {
      try {
        const projeto = await API.get(`/api/projetos/${tarefa.projeto_id}`);
        _participantes = projeto.participantes || [];
      } catch {
        _participantes = [];
      }
    }

    // Resetar seleção
    _selecionarAcao('delegar');
    _renderResponsaveis();

    // Data padrão: amanhã
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    document.getElementById('prox-data').value = amanha.toISOString().slice(0, 10);
    document.getElementById('prox-hora').value  = '';
    document.getElementById('prox-titulo').value = '';
    document.getElementById('prox-descricao').value = '';

    document.getElementById('modal-concluir-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function fechar() {
    document.getElementById('modal-concluir-overlay').classList.remove('open');
    document.body.style.overflow = '';
    _tarefa = null;
  }

  function _selecionarAcao(acao) {
    document.querySelectorAll('.acao-opt').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.acao === acao);
      opt.querySelector('input[type="radio"]').checked = opt.dataset.acao === acao;
    });
    const delegForm = document.getElementById('delegacao-form');
    delegForm.classList.toggle('hidden', acao !== 'delegar');
  }

  function _renderResponsaveis() {
    const sel = document.getElementById('prox-atribuido');
    sel.innerHTML = '<option value="">Selecione o responsável...</option>';
    _participantes.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.nome}${p.cargo ? ` — ${p.cargo}` : ''}`;
      sel.appendChild(opt);
    });
  }

  async function _confirmar() {
    const obs    = document.getElementById('concluir-obs').value.trim();
    const acao   = document.querySelector('.acao-opt.selected')?.dataset.acao;

    const body = {
      obs_conclusao: obs,
      acao_seguinte: acao
    };

    if (acao === 'delegar') {
      const titulo      = document.getElementById('prox-titulo').value.trim();
      const atribuido_a = document.getElementById('prox-atribuido').value;
      const data_inicio = document.getElementById('prox-data').value;
      const hora        = document.getElementById('prox-hora').value;
      const descricao   = document.getElementById('prox-descricao').value.trim();
      const prioridade  = document.querySelector('.prioridade-opt.checked')?.dataset.val || 'normal';

      if (!titulo) { Toast.show('Informe o título da próxima tarefa', 'error'); return; }
      if (!atribuido_a) { Toast.show('Selecione o responsável pela próxima tarefa', 'error'); return; }
      if (!data_inicio) { Toast.show('Informe a data da próxima tarefa', 'error'); return; }

      body.proxima_tarefa = { titulo, descricao, atribuido_a, data_inicio, hora: hora || null, prioridade };
    }

    const btn = document.getElementById('btn-confirmar-concluir');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando...';

    try {
      await API.post(`/api/tarefas/${_tarefa.id}/concluir`, body);
      fechar();
      Toast.show('Tarefa concluída com sucesso!', 'success');
      _onSucesso?.();
      document.dispatchEvent(new CustomEvent('tarefa-atualizada'));
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Concluir →';
    }
  }

  function init() {
    document.getElementById('modal-concluir-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'modal-concluir-overlay') fechar();
    });

    document.getElementById('btn-fechar-concluir')?.addEventListener('click', fechar);
    document.getElementById('btn-cancelar-concluir')?.addEventListener('click', fechar);
    document.getElementById('btn-confirmar-concluir')?.addEventListener('click', _confirmar);

    document.querySelectorAll('.acao-opt').forEach(opt => {
      opt.addEventListener('click', () => _selecionarAcao(opt.dataset.acao));
    });

    // Prioridade na delegação
    document.querySelectorAll('#delegacao-form .prioridade-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('#delegacao-form .prioridade-opt').forEach(o => o.classList.remove('checked'));
        opt.classList.add('checked');
      });
    });

    // Marcar normal como padrão
    document.querySelector('#delegacao-form .prioridade-opt[data-val="normal"]')?.classList.add('checked');
  }

  return { init, abrir, fechar };
})();

window.ModalConcluir = ModalConcluir;
