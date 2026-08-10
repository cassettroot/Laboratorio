// Interceptor global para fetch
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    const url = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : String(resource));
    
    if (url.includes('/api/')) {
        config = config || {};
        if (!config.headers) {
            config.headers = {};
        }
        const invId = localStorage.getItem('inventory_id') || 'inventario';
        if (config.headers instanceof Headers) {
            config.headers.append('X-Inventory-Id', invId);
        } else {
            config.headers['X-Inventory-Id'] = invId;
        }
    }
    return originalFetch(resource, config);
};

function setActiveTab(id) {
    const tab = document.getElementById(id);
    if (tab) {
        tab.classList.remove('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
        tab.classList.add('bg-brand-500', 'text-slate-900', 'font-bold');
    }
}

function router() {
    state.activeRoute = window.location.hash || '#/';

    const currentInventory = localStorage.getItem('inventory_id') || 'inventario';
    const isLab = currentInventory === 'inventario';

    // Manejo visual del menú lateral según inventario
    const navSub = document.getElementById('nav-substances');
    const navChem = document.getElementById('nav-chem-materials');
    const navDid = document.getElementById('nav-did-materials');
    const navEquipos = document.getElementById('nav-equipos');
    const navConsulta = document.getElementById('nav-consulta');

    if (navChem) {
        navChem.classList.remove('hidden');
        const chemText = navChem.querySelector('span');
        if (chemText) {
            if (currentInventory === 'oficina') chemText.textContent = 'Materiales y Bienes de Oficina';
            else if (currentInventory === 'sistemas') chemText.textContent = 'Materiales y Equipos de Sistemas';
            else chemText.textContent = 'Materiales Químicos';
        }
    }

    if (isLab) {
        if(navSub) navSub.classList.remove('hidden');
        if(navDid) navDid.classList.remove('hidden');
        if(navConsulta) navConsulta.classList.remove('hidden');
        if(navEquipos) navEquipos.classList.add('hidden');
    } else {
        if(navSub) navSub.classList.add('hidden');
        if(navDid) navDid.classList.add('hidden');
        if(navConsulta) navConsulta.classList.add('hidden');
        if(navEquipos) navEquipos.classList.add('hidden');
    }

    // Rutas accesibles sin iniciar sesión (solo lectura)
    const allowedLoggedOutRoutes = [
        '#/substances',
        '#/chemical-materials',
        '#/didactic-materials',
        '#/equipos',
        '#/scan-qr',
        '#/warehouse',
        '#/loans',
        '#/settings'
        // NOTA: '#/inventory-check' NO está aquí — requiere sesión activa
    ];

    if (!state.isLoggedIn) {
        // Si no ha iniciado sesión, solo se permiten las vistas de elementos y escanear QR
        const isAllowed = allowedLoggedOutRoutes.some(route => state.activeRoute.startsWith(route));
        if (!isAllowed) {
            window.location.hash = isLab ? '#/substances' : '#/chemical-materials';
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

    // Redirecciones forzadas si intenta entrar a rutas exclusivas de sustancias
    if (!isLab && (state.activeRoute.startsWith('#/substances') || state.activeRoute.startsWith('#/didactic-materials') || state.activeRoute.startsWith('#/consulta'))) {
        window.location.hash = '#/chemical-materials';
        return;
    }
    if (isLab && state.activeRoute.startsWith('#/equipos')) {
        window.location.hash = '#/chemical-materials';
        return;
    }

    stopQrScanner();
    stopWebcam();

    // Ocultar / mostrar "Chequeo de Inventario" según si hay sesión iniciada
    const navInvCheck = document.getElementById('nav-inventory-check');
    if (navInvCheck) {
        if (state.isLoggedIn) {
            navInvCheck.classList.remove('hidden');
        } else {
            navInvCheck.classList.add('hidden');
        }
    }

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
    else if (state.activeRoute === '#/cabinet') {
        setActiveTab('nav-cabinet');
        titleEl.textContent = "Almacén";
        if (typeof renderCabinetView === 'function') {
            renderCabinetView(mainEl);
        } else {
            mainEl.innerHTML = '<div class="p-8 text-center text-slate-500">Módulo en construcción...</div>';
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
    else if (state.activeRoute.startsWith('#/equipos')) {
        setActiveTab('nav-equipos');
        titleEl.textContent = "Bienes y Equipos";
        const parts = state.activeRoute.split('/');
        if (parts.length === 3) {
            renderItemDetail(mainEl, 'equipos', parts[2]);
        } else {
            if (typeof renderEquiposList === 'function') {
                renderEquiposList(mainEl);
            } else {
                mainEl.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error: renderEquiposList no definido.</div>`;
            }
        }
    }
    else if (state.activeRoute === '#/scan-qr') {
        setActiveTab('nav-scan-qr');
        titleEl.textContent = "Escaneo de Códigos QR";
        renderScanQrView(mainEl);
    }
    else if (state.activeRoute === '#/inventory-check') {
        setActiveTab('nav-inventory-check');
        titleEl.textContent = "Chequeo de Inventario";
        if (typeof renderInventoryCheckView === 'function') {
            renderInventoryCheckView(mainEl);
        }
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
    else if (state.activeRoute === '#/settings') {
        setActiveTab('nav-settings');
        titleEl.textContent = "Configuración del Sistema";
        if (typeof renderSettings === 'function') {
            renderSettings(mainEl);
        }
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

    if (!localStorage.getItem('inventory_selected')) {
        if (typeof openSpaceSelectModal === 'function') {
            openSpaceSelectModal();
        }
    }
}

window.openImageLightbox = function(imgSrc, title = 'Vista Previa de Foto / Evidencia') {
    let lightbox = document.getElementById('global-image-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'global-image-lightbox';
        lightbox.className = 'fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300 opacity-0 pointer-events-none no-print';
        lightbox.innerHTML = `
            <div class="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 max-w-3xl w-full shadow-2xl relative flex flex-col items-center space-y-4 animate-fade-in text-white">
                <div class="w-full flex justify-between items-center border-b border-slate-800 pb-3">
                    <h3 id="lightbox-title" class="font-extrabold text-sm text-slate-100 flex items-center gap-2">
                        <i data-lucide="image" class="w-4 h-4 text-emerald-400"></i>
                        <span>${title}</span>
                    </h3>
                    <button onclick="closeImageLightbox()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition font-bold text-lg">&times;</button>
                </div>
                <div class="w-full max-h-[75vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/50 border border-slate-800 p-2">
                    <img id="lightbox-img" src="${imgSrc}" class="max-h-[70vh] max-w-full object-contain rounded-xl shadow-lg" />
                </div>
                <div class="w-full flex justify-between items-center text-xs text-slate-400">
                    <span class="italic">Haz clic fuera o presiona ESC para cerrar</span>
                    <a id="lightbox-download-link" href="${imgSrc}" download target="_blank" class="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition flex items-center gap-1.5 font-bold">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i> Descargar Imagen
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeImageLightbox();
        });
    } else {
        const img = document.getElementById('lightbox-img');
        const titleEl = document.getElementById('lightbox-title')?.querySelector('span');
        const link = document.getElementById('lightbox-download-link');
        if (img) img.src = imgSrc;
        if (titleEl) titleEl.textContent = title;
        if (link) link.href = imgSrc;
    }
    lightbox.classList.remove('opacity-0', 'pointer-events-none');
    if (window.lucide) window.lucide.createIcons();
};

window.closeImageLightbox = function() {
    const lightbox = document.getElementById('global-image-lightbox');
    if (lightbox) {
        lightbox.classList.add('opacity-0', 'pointer-events-none');
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeImageLightbox();
});

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', initApp);
