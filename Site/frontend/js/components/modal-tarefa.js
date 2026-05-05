// ============================================================
// AgriFlow — Modal de Nova/Edição de Tarefa Avulsa
// ============================================================

const ModalTarefa = (() => {
  let _modo              = 'criar';
  let _tarefaId          = null;
  let _grupoRecorrencia  = null;
  let _projetos          = [];
  let _usuarios          = [];
  let _onSucesso         = null;

  async function abrir(tarefa = null, { onSucesso, projetoId = null, dataInicio = null } = {}) {
    _modo             = tarefa ? 'editar' : 'criar';
    _tarefaId         = tarefa?.id || null;
    _grupoRecorrencia = tarefa?.grupo_recorrencia || null;
    _onSucesso        = onSucesso;

    // Carregar dados
    try {
      [_projetos, _usuarios] = await Promise.all([
        API.get('/api/projetos?status=ativo'),
        API.get('/api/usuarios')
      ]);
    } catch {
      _projetos = []; _usuarios = [];
    }

    _renderProjetos(tarefa?.projeto_id || projetoId);
    _renderUsuarios(tarefa?.atribuido_a);

    // Preencher campos
    const tipo = tarefa?.tipo || 'equipe';
    _setTipo(tipo);

    document.getElementById('tarefa-titulo').value    = tarefa?.titulo || '';
    document.getElementById('tarefa-descricao').value = tarefa?.descricao || '';
    document.getElementById('tarefa-data').value      = tarefa?.data_inicio?.slice(0,10) || dataInicio || '';
    document.getElementById('tarefa-hora').value      = tarefa?.hora?.slice(0,5) || '';
    document.getElementById('tarefa-data-fim').value  = tarefa?.data_fim?.slice(0,10) || '';
    document.getElementById('tarefa-dia-inteiro').checked = tarefa?.dia_inteiro !== false;

    // Mostrar/ocultar seção de repetição (só no modo criar)
    const repetirSection = document.getElementById('tarefa-repetir-section');
    if (repetirSection) repetirSection.style.display = _modo === 'criar' ? '' : 'none';

    // Mostrar/ocultar botões de delete (só no modo editar)
    const btnDel   = document.getElementById('btn-deletar-tarefa');
    const btnDelGrp = document.getElementById('btn-deletar-grupo');
    if (btnDel)    btnDel.style.display    = _modo === 'editar' ? ''       : 'none';
    if (btnDelGrp) btnDelGrp.style.display = (_modo === 'editar' && _grupoRecorrencia) ? '' : 'none';

    // Reset repetir
    const repetirChk = document.getElementById('tarefa-repetir');
    if (repetirChk) {
      repetirChk.checked = false;
      document.getElementById('tarefa-repetir-opcoes').style.display = 'none';
      document.querySelectorAll('.repetir-dia-btn').forEach(btn => btn.classList.remove('active'));
      const ate = document.getElementById('tarefa-repetir-ate');
      if (ate) ate.value = '';
    }

    // Mostrar "editar grupo" só no modo editar quando há grupo_recorrencia
    const grupoSection = document.getElementById('tarefa-grupo-section');
    if (grupoSection) {
      grupoSection.style.display = (_modo === 'editar' && _grupoRecorrencia) ? '' : 'none';
      const grupoChk = document.getElementById('tarefa-editar-grupo');
      if (grupoChk) grupoChk.checked = false;
    }

    // Prioridade
    const prioridade = tarefa?.prioridade || 'normal';
    document.querySelectorAll('#modal-tarefa .prioridade-opt').forEach(opt => {
      opt.classList.toggle('checked', opt.dataset.val === prioridade);
    });

    document.getElementById('modal-tarefa-titulo').textContent =
      _modo === 'criar' ? 'Nova tarefa' : 'Editar tarefa';
    document.getElementById('btn-confirmar-tarefa').textContent =
      _modo === 'criar' ? 'Criar tarefa' : 'Salvar';

    document.getElementById('modal-tarefa-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function fechar() {
    document.getElementById('modal-tarefa-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function _setTipo(tipo) {
    document.querySelectorAll('.tipo-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tipo === tipo);
    });
    const isEquipe = tipo === 'equipe';
    document.getElementById('tarefa-projeto-section').style.display  = isEquipe ? '' : 'none';
    document.getElementById('tarefa-atribuido-section').style.display = isEquipe ? '' : 'none';
  }

  function _renderProjetos(projetoSel) {
    const sel = document.getElementById('tarefa-projeto');
    sel.innerHTML = '<option value="">Selecione o projeto...</option>' +
      _projetos.map(p =>
        `<option value="${p.id}" ${p.id === projetoSel ? 'selected' : ''}>${p.nome}</option>`
      ).join('');

    sel.addEventListener('change', () => _renderUsuariosPorProjeto(sel.value));
    if (projetoSel) _renderUsuariosPorProjeto(projetoSel);
  }

  async function _renderUsuariosPorProjeto(projetoId) {
    if (!projetoId) {
      _renderUsuarios();
      return;
    }
    try {
      const projeto = await API.get(`/api/projetos/${projetoId}`);
      _renderUsuarios(null, projeto.participantes);
    } catch {
      _renderUsuarios();
    }
  }

  function _renderUsuarios(selecionado, lista = null) {
    const origem = lista || _usuarios;
    const sel = document.getElementById('tarefa-atribuido');
    sel.innerHTML = '<option value="">Atribuir a...</option>' +
      origem.map(u =>
        `<option value="${u.id}" ${u.id === selecionado ? 'selected' : ''}>${u.nome}${u.cargo ? ` — ${u.cargo}` : ''}</option>`
      ).join('');
  }

  async function _confirmar() {
    const tipo      = document.querySelector('.tipo-btn.active')?.dataset.tipo || 'equipe';
    const titulo    = document.getElementById('tarefa-titulo').value.trim();
    const descricao = document.getElementById('tarefa-descricao').value.trim();
    const data      = document.getElementById('tarefa-data').value;
    const hora      = document.getElementById('tarefa-hora').value;
    const dataFim   = document.getElementById('tarefa-data-fim').value;
    const diaInteiro = document.getElementById('tarefa-dia-inteiro').checked;
    const prioridade = document.querySelector('#modal-tarefa .prioridade-opt.checked')?.dataset.val || 'normal';

    if (!titulo) { Toast.show('Informe o título da tarefa', 'error'); return; }
    if (!data)   { Toast.show('Informe a data da tarefa', 'error'); return; }

    const body = {
      titulo, descricao, tipo,
      data_inicio: data,
      data_fim: dataFim || null,
      hora: hora || null,
      dia_inteiro: diaInteiro,
      prioridade
    };

    if (tipo === 'equipe') {
      body.projeto_id   = document.getElementById('tarefa-projeto').value || null;
      body.atribuido_a  = document.getElementById('tarefa-atribuido').value;
      if (!body.atribuido_a) { Toast.show('Selecione o responsável', 'error'); return; }
    } else {
      body.atribuido_a = Auth.usuario().id;
    }

    const btn = document.getElementById('btn-confirmar-tarefa');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando...';

    try {
      if (_modo === 'criar') {
        const repetir = document.getElementById('tarefa-repetir')?.checked;

        if (repetir) {
          const diasSelecionados = Array.from(document.querySelectorAll('.repetir-dia-btn.active'))
            .map(btn => parseInt(btn.dataset.dow));
          const ateData = document.getElementById('tarefa-repetir-ate')?.value;

          if (diasSelecionados.length === 0) {
            Toast.show('Selecione pelo menos um dia da semana', 'error');
            btn.disabled = false;
            btn.textContent = 'Criar tarefa';
            return;
          }
          if (!ateData) {
            Toast.show('Informe a data limite de repetição', 'error');
            btn.disabled = false;
            btn.textContent = 'Criar tarefa';
            return;
          }

          const datas = [];
          const inicio = new Date(body.data_inicio + 'T12:00:00');
          const fim    = new Date(ateData + 'T12:00:00');
          for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
            if (diasSelecionados.includes(d.getDay())) {
              datas.push(d.toISOString().slice(0, 10));
            }
          }

          if (datas.length === 0) {
            Toast.show('Nenhuma data encontrada com os dias selecionados', 'error');
            btn.disabled = false;
            btn.textContent = 'Criar tarefa';
            return;
          }

          const grupoId = crypto.randomUUID();
          await Promise.all(datas.map(data =>
            API.post('/api/tarefas', { ...body, data_inicio: data, grupo_recorrencia: grupoId })
          ));
          Toast.show(`${datas.length} tarefas criadas!`, 'success');
          Confetti?.center(90);
        } else {
          await API.post('/api/tarefas', body);
          Toast.show('Tarefa criada!', 'success');
          Confetti?.fromEl(document.getElementById('btn-confirmar-tarefa'), 55);
        }
      } else {
        await API.put(`/api/tarefas/${_tarefaId}`, body);

        const editarGrupo = document.getElementById('tarefa-editar-grupo')?.checked;
        if (editarGrupo && _grupoRecorrencia) {
          await API.put(`/api/tarefas/grupo/${_grupoRecorrencia}`, {
            titulo:    body.titulo,
            descricao: body.descricao,
            hora:      body.hora,
            prioridade: body.prioridade,
          });
          Toast.show('Todas as ocorrências atualizadas!', 'success');
        } else {
          Toast.show('Tarefa atualizada!', 'success');
        }
      }
      fechar();
      _onSucesso?.();
      document.dispatchEvent(new CustomEvent('tarefa-atualizada'));
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = _modo === 'criar' ? 'Criar tarefa' : 'Salvar';
    }
  }

  function init() {
    document.getElementById('modal-tarefa-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'modal-tarefa-overlay') fechar();
    });
    document.getElementById('btn-fechar-tarefa')?.addEventListener('click', fechar);
    document.getElementById('btn-cancelar-tarefa')?.addEventListener('click', fechar);
    document.getElementById('btn-confirmar-tarefa')?.addEventListener('click', _confirmar);

    document.querySelectorAll('.tipo-btn').forEach(btn => {
      btn.addEventListener('click', () => _setTipo(btn.dataset.tipo));
    });

    document.querySelectorAll('#modal-tarefa .prioridade-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        document.querySelectorAll('#modal-tarefa .prioridade-opt').forEach(o => o.classList.remove('checked'));
        opt.classList.add('checked');
      });
    });

    // Repetir toggle
    document.getElementById('tarefa-repetir')?.addEventListener('change', function() {
      const opcoes = document.getElementById('tarefa-repetir-opcoes');
      if (opcoes) opcoes.style.display = this.checked ? 'block' : 'none';
    });

    // Dias da semana toggle
    document.querySelectorAll('.repetir-dia-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('active'));
    });

    // Excluir esta tarefa
    document.getElementById('btn-deletar-tarefa')?.addEventListener('click', async () => {
      if (!_tarefaId) return;
      if (!confirm('Excluir esta tarefa?')) return;
      try {
        await API.delete(`/api/tarefas/${_tarefaId}`);
        fechar();
        Toast.show('Tarefa excluída', 'success');
        document.dispatchEvent(new CustomEvent('tarefa-atualizada'));
      } catch (err) { Toast.show(err.message || 'Erro ao excluir', 'error'); }
    });

    // Excluir todas do grupo
    document.getElementById('btn-deletar-grupo')?.addEventListener('click', async () => {
      if (!_grupoRecorrencia) return;
      if (!confirm('Excluir TODAS as ocorrências desta recorrência?')) return;
      try {
        await API.delete(`/api/tarefas/grupo/${_grupoRecorrencia}`);
        fechar();
        Toast.show('Todas as ocorrências excluídas', 'success');
        document.dispatchEvent(new CustomEvent('tarefa-atualizada'));
      } catch (err) { Toast.show(err.message || 'Erro ao excluir grupo', 'error'); }
    });
  }

  return { init, abrir, fechar };
})();

window.ModalTarefa = ModalTarefa;
