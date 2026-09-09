/* ==========================================================================
   LEARNER — Registro do Service Worker (PWA)
   --------------------------------------------------------------------------
   Registra o sw.js para habilitar funcionamento offline (Cache-First)
   e instalação como Progressive Web App no celular e desktop.
   ========================================================================== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('PWA Service Worker registrado com sucesso! Escopo:', reg.scope))
            .catch(err => console.log('Erro ao registrar Service Worker:', err));
    });
}

/* ==========================================================================
   LEARNER — Roteador de Telas (SPA com hash routing + fetch)
   --------------------------------------------------------------------------
   Responsabilidades:
   1. Buscar o HTML de cada tela em pages/<tela>.html e injetá-lo no slot
      <section id="app-main-content"> sem recarregar a página (com cache).
   2. Atualizar o título do cabeçalho mobile (.mobile-header-title).
   3. Sincronizar o estado visual ativo (.active) em TODOS os menus ao mesmo
      tempo: Sidebar (desktop), Drawer (mobile) e Bottom Sheet (mobile).
   4. Fechar automaticamente o Drawer ou o Bottom Sheet, se estiverem abertos.
   5. Manter a URL em sincronia via hash (#quiz, #favoritos...) e reagir ao
      evento 'hashchange' para que o botão VOLTAR do celular navegue entre as
      telas sem sair do site.
   ========================================================================== */
(function () {
    'use strict';

    /* ----------------------------------------------------------------------
       1. CONFIGURAÇÃO
       ----------------------------------------------------------------------
       - TELA_PADRAO: exibida quando o site abre sem hash ou com hash inválido.
       - TITULOS: nome de cada tela em caixa alta, usado no cabeçalho mobile.
       ---------------------------------------------------------------------- */
    var TELA_PADRAO = 'traducao';

    var TITULOS = {
        traducao: 'TRADUÇÃO',
        analisador: 'ANALISADOR',
        quiz: 'QUIZ',
        favoritos: 'FAVORITOS',
        categorias: 'CATEGORIAS',
        ficha: 'FICHA TÉCNICA',
        configuracoes: 'CONFIGURAÇÕES'
    };

    var telaAtual = null;   // Guarda a tela exibida no momento (evita retrabalho)
    var cacheTelas = {};    // Cache do HTML já buscado (1 fetch por tela)

    /* Referências de DOM */
    var conteudoSlot = document.getElementById('app-main-content');
    var tituloHeader = document.querySelector('.mobile-header-title');

    /* ----------------------------------------------------------------------
       2. CARREGAMENTO DINÂMICO DAS TELAS
       ----------------------------------------------------------------------
       carregarTela(nomeDaTela) busca pages/<nome>.html e injeta o HTML
       retornado dentro do slot #app-main-content. Telas já buscadas ficam
       em cache e são reinjetadas instantaneamente.
       ---------------------------------------------------------------------- */
    function carregarTela(nomeDaTela) {
        /* Slot ausente (HTML da casca alterado): nada a fazer */
        if (!conteudoSlot) return;

        /* 2.1 Tela em cache: injeta direto, sem fetch */
        if (cacheTelas[nomeDaTela]) {
            conteudoSlot.innerHTML = cacheTelas[nomeDaTela];
            return;
        }

        /* 2.2 Primeira visita à tela: busca o fragmento em pages/ */
        /* 'no-cache' garante que edições nas telas apareçam sem o
           navegador servir uma cópia antiga do cache HTTP */
        fetch('pages/' + nomeDaTela + '.html', { cache: 'no-cache' })
            .then(function (res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function (html) {
                cacheTelas[nomeDaTela] = html;
                /* Só injeta se o usuário ainda estiver nesta tela
                   (evita sobrescrever outra tela em caso de clique rápido) */
                if (telaAtual === nomeDaTela) {
                    conteudoSlot.innerHTML = html;
                }
            })
            .catch(function () {
                if (telaAtual === nomeDaTela) {
                    conteudoSlot.innerHTML =
                        '<p class="tela-frase-teste">Não foi possível carregar a tela "' +
                        nomeDaTela + '". Verifique se o arquivo pages/' +
                        nomeDaTela + '.html existe e se a página está sendo servida por um servidor local.</p>';
                }
            });
    }

    /* ----------------------------------------------------------------------
       3. FUNÇÃO CENTRAL DE NAVEGAÇÃO
       ----------------------------------------------------------------------
       navegarPara(telaId)
       - telaId é o valor do atributo data-target (ex: 'quiz').
       - O HTML vem de pages/<telaId>.html (ex: pages/quiz.html).
       - O hash resultante é '#quiz', permitindo voltar/avançar no histórico.
       ---------------------------------------------------------------------- */
    function navegarPara(telaId) {
        /* Tela inexistente (hash inválido): cai para a tela padrão */
        if (!TITULOS[telaId]) {
            if (telaId !== TELA_PADRAO) return navegarPara(TELA_PADRAO);
            return;
        }

        /* Se já estamos nessa tela, apenas garante o hash correto e sai */
        if (telaAtual === telaId) {
            if (window.location.hash !== '#' + telaId) {
                window.location.hash = telaId;
            }
            return;
        }

        /* 3.1 Injeta o HTML da tela no slot único de conteúdo */
        carregarTela(telaId);

        /* 3.2 Atualiza o título do cabeçalho mobile em caixa alta */
        if (tituloHeader) {
            tituloHeader.textContent = TITULOS[telaId] || telaId.toUpperCase();
        }

        /* 3.3 Sincroniza o estado .active em TODOS os menus de uma vez
           (sidebar no desktop, drawer no mobile e bottom sheet no mobile).
           Qualquer elemento com data-target correspondente ganha .active. */
        document.querySelectorAll('[data-target]').forEach(function (elemento) {
            elemento.classList.toggle('active', elemento.getAttribute('data-target') === telaId);
        });

        /* 3.4 Fecha o Drawer e o Bottom Sheet, se estiverem abertos.
           As funções globais são expostas por drawer.js e bottom-sheet.js. */
        if (typeof window.fecharDrawer === 'function') window.fecharDrawer();
        if (typeof window.fecharBottomSheet === 'function') window.fecharBottomSheet();

        /* 3.5 Atualiza a URL via hash. A mudança dispara 'hashchange', que
           chama navegarPara de novo — mas o guarda de telaAtual acima
           detecta que já estamos na tela correta e evita repetição. */
        if (window.location.hash !== '#' + telaId) {
            window.location.hash = telaId;
        }

        telaAtual = telaId;

        /* Rola o conteúdo de volta ao topo a cada troca de tela */
        var main = document.getElementById('app-main');
        if (main) main.scrollTop = 0;
    }

    /* ----------------------------------------------------------------------
       4. LEITURA DA URL (hash) — habilita o botão VOLTAR do navegador/celular
       ---------------------------------------------------------------------- */
    function navegarPeloHash() {
        /* '#quiz' -> 'quiz'; '#/quiz' (trocado pelo browser em alguns casos)
           também é tratado ao remover a '/' extra */
        var telaId = window.location.hash.replace('#', '').replace('/', '');
        if (!telaId) telaId = TELA_PADRAO;
        navegarPara(telaId);
    }

    /* Botão voltar/avançar do histórico navega entre as telas */
    window.addEventListener('hashchange', navegarPeloHash);

    /* ----------------------------------------------------------------------
       5. CLIQUES NOS MENUS
       ----------------------------------------------------------------------
       Todos os links estáticos (Sidebar/Drawer) e o botão Configurações
       possuem data-target. O Bottom Sheet é renderizado dinamicamente pelo
       bottom-sheet.js, que repassa a chamada para navegarPara().
       ---------------------------------------------------------------------- */
    document.querySelectorAll('[data-target]').forEach(function (elemento) {
        elemento.addEventListener('click', function (event) {
            event.preventDefault(); // o href="#" não deve recarregar/saltar
            navegarPara(elemento.getAttribute('data-target'));
        });
    });

    /* ----------------------------------------------------------------------
       6. EXPOSIÇÃO GLOBAL + ESTADO INICIAL
       ----------------------------------------------------------------------
       - window.navegarPara é usado pelo bottom-sheet.js (itens dinâmicos).
       - Ao carregar, respeita o hash da URL (ex: abrir index.html#quiz já
         inicia na tela Quiz); sem hash, cai na tela padrão (Tradução).
       ---------------------------------------------------------------------- */
    window.navegarPara = navegarPara;
    navegarPeloHash();

    /* ----------------------------------------------------------------------
       7. GESTÃO DO TECLADO VIRTUAL (Auto-ocultar Filtros ao Digitar)
       ----------------------------------------------------------------------
       Usa delegação de eventos no document para capturar focus/blur mesmo
       quando o HTML da tela de Tradução é injetado dinamicamente via fetch.

       • focus  → adiciona body.keyboard-open → CSS oculta .btn-filter
       • blur   → remove body.keyboard-open   → CSS restaura .btn-filter
       ---------------------------------------------------------------------- */
    document.addEventListener('focus', function (event) {
        if (event.target && event.target.classList.contains('translation-textarea')) {
            document.body.classList.add('keyboard-open');
        }
    }, true /* capture: true garante disparo antes do target */
    );

    document.addEventListener('blur', function (event) {
        if (event.target && event.target.classList.contains('translation-textarea')) {
            document.body.classList.remove('keyboard-open');
        }
    }, true
    );
})();
