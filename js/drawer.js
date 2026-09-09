/* ==========================================================================
   GAVETA DESLIZANTE (DRAWER) — Script Mínimo de Interação
   - Abre: clique no botão hambúrguer do header mobile
   - Fecha: clique no overlay (.drawer-overlay) ou em qualquer .nav-link
   ========================================================================== */
(function () {
    'use strict';

    var sidebar = document.getElementById('sidebar-drawer');
    var overlay = document.getElementById('drawer-overlay');
    var btnMenu = document.getElementById('btn-menu-mobile');

    if (!sidebar || !overlay || !btnMenu) return;

    function openDrawer() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        btnMenu.setAttribute('aria-expanded', 'true');
    }

    function closeDrawer() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        btnMenu.setAttribute('aria-expanded', 'false');
    }

    /* Expõe globalmente para o app.js poder fechar o drawer ao trocar de tela */
    window.fecharDrawer = closeDrawer;

    /* Abre ao clicar no hambúrguer */
    btnMenu.addEventListener('click', openDrawer);

    /* Fecha ao clicar no backdrop */
    overlay.addEventListener('click', closeDrawer);

    /* Fecha ao clicar em qualquer link da navegação */
    var navLinks = sidebar.querySelectorAll('.nav-link');
    navLinks.forEach(function (link) {
        link.addEventListener('click', closeDrawer);
    });
})();
