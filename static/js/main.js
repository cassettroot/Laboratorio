function setActiveTab(id) {
    const tab = document.getElementById(id);
    if (tab) {
        tab.classList.remove('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
        tab.classList.add('bg-brand-500', 'text-slate-900', 'font-bold');
    }
}

function router() {
    state.activeRoute = window.location.hash || '#/';

    // Redirección y validación de permisos de rutas
    const allowedLoggedOutRoutes = [
        '#/substances',
        '#/chemical-materials',
        '#/didactic-materials',
        '#/scan-qr',
        '#/warehouse',
        '#/loans'
    ];

    if (!state.isLoggedIn) {
        // Si no ha iniciado sesión, solo se permiten las vistas de reactivos, materiales y escanear QR
        const isAllowed = allowedLoggedOutRoutes.some(route => state.activeRoute.startsWith(route));
        if (!isAllowed) {
            window.location.hash = '#/substances';
            return;
        }
    } else {
        // Con sesión iniciada
        if (state.userRole === 'responsable') {
            // El responsable no puede ver el panel de base de datos, los usuarios, ni el historial de cambios
            if (state.activeRoute.startsWith('#/backup') || state.activeRoute.startsWith('#/users') || state.activeRoute.startsWith('#/history')) {
                window.location.hash = '#/';
                return;
            }
        }
    }

    stopQrScanner();
    stopWebcam();

    document.querySelectorAll('aside nav a').forEach(a => {
        a.classList.remove('bg-brand-500', 'text-slate-900', 'bg-slate-800', 'text-white');
        a.classList.add('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
    });

    const titleEl = document.getElementById('page-title');
    const mainEl = document.getElementById('main-content');

    if (state.activeRoute === '#/') {
        setActiveTab('nav-dashboard');
        titleEl.textContent = "Panel de Control";
        renderDashboard(mainEl);
    }
    else if (state.activeRoute.startsWith('#/substances')) {
        setActiveTab('nav-substances');
        titleEl.textContent = "Reactivos y Sustancias Químicas";
        const parts = state.activeRoute.split('/');
        if (parts.length === 3) {
            if (window.scrollY > 0) {
                sessionStorage.setItem('substances_scroll_y', window.scrollY.toString());
            }
            renderItemDetail(mainEl, 'substances', parts[2]);
        } else {
            sessionStorage.removeItem('last_navigation_source');
            renderSubstancesList(mainEl);
        }
    }
    else if (state.activeRoute.startsWith('#/chemical-materials')) {
        setActiveTab('nav-chem-materials');
        titleEl.textContent = "Materiales Químicos";
        const parts = state.activeRoute.split('/');
        if (parts.length === 3) {
            renderItemDetail(mainEl, 'chemical-materials', parts[2]);
        } else {
            renderChemicalMaterialsList(mainEl);
        }
    }
    else if (state.activeRoute.startsWith('#/didactic-materials')) {
        setActiveTab('nav-did-materials');
        titleEl.textContent = "Materiales Didácticos";
        const parts = state.activeRoute.split('/');
        if (parts.length === 3) {
            renderItemDetail(mainEl, 'didactic-materials', parts[2]);
        } else {
            renderDidacticMaterialsList(mainEl);
        }
    }
    else if (state.activeRoute === '#/scan-qr') {
        setActiveTab('nav-scan-qr');
        titleEl.textContent = "Escaneo de Códigos QR";
        renderScanQrView(mainEl);
    }
    else if (state.activeRoute === '#/warehouse') {
        window.location.hash = '#/substances';
    }
    else if (state.activeRoute === '#/loans') {
        setActiveTab('nav-loans');
        titleEl.textContent = "Control de Préstamos y Devoluciones";
        renderLoansView(mainEl);
    }
    else if (state.activeRoute === '#/history') {
        setActiveTab('nav-history');
        titleEl.textContent = "Historial de Auditoría";
        renderHistoryView(mainEl);
    }
    else if (state.activeRoute === '#/consulta') {
        setActiveTab('nav-consulta');
        titleEl.textContent = "Centro de Consulta";
        renderConsultaView(mainEl);
    }
    else if (state.activeRoute === '#/backup') {
        setActiveTab('nav-backup');
        titleEl.textContent = "Base de Datos";
        renderBackupView(mainEl);
    }
    else if (state.activeRoute === '#/users') {
        setActiveTab('nav-users');
        titleEl.textContent = "Administración de Usuarios";
        renderUsersView(mainEl);
    }
    else if (state.activeRoute === '#/notifications') {
        setActiveTab('nav-notifications');
        titleEl.textContent = "Bandeja de Notificaciones";
        renderNotificationsView(mainEl);
    }
    else if (state.activeRoute === '#/account') {
        setActiveTab('nav-account');
        titleEl.textContent = "Mi Cuenta";
        renderAccountView(mainEl);
    }
    else {
        mainEl.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Ruta no encontrada.</div>`;
    }

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

async function initApp() {
    const savedViewMode = localStorage.getItem('itma2_substances_view_mode');
    if (savedViewMode) {
        state.substancesViewMode = savedViewMode;
    }
    await checkSessionStatus();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', initApp);
