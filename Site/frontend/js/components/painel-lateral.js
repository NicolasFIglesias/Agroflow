// ============================================================
// AgriFlow — Painel Lateral (Slide-over de detalhes da tarefa)
// ============================================================

const PainelLateral = (() => {
  let _tarefaAtual = null;
  let _onConcluir  = null;

  function abrir(tarefa, { onConcluir } = {}) {
    _tarefaAtual = tarefa;
    _onConcluir  = onConcluir;
    _renderizar(tarefa);
    document.getElementById('painel-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function fechar() {
    document.getElementById('painel-overlay').classList.remove('open');
    document.body.style.overflow = '';
    _tarefaAtual = null;
  }

  function _renderizar(t) {
    const cor = t.projeto?.cor || '#5F5E5A';

    // Título e cor
    document.getElementById('painel-cor').style.background = cor;
    document.getElementById('painel-titulo').textContent   = t.titulo;

    // Projeto
    const projEl = document.getElementById('painel-projeto');
    if (t.projeto) {
      projEl.innerHTML = `
        <span class="painel-cor-dot" style="background:${cor}"></span>
        ${t.projeto.nome}
      `;
      projEl.onclick = () => {
        window.location.href = `/pages/projeto-detalhes.html?id=${t.projeto.id}`;
      };
      projEl.closest('.painel-section')?.classList.remove('hidden');
    } else {
      projEl.closest('.painel-section')?.classList.add('hidden');
    }

    // Status
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === t.status);
    });

    // Atribuído a
    document.getElementById('painel-atribuido-avatar').textContent = Auth.iniciais(t.atribuido_nome);
    document.getElementById('painel-atribuido-nome').textContent   = t.atribuido_nome || '—';

    // Data / hora
    const dataStr = t.data_inicio
      ? new Date(t.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')
      : 'Sem data';
    document.getElementById('painel-data').textContent = dataStr;
    document.getElementById('painel-hora').textContent = t.hora
      ? t.hora.slice(0,5)
      : t.dia_inteiro ? 'Dia inteiro' : '—';

    // Prioridade
    document.querySelectorAll('.prioridade-label').forEach(lbl => {
      lbl.classList.toggle('checked', lbl.dataset.val === t.prioridade);
    });

    // Descrição
    const descEl = document.getElementById('painel-descricao');
    if (t.descricao) {
      descEl.textContent = t.descricao;
      descEl.parentElement.classList.remove('hidden');
    } else {
      descEl.parentElement.classList.add('hidden');
    }

    // Botão concluir — esconder se já concluída ou cancelada
    const btnConcluir = document.getElementById('btn-concluir');
    if (btnConcluir) {
      const esconder = ['concluida', 'cancelada'].includes(t.status);
      btnConcluir.style.display = esconder ? 'none' : 'flex';
    }

    // Histórico
    _renderHistorico(t.historico || []);
  }

  function _renderHistorico(historico) {
    const lista = document.getElementById('painel-historico');
    if (!lista) return;
    lista.innerHTML = historico.length === 0
      ? '<p class="text-muted text-sm">Sem histórico.</p>'
      : historico.map(h => `
          <div class="historico-item">
            <span class="historico-dot"></span>
            <span>
              <span class="historico-data">${_fmtDataHora(h.created_at)}</span>
              · <span class="historico-desc">${_esc(h.descricao || h.acao)}</span>
            </span>
          </div>
        `).join('');
  }

  function _fmtDataHora(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function _esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function init() {
    // Fechar ao clicar no overlay
    document.getElementById('painel-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('painel-overlay')) fechar();
    });

    document.getElementById('btn-fechar-painel')?.addEventListener('click', fechar);

    // Alterar status
    document.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!_tarefaAtual) return;
        try {
          await API.put(`/api/tarefas/${_tarefaAtual.id}/status`, { status: btn.dataset.status });
          _tarefaAtual.status = btn.dataset.status;
          document.querySelectorAll('.status-btn').forEach(b => b.classList.toggle('active', b === btn));
          Toast.show('Status atualizado', 'success');
          document.dispatchEvent(new CustomEvent('tarefa-atualizada'));
        } catch (err) {
          Toast.show(err.message, 'error');
        }
      });
    });

    // Botão concluir e delegar
    document.getElementById('btn-concluir')?.addEventListener('click', () => {
      if (_tarefaAtual && _onConcluir) {
        const t  = _tarefaAtual;
        const cb = _onConcluir;
        fechar();
        cb(t);
      }
    });

    // Editar
    document.getElementById('btn-editar-tarefa')?.addEventListener('click', () => {
      if (_tarefaAtual) {
        fechar();
        ModalTarefa.abrir(_tarefaAtual, { modo: 'editar' });
      }
    });

    // Excluir
    document.getElementById('btn-excluir-tarefa')?.addEventListener('click', async () => {
      if (!_tarefaAtual) return;
      if (!confirm(`Excluir a tarefa "${_tarefaAtual.titulo}"?`)) return;
      try {
        await API.delete(`/api/tarefas/${_tarefaAtual.id}`);
        fechar();
        Toast.show('Tarefa excluída', 'success');
        document.dispatchEvent(new CustomEvent('tarefa-atualizada'));
      } catch (err) {
        Toast.show(err.message, 'error');
      }
    });
  }

  return { init, abrir, fechar };
})();

window.PainelLateral = PainelLateral;
