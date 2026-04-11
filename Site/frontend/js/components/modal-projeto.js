// ============================================================
// AgriFlow — Modal de Criação/Edição de Projeto
// ============================================================

const ModalProjeto = (() => {
  let _modo          = 'criar'; // 'criar' | 'editar'
  let _projetoId     = null;
  let _colaboradores = [];
  let _participantes = [];
  let _tarefas       = [];
  let _onSucesso     = null;

  const CORES = [
    '#639922','#378ADD','#BA7517',
    '#E24B4A','#534AB7','#1D9E75',
    '#D85A30','#D4537E','#5F5E5A'
  ];

  async function abrir(projeto = null, { onSucesso } = {}) {
    _modo      = projeto ? 'editar' : 'criar';
    _projetoId = projeto?.id || null;
    _onSucesso = onSucesso;

    // Carregar colaboradores
    try {
      _colaboradores = await API.get('/api/usuarios');
    } catch {
      _colaboradores = [];
    }

    _participantes = projeto
      ? (projeto.participantes?.map(p => p.id) || [])
      : [Auth.usuario().id];

    _tarefas = [];

    _renderColorPicker(projeto?.cor || '#639922');
    _renderParticipantes();

    // Preencher campos
    document.getElementById('projeto-nome').value      = projeto?.nome || '';
    document.getElementById('projeto-descricao').value = projeto?.descricao || '';
    document.getElementById('projeto-inicio').value    = projeto?.data_inicio?.slice(0,10) || _hoje();
    document.getElementById('projeto-fim').value       = projeto?.data_fim?.slice(0,10) || '';

    // Tarefas (só no modo criar)
    const tarefasSection = document.getElementById('tarefas-iniciais-section');
    if (tarefasSection) {
      tarefasSection.style.display = _modo === 'criar' ? '' : 'none';
    }
    if (_modo === 'criar') {
      _adicionarTarefa(); // começa com 1 tarefa em branco
    }

    document.getElementById('modal-projeto-titulo').textContent = _modo === 'criar' ? 'Novo projeto' : 'Editar projeto';
    document.getElementById('btn-confirmar-projeto').textContent = _modo === 'criar' ? 'Criar projeto →' : 'Salvar alterações';

    document.getElementById('modal-projeto-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function fechar() {
    document.getElementById('modal-projeto-overlay').classList.remove('open');
    document.body.style.overflow = '';
    // Limpar tarefas dinamicamente
    document.getElementById('tarefas-container').innerHTML = '';
    _tarefas = [];
  }

  function _hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  function _renderColorPicker(corSel) {
    const container = document.getElementById('color-picker');
    container.innerHTML = CORES.map(cor => `
      <button type="button"
        class="color-option ${cor === corSel ? 'selected' : ''}"
        data-cor="${cor}"
        style="background:${cor}; color:${cor}"
        title="${cor}"
        aria-label="Cor ${cor}"
      ></button>
    `).join('');

    container.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  function _renderParticipantes() {
    const lista = document.getElementById('participantes-lista');
    const usuario = Auth.usuario();

    lista.innerHTML = _participantes.map(uid => {
      const colab = _colaboradores.find(c => c.id === uid) ||
                    (uid === usuario.id ? usuario : null);
      if (!colab) return '';
      const isProprio = uid === usuario.id;
      return `
        <div class="participante-item" data-uid="${uid}">
          <span class="avatar-sm" style="background:var(--verde)">${Auth.iniciais(colab.nome)}</span>
          <span class="participante-nome">${colab.nome}</span>
          <span class="participante-cargo">${colab.cargo || ''}</span>
          ${isProprio ? '' : `<button type="button" class="btn-remove-part" data-uid="${uid}" title="Remover">✕</button>`}
        </div>
      `;
    }).join('');

    // Remover participante
    lista.querySelectorAll('.btn-remove-part').forEach(btn => {
      btn.addEventListener('click', () => {
        _participantes = _participantes.filter(id => id !== btn.dataset.uid);
        _renderParticipantes();
        _atualizarSelectsAtribuicao();
      });
    });

    _atualizarSelectsAtribuicao();
  }

  function _atualizarSelectsAtribuicao() {
    document.querySelectorAll('.tarefa-atribuido-select').forEach(sel => {
      const valorAtual = sel.value;
      sel.innerHTML = '<option value="">Atribuir a...</option>' +
        _participantes.map(uid => {
          const c = _colaboradores.find(x => x.id === uid) ||
                    (uid === Auth.usuario().id ? Auth.usuario() : null);
          if (!c) return '';
          return `<option value="${uid}" ${uid === valorAtual ? 'selected' : ''}>${c.nome}</option>`;
        }).join('');
    });
  }

  function _adicionarTarefa() {
    const idx = _tarefas.length;
    _tarefas.push({ titulo: '', atribuido_a: '', data_inicio: '', hora: '', prioridade: 'normal' });

    const container = document.getElementById('tarefas-container');
    const bloco = document.createElement('div');
    bloco.className = 'tarefa-bloco';
    bloco.dataset.idx = idx;
    bloco.innerHTML = `
      <div class="tarefa-bloco-header">
        <span class="tarefa-bloco-num">Tarefa ${idx + 1}</span>
        ${idx > 0 ? `<button type="button" class="btn-remove-tarefa">Remover</button>` : ''}
      </div>
      <div class="form-group">
        <input type="text" class="form-input tarefa-titulo-input" placeholder="Título da tarefa *" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <select class="form-select tarefa-atribuido-select">
            <option value="">Atribuir a...</option>
          </select>
        </div>
        <div class="form-group">
          <input type="date" class="form-input tarefa-data-input" placeholder="Data">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <input type="time" class="form-input tarefa-hora-input" placeholder="Hora">
        </div>
        <div class="form-group">
          <select class="form-select tarefa-prioridade-select">
            <option value="baixa">Baixa</option>
            <option value="normal" selected>Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
      </div>
    `;

    // Remover tarefa
    bloco.querySelector('.btn-remove-tarefa')?.addEventListener('click', () => {
      bloco.remove();
      _tarefas.splice(idx, 1);
      // Re-numerar
      document.querySelectorAll('.tarefa-bloco').forEach((b, i) => {
        b.querySelector('.tarefa-bloco-num').textContent = `Tarefa ${i + 1}`;
        b.dataset.idx = i;
      });
    });

    container.appendChild(bloco);
    _atualizarSelectsAtribuicao();

    if (idx === 0) {
      bloco.querySelector('.tarefa-data-input').value = _hoje();
    }
  }

  function _coletarDados() {
    const nome       = document.getElementById('projeto-nome').value.trim();
    const descricao  = document.getElementById('projeto-descricao').value.trim();
    const cor        = document.querySelector('.color-option.selected')?.dataset.cor || '#639922';
    const data_inicio = document.getElementById('projeto-inicio').value;
    const data_fim   = document.getElementById('projeto-fim').value || null;

    if (!nome)        { Toast.show('Informe o nome do projeto', 'error'); return null; }
    if (!data_inicio) { Toast.show('Informe a data de início', 'error'); return null; }
    if (_participantes.length === 0) { Toast.show('Adicione ao menos um participante', 'error'); return null; }

    const tarefas = [];
    if (_modo === 'criar') {
      const blocos = document.querySelectorAll('.tarefa-bloco');
      for (const bloco of blocos) {
        const titulo     = bloco.querySelector('.tarefa-titulo-input').value.trim();
        const atribuido  = bloco.querySelector('.tarefa-atribuido-select').value;
        const dataI      = bloco.querySelector('.tarefa-data-input').value;
        const hora       = bloco.querySelector('.tarefa-hora-input').value;
        const prioridade = bloco.querySelector('.tarefa-prioridade-select').value;
        if (!titulo)    { Toast.show('Preencha o título de todas as tarefas', 'error'); return null; }
        if (!atribuido) { Toast.show('Atribua todas as tarefas a um responsável', 'error'); return null; }
        tarefas.push({ titulo, atribuido_a: atribuido, data_inicio: dataI || null, hora: hora || null, prioridade });
      }
      if (tarefas.length === 0) { Toast.show('Adicione ao menos uma tarefa', 'error'); return null; }
    }

    return { nome, descricao, cor, data_inicio, data_fim, participantes: _participantes, tarefas };
  }

  async function _confirmar() {
    const dados = _coletarDados();
    if (!dados) return;

    const btn = document.getElementById('btn-confirmar-projeto');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Salvando...';

    try {
      if (_modo === 'criar') {
        await API.post('/api/projetos', dados);
        Toast.show('Projeto criado com sucesso!', 'success');
      } else {
        await API.put(`/api/projetos/${_projetoId}`, dados);
        Toast.show('Projeto atualizado!', 'success');
      }
      fechar();
      _onSucesso?.();
    } catch (err) {
      Toast.show(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = _modo === 'criar' ? 'Criar projeto →' : 'Salvar alterações';
    }
  }

  function init() {
    document.getElementById('modal-projeto-overlay')?.addEventListener('click', e => {
      if (e.target.id === 'modal-projeto-overlay') fechar();
    });
    document.getElementById('btn-fechar-projeto')?.addEventListener('click', fechar);
    document.getElementById('btn-cancelar-projeto')?.addEventListener('click', fechar);
    document.getElementById('btn-confirmar-projeto')?.addEventListener('click', _confirmar);

    // Adicionar participante
    document.getElementById('btn-add-participante')?.addEventListener('click', () => {
      const sel = document.getElementById('select-participante');
      const uid = sel.value;
      if (!uid) return;
      if (!_participantes.includes(uid)) {
        _participantes.push(uid);
        _renderParticipantes();
      }
      sel.value = '';
    });

    // Preencher select de colaboradores
    const selColab = document.getElementById('select-participante');
    if (selColab) {
      // Será preenchido ao abrir o modal pois requer dados carregados
    }

    // Adicionar tarefa
    document.getElementById('btn-add-tarefa')?.addEventListener('click', _adicionarTarefa);
  }

  // Expor função para preencher select ao abrir
  async function _atualizarSelectColaboradores() {
    const sel = document.getElementById('select-participante');
    if (!sel) return;
    sel.innerHTML = '<option value="">Adicionar participante...</option>' +
      _colaboradores.map(c => `<option value="${c.id}">${c.nome} — ${c.cargo || c.role}</option>`).join('');
  }

  const _abrirOriginal = abrir;
  async function abrirComColabs(projeto = null, opts = {}) {
    await _abrirOriginal(projeto, opts);
    _atualizarSelectColaboradores();
  }

  return { init, abrir: abrirComColabs, fechar };
})();

window.ModalProjeto = ModalProjeto;
