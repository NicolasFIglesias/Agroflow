// AgriFlow — Sistema de Ajuda e Tutorial
(function () {
  'use strict';

  // ── Conteúdo de ajuda por página ────────────────────────────
  const PAGE_HELP = {
    'visao-geral': {
      title: 'Visão Geral',
      desc: 'Painel principal com um resumo de toda a operação do escritório em tempo real.',
      items: [
        { icon: '📊', title: 'Cards de resumo', desc: 'Mostram os totais de clientes, imóveis, contratos ativos e tarefas do dia.' },
        { icon: '✅', title: 'Tarefas de hoje', desc: 'Lista tarefas com vencimento para hoje. Clique para marcar como concluída ou editar.' },
        { icon: '📅', title: 'Próximos eventos', desc: 'Compromissos dos próximos dias vindos do Calendário.' },
        { icon: '💰', title: 'Resumo financeiro', desc: 'Saldo, receitas e despesas do mês corrente.' },
      ],
    },
    'clientes': {
      title: 'Clientes',
      desc: 'Cadastro completo de produtores rurais, pessoas físicas e jurídicas.',
      items: [
        { icon: '➕', title: 'Novo cliente', desc: 'Cadastre CPF/CNPJ, endereço, dados bancários, DAP/CAF e cônjuge.' },
        { icon: '🔍', title: 'Busca e filtros', desc: 'Encontre clientes por nome, CPF/CNPJ, município ou tipo de pessoa.' },
        { icon: '📋', title: 'Ficha do cliente', desc: 'Clique em um cliente para ver imóveis vinculados, contratos, linha do tempo e todas as informações.' },
        { icon: '📅', title: 'Linha do tempo', desc: 'Registro automático de toda movimentação: contratos gerados, projetos de crédito, anotações manuais.' },
      ],
    },
    'imoveis': {
      title: 'Imóveis Rurais',
      desc: 'Cadastro das propriedades rurais vinculadas aos clientes.',
      items: [
        { icon: '➕', title: 'Novo imóvel', desc: 'Cadastre denominação, área total, matrícula, cartório, CAR, CCIR, NIRF e confrontantes.' },
        { icon: '👤', title: 'Vínculo com cliente', desc: 'Todo imóvel é vinculado a um cliente. Um cliente pode ter vários imóveis.' },
        { icon: '📄', title: 'Uso em contratos e crédito', desc: 'Os imóveis cadastrados preenchem automaticamente contratos e projetos de crédito rural.' },
        { icon: '🗺️', title: 'Confrontantes', desc: 'Registre os confrontantes (Norte, Sul, Leste, Oeste) para uso no laudo de visita.' },
      ],
    },
    'contratos': {
      title: 'Contratos',
      desc: 'Geração automática de contratos preenchidos com dados dos clientes e imóveis.',
      items: [
        { icon: '📝', title: 'Tipos suportados', desc: 'Arrendamento, Compra e Venda, Comodato, Permuta, Aluguel, Recibo e Nota Promissória.' },
        { icon: '🏷️', title: 'Modelos com tags', desc: 'Faça upload de um modelo .docx ou .html com tags como {{VENDEDOR_NOME}} e o sistema substitui pelos dados reais.' },
        { icon: '📥', title: 'Download Word', desc: 'O contrato gerado é baixado como .docx pronto para assinar. Funciona sem precisar instalar nada.' },
        { icon: '📋', title: 'Modelos', desc: 'Gerencie seus templates na aba "Modelos". Marque um como padrão para que seja usado automaticamente.' },
      ],
    },
    'modelos-documentos': {
      title: 'Modelos de Documentos',
      desc: 'Templates para geração automática de contratos e documentos.',
      items: [
        { icon: '📤', title: 'Upload de modelo', desc: 'Envie um arquivo .docx ou .html com as tags {{NOME_DA_TAG}} onde os dados devem ser inseridos.' },
        { icon: '🏷️', title: 'Tags disponíveis', desc: 'Use {{VENDEDOR_NOME}}, {{COMPRADOR_QUALIFICACAO}}, {{IMOVEL_AREA}}, {{VALOR_EXTENSO}}, {{DATA_ASSINATURA}} e muitas outras.' },
        { icon: '⭐', title: 'Modelo padrão', desc: 'Marque um modelo como padrão para que seja selecionado automaticamente ao criar contratos daquele tipo.' },
        { icon: '💡', title: 'Dica de formatação', desc: 'No Word, selecione toda a tag {{NOME}} e aplique um único estilo. Não misture negrito/cor dentro da tag.' },
      ],
    },
    'vendas': {
      title: 'Vendas / Faturamento',
      desc: 'Controle financeiro do escritório: receitas, despesas e comissões.',
      items: [
        { icon: '➕', title: 'Novo lançamento', desc: 'Registre receitas (honorários, comissões de crédito rural) e despesas operacionais.' },
        { icon: '📊', title: 'Resumo do período', desc: 'Veja totais de receitas, despesas e saldo para o período filtrado.' },
        { icon: '🔍', title: 'Filtros', desc: 'Filtre por tipo (receita/despesa), categoria, período ou status (pago/pendente).' },
        { icon: '📋', title: 'Categorias', desc: 'Organize lançamentos por categoria para facilitar a análise financeira.' },
      ],
    },
    'calendario': {
      title: 'Calendário',
      desc: 'Agenda de tarefas e compromissos para toda a equipe.',
      items: [
        { icon: '➕', title: 'Nova tarefa', desc: 'Crie tarefas com data, hora, responsável, tipo e descrição.' },
        { icon: '🔁', title: 'Recorrência', desc: 'Tarefas podem se repetir diariamente, semanalmente ou mensalmente.' },
        { icon: '👥', title: 'Visão da equipe', desc: 'Administradores vêem as tarefas de todos os colaboradores. Colaboradores vêem só as suas.' },
        { icon: '🏠', title: 'Tipos de tarefa', desc: 'Reunião, visita técnica, vencimento, ligação, entrega de documento ou tarefa geral.' },
      ],
    },
    'servicos': {
      title: 'Serviços e Produtos',
      desc: 'Catálogo de serviços prestados e produtos comercializados pelo escritório.',
      items: [
        { icon: '➕', title: 'Novo serviço', desc: 'Cadastre serviços com nome, descrição, preço unitário e categoria.' },
        { icon: '💰', title: 'Precificação', desc: 'Defina preço fixo por serviço ou por hora de trabalho.' },
        { icon: '📋', title: 'Uso em lançamentos', desc: 'Serviços cadastrados aparecem como opções ao registrar uma receita no Faturamento.' },
      ],
    },
    'credito-rural': {
      title: 'Crédito Rural',
      desc: 'Módulo completo de gestão de projetos de crédito rural, do primeiro contato ao TRT.',
      items: [
        { icon: '📋', title: '9 etapas de controle', desc: 'Captação → Documentos → Visita Técnica → Elaboração → Protocolo → Análise → Contrato → Liberação → TRT. Cada avanço é registrado com data e usuário.' },
        { icon: '🏦', title: 'Modalidades', desc: 'Custeio Agrícola, Custeio Pecuário, Investimento, Microcrédito Rural e Crédito Fundiário.' },
        { icon: '💰', title: 'Comissão automática', desc: 'Configurável por projeto. Calculada sobre o valor efetivamente liberado pelo banco.' },
        { icon: '📄', title: 'Documentos gerados', desc: 'Laudo de visita, levantamento patrimonial, planilha de custeio, proposta e TRT — todos preenchidos automaticamente.' },
        { icon: '📅', title: 'Linha do tempo', desc: 'Toda movimentação é registrada na linha do tempo do cliente automaticamente.' },
      ],
    },
    'preferencias': {
      title: 'Preferências',
      desc: 'Personalize a aparência e o funcionamento do sistema para o seu escritório.',
      items: [
        { icon: '🎨', title: 'Cor primária', desc: 'Troque a cor do sistema para combinar com a identidade visual do escritório. A mudança reflete em botões e menu lateral.' },
        { icon: '🖼️', title: 'Logo da empresa', desc: 'Adicione o logo para aparecer no topo da barra lateral.' },
        { icon: '🔀', title: 'Ordem do menu', desc: 'Arraste os itens da lista para reorganizar o menu lateral conforme seu fluxo de trabalho.' },
        { icon: '👁️', title: 'Ocultar seções', desc: 'Marque o olho para esconder seções que você não usa do menu lateral.' },
      ],
    },
    'colaboradores': {
      title: 'Colaboradores',
      desc: 'Gerencie os membros da equipe e controle os acessos.',
      items: [
        { icon: '✉️', title: 'Convite por link', desc: 'Clique em "Convidar" para gerar um link único. O colaborador cria a própria conta via link — sem precisar da senha dele.' },
        { icon: '🔑', title: 'Papel do usuário', desc: 'Administrador tem acesso total. Colaborador acessa clientes, imóveis, calendário e pode ser restringido pelo menu de preferências.' },
        { icon: '🔒', title: 'Redefinir senha', desc: 'Se um colaborador esquecer a senha, ele pode redefini-la na tela de login sem precisar de confirmação por e-mail.' },
      ],
    },
  };

  // ── Passos do tutorial de onboarding ──────────────────────
  const TUTORIAL_STEPS = [
    {
      selector: null,
      title: 'Bem-vindo ao AgriFlow! 👋',
      desc: 'Vamos fazer um tour rápido pelas principais seções. São menos de 2 minutos. Você pode sair a qualquer momento.',
    },
    {
      selector: '.sidebar',
      title: 'Menu lateral',
      desc: 'Aqui você navega entre todas as seções do sistema. Clique em qualquer item para acessar. Você pode reorganizar e ocultar itens em Preferências.',
    },
    {
      selector: '[data-page="clientes"]',
      title: 'Clientes',
      desc: 'Cadastre todos os seus produtores rurais com dados completos: CPF, endereço, dados bancários, DAP/CAF e cônjuge.',
    },
    {
      selector: '[data-page="imoveis"]',
      title: 'Imóveis Rurais',
      desc: 'Cadastre as propriedades rurais vinculadas a cada cliente. O sistema usa esses dados automaticamente em contratos e projetos de crédito.',
    },
    {
      selector: '[data-page="contratos"]',
      title: 'Contratos',
      desc: 'Gere contratos preenchidos automaticamente com os dados dos clientes e imóveis. Suporta 7 tipos de contrato. Faça upload de um modelo Word ou HTML com tags {{TAG}}.',
    },
    {
      selector: '[data-page="credito-rural"]',
      title: 'Crédito Rural',
      desc: 'Módulo completo para projetos de crédito rural. Acompanhe 9 etapas de controle, gerencie documentos, calcule comissões e gere o TRT.',
    },
    {
      selector: '[data-page="calendario"]',
      title: 'Calendário',
      desc: 'Agenda de tarefas para toda a equipe, com suporte a recorrência diária, semanal e mensal.',
    },
    {
      selector: '[data-page="preferencias"]',
      title: 'Preferências',
      desc: 'Personalize a cor, o logo e a ordem do menu lateral para o seu escritório.',
    },
    {
      selector: '#help-fab',
      title: 'Botão de ajuda (?)',
      desc: 'Em qualquer página, clique neste botão para ver um guia rápido sobre aquela seção.',
    },
    {
      selector: null,
      title: 'Tudo pronto! 🎉',
      desc: 'Você já conhece o básico do AgriFlow. Explore cada seção e use o "?" para ajuda contextual a qualquer momento.',
    },
  ];

  // ── Detectar página atual ────────────────────────────────
  function _currentPageKey() {
    const path = window.location.pathname;
    if (path.includes('visao-geral'))       return 'visao-geral';
    if (path.includes('clientes'))          return 'clientes';
    if (path.includes('imoveis'))           return 'imoveis';
    if (path.includes('modelos-documentos'))return 'modelos-documentos';
    if (path.includes('contratos'))         return 'contratos';
    if (path.includes('vendas'))            return 'vendas';
    if (path.includes('calendario'))        return 'calendario';
    if (path.includes('servicos'))          return 'servicos';
    if (path.includes('credito-rural'))     return 'credito-rural';
    if (path.includes('preferencias'))      return 'preferencias';
    if (path.includes('colaboradores'))     return 'colaboradores';
    return null;
  }

  // ── Injetar estilos ──────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('agriflow-help-styles')) return;
    const style = document.createElement('style');
    style.id = 'agriflow-help-styles';
    style.textContent = `
      /* Botão flutuante ? */
      #help-fab {
        position: fixed; bottom: 24px; right: 24px; z-index: 1200;
        width: 44px; height: 44px; border-radius: 50%;
        background: var(--verde, #1A6B3C); color: #fff;
        border: none; cursor: pointer;
        font-size: 1.1rem; font-weight: 900; font-family: inherit;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        display: flex; align-items: center; justify-content: center;
        transition: transform .15s, box-shadow .15s;
      }
      #help-fab:hover { transform: scale(1.1); box-shadow: 0 6px 20px rgba(0,0,0,0.28); }

      /* Modal de ajuda */
      #help-modal-overlay {
        display: none; position: fixed; inset: 0; z-index: 2000;
        background: rgba(0,0,0,0.45); align-items: center; justify-content: center;
      }
      #help-modal-overlay.open { display: flex; }
      #help-modal {
        background: #fff; border-radius: 16px; padding: 28px 28px 24px;
        max-width: 480px; width: 90%; max-height: 80vh; overflow-y: auto;
        box-shadow: 0 16px 48px rgba(0,0,0,0.18);
        animation: helpFadeIn .2s ease;
      }
      @keyframes helpFadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
      #help-modal h2 { font-size: 1.1rem; font-weight: 900; margin-bottom: 6px; color: var(--verde, #1A6B3C); }
      #help-modal .help-desc { font-size: .85rem; color: #555; margin-bottom: 20px; line-height: 1.5; }
      .help-item { display:flex; gap:14px; padding:12px 0; border-bottom:1px solid #F0F0E8; }
      .help-item:last-child { border-bottom:none; }
      .help-item-icon { font-size:1.4rem; flex-shrink:0; width:32px; text-align:center; padding-top:2px; }
      .help-item-body h4 { font-size:.85rem; font-weight:800; color:#1A1A1A; margin-bottom:3px; }
      .help-item-body p  { font-size:.78rem; color:#666; line-height:1.5; margin:0; }
      .help-modal-footer { display:flex; justify-content:space-between; align-items:center; margin-top:20px; padding-top:16px; border-top:1px solid #F0F0E8; }
      .help-tutorial-btn { font-size:.75rem; font-weight:700; color:var(--verde,#1A6B3C); background:none; border:none; cursor:pointer; padding:0; text-decoration:underline; }
      .help-close-btn { padding:8px 20px; background:var(--verde,#1A6B3C); color:#fff; border:none; border-radius:8px; font-size:.82rem; font-weight:700; cursor:pointer; font-family:inherit; }

      /* Tutorial overlay */
      #tut-overlay {
        display: none; position: fixed; inset: 0; z-index: 3000; pointer-events: none;
        background: rgba(0,0,0,0); transition: background .3s;
      }
      #tut-overlay.active { pointer-events: none; background: rgba(0,0,0,0.65); }
      #tut-highlight {
        position: fixed; z-index: 3001; pointer-events: none;
        border-radius: 8px; transition: all .3s ease;
        box-shadow: 0 0 0 4px rgba(255,255,255,0.6);
        outline: 3px solid var(--verde, #1A6B3C);
      }
      #tut-card {
        position: fixed; z-index: 3002; background: #fff;
        border-radius: 14px; padding: 20px 22px; max-width: 300px; width: 85%;
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        transition: all .3s ease;
      }
      #tut-card h3 { font-size:.95rem; font-weight:900; color:var(--verde,#1A6B3C); margin-bottom:8px; }
      #tut-card p  { font-size:.82rem; color:#444; line-height:1.5; margin:0 0 16px; }
      #tut-card .tut-nav { display:flex; gap:8px; align-items:center; }
      #tut-card .tut-step { font-size:.72rem; color:#999; flex:1; }
      #tut-skip  { font-size:.72rem; color:#999; background:none; border:none; cursor:pointer; text-decoration:underline; padding:0; font-family:inherit; }
      #tut-prev  { padding:6px 14px; background:#F0F0E8; border:none; border-radius:6px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
      #tut-next  { padding:6px 16px; background:var(--verde,#1A6B3C); color:#fff; border:none; border-radius:6px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
      #tut-close { pointer-events: all; position:fixed; top:16px; right:16px; z-index:3003; padding:6px 14px; background:rgba(255,255,255,0.9); border:none; border-radius:6px; font-size:.78rem; font-weight:700; cursor:pointer; font-family:inherit; }
    `;
    document.head.appendChild(style);
  }

  // ── Botão flutuante ──────────────────────────────────────
  function _injectFab() {
    if (document.getElementById('help-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'help-fab';
    btn.title = 'Ajuda';
    btn.textContent = '?';
    btn.addEventListener('click', _openHelp);
    document.body.appendChild(btn);
  }

  // ── Modal de ajuda ───────────────────────────────────────
  function _openHelp() {
    const key  = _currentPageKey();
    const info = PAGE_HELP[key];

    let overlay = document.getElementById('help-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'help-modal-overlay';
      overlay.innerHTML = `
        <div id="help-modal">
          <h2 id="help-title"></h2>
          <p class="help-desc" id="help-desc"></p>
          <div id="help-items"></div>
          <div class="help-modal-footer">
            <button class="help-tutorial-btn" id="help-tour-btn">🗺️ Ver tutorial do sistema</button>
            <button class="help-close-btn" id="help-close-btn">Fechar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      document.getElementById('help-close-btn').addEventListener('click', _closeHelp);
      document.getElementById('help-tour-btn').addEventListener('click', () => { _closeHelp(); _startTutorial(); });
      overlay.addEventListener('click', e => { if (e.target === overlay) _closeHelp(); });
    }

    if (info) {
      document.getElementById('help-title').textContent = info.title;
      document.getElementById('help-desc').textContent  = info.desc;
      document.getElementById('help-items').innerHTML   = info.items.map(it => `
        <div class="help-item">
          <div class="help-item-icon">${it.icon}</div>
          <div class="help-item-body"><h4>${it.title}</h4><p>${it.desc}</p></div>
        </div>`).join('');
    } else {
      document.getElementById('help-title').textContent = 'Ajuda — AgriFlow';
      document.getElementById('help-desc').textContent  = 'Use o tutorial para conhecer todas as funcionalidades do sistema.';
      document.getElementById('help-items').innerHTML   = '';
    }

    overlay.classList.add('open');
  }

  function _closeHelp() {
    document.getElementById('help-modal-overlay')?.classList.remove('open');
  }

  // ── Tutorial ─────────────────────────────────────────────
  let _tutStep = 0;

  function _startTutorial() {
    _tutStep = 0;
    _buildTutorialDOM();
    document.getElementById('tut-overlay').classList.add('active');
    document.getElementById('tut-overlay').style.display = '';
    _renderTutStep();
  }

  function _buildTutorialDOM() {
    if (document.getElementById('tut-overlay')) { document.getElementById('tut-overlay').style.display = ''; return; }

    const overlay = document.createElement('div');
    overlay.id = 'tut-overlay';

    const highlight = document.createElement('div');
    highlight.id = 'tut-highlight';

    const card = document.createElement('div');
    card.id = 'tut-card';
    card.innerHTML = `
      <h3 id="tut-title"></h3>
      <p id="tut-desc"></p>
      <div class="tut-nav">
        <span class="tut-step" id="tut-step-num"></span>
        <button id="tut-skip">Pular</button>
        <button id="tut-prev">←</button>
        <button id="tut-next">Próximo →</button>
      </div>`;

    const closeBtn = document.createElement('button');
    closeBtn.id = 'tut-close';
    closeBtn.textContent = '✕ Fechar tutorial';

    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(card);
    document.body.appendChild(closeBtn);

    card.style.pointerEvents = 'all';
    closeBtn.style.pointerEvents = 'all';

    document.getElementById('tut-next').addEventListener('click', () => { _tutStep++; if (_tutStep >= TUTORIAL_STEPS.length) _endTutorial(); else _renderTutStep(); });
    document.getElementById('tut-prev').addEventListener('click', () => { if (_tutStep > 0) { _tutStep--; _renderTutStep(); } });
    document.getElementById('tut-skip').addEventListener('click', _endTutorial);
    closeBtn.addEventListener('click', _endTutorial);
  }

  function _renderTutStep() {
    const step    = TUTORIAL_STEPS[_tutStep];
    const total   = TUTORIAL_STEPS.length;
    const isLast  = _tutStep === total - 1;
    const card    = document.getElementById('tut-card');
    const hl      = document.getElementById('tut-highlight');

    document.getElementById('tut-title').textContent    = step.title;
    document.getElementById('tut-desc').textContent     = step.desc;
    document.getElementById('tut-step-num').textContent = `${_tutStep + 1} / ${total}`;
    document.getElementById('tut-next').textContent     = isLast ? '✓ Concluir' : 'Próximo →';
    document.getElementById('tut-prev').style.display   = _tutStep === 0 ? 'none' : '';

    if (step.selector) {
      const target = document.querySelector(step.selector);
      if (target) {
        const rect = target.getBoundingClientRect();
        const pad  = 6;
        hl.style.display = '';
        hl.style.top    = (rect.top    - pad) + 'px';
        hl.style.left   = (rect.left   - pad) + 'px';
        hl.style.width  = (rect.width  + pad*2) + 'px';
        hl.style.height = (rect.height + pad*2) + 'px';

        // Position card below or above target
        const below = rect.bottom + 16 + 220 < window.innerHeight;
        card.style.top  = below ? (rect.bottom + 16) + 'px' : (rect.top - 16 - 180) + 'px';
        card.style.left = Math.min(rect.left, window.innerWidth - 320) + 'px';
      } else {
        _centerCard(); hl.style.display = 'none';
      }
    } else {
      hl.style.display = 'none';
      _centerCard();
    }
  }

  function _centerCard() {
    const card = document.getElementById('tut-card');
    card.style.top  = '50%';
    card.style.left = '50%';
    card.style.transform = 'translate(-50%, -50%)';
  }

  function _endTutorial() {
    document.getElementById('tut-overlay').style.display   = 'none';
    document.getElementById('tut-overlay').classList.remove('active');
    document.getElementById('tut-highlight').style.display = 'none';
    document.getElementById('tut-card').style.display      = 'none';
    document.getElementById('tut-close').style.display     = 'none';
    localStorage.setItem('agriflow_tutorial_seen', '1');
  }

  // ── Verificar se é primeira visita ───────────────────────
  function _checkFirstVisit() {
    if (!localStorage.getItem('agriflow_tutorial_seen')) {
      // Mostrar tutorial após 1.5s para a página carregar
      setTimeout(_startTutorial, 1500);
    }
  }

  // ── Init público ─────────────────────────────────────────
  window.initHelp = function () {
    _injectStyles();
    _injectFab();

    // Tutorial automático apenas na visão geral (página inicial)
    if (window.location.pathname.includes('visao-geral')) {
      _checkFirstVisit();
    }
  };

  window.startTutorial = _startTutorial;
})();
