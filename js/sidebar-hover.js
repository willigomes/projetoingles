/* ==========================================================================
   SIDEBAR FLUTUANTE COM EXPANSÃO POR HOVER (OVERLAY) — DESKTOP
   Estilo Genshin Impact: Texto na Esquerda, Ícone na Direita.
   Controle de intenção via debounce de 120ms para evitar aberturas acidentais.
   ========================================================================== */
(function () {
    'use strict';

    var sidebar = document.getElementById('sidebar-drawer');
    if (!sidebar) return;

    var hoverTimer = null;
    var INTENT_DELAY = 120; // Debounce de intenção: 120ms

    // Ao passar o mouse: aguarda 120ms para confirmar intenção de uso antes de expandir
    sidebar.addEventListener('mouseenter', function () {
        if (window.innerWidth < 768) return;
        if (hoverTimer) clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () {
            sidebar.classList.add('expanded');
        }, INTENT_DELAY);
    });

    // Ao retirar o mouse: recolhe imediatamente
    sidebar.addEventListener('mouseleave', function () {
        if (window.innerWidth < 768) return;
        if (hoverTimer) clearTimeout(hoverTimer);
        sidebar.classList.remove('expanded');
    });

    // Fecha a expansão imediatamente ao clicar em qualquer link ou botão
    var interactiveElements = sidebar.querySelectorAll('.nav-link, .sidebar-action-btn');
    interactiveElements.forEach(function (el) {
        el.addEventListener('click', function () {
            if (hoverTimer) clearTimeout(hoverTimer);
            sidebar.classList.remove('expanded');
        });
    });

    // Acessibilidade via teclado (Focus)
    sidebar.addEventListener('focusin', function () {
        if (window.innerWidth < 768) return;
        if (hoverTimer) clearTimeout(hoverTimer);
        sidebar.classList.add('expanded');
    });

    sidebar.addEventListener('focusout', function (e) {
        if (window.innerWidth < 768) return;
        if (!sidebar.contains(e.relatedTarget)) {
            if (hoverTimer) clearTimeout(hoverTimer);
            sidebar.classList.remove('expanded');
        }
    });

    // Garante que o menu recolha se a janela for redimensionada para mobile
    window.addEventListener('resize', function () {
        if (window.innerWidth < 768) {
            if (hoverTimer) clearTimeout(hoverTimer);
            sidebar.classList.remove('expanded');
        }
    });
})();
