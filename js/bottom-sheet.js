/* ==========================================================================
   BOTTOM SHEET (MENU INFERIOR DESLIZANTE) — Versão com Física Fluida Real
   ========================================================================== */
(function () {
    'use strict';

    var sheet = document.getElementById('bottomSheet');
    var overlay = document.getElementById('sheetOverlay');
    var dragZone = document.getElementById('sheetDragZone');
    var content = document.getElementById('sheetContent');

    if (!sheet || !overlay || !dragZone || !content) return;

    var SHEET_CONTENT = {
        estudar: {
            items: [
                { name: 'Tradução', icon: 'icon-notebook', target: 'traducao' }
            ]
        },
        laboratorio: {
            items: [
                { name: 'Analisador de textos', icon: 'icon-clipboard', target: 'analisador' },
                { name: 'Quiz', icon: 'icon-question-mark', target: 'quiz' }
            ]
        },
        biblioteca: {
            items: [
                { name: 'Favoritos', icon: 'icon-star', target: 'favoritos' }
            ]
        },
        vocabulario: {
            items: [
                { name: 'Categorias', icon: 'icon-category', target: 'categorias' },
                { name: 'Ficha técnica', icon: 'icon-sort-a-z', target: 'ficha' }
            ]
        }
    };

    var DRAG_CLOSE_THRESHOLD = 80;
    var DRAG_EXPAND_THRESHOLD = 60;
    var TRANSITION_SMOOTH = 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), height 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)';

    var startY = 0;
    var currentY = 0;
    var isDragging = false;
    var isExpanded = false;
    var closeTimer = null; // Controla o setTimeout da limpeza pós-fechamento

    function renderSheetContent(categoryKey) {
        var category = SHEET_CONTENT[categoryKey];
        if (!category) return;

        content.innerHTML = category.items.map(function (item) {
            return '<a href="#" data-target="' + item.target + '" class="sheet-item">' +
                '<span class="sheet-item-icon ' + item.icon + '" aria-hidden="true"></span>' +
                '<span>' + item.name + '</span>' +
                '</a>';
        }).join('');

        // Marca como ativo o item cuja tela já está sendo exibida
        var telaAtiva = (window.location.hash || '#traducao').replace('#', '');
        content.querySelectorAll('.sheet-item').forEach(function (itemEl) {
            itemEl.classList.toggle('active', itemEl.getAttribute('data-target') === telaAtiva);
        });
    }

    function openSheet(categoryKey) {
        renderSheetContent(categoryKey);

        // CORREÇÃO DO ATRASO: cancela a limpeza pendente do fechamento anterior.
        // Sem isso, o setTimeout de 300ms do closeSheet() disparava DEPOIS do
        // openSheet() e apagava o transform/height recém-aplicados, fazendo o
        // sheet fechar de volta ("a abertura não funcionava").
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }

        sheet.style.transition = TRANSITION_SMOOTH;
        sheet.style.transform = 'translateY(0)';
        sheet.style.height = '50dvh';
        sheet.style.pointerEvents = 'auto';

        overlay.style.transition = 'opacity 0.25s ease';
        overlay.style.pointerEvents = 'auto';

        sheet.classList.add('active');
        overlay.classList.add('active');
        isExpanded = false;
    }

    /* Expõe globalmente para o app.js fechar o sheet ao trocar de tela */
    window.fecharBottomSheet = closeSheet;

    function closeSheet() {
        // Cancela limpeza anterior (evita timeouts duplicados/solapados)
        if (closeTimer) clearTimeout(closeTimer);

        // CORREÇÃO DO ATRASO: Desliga pointer-events instantaneamente
        overlay.style.pointerEvents = 'none';
        sheet.style.pointerEvents = 'none';

        sheet.style.transition = TRANSITION_SMOOTH;
        sheet.style.transform = 'translateY(100%)';
        overlay.style.transition = 'opacity 0.2s ease';

        sheet.classList.remove('active', 'expanded');
        overlay.classList.remove('active');

        closeTimer = setTimeout(function () {
            closeTimer = null;
            // Defesa extra: só limpa se o sheet continuar fechado
            if (!sheet.classList.contains('active')) {
                sheet.style.height = '';
                sheet.style.transform = '';
                isExpanded = false;
            }
        }, 300);
    }

    /* ----------------------------------------------------------------------
       Cliques nos menus
       ---------------------------------------------------------------------- */
    var navItems = document.querySelectorAll('.mobile-bottom-nav .bottom-nav-item');
    navItems.forEach(function (btn) {
        btn.addEventListener('click', function (event) {
            event.preventDefault();
            openSheet(btn.getAttribute('data-sheet'));
        });
    });

    overlay.addEventListener('click', closeSheet);

    content.addEventListener('click', function (event) {
        var item = event.target.closest('.sheet-item');
        if (item) {
            event.preventDefault();
            var telaId = item.getAttribute('data-target');
            closeSheet();
            /* Navega via roteador central do app.js (troca a tela + hash +
               sincroniza a sidebar/drawer). A ordem importa: fechar primeiro
               para a troca de tela não ser interrompida pelo fecharBottomSheet. */
            if (telaId && typeof window.navegarPara === 'function') {
                window.navegarPara(telaId);
            }
        }
    });

    /*  ----------------------------------------------------------------------
        Gestos de arraste
        ---------------------------------------------------------------------- */
    var baseHeightPx = 0;

    dragZone.addEventListener('touchstart', function (e) {
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        sheet.style.transition = 'none';
        baseHeightPx = sheet.getBoundingClientRect().height;
    }, { passive: true });

    dragZone.addEventListener('touchmove', function (e) {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        var deltaY = currentY - startY;

        if (deltaY > 0) {
            // Arrastando para baixo: a folha desce
            sheet.style.transform = 'translateY(' + deltaY + 'px)';
        } else {
            // Arrastando para cima: ESTICA A ALTURA em vez de mover a caixa
            sheet.style.transform = 'translateY(0)';
            var newHeight = baseHeightPx + Math.abs(deltaY);
            sheet.style.height = newHeight + 'px';
        }
    }, { passive: true });

    dragZone.addEventListener('touchend', function () {
        if (!isDragging) return;
        isDragging = false;

        var deltaY = currentY - startY;
        sheet.style.transition = TRANSITION_SMOOTH;

        if (deltaY > DRAG_CLOSE_THRESHOLD) {
            // Puxou para baixo: fecha
            closeSheet();
        } else if (deltaY < -DRAG_EXPAND_THRESHOLD && !isExpanded) {
            // Puxou para cima: crava em 82dvh suavemente
            sheet.style.transform = 'translateY(0)';
            sheet.style.height = '82dvh';
            sheet.classList.add('expanded');
            isExpanded = true;
        } else {
            // Volta para a altura padrão
            sheet.style.transform = 'translateY(0)';
            sheet.style.height = isExpanded ? '82dvh' : '50dvh';
        }

        startY = 0;
        currentY = 0;
    });
})();