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

window.toggleSidebarGroup = function(groupId, forceOpen = null) {
    const group = document.getElementById(groupId);
    if (!group) return;
    const isExpanded = group.classList.contains('expanded');
    const shouldOpen = forceOpen !== null ? forceOpen : !isExpanded;
    if (shouldOpen) {
        group.classList.add('expanded');
    } else {
        group.classList.remove('expanded');
    }
};

function setActiveTab(id) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const tab = document.getElementById(id);
    if (tab) {
        tab.classList.add('active');
        const parentGroup = tab.closest('.nav-group');
        if (parentGroup) {
            parentGroup.classList.add('expanded');
        }
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

// ── Sincronización Automática en Tiempo Real para la Web ───────────
let _lastSyncState = { pending_count: -1, total_max_id: -1, last_pending_id: -1, loans_pending_count: -1, last_loan_id: -1, last_loan_activity: '', last_loan_status: '' };

function initRealtimeSync() {
    setInterval(async () => {
        try {
            const res = await originalFetch('/api/sync/status').then(r => r.json());
            if (res.status === 'success') {
                const { pending_count, total_max_id, last_pending_id, loans_pending_count, last_loan_id, latest_loan_info } = res;
                
                // Actualizar insignia de préstamos en el menú lateral de la web
                const loansDot = document.getElementById('loans-badge-dot');
                const loansBadge = document.getElementById('loans-badge-count');
                if (loansDot && loansBadge) {
                    if (loans_pending_count > 0) {
                        loansDot.classList.remove('hidden');
                        loansBadge.classList.remove('hidden');
                        loansBadge.textContent = loans_pending_count > 9 ? '9+' : loans_pending_count;
                    } else {
                        loansDot.classList.add('hidden');
                        loansBadge.classList.add('hidden');
                    }
                }

                if (_lastSyncState.pending_count === -1) {
                    _lastSyncState = { 
                        pending_count, 
                        total_max_id, 
                        last_pending_id, 
                        loans_pending_count, 
                        last_loan_id,
                        last_loan_activity: latest_loan_info?.last_activity || '',
                        last_loan_status: latest_loan_info?.status || ''
                    };
                    return;
                }

                const hasNewRequest = last_pending_id > (_lastSyncState.last_pending_id || 0);
                const hasInventoryChange = total_max_id !== _lastSyncState.total_max_id;
                const hasLoanChange = (loans_pending_count !== _lastSyncState.loans_pending_count) || 
                                      (last_loan_id && last_loan_id > (_lastSyncState.last_loan_id || 0)) ||
                                      (latest_loan_info && (
                                          latest_loan_info.last_activity !== _lastSyncState.last_loan_activity ||
                                          latest_loan_info.status !== _lastSyncState.last_loan_status
                                      ));

                if (hasNewRequest || hasInventoryChange || hasLoanChange) {
                    _lastSyncState = { 
                        pending_count, 
                        total_max_id, 
                        last_pending_id, 
                        loans_pending_count, 
                        last_loan_id,
                        last_loan_activity: latest_loan_info?.last_activity || '',
                        last_loan_status: latest_loan_info?.status || ''
                    };

                    if (typeof showToast === 'function') {
                        if (hasLoanChange && latest_loan_info) {
                            const st = latest_loan_info.status;
                            if (st === 'Pendiente Aprobación Admin') showToast(`⏳ Solicitud de préstamo: ${latest_loan_info.item_name}`, 'info');
                            else if (st === 'Prestado') showToast(`🟢 Préstamo aprobado: ${latest_loan_info.item_name}`, 'success');
                            else if (st === 'Pendiente Verificación Admin') showToast(`📷 Evidencia de devolución: ${latest_loan_info.item_name}`, 'info');
                            else if (st === 'Devuelto') showToast(`✅ Devolución concluida: ${latest_loan_info.item_name}`, 'success');
                            else if (st === 'Requiere Atención') showToast(`⚠️ Devolución observada: ${latest_loan_info.item_name}`, 'warning');
                            else if (st === 'Rechazado') showToast(`✕ Solicitud rechazada: ${latest_loan_info.item_name}`, 'error');
                            else if (st === 'Control Mayor') showToast(`🏛️ Concluido bajo Control Mayor: ${latest_loan_info.item_name}`, 'info');
                            else showToast('🤝 Actualización en Préstamos', 'info');
                        } else if (hasNewRequest) {
                            showToast('🔔 Nueva solicitud de cambio registrada en el laboratorio', 'info');
                        } else {
                            showToast('🔄 Cambios aplicados en el inventario', 'info');
                        }
                    }

                    const badgeDesktop = document.getElementById('nav-notification-badge');
                    const badgeMobile = document.getElementById('mobile-notification-badge');
                    if (badgeDesktop) {
                        badgeDesktop.textContent = pending_count > 0 ? pending_count : '';
                        badgeDesktop.classList.toggle('hidden', pending_count <= 0);
                    }
                    if (badgeMobile) {
                        badgeMobile.textContent = pending_count > 0 ? pending_count : '';
                        badgeMobile.classList.toggle('hidden', pending_count <= 0);
                    }

                    // Actualización automática de vistas en la web
                    if (state.activeRoute === '#/loans' && typeof window.loadLoansData === 'function') {
                        window.loadLoansData();
                    } else if (state.activeRoute === '#/notifications' && typeof renderNotificationsView === 'function') {
                        const mainEl = document.getElementById('main-content');
                        if (mainEl) renderNotificationsView(mainEl);
                    } else if (!state.activeRoute || state.activeRoute === '#' || state.activeRoute === '#/' || state.activeRoute === '#/home') {
                        const mainEl = document.getElementById('main-content');
                        if (mainEl && typeof renderHomeView === 'function') renderHomeView(mainEl);
                    } else if (state.activeRoute.includes('#/substances') || state.activeRoute.includes('#/chemical-materials') || state.activeRoute.includes('#/didactic-materials') || state.activeRoute.includes('#/cards') || state.activeRoute.includes('#/table')) {
                        const activeInput = document.activeElement;
                        const isTyping = activeInput && (activeInput.tagName === 'INPUT' || activeInput.tagName === 'TEXTAREA');
                        if (!isTyping && typeof router === 'function') {
                            router();
                        }
                    }
                }
            }
        } catch (e) {}
    }, 2000);
}

// ── Motor Ambiental Ultra-Optimizado (Orbes Multicolor Fluidos + Estrellas 60FPS) ───────────
let _ambientLoopRunning = false;
let _ambientAnimationId = null;

window.toggleAmbientBackground = function(enable) {
    localStorage.setItem('ambient_bg_enabled', enable ? 'true' : 'false');
    const canvas = document.getElementById('ambient-bg-canvas');
    if (!canvas) return;

    if (!enable) {
        if (_ambientAnimationId) {
            cancelAnimationFrame(_ambientAnimationId);
            _ambientAnimationId = null;
        }
        _ambientLoopRunning = false;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    } else {
        canvas.style.display = 'block';
        if (!_ambientLoopRunning) {
            initAmbientBackground();
        }
    }
};

function initAmbientBackground() {
    const isEnabled = localStorage.getItem('ambient_bg_enabled') !== 'false';
    const isLowSpec = localStorage.getItem('low_spec_mode') === 'true' || document.documentElement.classList.contains('low-spec-mode') || document.body.classList.contains('low-spec-mode');
    const canvas = document.getElementById('ambient-bg-canvas');
    if (!canvas) return;

    if (!isEnabled || isLowSpec) {
        canvas.style.display = 'none';
        return;
    }

    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
        width = canvas.width = Math.floor(window.innerWidth * 0.75);
        height = canvas.height = Math.floor(window.innerHeight * 0.75);
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    // 34 Estrellas con matices vibrantes para ambos temas
    const stars = Array.from({ length: 34 }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: 0.9 + Math.random() * 2.0,
        baseAlpha: 0.25 + Math.random() * 0.7,
        speed: 0.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        hue: Math.random() > 0.4 ? 185 + Math.random() * 85 : 35 + Math.random() * 25
    }));

    let startTime = performance.now();
    let isVisible = true;

    document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden;
        const lowSpecActive = localStorage.getItem('low_spec_mode') === 'true' || document.documentElement.classList.contains('low-spec-mode');
        if (isVisible && isEnabled && !lowSpecActive && !_ambientLoopRunning) {
            startTime = performance.now();
            loop();
        }
    });

    _ambientLoopRunning = true;

    function loop() {
        const isCurrentEnabled = localStorage.getItem('ambient_bg_enabled') !== 'false';
        const isCurrentLowSpec = localStorage.getItem('low_spec_mode') === 'true' || document.documentElement.classList.contains('low-spec-mode');
        if (!isVisible || !isCurrentEnabled || isCurrentLowSpec) {
            _ambientLoopRunning = false;
            canvas.style.display = 'none';
            return;
        }

        const now = performance.now();
        const t = (now - startTime) * 0.0006;

        ctx.clearRect(0, 0, width, height);

        const isDark = !document.body.classList.contains('theme-light');
        // En tema blanco aumentamos la presencia de color para que no se pierda
        const orbAlpha = isDark ? 0.17 : 0.28;
        const orbLightness = isDark ? '55%' : '60%';

        // Orbe 1 (Cian a Violeta a Magenta a Ámbar)
        const hue1 = (t * 24) % 360;
        const x1 = width * (0.35 + 0.25 * Math.sin(t * 0.7));
        const y1 = height * (0.30 + 0.20 * Math.cos(t * 0.8));
        const r1 = Math.min(width, height) * (isDark ? 0.45 : 0.50);
        const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
        grad1.addColorStop(0, `hsla(${hue1}, 95%, ${orbLightness}, ${orbAlpha * 1.3})`);
        grad1.addColorStop(0.5, `hsla(${(hue1 + 40) % 360}, 90%, ${orbLightness}, ${orbAlpha * 0.65})`);
        grad1.addColorStop(1, 'transparent');
        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(x1, y1, r1, 0, Math.PI * 2);
        ctx.fill();

        // Orbe 2 (Índigo a Esmeralda a Fucsia)
        const hue2 = (t * 24 + 130) % 360;
        const x2 = width * (0.70 + 0.22 * Math.cos(t * 0.6));
        const y2 = height * (0.70 + 0.22 * Math.sin(t * 0.75));
        const r2 = Math.min(width, height) * (isDark ? 0.50 : 0.55);
        const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
        grad2.addColorStop(0, `hsla(${hue2}, 95%, ${orbLightness}, ${orbAlpha * 1.25})`);
        grad2.addColorStop(0.5, `hsla(${(hue2 + 50) % 360}, 90%, ${orbLightness}, ${orbAlpha * 0.55})`);
        grad2.addColorStop(1, 'transparent');
        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(x2, y2, r2, 0, Math.PI * 2);
        ctx.fill();

        // Orbe 3 (Esmeralda a Ámbar a Azul Zafiro)
        const hue3 = (t * 24 + 250) % 360;
        const x3 = width * (0.20 + 0.18 * Math.cos(t * 0.9));
        const y3 = height * (0.80 + 0.18 * Math.sin(t * 0.5));
        const r3 = Math.min(width, height) * (isDark ? 0.42 : 0.46);
        const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
        grad3.addColorStop(0, `hsla(${hue3}, 95%, ${orbLightness}, ${orbAlpha * 1.15})`);
        grad3.addColorStop(1, 'transparent');
        ctx.fillStyle = grad3;
        ctx.beginPath();
        ctx.arc(x3, y3, r3, 0, Math.PI * 2);
        ctx.fill();

        // 2. Destellos y Estrellas Shimmering
        for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const starAlpha = Math.max(0.12, Math.min(1, s.baseAlpha + 0.40 * Math.sin(t * s.speed + s.phase)));
            const sx = s.x * width;
            const sy = s.y * height;

            // En tema claro, usamos mayor saturación y contraste para que brillen
            ctx.fillStyle = isDark 
                ? `hsla(${s.hue}, 90%, 75%, ${starAlpha})`
                : `hsla(${s.hue}, 95%, 38%, ${starAlpha * 0.85})`;
            ctx.beginPath();
            ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
            ctx.fill();

            // Resplandor
            if (starAlpha > 0.65) {
                ctx.fillStyle = isDark 
                    ? `hsla(${s.hue}, 95%, 85%, ${starAlpha * 0.35})`
                    : `hsla(${s.hue}, 90%, 50%, ${starAlpha * 0.25})`;
                ctx.beginPath();
                ctx.arc(sx, sy, s.size * 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        _ambientAnimationId = requestAnimationFrame(loop);
    }

    loop();
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', () => {
    initApp();
    initRealtimeSync();
    initAmbientBackground();
});
