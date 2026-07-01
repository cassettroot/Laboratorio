// LabKeep - Lógica SPA de Inventario Químico

// Estado Global
const state = {
    activeRoute: '#/',
    substances: [],
    chemMaterials: [],
    didMaterials: [],
    history: [],
    activeUser: '',
    isLoggedIn: false,
    substancesViewMode: localStorage.getItem('itma2_substances_view_mode') || 'list',
    webcamStream: null,
    html5QrScanner: null
};

// Enrutador Principal
function router() {
    state.activeRoute = window.location.hash || '#/';
    
    // Detener escáner si cambia de ruta
    stopQrScanner();
    // Detener webcam si cambia de ruta
    stopWebcam();

    // Actualizar sidebar activo
    document.querySelectorAll('aside nav a').forEach(a => {
        a.classList.remove('bg-brand-500', 'text-slate-900', 'bg-slate-800', 'text-white');
        a.classList.add('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
    });

    const titleEl = document.getElementById('page-title');
    const mainEl = document.getElementById('main-content');

    // Mapear rutas
    if (state.activeRoute === '#/') {
        setActiveTab('nav-dashboard');
        titleEl.textContent = "Panel de Control";
        renderDashboard(mainEl);
    } 
    else if (state.activeRoute.startsWith('#/substances')) {
        setActiveTab('nav-substances');
        titleEl.textContent = "Reactivos y Sustancias Químicas";
        
        // Comprobar si es ver detalle o lista
        const parts = state.activeRoute.split('/');
        if (parts.length === 3) {
            renderItemDetail(mainEl, 'substances', parts[2]);
        } else {
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
    else if (state.activeRoute === '#/history') {
        setActiveTab('nav-history');
        titleEl.textContent = "Historial de Auditoría";
        renderHistoryView(mainEl);
    } 
    else {
        mainEl.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Ruta no encontrada.</div>`;
    }

    // Inicializar iconos de Lucide dinámicos
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

function setActiveTab(id) {
    const tab = document.getElementById(id);
    if (tab) {
        tab.classList.remove('text-slate-300', 'hover:bg-slate-800', 'hover:text-white');
        tab.classList.add('bg-brand-500', 'text-slate-900', 'font-bold');
    }
}

// Obtener el responsable activo cabecera
function getActiveUser() {
    return state.activeUser || '';
}

// -------------------------------------------------------------
// VISTA: PANEL DE CONTROL
// -------------------------------------------------------------
async function renderDashboard(container) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>
    `;

    try {
        const [subRes, chemRes, didRes, histRes] = await Promise.all([
            fetch('/api/substances').then(r => r.json()),
            fetch('/api/chemical-materials').then(r => r.json()),
            fetch('/api/didactic-materials').then(r => r.json()),
            fetch('/api/history').then(r => r.json())
        ]);

        const substances = subRes.data || [];
        const chemMaterials = chemRes.data || [];
        const didMaterials = didRes.data || [];
        const history = histRes.data || [];

        // Calcular alertas (caducados o por caducar en 30 días)
        const today = new Date();
        const expirationAlerts = substances.filter(s => {
            if (!s.expiration_date) return false;
            const exp = new Date(s.expiration_date);
            const diffTime = exp - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30; // Caducado o por caducar en 30 días
        });

        container.innerHTML = `
            <div class="space-y-8 animate-fade-in">
                <!-- Banner de bienvenida -->
                <div class="bg-gradient-to-r from-slate-900 via-brand-900 to-brand-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-slate-950/10">
                    <div class="absolute -right-16 -top-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl"></div>
                    <div class="relative z-10 max-w-2xl">
                        <span class="text-brand-400 text-sm font-bold uppercase tracking-wider">Laboratorio Local</span>
                        <h2 class="text-3xl font-extrabold mt-2">Bienvenido a LabKeep</h2>
                        <p class="text-slate-300 mt-2">
                            Sistema local de inventario químico, reactivos, materiales didácticos y generación de etiquetas QR con bitácora de cambios.
                        </p>
                    </div>
                </div>

                <!-- Tarjetas de estadísticas rápidas -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                        <div class="bg-teal-50 text-teal-600 p-4 rounded-2xl">
                            <i data-lucide="beaker" class="w-8 h-8"></i>
                        </div>
                        <div>
                            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Sustancias</span>
                            <h3 class="text-2xl font-bold mt-1 text-slate-800">${substances.length}</h3>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                        <div class="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                            <i data-lucide="droplet" class="w-8 h-8"></i>
                        </div>
                        <div>
                            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Material Químico</span>
                            <h3 class="text-2xl font-bold mt-1 text-slate-800">${chemMaterials.length}</h3>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                        <div class="bg-indigo-50 text-indigo-600 p-4 rounded-2xl">
                            <i data-lucide="graduation-cap" class="w-8 h-8"></i>
                        </div>
                        <div>
                            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Didácticos</span>
                            <h3 class="text-2xl font-bold mt-1 text-slate-800">${didMaterials.length}</h3>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center gap-5 hover-scale">
                        <div class="p-4 rounded-2xl ${expirationAlerts.length > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}">
                            <i data-lucide="bell" class="w-8 h-8 animate-bounce"></i>
                        </div>
                        <div>
                            <span class="text-slate-400 text-xs font-semibold uppercase tracking-wider">Alertas Caducidad</span>
                            <h3 class="text-2xl font-bold mt-1 ${expirationAlerts.length > 0 ? 'text-red-600 font-extrabold' : 'text-slate-800'}">${expirationAlerts.length}</h3>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Historial reciente -->
                    <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm lg:col-span-2 flex flex-col min-h-[400px]">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                            <h3 class="font-bold text-slate-900 flex items-center gap-2">
                                <i data-lucide="activity" class="text-brand-500 w-5 h-5"></i>
                                <span>Actividad Reciente en el Inventario</span>
                            </h3>
                            <a href="#/history" class="text-xs font-bold text-brand-600 hover:text-brand-700">Ver todo</a>
                        </div>
                        <div class="flex-1 overflow-y-auto max-h-[350px] space-y-4 pr-1">
                            ${history.length === 0 ? `
                                <div class="text-center text-slate-400 py-12 text-sm">No hay registros de actividad aún.</div>
                            ` : history.slice(0, 5).map(h => {
                                let actionBadgeColor = 'bg-blue-50 text-blue-600 border-blue-200';
                                if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-red-50 text-red-600 border-red-200';

                                const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : 'Mat. Didáctico');
                                
                                return `
                                    <div class="flex items-start gap-4 p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition">
                                        <span class="px-2.5 py-1 text-2xs font-bold border rounded-lg ${actionBadgeColor} tracking-wider uppercase shrink-0 mt-0.5">
                                            ${h.action}
                                        </span>
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-semibold text-slate-800">
                                                ${h.action === 'CREACION' ? `Registro creado en <b>${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                ${h.action === 'ELIMINACION' ? `Registro eliminado en <b>${labelTable}</b> (ID: ${h.record_id})` : ''}
                                                ${h.action === 'EDICION' ? `Se modificó <b>${h.field_name}</b> en <b>${labelTable}</b>` : ''}
                                            </p>
                                            ${h.action === 'EDICION' ? `
                                                <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                                                    <span class="text-slate-400 line-through">${h.old_value || 'vacío'}</span>
                                                    <i data-lucide="arrow-right" class="w-3 h-3"></i>
                                                    <span class="text-slate-700 font-medium">${h.new_value || 'vacío'}</span>
                                                </p>
                                            ` : ''}
                                            <p class="text-3xs text-slate-400 mt-1 flex items-center gap-1">
                                                <i data-lucide="clock" class="w-3 h-3"></i>
                                                <span>${h.timestamp}</span>
                                                <span class="mx-1">&bull;</span>
                                                <i data-lucide="user" class="w-3 h-3"></i>
                                                <span>${h.user_responsible}</span>
                                            </p>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>

                    <!-- Enlaces rápidos e instructivo -->
                    <div class="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                        <div>
                            <h3 class="font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                <i data-lucide="mouse-pointer-click" class="text-brand-500 w-5 h-5"></i>
                                <span>Acciones Rápidas</span>
                            </h3>
                            <div class="grid grid-cols-2 gap-3 mt-4">
                                <button onclick="openAddModal('substances')" class="p-3 text-center bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                    <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                    + Sustancia
                                </button>
                                <button onclick="openAddModal('chemical_materials')" class="p-3 text-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                    <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                    + Mat. Químico
                                </button>
                                <button onclick="openAddModal('didactic_materials')" class="p-3 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                    <i data-lucide="plus-circle" class="w-6 h-6"></i>
                                    + Mat. Didáctico
                                </button>
                                <a href="#/scan-qr" class="p-3 text-center bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl transition font-semibold text-xs flex flex-col items-center gap-2">
                                    <i data-lucide="qr-code" class="w-6 h-6"></i>
                                    Escáner Cámara
                                </a>
                            </div>
                        </div>

                        <div class="bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                            <h4 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                                <i data-lucide="info" class="text-slate-500 w-4 h-4"></i>
                                <span>Funcionamiento Offline</span>
                            </h4>
                            <p class="text-xs text-slate-500 mt-2 leading-relaxed">
                                Este sistema funciona 100% de forma local. La base de datos SQLite se almacena en el disco. No requiere internet para registrar elementos, generar códigos QR ni capturar fotos.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error de conexión: ${err.message}</div>`;
    }
}

// -------------------------------------------------------------
// VISTA: LISTADO DE SUSTANCIAS
// -------------------------------------------------------------
async function renderSubstancesList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <!-- Barra de Herramientas superior -->
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full md:w-64">
                        <input id="search-substances" type="text" placeholder="Buscar reactivos (CAS, nombre, etc)..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="filter-state" class="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-brand-500">
                        <option value="">-- Estado Físico --</option>
                        <option value="Sólido">Sólido</option>
                        <option value="Líquido">Líquido</option>
                        <option value="Gaseoso">Gaseoso</option>
                    </select>
                    <input id="filter-location" type="text" placeholder="Filtrar por ubicación..." class="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-brand-500">
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    <!-- Alternador de vista cuadrícula/lista -->
                    <div class="flex border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                        <button onclick="setSubstancesViewMode('list')" id="btn-view-list" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Lista">
                            <i data-lucide="list" class="w-4 h-4"></i>
                        </button>
                        <button onclick="setSubstancesViewMode('grid')" id="btn-view-grid" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Cuadrícula">
                            <i data-lucide="layout-grid" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <button onclick="exportTableToExcel('substances')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    
                    ${state.isLoggedIn ? `
                    <button onclick="openAddModal('substances')" class="bg-brand-600 hover:bg-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Sustancia</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Contenedor dinámico de listado (Lista o Cuadrícula) -->
            <div id="substances-data-container">
                <div class="py-12 text-center text-slate-400">Cargando sustancias químicas...</div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();

    // Eventos de búsqueda en tiempo real
    const fetchAndRender = async () => {
        const search = document.getElementById('search-substances').value;
        const physical_state = document.getElementById('filter-state').value;
        const location = document.getElementById('filter-location').value;

        const dataContainer = document.getElementById('substances-data-container');
        
        // Estilo de botones de vista
        const btnList = document.getElementById('btn-view-list');
        const btnGrid = document.getElementById('btn-view-grid');
        if (btnList && btnGrid) {
            if (state.substancesViewMode === 'list') {
                btnList.className = 'px-3.5 py-2.5 bg-brand-500 text-slate-900 transition flex items-center justify-center font-bold text-xs';
                btnGrid.className = 'px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 transition flex items-center justify-center font-bold text-xs';
            } else {
                btnGrid.className = 'px-3.5 py-2.5 bg-brand-500 text-slate-900 transition flex items-center justify-center font-bold text-xs';
                btnList.className = 'px-3.5 py-2.5 text-slate-500 hover:bg-slate-50 transition flex items-center justify-center font-bold text-xs';
            }
        }

        try {
            const url = new URL('/api/substances', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (physical_state) url.searchParams.append('physical_state', physical_state);
            if (location) url.searchParams.append('location', location);

            const res = await fetch(url).then(r => r.json());
            state.substances = res.data || [];

            if (state.substances.length === 0) {
                dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-slate-400">No se encontraron sustancias con los filtros aplicados.</div>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            if (state.substancesViewMode === 'list') {
                // Renderizar Tabla convencional
                dataContainer.innerHTML = `
                    <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                        <th class="py-4 px-6">Sustancia</th>
                                        <th class="py-4 px-6">Grupo</th>
                                        <th class="py-4 px-6">Fórmula / CAS</th>
                                        <th class="py-4 px-6">Estado Físico</th>
                                        <th class="py-4 px-6">Cantidad</th>
                                        <th class="py-4 px-6">Caducidad</th>
                                        <th class="py-4 px-6 no-print text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                                    ${state.substances.map(s => {
                                        const today = new Date();
                                        let expBadge = `<span class="text-slate-600">${s.expiration_date || 'N/D'}</span>`;
                                        if (s.expiration_date) {
                                            const exp = new Date(s.expiration_date);
                                            const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                                            if (diff < 0) {
                                                expBadge = `<span class="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-lg text-2xs font-bold uppercase shrink-0">Caducado</span>`;
                                            } else if (diff <= 30) {
                                                expBadge = `<span class="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-lg text-2xs font-bold uppercase shrink-0">Por caducar</span>`;
                                            }
                                        }

                                        // Definir color de estado físico
                                        let stateColor = 'bg-slate-100 text-slate-700';
                                        if (s.physical_state === 'Líquido') stateColor = 'bg-blue-50 text-blue-700';
                                        if (s.physical_state === 'Sólido') stateColor = 'bg-amber-50 text-amber-700';
                                        if (s.physical_state === 'Gaseoso') stateColor = 'bg-purple-50 text-purple-700';

                                        return `
                                            <tr class="hover:bg-slate-50/50 transition">
                                                <td class="py-4 px-6">
                                                    <div class="flex items-center gap-3">
                                                        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200/50 shrink-0">
                                                            ${s.image_path ? `<img src="${s.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="flask-conical" class="w-5 h-5"></i>`}
                                                        </div>
                                                        <div>
                                                            <a href="#/substances/${s.id}" class="text-sm font-bold text-slate-900 hover:text-brand-600 transition block">${s.name}</a>
                                                            <span class="text-3xs text-slate-400 uppercase tracking-wider">ID: LAB-SUB-${s.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="py-4 px-6">
                                                    ${s.substance_group ? `
                                                        <span class="px-2 py-0.5 rounded border text-3xs font-bold bg-brand-50 text-brand-700 border-brand-100">${s.substance_group}</span>
                                                    ` : '-'}
                                                </td>
                                                <td class="py-4 px-6">
                                                    <div class="text-sm text-slate-800 font-semibold">${s.chemical_formula || '-'}</div>
                                                    <div class="text-2xs text-slate-400 font-medium">CAS: ${s.cas_number || '-'}</div>
                                                </td>
                                                <td class="py-4 px-6">
                                                    <div class="flex flex-col gap-1 items-start">
                                                        <span class="px-2 py-0.5 rounded-md text-2xs font-bold ${stateColor}">${s.physical_state || 'N/D'}</span>
                                                    </div>
                                                </td>
                                                <td class="py-4 px-6 text-xs text-slate-500">
                                                    <div class="text-sm font-bold text-slate-900">${s.quantity} <span class="text-xs font-normal text-slate-500">${s.unit}</span></div>
                                                    ${s.container_content ? `<div class="text-3xs text-slate-400 font-bold">${s.stock_units || 1} uds x ${s.container_content}</div>` : `<div class="text-3xs text-slate-400 font-bold">${s.stock_units || 1} uds</div>`}
                                                </td>
                                                <td class="py-4 px-6">
                                                    <div class="flex flex-col gap-1 items-start">
                                                        ${expBadge}
                                                        <span class="text-3xs text-slate-400">${s.expiration_date || ''}</span>
                                                    </div>
                                                </td>
                                                <td class="py-4 px-6 no-print text-right">
                                                    <div class="flex items-center justify-end gap-1.5">
                                                        <a href="#/substances/${s.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Ver Ficha Detallada">
                                                            <i data-lucide="eye" class="w-4 h-4"></i>
                                                        </a>
                                                        ${isLogged ? `
                                                            <button onclick="openEditModal('substances', ${s.id})" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Editar">
                                                                <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                            </button>
                                                            <button onclick="deleteItem('substances', ${s.id})" class="p-2 hover:bg-red-50 text-red-500 rounded-lg transition" title="Eliminar">
                                                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                            </button>
                                                        ` : ''}
                                                    </div>
                                                </td>
                                            </tr>
                                        `;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;
            } else {
                // Renderizar Cuadrícula (Grid Requerido: grande, premium, con overlays y glassmorphism)
                dataContainer.innerHTML = `
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        ${state.substances.map(s => {
                            const today = new Date();
                            let expBadge = '';
                            if (s.expiration_date) {
                                const exp = new Date(s.expiration_date);
                                const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                                if (diff < 0) {
                                    expBadge = `<span class="absolute top-3 left-3 bg-red-600 text-white text-3xs font-extrabold uppercase px-2 py-1 rounded-xl shadow-lg shadow-red-600/25 z-10">Caducado</span>`;
                                } else if (diff <= 30) {
                                    expBadge = `<span class="absolute top-3 left-3 bg-amber-500 text-white text-3xs font-extrabold uppercase px-2 py-1 rounded-xl shadow-lg shadow-amber-500/25 z-10">Por Caducar</span>`;
                                }
                            }

                            let groupBadgeHtml = '';
                            if (s.substance_group) {
                                let gColor = 'bg-slate-100 text-slate-700 border-slate-200';
                                const g = s.substance_group.toLowerCase();
                                if (g.includes('inflam')) gColor = 'bg-red-50 text-red-700 border-red-200';
                                else if (g.includes('tox') || g.includes('venen')) gColor = 'bg-purple-50 text-purple-700 border-purple-200';
                                else if (g.includes('corros')) gColor = 'bg-orange-50 text-orange-700 border-orange-200';
                                else if (g.includes('explos')) gColor = 'bg-yellow-50 text-yellow-800 border-yellow-300';
                                else if (g.includes('comburent')) gColor = 'bg-pink-50 text-pink-700 border-pink-200';
                                else if (g.includes('irrit')) gColor = 'bg-teal-50 text-teal-700 border-teal-200';
                                
                                groupBadgeHtml = `<span class="px-2 py-0.5 rounded-lg border text-3xs font-bold ${gColor}">${s.substance_group}</span>`;
                            }

                            return `
                                <div class="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col group relative">
                                    <!-- Contenedor de Imagen -->
                                    <div class="relative w-full aspect-square bg-slate-50 border-b flex items-center justify-center text-slate-300 overflow-hidden shrink-0">
                                        ${expBadge}
                                        ${s.image_path ? `
                                            <img src="${s.image_path}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                        ` : `
                                            <i data-lucide="flask-conical" class="w-12 h-12 text-slate-300"></i>
                                        `}
                                        
                                        <!-- Superposición de Unidades y Contenido (Glassmorphism) -->
                                        <div class="absolute bottom-3 left-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-3xs rounded-2xl p-2.5 flex justify-between items-center shadow-lg border border-white/10">
                                            <span class="font-bold flex items-center gap-1">
                                                <i data-lucide="package" class="w-3.5 h-3.5 text-brand-400"></i>
                                                <span>${s.stock_units || 1} uds</span>
                                            </span>
                                            <span class="font-bold flex items-center gap-1">
                                                <i data-lucide="scale" class="w-3.5 h-3.5 text-brand-400"></i>
                                                <span>${s.container_content || s.unit || ''}</span>
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Contenido de Texto -->
                                    <div class="p-5 flex-1 flex flex-col justify-between gap-4">
                                        <div class="space-y-2.5">
                                            <div class="flex items-center justify-between gap-2 flex-wrap">
                                                <span class="text-3xs text-slate-400 font-bold uppercase tracking-wider">LAB-SUB-${s.id}</span>
                                                ${groupBadgeHtml}
                                            </div>
                                            <h4 class="font-bold text-slate-900 text-base leading-tight line-clamp-2" title="${s.name}">${s.name}</h4>
                                            
                                            <div class="text-xs text-slate-500 space-y-1.5 pt-2 border-t border-slate-100">
                                                <div class="flex justify-between"><span class="font-medium text-slate-400">Fórmula:</span><span class="font-semibold text-slate-800 truncate max-w-[140px]" title="${s.chemical_formula || ''}">${s.chemical_formula || '-'}</span></div>
                                                <div class="flex justify-between"><span class="font-medium text-slate-400">CAS:</span><span class="font-semibold text-slate-800">${s.cas_number || '-'}</span></div>
                                                <div class="flex justify-between"><span class="font-medium text-slate-400">Estado:</span><span class="font-bold text-brand-700">${s.physical_state || 'N/D'}</span></div>
                                                <div class="flex justify-between"><span class="font-medium text-slate-400">Ubicación:</span><span class="font-semibold text-slate-700 truncate max-w-[140px]">${s.location || '-'}</span></div>
                                                <div class="flex justify-between"><span class="font-medium text-slate-400">Total Stock:</span><span class="font-bold text-slate-900">${s.quantity} ${s.unit}</span></div>
                                            </div>
                                        </div>

                                        <!-- Acciones del pie de tarjeta -->
                                        <div class="flex items-center justify-end gap-1.5 border-t border-slate-50 pt-3">
                                            <a href="#/substances/${s.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Ver Detalle">
                                                <i data-lucide="eye" class="w-4 h-4"></i>
                                            </a>
                                            ${isLogged ? `
                                                <button onclick="openEditModal('substances', ${s.id})" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Editar">
                                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                                </button>
                                                <button onclick="deleteItem('substances', ${s.id})" class="p-2 hover:bg-red-50 text-red-500 rounded-lg transition" title="Eliminar">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-red-500 font-bold">Error al cargar datos.</div>`;
        }
    };

    // Registrar event listeners para búsquedas
    document.getElementById('search-substances').addEventListener('input', fetchAndRender);
    document.getElementById('filter-state').addEventListener('change', fetchAndRender);
    document.getElementById('filter-location').addEventListener('input', fetchAndRender);

    // Carga inicial
    fetchAndRender();
}

// -------------------------------------------------------------
// VISTA: LISTADO DE MATERIALES QUÍMICOS
// -------------------------------------------------------------
async function renderChemicalMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full md:w-64">
                        <input id="search-materials" type="text" placeholder="Buscar material (nombre, ubicación)..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="filter-category" class="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-brand-500">
                        <option value="">-- Categoría --</option>
                        <option value="Vidriería">Vidriería</option>
                        <option value="Metal">Metal</option>
                        <option value="Porcelana">Porcelana</option>
                        <option value="Plástico">Plástico</option>
                        <option value="Soporte">Soporte</option>
                    </select>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button onclick="exportTableToExcel('chemical_materials')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ${state.isLoggedIn ? `
                    <button onclick="openAddModal('chemical_materials')" class="bg-brand-600 hover:bg-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Material</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Material</th>
                                <th class="py-4 px-6">Categoría</th>
                                <th class="py-4 px-6">Estado</th>
                                <th class="py-4 px-6">Cantidad</th>
                                <th class="py-4 px-6">Ubicación</th>
                                <th class="py-4 px-6">Responsable</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="materials-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">Cargando materiales químicos...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const search = document.getElementById('search-materials').value;
        const category = document.getElementById('filter-category').value;
        const body = document.getElementById('materials-table-body');
        
        try {
            const url = new URL('/api/chemical-materials', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (category) url.searchParams.append('category', category);

            const res = await fetch(url).then(r => r.json());
            state.chemMaterials = res.data || [];

            if (state.chemMaterials.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">No se encontraron materiales químicos.</td></tr>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            body.innerHTML = state.chemMaterials.map(m => {
                let statusColor = 'bg-slate-100 text-slate-700';
                if (m.status === 'Excelente' || m.status === 'Nuevo') statusColor = 'bg-emerald-50 text-emerald-700';
                if (m.status === 'Dañado' || m.status === 'Roto') statusColor = 'bg-red-50 text-red-700';
                if (m.status === 'Bueno') statusColor = 'bg-blue-50 text-blue-700';

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200/50 shrink-0">
                                    ${m.image_path ? `<img src="${m.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="droplet" class="w-5 h-5"></i>`}
                                </div>
                                <div>
                                    <a href="#/chemical-materials/${m.id}" class="text-sm font-bold text-slate-900 hover:text-brand-600 transition block">${m.name}</a>
                                    <span class="text-3xs text-slate-400 uppercase tracking-wider">ID: LAB-CHM-${m.id}</span>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-slate-600 font-semibold">${m.category || '-'}</td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-0.5 rounded-md text-2xs font-bold ${statusColor}">${m.status || 'N/D'}</span>
                        </td>
                        <td class="py-4 px-6">
                            <span class="text-sm font-bold text-slate-900">${m.quantity}</span>
                            <span class="text-xs text-slate-500">${m.unit}</span>
                        </td>
                        <td class="py-4 px-6 text-slate-600">${m.location || '-'}</td>
                        <td class="py-4 px-6 text-slate-500 text-xs">${m.responsible || '-'}</td>
                        <td class="py-4 px-6 no-print text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <a href="#/chemical-materials/${m.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${isLogged ? `
                                <button onclick="openEditModal('chemical_materials', ${m.id})" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteItem('chemical_materials', ${m.id})" class="p-2 hover:bg-red-50 text-red-500 rounded-lg transition">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-red-500 font-bold">Error al cargar datos.</td></tr>`;
        }
    };

    document.getElementById('search-materials').addEventListener('input', fetchAndRender);
    document.getElementById('filter-category').addEventListener('change', fetchAndRender);
    fetchAndRender();
}

// -------------------------------------------------------------
// VISTA: LISTADO DE MATERIALES DIDÁCTICOS
// -------------------------------------------------------------
async function renderDidacticMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between no-print">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full md:w-64">
                        <input id="search-didactic" type="text" placeholder="Buscar material didáctico..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button onclick="exportTableToExcel('didactic_materials')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ${state.isLoggedIn ? `
                    <button onclick="openAddModal('didactic_materials')" class="bg-brand-600 hover:bg-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Recurso</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Material Didáctico</th>
                                <th class="py-4 px-6">Categoría</th>
                                <th class="py-4 px-6">Estado</th>
                                <th class="py-4 px-6">Cantidad</th>
                                <th class="py-4 px-6">Ubicación</th>
                                <th class="py-4 px-6">Responsable</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="didactic-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">Cargando recursos didácticos...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const search = document.getElementById('search-didactic').value;
        const body = document.getElementById('didactic-table-body');
        
        try {
            const url = new URL('/api/didactic-materials', window.location.origin);
            if (search) url.searchParams.append('search', search);

            const res = await fetch(url).then(r => r.json());
            state.didMaterials = res.data || [];

            if (state.didMaterials.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">No se encontraron materiales didácticos.</td></tr>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            body.innerHTML = state.didMaterials.map(d => {
                let statusColor = 'bg-slate-100 text-slate-700';
                if (d.status === 'Nuevo' || d.status === 'Completo') statusColor = 'bg-emerald-50 text-emerald-700';
                if (d.status === 'Incompleto' || d.status === 'Dañado') statusColor = 'bg-amber-50 text-amber-700';

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200/50 shrink-0">
                                    ${d.image_path ? `<img src="${d.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="graduation-cap" class="w-5 h-5"></i>`}
                                </div>
                                <div>
                                    <a href="#/didactic-materials/${d.id}" class="text-sm font-bold text-slate-900 hover:text-brand-600 transition block">${d.name}</a>
                                    <span class="text-3xs text-slate-400 uppercase tracking-wider">ID: LAB-DID-${d.id}</span>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-slate-600 font-semibold">${d.category || '-'}</td>
                        <td class="py-4 px-6">
                            <span class="px-2.5 py-0.5 rounded-md text-2xs font-bold ${statusColor}">${d.status || 'N/D'}</span>
                        </td>
                        <td class="py-4 px-6">
                            <span class="text-sm font-bold text-slate-900">${d.quantity}</span>
                            <span class="text-xs text-slate-500">unidades</span>
                        </td>
                        <td class="py-4 px-6 text-slate-600">${d.location || '-'}</td>
                        <td class="py-4 px-6 text-slate-500 text-xs">${d.responsible || '-'}</td>
                        <td class="py-4 px-6 no-print text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <a href="#/didactic-materials/${d.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${isLogged ? `
                                <button onclick="openEditModal('didactic_materials', ${d.id})" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteItem('didactic_materials', ${d.id})" class="p-2 hover:bg-red-50 text-red-500 rounded-lg transition">
                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-red-500 font-bold">Error al cargar datos.</td></tr>`;
        }
    };

    document.getElementById('search-didactic').addEventListener('input', fetchAndRender);
    fetchAndRender();
}

// -------------------------------------------------------------
// VISTA: FICHA INDIVIDUAL DE DETALLE
// -------------------------------------------------------------
async function renderItemDetail(container, typePath, itemId) {
    container.innerHTML = `
        <div class="flex justify-center items-center py-12"><div class="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div></div>
    `;

    const apiPath = typePath === 'chemical-materials' ? 'chemical-materials' : (typePath === 'didactic-materials' ? 'didactic-materials' : 'substances');
    const dbTable = typePath === 'chemical-materials' ? 'chemical_materials' : (typePath === 'didactic-materials' ? 'didactic_materials' : 'substances');

    try {
        const itemRes = await fetch(`/api/${apiPath}/${itemId}`).then(r => r.json());
        if (itemRes.status === 'error') {
            container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">${itemRes.message}</div>`;
            return;
        }

        const item = itemRes.data;

        // Cargar similares en paralelo
        const simRes = await fetch(`/api/${apiPath}?similar_to=${item.id}`).then(r => r.json());
        const similars = simRes.data || [];

        // Armar la ficha para imprimir
        container.innerHTML = `
            <div class="space-y-8 animate-fade-in print-card bg-white p-8 rounded-3xl border border-slate-200 shadow-xl relative">
                <!-- Sección para Impresión Ficha Individual (Requerimiento 9) -->
                <div class="flex flex-col md:flex-row justify-between items-start gap-6">
                    <div class="flex-1 space-y-4">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="px-3 py-1 rounded-xl text-xs font-bold bg-brand-100 text-brand-800 uppercase tracking-wider no-print">
                                ${typePath === 'substances' ? 'Sustancia Química' : (typePath === 'chemical-materials' ? 'Material Químico' : 'Material Didáctico')}
                            </span>
                            <span class="text-xs text-slate-400 font-bold">Código de Inventario: LAB-${dbTable.toUpperCase().substring(0,3)}-${item.id}</span>
                        </div>
                        <h2 class="text-3xl font-extrabold text-slate-900 leading-tight border-b pb-2 border-slate-100">${item.name}</h2>
                        
                        <!-- Campos Condicionales para Sustancias -->
                        ${typePath === 'substances' ? `
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-2">
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Grupo Químico</span><span class="px-2 py-0.5 rounded bg-brand-100 text-brand-800 text-xs font-bold inline-block border border-brand-200">${item.substance_group || 'General / Ninguno'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Fórmula Química</span><span class="font-bold text-slate-800 text-base">${item.chemical_formula || 'Sin fórmula'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Número CAS</span><span class="font-bold text-slate-800 text-base">${item.cas_number || 'N/D'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Concentración</span><span>${item.concentration || '-'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Composición / Pureza</span><span>${item.composition || '-'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Estado Físico</span><span class="px-2 py-0.5 rounded bg-slate-100 font-bold">${item.physical_state || '-'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Advertencias de Riesgo</span><span class="text-red-600 font-semibold">${item.risks_warnings || 'Ninguno'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Fecha Caducidad</span><span class="font-semibold ${isExpired(item.expiration_date) ? 'text-red-600' : ''}">${item.expiration_date || 'N/D'}</span></div>
                            </div>
                        ` : `
                            <!-- Materiales -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-2">
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Categoría</span><span class="font-bold text-slate-800 text-base">${item.category || 'General'}</span></div>
                                <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Estado de conservación</span><span class="font-bold">${item.status || 'N/D'}</span></div>
                            </div>
                        `}
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 text-sm pt-3 border-t border-slate-100">
                            <div>
                                <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Stock Disponible</span>
                                <span class="text-xl font-bold text-brand-600">${item.quantity} ${item.unit || 'uds'}</span>
                                ${typePath === 'substances' ? `
                                    <div class="text-2xs text-slate-400 font-bold mt-0.5">Envases: ${item.stock_units || 1} uds x ${item.container_content || 'N/D'}</div>
                                ` : ''}
                            </div>
                            <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Ubicación Física</span><span class="font-semibold text-slate-700">${item.location || '-'}</span></div>
                            <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Responsable Custodia</span><span>${item.responsible || '-'}</span></div>
                            <div><span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Última Modificación</span><span class="text-xs text-slate-500">${item.updated_at}</span></div>
                        </div>

                        ${item.observations ? `
                            <div class="pt-4 border-t border-slate-100 text-sm">
                                <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider">Observaciones</span>
                                <p class="text-slate-600 italic bg-slate-50 p-3 rounded-xl border mt-1">${item.observations}</p>
                            </div>
                        ` : ''}

                        ${typePath === 'substances' ? `
                            <div class="pt-4 border-t border-slate-100 text-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-2">Documentación (PDF)</span>
                                    ${item.pdf_path ? `
                                        <a href="${item.pdf_path}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2.5 border border-brand-200 hover:border-brand-300 bg-brand-50/50 hover:bg-brand-50 text-brand-700 font-bold rounded-xl text-xs transition shadow-sm no-print">
                                            <i data-lucide="file-text" class="w-4 h-4"></i>
                                            <span>Ver Ficha de Seguridad / PDF</span>
                                        </a>
                                        <span class="hidden print:inline font-semibold text-slate-700 text-xs">${item.pdf_path}</span>
                                    ` : `
                                        <span class="text-xs text-slate-400 italic">No hay documento PDF guardado</span>
                                    `}
                                </div>
                                <div>
                                    <span class="text-slate-400 block text-xs uppercase font-bold tracking-wider mb-2">Enlaces de Referencia</span>
                                    ${item.external_links ? `
                                        <div class="flex flex-col gap-2">
                                            ${item.external_links.split('\n').filter(l => l.trim()).map(link => {
                                                let cleanLink = link.trim();
                                                if (!/^https?:\/\//i.test(cleanLink)) {
                                                    cleanLink = 'https://' + cleanLink;
                                                }
                                                return `
                                                    <a href="${cleanLink}" target="_blank" class="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-semibold hover:underline text-xs no-print">
                                                        <i data-lucide="external-link" class="w-3.5 h-3.5"></i>
                                                        <span class="truncate max-w-[280px]">${link.trim()}</span>
                                                    </a>
                                                    <span class="hidden print:inline font-semibold text-slate-700 text-xs">${link.trim()}</span>
                                                `;
                                            }).join('')}
                                        </div>
                                    ` : `
                                        <span class="text-xs text-slate-400 italic">No hay enlaces registrados</span>
                                    `}
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Lado derecho: Imagen, QR y botones de impresión -->
                    <div class="w-full md:w-56 shrink-0 flex flex-col gap-5 items-center bg-slate-50/50 p-5 rounded-3xl border border-slate-100">
                        <!-- Foto del Reactivo -->
                        <div class="w-full aspect-square rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm flex items-center justify-center text-slate-300 relative">
                            ${item.image_path ? `
                                <img src="${item.image_path}" class="w-full h-full object-cover">
                            ` : `
                                <div class="flex flex-col items-center gap-2">
                                    <i data-lucide="image" class="w-10 h-10 text-slate-300"></i>
                                    <span class="text-3xs text-slate-400">Sin foto cargada</span>
                                </div>
                            `}
                            
                            ${typePath === 'substances' ? `
                            <!-- Superposición de Unidades y Contenido (Glassmorphism) -->
                            <div class="absolute bottom-2 left-2 right-2 bg-slate-900/60 backdrop-blur-md text-white text-3xs rounded-xl p-2.5 flex justify-between items-center shadow border border-white/10">
                                <span class="font-bold flex items-center gap-1">
                                    <i data-lucide="package" class="w-3.5 h-3.5 text-brand-400"></i>
                                    <span>${item.stock_units || 1} uds</span>
                                </span>
                                <span class="font-bold flex items-center gap-1">
                                    <i data-lucide="scale" class="w-3.5 h-3.5 text-brand-400"></i>
                                    <span>${item.container_content || item.unit || ''}</span>
                                </span>
                            </div>
                            ` : ''}
                        </div>

                        <!-- Código QR (Generado de forma local) -->
                        <div class="flex flex-col items-center border border-slate-200 p-3 rounded-2xl bg-white w-full text-center">
                            <span class="text-3xs font-semibold uppercase text-slate-400 tracking-wider mb-2">Código QR único</span>
                            ${item.qr_path ? `
                                <img src="${item.qr_path}" class="w-32 h-32 object-contain" alt="QR Code">
                                <span class="text-3xs text-slate-500 font-bold mt-2 truncate max-w-full">${item.qr_content}</span>
                                <a href="${item.qr_path}" download="qr_${item.name.replace(/ /g, '_')}.png" class="text-3xs font-bold text-brand-600 hover:underline mt-1.5 inline-block no-print">Descargar QR</a>
                            ` : `
                                <span class="text-xs text-red-500">QR no generado</span>
                            `}
                        </div>

                        <!-- Botón de Imprimir Ficha -->
                        <button onclick="window.print()" class="w-full no-print bg-slate-800 hover:bg-slate-900 font-bold py-2.5 rounded-xl text-xs text-white flex items-center justify-center gap-2 transition">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                            <span>Imprimir Ficha / Etiqueta</span>
                        </button>
                    </div>
                </div>

                <!-- Búsqueda de parecidos (Requerimiento 7) - Oculto al imprimir -->
                <div class="border-t border-slate-100 pt-8 no-print">
                    <h3 class="font-bold text-slate-900 flex items-center gap-2 mb-4 text-base">
                        <i data-lucide="sparkles" class="text-brand-500 w-5 h-5"></i>
                        <span>Elementos Parecidos en el Inventario</span>
                    </h3>
                    
                    ${similars.length === 0 ? `
                        <p class="text-sm text-slate-400 italic">No se encontraron reactivos o materiales similares en base a ubicación, color o estado físico.</p>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            ${similars.map(s => {
                                const detailsPath = `#/${typePath}/${s.id}`;
                                return `
                                    <a href="${detailsPath}" class="p-4 bg-slate-50 hover:bg-brand-50/50 border border-slate-200/60 rounded-2xl transition hover:border-brand-200/50 block group">
                                        <h4 class="font-bold text-sm text-slate-800 group-hover:text-brand-700 transition line-clamp-1">${s.name}</h4>
                                        <p class="text-3xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">ID: LAB-${dbTable.toUpperCase().substring(0,3)}-${s.id}</p>
                                        <div class="flex flex-wrap gap-1.5 mt-2">
                                            ${s.physical_state ? `<span class="bg-white border text-3xs px-1.5 py-0.5 rounded text-slate-600 font-medium">${s.physical_state}</span>` : ''}
                                            ${s.location ? `<span class="bg-white border text-3xs px-1.5 py-0.5 rounded text-slate-600 font-medium">${s.location}</span>` : ''}
                                        </div>
                                    </a>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        container.innerHTML = `<div class="p-8 text-center text-red-500 font-bold">Error de red: ${err.message}</div>`;
    }
}

// Comprobar si una fecha está caducada
function isExpired(dateStr) {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
}

// -------------------------------------------------------------
// VISTA: ESCÁNER DE CÓDIGOS QR
// -------------------------------------------------------------
function renderScanQrView(container) {
    container.innerHTML = `
        <div class="max-w-xl mx-auto space-y-6 animate-fade-in text-center no-print">
            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                <div class="bg-brand-50 text-brand-600 p-4 rounded-2xl mb-4">
                    <i data-lucide="qr-code" class="w-8 h-8"></i>
                </div>
                <h3 class="font-bold text-slate-900 text-lg">Escanear mediante Cámara Web</h3>
                <p class="text-sm text-slate-500 mt-1 max-w-sm">
                    Enciende la cámara y apunta hacia el código QR de un reactivo o material para abrir su ficha de inventario automáticamente.
                </p>

                <!-- Lector de cámara -->
                <div class="w-full mt-6 bg-slate-900 rounded-2xl overflow-hidden aspect-video border relative">
                    <div id="reader" class="w-full"></div>
                    <div id="scanner-feedback" class="absolute inset-0 flex items-center justify-center bg-slate-900/80 text-sm font-semibold text-slate-400">
                        Esperando activación de cámara...
                    </div>
                </div>

                <div class="flex gap-3 w-full mt-6">
                    <button id="btn-start-scanner" onclick="startQrScanner()" class="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-brand-700 transition">
                        <i data-lucide="play" class="w-4 h-4"></i>
                        <span>Iniciar Cámara</span>
                    </button>
                    <button id="btn-stop-scanner" onclick="stopQrScanner()" class="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-2 transition hidden">
                        <i data-lucide="square" class="w-4 h-4"></i>
                        <span>Detener Cámara</span>
                    </button>
                </div>
            </div>

            <!-- Entrada manual en caso de que falle la cámara -->
            <div class="bg-slate-100 p-5 rounded-2xl border text-left">
                <h4 class="font-bold text-sm text-slate-800 mb-2">Ingresar código manualmente</h4>
                <div class="flex gap-2">
                    <input id="manual-qr-input" type="text" placeholder="Ej. LAB-SUBSTANCES-1" class="flex-1 bg-white border px-3 py-2 rounded-xl text-sm outline-none">
                    <button onclick="handleManualQrSubmit()" class="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition">
                        Buscar
                    </button>
                </div>
            </div>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

function startQrScanner() {
    const feedback = document.getElementById('scanner-feedback');
    feedback.classList.add('hidden');
    
    document.getElementById('btn-start-scanner').classList.add('hidden');
    document.getElementById('btn-stop-scanner').classList.remove('hidden');

    state.html5QrScanner = new Html5Qrcode("reader");
    
    state.html5QrScanner.start(
        { facingMode: "environment" }, 
        {
            fps: 10,
            qrbox: { width: 250, height: 250 }
        },
        async (decodedText, decodedResult) => {
            // Detener cámara al leer un QR correcto
            stopQrScanner();
            
            // Si el QR contiene un link web normal, lo abrimos o mostramos
            if (decodedText.startsWith('http://') || decodedText.startsWith('https://')) {
                const openLink = confirm(`El código QR contiene un enlace externo:\n\n${decodedText}\n\n¿Desea abrirlo en una nueva pestaña?`);
                if (openLink) {
                    window.open(decodedText, '_blank');
                }
                return;
            }

            // Consultar endpoint API local de búsqueda de QR
            try {
                const res = await fetch('/api/scan-qr', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ qr_code: decodedText })
                }).then(r => r.json());

                if (res.status === 'success') {
                    // Redireccionar a la ficha correspondiente
                    const categoryUrl = res.type === 'substance' ? 'substances' : (res.type === 'chemical_material' ? 'chemical-materials' : 'didactic-materials');
                    window.location.hash = `#/${categoryUrl}/${res.data.id}`;
                } else {
                    alert(res.message);
                }
            } catch (err) {
                alert(`Error al procesar QR: ${err.message}`);
            }
        },
        (errorMessage) => {
            // Errores de frame (ignorar para evitar spam de consola)
        }
    ).catch(err => {
        feedback.classList.remove('hidden');
        feedback.innerHTML = `<span class="text-red-500 font-bold p-4">Error al abrir cámara: ${err}</span>`;
        stopQrScanner();
    });
}

function stopQrScanner() {
    const startBtn = document.getElementById('btn-start-scanner');
    const stopBtn = document.getElementById('btn-stop-scanner');
    if (startBtn && stopBtn) {
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
    }

    if (state.html5QrScanner) {
        state.html5QrScanner.stop().then(() => {
            state.html5QrScanner = null;
        }).catch(err => console.error(err));
    }
}

async function handleManualQrSubmit() {
    const input = document.getElementById('manual-qr-input').value.trim();
    if (!input) return;

    try {
        const res = await fetch('/api/scan-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qr_code: input })
        }).then(r => r.json());

        if (res.status === 'success') {
            const categoryUrl = res.type === 'substance' ? 'substances' : (res.type === 'chemical_material' ? 'chemical-materials' : 'didactic-materials');
            window.location.hash = `#/${categoryUrl}/${res.data.id}`;
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// VISTA: HISTORIAL DE AUDITORÍA
// -------------------------------------------------------------
async function renderHistoryView(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in no-print">
            <div class="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select id="filter-hist-table" class="bg-white border px-3 py-2.5 rounded-xl text-sm shadow-sm outline-none transition focus:border-brand-500">
                        <option value="">-- Todos los módulos --</option>
                        <option value="substances">Sustancias Químicas</option>
                        <option value="chemical_materials">Materiales Químicos</option>
                        <option value="didactic_materials">Materiales Didácticos</option>
                    </select>
                    <select id="filter-hist-action" class="bg-white border px-3 py-2.5 rounded-xl text-sm shadow-sm outline-none transition focus:border-brand-500">
                        <option value="">-- Todas las acciones --</option>
                        <option value="CREACION">CREACIÓN</option>
                        <option value="EDICION">EDICIÓN</option>
                        <option value="ELIMINACION">ELIMINACIÓN</option>
                    </select>
                    <input id="search-hist-user" type="text" placeholder="Filtrar por responsable..." class="bg-white border px-3 py-2.5 rounded-xl text-sm shadow-sm outline-none transition focus:border-brand-500">
                </div>
                <button onclick="exportHistoryExcel()" class="bg-white hover:bg-slate-50 border font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                    <i data-lucide="download" class="w-4 h-4"></i>
                    <span>Exportar Historial</span>
                </button>
            </div>

            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                                <th class="py-4 px-6">Fecha y Hora</th>
                                <th class="py-4 px-6">Responsable</th>
                                <th class="py-4 px-6">Acción</th>
                                <th class="py-4 px-6">Módulo / ID</th>
                                <th class="py-4 px-6">Campo Modificado</th>
                                <th class="py-4 px-6">Valor Anterior</th>
                                <th class="py-4 px-6">Valor Nuevo</th>
                            </tr>
                        </thead>
                        <tbody id="history-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="7" class="py-12 text-center text-slate-400">Cargando historial de auditoría...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const table = document.getElementById('filter-hist-table').value;
        const action = document.getElementById('filter-hist-action').value;
        const user = document.getElementById('search-hist-user').value.trim();
        const body = document.getElementById('history-table-body');

        try {
            const url = new URL('/api/history', window.location.origin);
            if (table) url.searchParams.append('table_name', table);
            if (action) url.searchParams.append('action', action);
            if (user) url.searchParams.append('user_responsible', user);

            const res = await fetch(url).then(r => r.json());
            state.history = res.data || [];

            if (state.history.length === 0) {
                body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-slate-400">No se encontraron eventos en la bitácora.</td></tr>`;
                return;
            }

            body.innerHTML = state.history.map(h => {
                let actionBadgeColor = 'bg-blue-50 text-blue-600 border-blue-150';
                if (h.action === 'CREACION') actionBadgeColor = 'bg-emerald-50 text-emerald-600 border-emerald-150';
                if (h.action === 'ELIMINACION') actionBadgeColor = 'bg-red-50 text-red-600 border-red-150';

                const labelTable = h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Mat. Químico' : 'Mat. Didáctico');
                
                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-3.5 px-6 text-slate-500 font-semibold text-xs whitespace-nowrap">${h.timestamp}</td>
                        <td class="py-3.5 px-6 font-bold text-slate-900">${h.user_responsible}</td>
                        <td class="py-3.5 px-6">
                            <span class="px-2 py-0.5 text-2xs font-bold border rounded-md uppercase tracking-wider ${actionBadgeColor}">
                                ${h.action}
                            </span>
                        </td>
                        <td class="py-3.5 px-6">
                            <div class="font-bold text-slate-800">${labelTable}</div>
                            <div class="text-3xs text-slate-400 font-bold uppercase">ID del Registro: ${h.record_id}</div>
                        </td>
                        <td class="py-3.5 px-6 text-brand-700 font-bold">${h.field_name || '-'}</td>
                        <td class="py-3.5 px-6 text-slate-500 font-medium max-w-[150px] truncate" title="${h.old_value || ''}">${h.old_value || '-'}</td>
                        <td class="py-3.5 px-6 text-slate-950 font-semibold max-w-[150px] truncate" title="${h.new_value || ''}">${h.new_value || '-'}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            body.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-red-500 font-bold">Error de red al cargar el historial.</td></tr>`;
        }
    };

    document.getElementById('filter-hist-table').addEventListener('change', fetchAndRender);
    document.getElementById('filter-hist-action').addEventListener('change', fetchAndRender);
    document.getElementById('search-hist-user').addEventListener('input', fetchAndRender);

    fetchAndRender();
}

// -------------------------------------------------------------
// OPERACIONES DE CRUD Y MODALES
// -------------------------------------------------------------
let currentModalType = ''; // 'substances', 'chemical_materials', 'didactic_materials'
let currentEditId = null;   // null si es inserción

function closeModal() {
    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
        stopWebcam();
    }, 200);
}

function openAddModal(type) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para registrar nuevos elementos.");
        openAuthModal();
        return;
    }
    currentModalType = type;
    currentEditId = null;

    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    const formContainer = document.getElementById('modal-form-container');
    const title = document.getElementById('modal-title');

    title.textContent = `Registrar ${type === 'substances' ? 'Reactivo o Sustancia' : (type === 'chemical_materials' ? 'Material Químico' : 'Material Didáctico')}`;
    
    formContainer.innerHTML = buildFormHtml(type, {});
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);

    if (window.lucide) window.lucide.createIcons();
    bindFormEvents();
}

async function openEditModal(type, id) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para editar elementos.");
        openAuthModal();
        return;
    }
    currentModalType = type;
    currentEditId = id;

    const modal = document.getElementById('item-modal');
    const content = document.getElementById('item-modal-content');
    const formContainer = document.getElementById('modal-form-container');
    const title = document.getElementById('modal-title');

    title.textContent = `Editar ${type === 'substances' ? 'Reactivo' : (type === 'chemical_materials' ? 'Material Químico' : 'Material Didáctico')}`;
    formContainer.innerHTML = `<div class="flex justify-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div></div>`;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);

    const apiPath = type === 'chemical_materials' ? 'chemical-materials' : (type === 'didactic_materials' ? 'didactic-materials' : 'substances');

    try {
        const res = await fetch(`/api/${apiPath}/${id}`).then(r => r.json());
        if (res.status === 'success') {
            formContainer.innerHTML = buildFormHtml(type, res.data);
            bindFormEvents();
            if (window.lucide) window.lucide.createIcons();
        } else {
            formContainer.innerHTML = `<div class="text-red-500 p-4">${res.message}</div>`;
        }
    } catch (err) {
        formContainer.innerHTML = `<div class="text-red-500 p-4">Error: ${err.message}</div>`;
    }
}

function buildFormHtml(type, data = {}) {
    // Foto cargada por defecto
    const photoPreview = data.image_path ? `
        <div class="relative w-full aspect-square rounded-2xl overflow-hidden border">
            <img src="${data.image_path}" class="w-full h-full object-cover">
            <input type="hidden" id="form-image-path" value="${data.image_path}">
            <button type="button" onclick="removeFormPhoto()" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 hover:bg-red-700 transition">
                <i data-lucide="trash" class="w-4 h-4"></i>
            </button>
        </div>
    ` : `
        <div class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto</span>
            <input type="hidden" id="form-image-path" value="">
        </div>
    `;

    if (type === 'substances') {
        return `
            <form id="modal-form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Columna Izquierda (Foto y QR personalizado) -->
                <div class="md:col-span-1 flex flex-col gap-5">
                    <div id="form-photo-container">${photoPreview}</div>
                    
                    <div class="flex gap-2">
                        <button type="button" onclick="startWebcamCapture()" class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <span>Tomar Foto</span>
                        </button>
                        <label class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            <span>Subir Archivo</span>
                            <input type="file" id="form-photo-file" accept="image/*" class="hidden">
                        </label>
                    </div>

                    <!-- Enlace QR personalizado (Requerimiento 4) -->
                    <div class="border-t border-slate-100 pt-4">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">QR Personalizado (Opcional)</label>
                        <input type="text" id="form-qr-content" placeholder="Link web o código propio" value="${data.qr_content || ''}" class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-brand-500 outline-none transition font-medium">
                        <span class="text-3xs text-slate-400 block mt-1 leading-relaxed">Vacío para que el sistema genere el código de inventario local.</span>
                    </div>
                </div>

                <!-- Formulario Campos Principales (Derecha) -->
                <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre de la sustancia *</label>
                        <input type="text" id="form-name" value="${data.name || ''}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Grupo Químico</label>
                        <select id="form-substance-group" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <option value="" ${!data.substance_group ? 'selected' : ''}>-- Seleccionar Grupo --</option>
                            <option value="Inflamables" ${data.substance_group === 'Inflamables' ? 'selected' : ''}>Inflamables</option>
                            <option value="Tóxicos" ${data.substance_group === 'Tóxicos' ? 'selected' : ''}>Tóxicos</option>
                            <option value="Corrosivos" ${data.substance_group === 'Corrosivos' ? 'selected' : ''}>Corrosivos</option>
                            <option value="Explosivos" ${data.substance_group === 'Explosivos' ? 'selected' : ''}>Explosivos</option>
                            <option value="Comburentes" ${data.substance_group === 'Comburentes' ? 'selected' : ''}>Comburentes</option>
                            <option value="Irritantes" ${data.substance_group === 'Irritantes' ? 'selected' : ''}>Irritantes</option>
                            <option value="Otros" ${data.substance_group === 'Otros' ? 'selected' : ''}>Otros</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fórmula Química</label>
                        <input type="text" id="form-chemical-formula" value="${data.chemical_formula || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Número CAS</label>
                        <input type="text" id="form-cas-number" value="${data.cas_number || ''}" placeholder="Ej. 64-17-5" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Pureza o Composición</label>
                        <input type="text" id="form-composition" value="${data.composition || ''}" placeholder="Ej. Mezcla acuosa" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Concentración</label>
                        <input type="text" id="form-concentration" value="${data.concentration || ''}" placeholder="Ej. 98%, 0.1 M" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado Físico</label>
                        <select id="form-physical-state" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <option value="Sólido" ${data.physical_state === 'Sólido' ? 'selected' : ''}>Sólido</option>
                            <option value="Líquido" ${data.physical_state === 'Líquido' ? 'selected' : ''}>Líquido</option>
                            <option value="Gaseoso" ${data.physical_state === 'Gaseoso' ? 'selected' : ''}>Gaseoso</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Riesgos SGA / Advertencias</label>
                        <input type="text" id="form-risks-warnings" value="${data.risks_warnings || ''}" placeholder="Ej. Inflamable, Corrosivo" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cantidad Total en Inventario *</label>
                        <input type="number" step="any" id="form-quantity" value="${data.quantity || '0'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Unidad de Medida *</label>
                        <input type="text" id="form-unit" value="${data.unit || 'g'}" required placeholder="Ej. g, ml, frascos" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Stock Unidades (Envases)</label>
                        <input type="number" id="form-stock-units" value="${data.stock_units || '1'}" min="1" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contenido por Envase (ej. 500 ml)</label>
                        <input type="text" id="form-container-content" value="${data.container_content || ''}" placeholder="Ej. 500 ml, 1 kg" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ubicación Física</label>
                        <input type="text" id="form-location" value="${data.location || ''}" placeholder="Ej. Estante 1, Fila B" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Entrada</label>
                        <input type="date" id="form-entry-date" value="${data.entry_date || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Fecha de Caducidad</label>
                        <input type="date" id="form-expiration-date" value="${data.expiration_date || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Responsable Custodia</label>
                        <input type="text" id="form-responsible" value="${data.responsible || getActiveUser()}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones</label>
                        <textarea id="form-observations" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.observations || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Enlaces Externos (Uno por línea)</label>
                        <textarea id="form-external-links" rows="2" placeholder="Ej. https://wikipedia.org/wiki/Etanol" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.external_links || ''}</textarea>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Documentación PDF</label>
                        <div class="flex items-center gap-3">
                            <label class="py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center select-none bg-white">
                                <i data-lucide="file-text" class="w-4 h-4 text-slate-500"></i>
                                <span id="btn-pdf-upload-text">Subir PDF</span>
                                <input type="file" id="form-pdf-file" accept="application/pdf" class="hidden">
                            </label>
                            <div id="form-pdf-preview" class="text-xs text-slate-500 truncate max-w-[400px] font-semibold">
                                ${data.pdf_path ? `
                                    <div class="flex items-center gap-1">
                                        <a href="${data.pdf_path}" target="_blank" class="text-brand-600 hover:underline font-semibold">Ver PDF actual</a>
                                        <button type="button" onclick="removeFormPdf()" class="text-red-500 hover:text-red-700 p-0.5" title="Eliminar PDF">
                                            <i data-lucide="x" class="w-3.5 h-3.5 inline"></i>
                                        </button>
                                    </div>
                                ` : 'Ningún archivo seleccionado'}
                            </div>
                            <input type="hidden" id="form-pdf-path" value="${data.pdf_path || ''}">
                        </div>
                    </div>
                </div>
            </form>
        `;
    } 
    else if (type === 'chemical_materials' || type === 'didactic_materials') {
        const isDidactic = type === 'didactic_materials';
        return `
            <form id="modal-form" class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Columna Izquierda (Foto y QR) -->
                <div class="md:col-span-1 flex flex-col gap-5">
                    <div id="form-photo-container">${photoPreview}</div>
                    
                    <div class="flex gap-2">
                        <button type="button" onclick="startWebcamCapture()" class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition">
                            <i data-lucide="camera" class="w-4 h-4"></i>
                            <span>Tomar Foto</span>
                        </button>
                        <label class="flex-1 py-2 px-3 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer text-center">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            <span>Subir Archivo</span>
                            <input type="file" id="form-photo-file" accept="image/*" class="hidden">
                        </label>
                    </div>

                    <div class="border-t border-slate-100 pt-4">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">QR Personalizado (Opcional)</label>
                        <input type="text" id="form-qr-content" placeholder="Link web o código propio" value="${data.qr_content || ''}" class="w-full bg-slate-50 border rounded-xl px-3 py-2 text-xs focus:bg-white focus:border-brand-500 outline-none transition font-medium">
                        <span class="text-3xs text-slate-400 block mt-1 leading-relaxed">Vacío para que el sistema genere el código de inventario local.</span>
                    </div>
                </div>

                <!-- Formulario Campos Principales (Derecha) -->
                <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Material *</label>
                        <input type="text" id="form-name" value="${data.name || ''}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Categoría / Tipo</label>
                        <input type="text" id="form-category" value="${data.category || ''}" placeholder="${isDidactic ? 'Ej. Modelos, Carteles' : 'Ej. Vidriería, Soporte'}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado de Conservación</label>
                        <select id="form-status" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                            <option value="Nuevo" ${data.status === 'Nuevo' ? 'selected' : ''}>Nuevo</option>
                            <option value="Excelente" ${data.status === 'Excelente' ? 'selected' : ''}>Excelente</option>
                            <option value="Bueno" ${data.status === 'Bueno' ? 'selected' : ''}>Bueno</option>
                            <option value="Dañado" ${data.status === 'Dañado' ? 'selected' : ''}>Dañado</option>
                            <option value="Roto" ${data.status === 'Roto' ? 'selected' : ''}>Roto / Incompleto</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Cantidad *</label>
                        <input type="number" id="form-quantity" value="${data.quantity || '0'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    
                    ${isDidactic ? '' : `
                        <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Unidad *</label>
                            <input type="text" id="form-unit" value="${data.unit || 'piezas'}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                        </div>
                    `}

                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Ubicación Física</label>
                        <input type="text" id="form-location" value="${data.location || ''}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>
                    
                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Responsable Custodia</label>
                        <input type="text" id="form-responsible" value="${data.responsible || getActiveUser()}" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">
                    </div>

                    <div class="md:col-span-2">
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Observaciones</label>
                        <textarea id="form-observations" rows="2" class="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:bg-white focus:border-brand-500 outline-none transition font-semibold">${data.observations || ''}</textarea>
                    </div>
                </div>
            </form>
        `;
    }
}

function bindFormEvents() {
    const fileInput = document.getElementById('form-photo-file');
    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('photo', file);

                try {
                    const res = await fetch('/api/upload-photo', {
                        method: 'POST',
                        body: formData
                    }).then(r => r.json());

                    if (res.status === 'success') {
                        setFormPhoto(res.image_path);
                    } else {
                        alert(res.message);
                    }
                } catch (err) {
                    alert(`Error al subir foto: ${err.message}`);
                }
            }
        });
    }

    const pdfInput = document.getElementById('form-pdf-file');
    if (pdfInput) {
        pdfInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const formData = new FormData();
                formData.append('pdf', file);

                const uploadText = document.getElementById('btn-pdf-upload-text');
                if (uploadText) uploadText.textContent = 'Subiendo...';

                try {
                    const res = await fetch('/api/upload-pdf', {
                        method: 'POST',
                        body: formData
                    }).then(r => r.json());

                    if (res.status === 'success') {
                        const pathInput = document.getElementById('form-pdf-path');
                        if (pathInput) pathInput.value = res.pdf_path;
                        
                        const preview = document.getElementById('form-pdf-preview');
                        if (preview) {
                            preview.innerHTML = `
                                <div class="flex items-center gap-1">
                                    <a href="${res.pdf_path}" target="_blank" class="text-brand-600 hover:underline font-semibold">Ver PDF subido</a>
                                    <button type="button" onclick="removeFormPdf()" class="text-red-500 hover:text-red-700 p-0.5" title="Eliminar PDF">
                                        <i data-lucide="x" class="w-3.5 h-3.5 inline"></i>
                                    </button>
                                </div>
                            `;
                            if (window.lucide) window.lucide.createIcons();
                        }
                    } else {
                        alert(res.message);
                    }
                } catch (err) {
                    alert(`Error al subir PDF: ${err.message}`);
                } finally {
                    if (uploadText) uploadText.textContent = 'Subir PDF';
                }
            }
        });
    }

    // Vincular el botón de guardar del modal
    const saveBtn = document.getElementById('btn-save-modal');
    saveBtn.onclick = handleFormSubmit;
}

function removeFormPhoto() {
    const container = document.getElementById('form-photo-container');
    container.innerHTML = `
        <div class="w-full aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3 p-4 bg-slate-50 text-slate-400">
            <i data-lucide="image" class="w-8 h-8"></i>
            <span class="text-xs text-center font-semibold">Sube o toma una foto</span>
            <input type="hidden" id="form-image-path" value="">
        </div>
    `;
}

function removeFormPdf() {
    const preview = document.getElementById('form-pdf-preview');
    const pathInput = document.getElementById('form-pdf-path');
    if (preview && pathInput) {
        preview.textContent = 'Ningún archivo seleccionado';
        pathInput.value = '';
    }
    if (window.lucide) window.lucide.createIcons();
}

function setFormPhoto(path) {
    const container = document.getElementById('form-photo-container');
    container.innerHTML = `
        <div class="relative w-full aspect-square rounded-2xl overflow-hidden border">
            <img src="${path}" class="w-full h-full object-cover">
            <input type="hidden" id="form-image-path" value="${path}">
            <button type="button" onclick="removeFormPhoto()" class="absolute top-2 right-2 bg-red-600 text-white rounded-lg p-1.5 hover:bg-red-700 transition">
                <i data-lucide="trash" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    if (window.lucide) window.lucide.createIcons();
}

// -------------------------------------------------------------
// WEBCAM: CAPTURA DE FOTO INSTANTÁNEA (Requerimiento 7)
// -------------------------------------------------------------
async function startWebcamCapture() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('webcam-preview');
    
    modal.classList.remove('hidden');

    try {
        state.webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        video.srcObject = state.webcamStream;
    } catch (err) {
        alert(`No se pudo acceder a la webcam: ${err.message}`);
        closeCameraModal();
    }
}

function closeCameraModal() {
    document.getElementById('camera-modal').classList.add('hidden');
    stopWebcam();
}

function stopWebcam() {
    if (state.webcamStream) {
        state.webcamStream.getTracks().forEach(track => track.stop());
        state.webcamStream = null;
    }
}

async function capturePhoto() {
    const video = document.getElementById('webcam-preview');
    const canvas = document.getElementById('webcam-canvas');
    
    if (!video.srcObject) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir canvas a Base64 JPEG
    const base64Image = canvas.toDataURL('image/jpeg');

    closeCameraModal();

    // Enviar base64 al servidor
    try {
        const res = await fetch('/api/upload-photo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Image })
        }).then(r => r.json());

        if (res.status === 'success') {
            setFormPhoto(res.image_path);
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// ENVÍO DE FORMULARIO CRUD
// -------------------------------------------------------------
async function handleFormSubmit() {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para registrar o modificar elementos.");
        openAuthModal();
        return;
    }
    const form = document.getElementById('modal-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const payload = {};
    const imgEl = document.getElementById('form-image-path');
    if (imgEl) payload.image_path = imgEl.value;

    const qrEl = document.getElementById('form-qr-content');
    if (qrEl) payload.qr_content = qrEl.value.trim();

    // Recoger todos los campos con prefijo 'form-'
    form.querySelectorAll('input, select, textarea').forEach(el => {
        if (el.id && el.id.startsWith('form-') && el.id !== 'form-photo-file' && el.id !== 'form-image-path' && el.id !== 'form-qr-content') {
            const key = el.id.replace('form-', '').replace(/-/g, '_');
            payload[key] = el.value;
        }
    });

    const isEdit = currentEditId !== null;
    const apiPath = currentModalType === 'chemical_materials' ? 'chemical-materials' : (currentModalType === 'didactic_materials' ? 'didactic-materials' : 'substances');
    const url = isEdit ? `/api/${apiPath}/${currentEditId}` : `/api/${apiPath}`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-User-Responsible': getActiveUser()
            },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        if (res.status === 'success') {
            closeModal();
            router(); // Recargar la vista actual
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// ELIMINAR ELEMENTO
// -------------------------------------------------------------
async function deleteItem(type, id) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para eliminar elementos del inventario.");
        openAuthModal();
        return;
    }
    const isSub = type === 'substances';
    const label = isSub ? 'la sustancia' : 'el material';
    
    if (!confirm(`¿Está seguro de que desea eliminar permanentemente ${label}? Esta acción se registrará en la bitácora.`)) {
        return;
    }

    const apiPath = type === 'chemical_materials' ? 'chemical-materials' : (type === 'didactic_materials' ? 'didactic-materials' : 'substances');

    try {
        const res = await fetch(`/api/${apiPath}/${id}`, {
            method: 'DELETE',
            headers: {
                'X-User-Responsible': getActiveUser()
            }
        }).then(r => r.json());

        if (res.status === 'success') {
            router();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert(err.message);
    }
}

// -------------------------------------------------------------
// REPORTES Y EXPORTACIÓN A EXCEL (Requerimiento 9)
// -------------------------------------------------------------
function exportTableToExcel(type) {
    let items = [];
    let filename = '';

    if (type === 'substances') {
        items = state.substances;
        filename = 'Inventario_Sustancias_Quimicas.xlsx';
    } else if (type === 'chemical_materials') {
        items = state.chemMaterials;
        filename = 'Inventario_Materiales_Quimicos.xlsx';
    } else if (type === 'didactic_materials') {
        items = state.didMaterials;
        filename = 'Inventario_Materiales_Didacticos.xlsx';
    }

    if (items.length === 0) {
        alert("No hay registros en la tabla activa para exportar.");
        return;
    }

    // Mapear campos a español para exportación estructurada
    const data = items.map(item => {
        const row = {
            "ID Inventario": item.id,
            "Nombre": item.name,
        };

        if (type === 'substances') {
            row["Fórmula Química"] = item.chemical_formula || '';
            row["Número CAS"] = item.cas_number || '';
            row["Composición"] = item.composition || '';
            row["Concentración"] = item.concentration || '';
            row["Estado Físico"] = item.physical_state || '';
            row["Riesgos/Advertencias"] = item.risks_warnings || '';
            row["Fecha Entrada"] = item.entry_date || '';
            row["Fecha Caducidad"] = item.expiration_date || '';
        } else {
            row["Categoría"] = item.category || '';
            row["Estado Conservación"] = item.status || '';
        }

        row["Cantidad"] = item.quantity;
        row["Unidad"] = item.unit || 'uds';
        row["Ubicación"] = item.location || '';
        row["Responsable"] = item.responsible || '';
        row["Observaciones"] = item.observations || '';
        row["Contenido QR"] = item.qr_content || '';
        row["Creado El"] = item.created_at || '';
        row["Modificado El"] = item.updated_at || '';

        return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario");
    XLSX.writeFile(workbook, filename);
}

function exportHistoryExcel() {
    if (state.history.length === 0) {
        alert("No hay registros en el historial activo para exportar.");
        return;
    }

    const data = state.history.map(h => ({
        "Fecha y Hora": h.timestamp,
        "Responsable de Acción": h.user_responsible,
        "Acción Realizada": h.action,
        "Tabla Afectada": h.table_name === 'substances' ? 'Sustancias' : (h.table_name === 'chemical_materials' ? 'Material Químico' : 'Material Didáctico'),
        "ID del Registro": h.record_id,
        "Campo Modificado": h.field_name || '',
        "Valor Anterior": h.old_value || '',
        "Valor Nuevo": h.new_value || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial Auditoría");
    XLSX.writeFile(workbook, 'Historial_Cambios_Inventario.xlsx');
}

// -------------------------------------------------------------
// CONTROLADORES DE VISTA Y AUTENTICACIÓN
// -------------------------------------------------------------
function setSubstancesViewMode(mode) {
    state.substancesViewMode = mode;
    localStorage.setItem('itma2_substances_view_mode', mode);
    router();
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    
    // Reset form
    document.getElementById('auth-username').value = '';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-confirm-password').value = '';
    switchAuthTab('login');

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 50);
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    const content = document.getElementById('auth-modal-content');
    
    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 200);
}

let activeAuthTab = 'login';
function switchAuthTab(tab) {
    activeAuthTab = tab;
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const confirmContainer = document.getElementById('auth-confirm-container');
    const btnSubmit = document.getElementById('btn-auth-submit');

    if (tab === 'login') {
        tabLogin.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-brand-500 text-brand-600 outline-none';
        tabRegister.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 outline-none';
        confirmContainer.classList.add('hidden');
        btnSubmit.textContent = 'Ingresar';
    } else {
        tabRegister.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-brand-500 text-brand-600 outline-none';
        tabLogin.className = 'flex-1 text-center font-bold text-sm pb-2 border-b-2 border-transparent text-slate-400 hover:text-slate-600 outline-none';
        confirmContainer.classList.remove('hidden');
        btnSubmit.textContent = 'Registrarse';
    }
}

async function handleAuthSubmit() {
    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    
    if (!username || !password) {
        alert("Por favor rellene todos los campos.");
        return;
    }

    if (activeAuthTab === 'register') {
        const confirmPw = document.getElementById('auth-confirm-password').value.trim();
        if (password !== confirmPw) {
            alert("Las contraseñas no coinciden.");
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            }).then(r => r.json());

            if (res.status === 'success') {
                alert("Cuenta creada con éxito. Ahora puede iniciar sesión.");
                switchAuthTab('login');
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert("Error al registrar cuenta: " + err.message);
        }
    } else {
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            }).then(r => r.json());

            if (res.status === 'success') {
                closeAuthModal();
                await checkSessionStatus();
            } else {
                alert(res.message);
            }
        } catch (err) {
            alert("Error de conexión: " + err.message);
        }
    }
}

async function handleLogout() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' }).then(r => r.json());
        if (res.status === 'success') {
            await checkSessionStatus();
        } else {
            alert(res.message);
        }
    } catch (err) {
        alert("Error al cerrar sesión: " + err.message);
    }
}

async function checkSessionStatus() {
    try {
        const res = await fetch('/api/auth/status').then(r => r.json());
        const container = document.getElementById('user-auth-control');
        
        if (res.status === 'success' && res.logged_in) {
            state.isLoggedIn = true;
            state.activeUser = res.user;
            
            if (container) {
                container.innerHTML = `
                    <span class="text-xs font-bold bg-brand-50 text-brand-700 border border-brand-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                        <i data-lucide="user" class="w-3.5 h-3.5 text-brand-500"></i>
                        <span>Sesión: <strong class="font-extrabold">${res.user}</strong></span>
                    </span>
                    <button onclick="handleLogout()" class="bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 border border-transparent hover:border-red-100">
                        <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                        <span>Cerrar Sesión</span>
                    </button>
                `;
            }
        } else {
            state.isLoggedIn = false;
            state.activeUser = '';
            
            if (container) {
                container.innerHTML = `
                    <span class="text-xs font-bold bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <i data-lucide="eye" class="w-3.5 h-3.5 text-slate-400"></i>
                        <span>Modo Lectura</span>
                    </span>
                    <button onclick="openAuthModal()" class="bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm shadow-brand-600/10">
                        <i data-lucide="log-in" class="w-3.5 h-3.5"></i>
                        <span>Iniciar Sesión</span>
                    </button>
                `;
            }
        }
        
        if (window.lucide) window.lucide.createIcons();
        
        // Refrescar el enrutador para actualizar las vistas y botones según el estado de la sesión
        if (typeof router === 'function' && state.activeRoute) {
            router();
        }
    } catch (err) {
        console.error("Error comprobando sesión: ", err);
    }
}

// Inicialización del Estado y Eventos
async function initApp() {
    // Restaurar modo de vista
    const savedViewMode = localStorage.getItem('itma2_substances_view_mode');
    if (savedViewMode) {
        state.substancesViewMode = savedViewMode;
    }
    await checkSessionStatus();
}

// Enrutar al cambiar hash o al cargar
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', initApp);
