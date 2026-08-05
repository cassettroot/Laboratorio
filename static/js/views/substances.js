function buildGroupBadgesHtml(substance_group) {
    if (!substance_group) return '';
    const groups = substance_group.split(/[,/;|]/).map(g => g.trim()).filter(Boolean);
    return groups.map(group => {
        let gColor = 'bg-slate-100 text-slate-700 border-slate-200';
        const g = group.toLowerCase();
        if (g.includes('inflam')) gColor = 'bg-red-50 text-red-700 border-red-200';
        else if (g.includes('tox') || g.includes('venen')) gColor = 'bg-purple-50 text-purple-700 border-purple-200';
        else if (g.includes('corros')) gColor = 'bg-orange-50 text-orange-700 border-orange-200';
        else if (g.includes('explos')) gColor = 'bg-yellow-50 text-yellow-800 border-yellow-300';
        else if (g.includes('comburent')) gColor = 'bg-pink-50 text-pink-700 border-pink-200';
        else if (g.includes('irrit')) gColor = 'bg-teal-50 text-teal-700 border-teal-200';
        else if (g.includes('inert')) gColor = 'bg-blue-50 text-blue-700 border-blue-200';
        return `<span class="px-2.5 py-0.5 rounded border text-3xs font-extrabold uppercase tracking-wider ${gColor}">${group}</span>`;
    }).join(' ');
}

function getMissingSubstanceFields(s) {
    const missing = [];
    if (!s.location || !s.location.trim()) missing.push('Ubicación');
    if (!s.expiration_date || !s.expiration_date.trim()) missing.push('Caducidad');
    if (!s.entry_date || !s.entry_date.trim()) missing.push('Fecha Entrada');
    if (!s.image_path || !s.image_path.trim()) missing.push('Foto');
    if (!s.chemical_formula || !s.chemical_formula.trim()) missing.push('Fórmula');
    if (!s.cas_number || !s.cas_number.trim()) missing.push('CAS');
    if (!s.pdf_path || !s.pdf_path.trim()) missing.push('PDF (HDS)');
    if (!s.external_links || !s.external_links.trim()) missing.push('Links Ref.');
    return missing;
}

function toggleSubstancesFilterActiveMode() {
    if (!state.substancesFilters) state.substancesFilters = {};
    state.substancesFilters.areFiltersActive = !state.substancesFilters.areFiltersActive;
    if (state.substancesFilters.areFiltersActive) {
        state.substancesFilters.isPanelOpen = true;
    } else {
        state.substancesFilters.isPanelOpen = false;
        state.substancesFilters.completeness = '';
    }
    if (window._triggerSubstancesFetch) window._triggerSubstancesFetch();
}
window.toggleSubstancesFilterActiveMode = toggleSubstancesFilterActiveMode;

function toggleSubstancesFiltersPanel() {
    const panel = document.getElementById('substances-filters-panel');
    if (panel) {
        panel.classList.toggle('hidden');
        if (!state.substancesFilters) state.substancesFilters = {};
        state.substancesFilters.isPanelOpen = !panel.classList.contains('hidden');
    }
}

function resetSubstancesFilters() {
    state.substancesFilters = {
        search: '',
        sort: 'name_asc',
        group: '',
        physical_state: '',
        completeness: '',
        location: '',
        isPanelOpen: false,
        areFiltersActive: false
    };

    const search = document.getElementById('search-substances');
    const sort = document.getElementById('sort-substances');
    const group = document.getElementById('group-substances');
    const stateFilter = document.getElementById('filter-state');
    const completeness = document.getElementById('filter-completeness');
    const loc = document.getElementById('filter-location');

    if (search) search.value = '';
    if (sort) sort.value = 'name_asc';
    if (group) group.value = '';
    if (stateFilter) stateFilter.value = '';
    if (completeness) completeness.value = '';
    if (loc) loc.value = '';

    const badge = document.getElementById('active-filters-badge');
    if (badge) {
        badge.textContent = '0';
        badge.classList.add('hidden');
    }

    if (window._triggerSubstancesFetch) window._triggerSubstancesFetch();
}

async function renderSubstancesList(container) {
    if (!state.substancesFilters) {
        state.substancesFilters = {
            search: '',
            sort: 'name_asc',
            group: '',
            physical_state: '',
            completeness: '',
            location: '',
            isPanelOpen: false,
            areFiltersActive: false
        };
    }

    const f = state.substancesFilters;

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="sticky -top-8 z-20 bg-slate-50/95 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/80 space-y-3 no-print shadow-xs">
                <!-- Fila Principal: Búsqueda y Botones -->
                <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div class="flex items-center gap-3 w-full md:w-auto flex-1 max-w-2xl">
                        <div class="relative w-full">
                            <input id="search-substances" type="text" value="${f.search || ''}" placeholder="Buscar por CAS, nombre, grupo o ubicación..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm font-medium text-slate-800 placeholder:text-slate-400">
                            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                        </div>
                        
                        <button type="button" id="btn-toggle-filter-mode" onclick="toggleSubstancesFilterActiveMode()" class="px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition border shadow-sm shrink-0 ${f.areFiltersActive ? 'bg-brand-600 text-white border-brand-700 hover:bg-brand-700' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}">
                            <i data-lucide="${f.areFiltersActive ? 'filter-check' : 'filter'}" class="w-4 h-4 text-brand-500"></i>
                            <span>${f.areFiltersActive ? '⚡ Activar Filtros: SÍ' : '⚡ Activar Filtros'}</span>
                        </button>

                        <button type="button" id="btn-toggle-filters" onclick="toggleSubstancesFiltersPanel()" class="bg-white hover:bg-slate-100 border border-slate-300 font-semibold px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm shrink-0">
                            <i data-lucide="sliders-horizontal" class="w-4 h-4 text-brand-600"></i>
                            <span>Opciones</span>
                            <span id="active-filters-badge" class="hidden bg-brand-500 text-slate-900 text-3xs font-extrabold px-2 py-0.5 rounded-full">0</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-2.5 w-full md:w-auto justify-end">
                        <div class="flex border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                            <button onclick="setSubstancesViewMode('list')" id="btn-view-list" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Lista">
                                <i data-lucide="list" class="w-4 h-4"></i>
                            </button>
                            <button onclick="setSubstancesViewMode('grid')" id="btn-view-grid" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Cuadrícula">
                                <i data-lucide="layout-grid" class="w-4 h-4"></i>
                            </button>
                        </div>

                        ${(state.isLoggedIn && state.userRole === 'admin') ? `
                        <button onclick="openQRBatchModal()" class="bg-indigo-600 hover:bg-indigo-700 font-extrabold px-3.5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-md shrink-0" title="Imprimir o Descargar Códigos QR de Sustancias (Solo Admin)">
                            <i data-lucide="qr-code" class="w-4 h-4 text-amber-300"></i>
                            <span class="hidden sm:inline">🖨️ Códigos QR</span>
                            <span class="sm:hidden">QR</span>
                        </button>
                        <button onclick="exportTableToExcel('substances')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm shrink-0">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Exportar</span>
                        </button>
                        ` : ''}

                        ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                        <button onclick="openAddModal('substances')" class="bg-brand-600 hover:bg-brand-700 font-bold px-4 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10 shrink-0">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            <span>Registrar Sustancia</span>
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Panel Plegable de Filtros Avanzados y Ordenamiento -->
                <div id="substances-filters-panel" class="${f.isPanelOpen ? '' : 'hidden'} bg-white border border-slate-200 rounded-2xl p-4 shadow-lg animate-fade-in space-y-3">
                    <div class="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <i data-lucide="filter" class="w-3.5 h-3.5 text-brand-600"></i>
                            Opciones de Filtro y Ordenamiento
                        </span>
                        <button onclick="resetSubstancesFilters()" class="text-xs font-bold text-brand-600 hover:text-brand-800 transition flex items-center gap-1">
                            <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                            <span>Restablecer Filtros</span>
                        </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ordenar por</label>
                            <select id="sort-substances" class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
                                <option value="name_asc" ${f.sort === 'name_asc' ? 'selected' : ''}>🔤 Nombre (A - Z)</option>
                                <option value="name_desc" ${f.sort === 'name_desc' ? 'selected' : ''}>🔤 Nombre (Z - A)</option>
                                <option value="cas_asc" ${f.sort === 'cas_asc' ? 'selected' : ''}>🔢 Número CAS (A - Z)</option>
                                <option value="cas_desc" ${f.sort === 'cas_desc' ? 'selected' : ''}>🔢 Número CAS (Z - A)</option>
                                <option value="quantity_desc" ${f.sort === 'quantity_desc' ? 'selected' : ''}>📦 Stock (Mayor a Menor)</option>
                                <option value="quantity_asc" ${f.sort === 'quantity_asc' ? 'selected' : ''}>📦 Stock (Menor a Mayor)</option>
                                <option value="id_desc" ${f.sort === 'id_desc' ? 'selected' : ''}>🆕 Registro (Más recientes)</option>
                                <option value="id_asc" ${f.sort === 'id_asc' ? 'selected' : ''}>⌛ Registro (Más antiguos)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Agrupar por</label>
                            <select id="group-substances" class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
                                <option value="" ${!f.group ? 'selected' : ''}>-- Sin Agrupar --</option>
                                <option value="physical_state" ${f.group === 'physical_state' ? 'selected' : ''}>📁 Estado Físico</option>
                                <option value="location" ${f.group === 'location' ? 'selected' : ''}>📍 Ubicación</option>
                                <option value="substance_group" ${f.group === 'substance_group' ? 'selected' : ''}>🏷️ Grupo Químico</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estado Físico</label>
                            <select id="filter-state" class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
                                <option value="" ${!f.physical_state ? 'selected' : ''}>-- Todos --</option>
                                <option value="Sólido" ${f.physical_state === 'Sólido' ? 'selected' : ''}>Sólido</option>
                                <option value="Líquido" ${f.physical_state === 'Líquido' ? 'selected' : ''}>Líquido</option>
                                <option value="Gaseoso" ${f.physical_state === 'Gaseoso' ? 'selected' : ''}>Gaseoso</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Incompletos / Faltan Datos</label>
                            <select id="filter-completeness" class="w-full bg-amber-50/50 border border-amber-200 px-3 py-2 rounded-xl text-xs font-semibold text-amber-900 outline-none focus:border-brand-500">
                                <option value="" ${!f.completeness ? 'selected' : ''}>-- Todos los reactivos --</option>
                                <option value="incomplete" ${f.completeness === 'incomplete' ? 'selected' : ''}>⚠️ Ver solo Incompletos</option>
                                <option value="missing_location" ${f.completeness === 'missing_location' ? 'selected' : ''}>📍 Falta Ubicación</option>
                                <option value="missing_expiration" ${f.completeness === 'missing_expiration' ? 'selected' : ''}>📅 Falta Caducidad</option>
                                <option value="missing_photo" ${f.completeness === 'missing_photo' ? 'selected' : ''}>📷 Falta Foto</option>
                                <option value="missing_formula" ${f.completeness === 'missing_formula' ? 'selected' : ''}>🧪 Falta Fórmula / CAS</option>
                                <option value="missing_pdf" ${f.completeness === 'missing_pdf' ? 'selected' : ''}>📄 Falta Documento PDF (HDS)</option>
                                <option value="missing_links" ${f.completeness === 'missing_links' ? 'selected' : ''}>🔗 Falta Links de Referencia</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ubicación</label>
                            <input id="filter-location" type="text" value="${f.location || ''}" placeholder="Ej. Estante 1..." class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
                        </div>
                    </div>
                </div>
            </div>

            <div id="substances-data-container">
                <div class="py-12 text-center text-slate-400">Cargando sustancias químicas...</div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        window._triggerSubstancesFetch = fetchAndRender;
        const f = state.substancesFilters || {};

        const search = document.getElementById('search-substances')?.value || '';
        const physical_state = document.getElementById('filter-state')?.value || '';
        const location = document.getElementById('filter-location')?.value || '';
        const sortVal = document.getElementById('sort-substances')?.value || 'name_asc';
        const groupVal = document.getElementById('group-substances')?.value || '';
        const completenessVal = f.areFiltersActive ? (document.getElementById('filter-completeness')?.value || '') : '';

        // Persistir en objeto de estado global
        if (!state.substancesFilters) state.substancesFilters = {};
        state.substancesFilters.search = search;
        state.substancesFilters.physical_state = physical_state;
        state.substancesFilters.location = location;
        state.substancesFilters.sort = sortVal;
        state.substancesFilters.group = groupVal;
        state.substancesFilters.completeness = completenessVal;

        // Contador de Filtros Activos
        let activeCount = 0;
        if (sortVal && sortVal !== 'name_asc') activeCount++;
        if (groupVal) activeCount++;
        if (physical_state) activeCount++;
        if (completenessVal) activeCount++;
        if (location && location.trim() !== '') activeCount++;

        const badge = document.getElementById('active-filters-badge');
        if (badge) {
            if (activeCount > 0) {
                badge.textContent = activeCount.toString();
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        const dataContainer = document.getElementById('substances-data-container');
        if (!dataContainer) return;

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
            let substancesList = res.data || [];

            const completeness = f.areFiltersActive ? (document.getElementById('filter-completeness')?.value || '') : '';
            if (completeness === 'incomplete') {
                substancesList = substancesList.filter(s => getMissingSubstanceFields(s).length > 0);
            } else if (completeness === 'missing_location') {
                substancesList = substancesList.filter(s => !s.location || !s.location.trim());
            } else if (completeness === 'missing_expiration') {
                substancesList = substancesList.filter(s => !s.expiration_date || !s.expiration_date.trim());
            } else if (completeness === 'missing_photo') {
                substancesList = substancesList.filter(s => !s.image_path || !s.image_path.trim());
            } else if (completeness === 'missing_formula') {
                substancesList = substancesList.filter(s => !s.chemical_formula || !s.chemical_formula.trim() || !s.cas_number || !s.cas_number.trim());
            } else if (completeness === 'missing_pdf') {
                substancesList = substancesList.filter(s => !s.pdf_path || !s.pdf_path.trim());
            } else if (completeness === 'missing_links') {
                substancesList = substancesList.filter(s => !s.external_links || !s.external_links.trim());
            }

            const sortBy = document.getElementById('sort-substances')?.value || 'name_asc';
            substancesList.sort((a, b) => {
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'cas_asc') return (a.cas_number || '').localeCompare(b.cas_number || '', 'es', { numeric: true });
                if (sortBy === 'cas_desc') return (b.cas_number || '').localeCompare(a.cas_number || '', 'es', { numeric: true });
                if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
                if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'id_desc') return b.id - a.id;
                return (a.name || '').localeCompare(b.name || '', 'es');
            });

            state.substances = substancesList;

            if (state.substances.length === 0) {
                dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-slate-400">No se encontraron sustancias con los filtros aplicados.</div>`;
                return;
            }

            const groupBy = document.getElementById('group-substances')?.value || '';

            if (groupBy) {
                const groups = {};
                state.substances.forEach(s => {
                    let key = 'Sin Clasificar';
                    if (groupBy === 'physical_state') key = s.physical_state || 'Sin Estado Físico';
                    else if (groupBy === 'location') key = s.location || 'Sin Ubicación';
                    else if (groupBy === 'substance_group') key = s.substance_group ? s.substance_group.split(/[,/;|]/)[0].trim() : 'Sin Grupo Químico';

                    if (!groups[key]) groups[key] = [];
                    groups[key].push(s);
                });

                let groupedHtml = '';
                for (const [groupTitle, groupItems] of Object.entries(groups)) {
                    groupedHtml += `
                        <div class="mb-8 space-y-4">
                            <div class="flex items-center gap-2 pb-2 border-b-2 border-slate-200">
                                <span class="text-sm font-extrabold text-slate-800 uppercase tracking-wide">${groupTitle}</span>
                                <span class="bg-brand-100 text-brand-800 text-2xs font-extrabold px-2.5 py-0.5 rounded-full">${groupItems.length} reactivos</span>
                            </div>
                            ${renderSubstancesBlock(groupItems, state.substancesViewMode)}
                        </div>
                    `;
                }
                dataContainer.innerHTML = groupedHtml;
            } else {
                dataContainer.innerHTML = renderSubstancesBlock(state.substances, state.substancesViewMode);
            }

            if (window.lucide) window.lucide.createIcons();

            // Restaurar posición del Scroll si se regresa de una ficha detallada
            const savedScroll = sessionStorage.getItem('substances_scroll_y');
            if (savedScroll) {
                setTimeout(() => {
                    window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'instant' });
                }, 60);
            }
        } catch (err) {
            console.error("Error al cargar sustancias:", err);
            dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-red-500 font-bold">Error al cargar datos: ${err.message}</div>`;
        }
    };

    document.getElementById('search-substances')?.addEventListener('input', fetchAndRender);
    document.getElementById('sort-substances')?.addEventListener('change', fetchAndRender);
    document.getElementById('group-substances')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-state')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-completeness')?.addEventListener('change', fetchAndRender);
    document.getElementById('filter-location')?.addEventListener('input', fetchAndRender);

    fetchAndRender();
}

function getSubstanceMainImage(s) {
    if (s.image_path && s.image_path.trim()) return s.image_path.trim();
    if (s.presentation_images) {
        try {
            const imgs = typeof s.presentation_images === 'string' ? JSON.parse(s.presentation_images) : s.presentation_images;
            if (Array.isArray(imgs) && imgs.length > 0 && imgs[0].image_path) {
                return imgs[0].image_path.trim();
            }
        } catch(e) {}
    }
    return '';
}

function renderSubstancesBlock(items, mode) {
    const f = state.substancesFilters || {};
    if (mode === 'list') {
        return `
            <div class="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-xs">
                                <th class="py-4 px-4 text-center w-12">#</th>
                                <th class="py-4 px-6">Sustancia</th>
                                <th class="py-4 px-6">Grupo SGA</th>
                                <th class="py-4 px-6">Fórmula / CAS</th>
                                <th class="py-4 px-6">Ubicación Estante</th>
                                <th class="py-4 px-6">Estado Físico</th>
                                <th class="py-4 px-6">Cantidad</th>
                                <th class="py-4 px-6">Caducidad</th>
                                <th class="py-4 px-6 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-slate-700 font-medium">
                            ${items.map((s, idx) => {
                                const today = new Date();
                                const cardImage = getSubstanceMainImage(s);
                                let expBadge = `<span class="text-slate-600">${s.expiration_date || 'N/D'}</span>`;
                                if (s.expiration_date === 'Sin caducidad' || s.expiration_date === 'No aplica') {
                                    expBadge = `<span class="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg text-2xs font-bold uppercase shrink-0">Sin Caducidad</span>`;
                                } else if (s.expiration_date) {
                                    const exp = new Date(s.expiration_date);
                                    if (!isNaN(exp)) {
                                        const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                                        if (diff < 0) {
                                            expBadge = `<span class="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded-lg text-2xs font-bold uppercase shrink-0">Caducado</span>`;
                                        } else if (diff <= 30) {
                                            expBadge = `<span class="bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-lg text-2xs font-bold uppercase shrink-0">Por caducar</span>`;
                                        }
                                    }
                                }

                                const missingFields = getMissingSubstanceFields(s);
                                const missingBadge = (missingFields.length > 0 && f.areFiltersActive) ? `
                                    <div class="mt-1 flex flex-wrap gap-1">
                                        <span class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-3xs font-extrabold flex items-center gap-1">
                                            <span>⚠️ Falta: ${missingFields.join(', ')}</span>
                                        </span>
                                    </div>
                                ` : '';

                                const stateColor = s.physical_state === 'Líquido' ? 'bg-cyan-100 text-cyan-800 border border-cyan-200' : (s.physical_state === 'Sólido' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-purple-100 text-purple-800 border border-purple-200');

                                return `
                                    <tr class="hover:bg-slate-50/80 transition">
                                        <td class="py-4 px-4 text-center">
                                            <span class="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-700 font-extrabold text-xs font-mono rounded-full border border-slate-200 shadow-2xs">${idx + 1}</span>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200/60 shrink-0 shadow-2xs ${cardImage ? 'cursor-pointer hover:ring-2 hover:ring-brand-500 transition' : ''}" ${cardImage ? `onclick="openImageViewer('${cardImage}', '${(s.name || '').replace(/'/g, "\\'")}')" title="Haz clic para ver foto en tamaño completo"` : ''}>
                                                    ${cardImage ? `<img src="${cardImage}" class="w-full h-full object-cover">` : `<i data-lucide="flask-conical" class="w-5 h-5 text-slate-400"></i>`}
                                                </div>
                                                <div>
                                                    <a href="#/substances/${s.id}" class="text-sm font-bold text-slate-900 hover:text-brand-600 transition block">${s.name}</a>
                                                    <span class="text-3xs text-slate-400 uppercase tracking-wider font-mono">LAB-SUB-${s.id}</span>
                                                    ${missingBadge}
                                                </div>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6">
                                            ${buildGroupBadgesHtml(s.substance_group) || '-'}
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="text-sm text-slate-800 font-semibold">${s.chemical_formula || '-'}</div>
                                            <div class="text-2xs text-slate-400 font-medium">CAS: ${s.cas_number || '-'}</div>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex flex-col gap-1 items-start">
                                                <span class="text-2xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg inline-block max-w-[180px] truncate" title="${s.location || 'No asignada'}">
                                                    📍 ${s.location || 'No asignada'}
                                                </span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex flex-col gap-1 items-start">
                                                <span class="px-2 py-0.5 rounded-md text-2xs font-bold ${stateColor}">${s.physical_state || 'N/D'}</span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6 text-xs text-slate-500">
                                            <div class="text-sm font-bold text-slate-900">${s.quantity} <span class="text-xs font-normal text-slate-500">${s.unit}</span></div>
                                            ${s.container_content ? `<div class="text-3xs text-slate-400 font-bold">Contenido: ${s.container_content}</div>` : ''}
                                        </td>
                                        <td class="py-4 px-6">
                                            <div class="flex flex-col gap-1 items-start">
                                                ${expBadge}
                                                <span class="text-3xs text-slate-400">${s.expiration_date || ''}</span>
                                            </div>
                                        </td>
                                        <td class="py-4 px-6 no-print text-right">
                                            <div class="flex items-center justify-end gap-1.5">
                                                <a href="#/substances/${s.id}" class="p-2 bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-700 border border-slate-200 hover:border-brand-200 rounded-xl transition shadow-2xs flex items-center gap-1 text-xs font-bold" title="Ver Detalle y Editar">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                    <span>Ver</span>
                                                </a>
                                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                                    <button onclick="deleteItem('substances', ${s.id})" class="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl transition" title="Eliminar">
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
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                ${items.map(s => {
                    const today = new Date();
                    let expBadge = '';
                    if (s.expiration_date === 'Sin caducidad' || s.expiration_date === 'No aplica') {
                        expBadge = `<span class="absolute top-3 left-3 bg-blue-600 text-white text-3xs font-extrabold uppercase px-2 py-1 rounded-xl shadow-lg shadow-blue-600/25 z-10">Sin Caducidad</span>`;
                    } else if (s.expiration_date) {
                        const exp = new Date(s.expiration_date);
                        if (!isNaN(exp)) {
                            const diff = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                            if (diff < 0) {
                                expBadge = `<span class="absolute top-3 left-3 bg-red-600 text-white text-3xs font-extrabold uppercase px-2 py-1 rounded-xl shadow-lg shadow-red-600/25 z-10">Caducado</span>`;
                            } else if (diff <= 30) {
                                expBadge = `<span class="absolute top-3 left-3 bg-amber-500 text-white text-3xs font-extrabold uppercase px-2 py-1 rounded-xl shadow-lg shadow-amber-500/25 z-10">Por Caducar</span>`;
                            }
                        }
                    }

                    const cardImage = getSubstanceMainImage(s);
                    let groupBadgeHtml = buildGroupBadgesHtml(s.substance_group);
                    let presBadge = '';
                    if (s.presentation_images) {
                        try {
                            const imgs = typeof s.presentation_images === 'string' ? JSON.parse(s.presentation_images) : s.presentation_images;
                            if (Array.isArray(imgs) && imgs.length > 0) {
                                presBadge = `<span class="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white text-3xs font-extrabold px-2 py-1 rounded-xl border border-white/20 z-10 flex items-center gap-1 shadow-sm"><i data-lucide="image" class="w-3 h-3 text-brand-300"></i> ${imgs.length + (s.image_path ? 1 : 0)} fotos</span>`;
                            }
                        } catch(e) {}
                    }

                    return `
                        <div class="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col group relative">
                            <div class="relative w-full aspect-square bg-slate-50 border-b flex items-center justify-center text-slate-300 overflow-hidden shrink-0 group/img ${cardImage ? 'cursor-pointer' : ''}" ${cardImage ? `onclick="openImageViewer('${cardImage}', '${(s.name || '').replace(/'/g, "\\'")}')"` : ''}>
                                ${expBadge}
                                ${presBadge}
                                ${cardImage ? `
                                    <img src="${cardImage}" class="w-full h-full object-cover group-hover/img:scale-105 transition duration-500">
                                    <div class="absolute inset-0 bg-slate-950/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white text-xs font-bold gap-1.5 backdrop-blur-[2px]">
                                        <i data-lucide="maximize-2" class="w-4 h-4 text-brand-400"></i>
                                        <span>Ver Foto Completa</span>
                                    </div>
                                ` : `
                                    <i data-lucide="flask-conical" class="w-12 h-12 text-slate-300"></i>
                                `}
                                <div class="absolute bottom-3 left-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-3xs rounded-2xl p-2.5 flex justify-center items-center shadow-lg border border-white/10 z-10">
                                    <span class="font-bold flex items-center gap-1">
                                        <i data-lucide="scale" class="w-3.5 h-3.5 text-brand-400"></i>
                                        <span>${s.container_content || s.unit || ''}</span>
                                    </span>
                                </div>
                            </div>

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
                                        <div class="flex justify-between items-center"><span class="font-medium text-slate-400">Ubicación:</span><span class="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-3xs truncate max-w-[130px]" title="${s.location || 'No asignada'}">📍 ${s.location || 'No asignada'}</span></div>
                                        <div class="flex justify-between"><span class="font-medium text-slate-400">Total Stock:</span><span class="font-bold text-slate-900">${s.quantity} ${s.unit}</span></div>
                                        ${(() => {
                                            if (!f.areFiltersActive) return '';
                                            const missing = getMissingSubstanceFields(s);
                                            return missing.length > 0 ? `
                                                <div class="pt-1.5 border-t border-slate-100">
                                                    <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-3xs font-bold block truncate" title="Faltan datos: ${missing.join(', ')}">
                                                        ⚠️ Falta: ${missing.join(', ')}
                                                    </span>
                                                </div>
                                            ` : '';
                                        })()}
                                    </div>
                                </div>

                                <div class="flex items-center justify-end gap-1.5 border-t border-slate-50 pt-3">
                                    <a href="#/substances/${s.id}" class="p-2 bg-slate-50 hover:bg-brand-50 text-slate-600 hover:text-brand-700 border border-slate-200 hover:border-brand-200 rounded-xl transition shadow-2xs flex items-center gap-1 text-xs font-bold" title="Ver Detalle y Editar">
                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                        <span>Ver Detalle</span>
                                    </a>
                                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                                        <button onclick="deleteItem('substances', ${s.id})" class="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-xl transition" title="Eliminar">
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
}

async function openSubstanceLoanModal(substanceId) {
    if (!state.isLoggedIn) {
        alert("Debe iniciar sesión para solicitar un préstamo.");
        return;
    }

    let modalEl = document.getElementById('modal-request-substance-loan');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'modal-request-substance-loan';
        modalEl.className = 'fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4';
        document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
        <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-fade-in relative border border-slate-200">
            <div class="flex justify-between items-start border-b pb-4 border-slate-100">
                <div>
                    <span class="bg-amber-100 text-amber-800 text-3xs font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        🤝 Préstamo de Sustancia
                    </span>
                    <h3 class="text-xl font-bold text-slate-900 mt-1">Solicitar Préstamo de Sustancia</h3>
                </div>
                <button onclick="closeSubstanceLoanModal()" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div id="substance-loan-modal-content" class="py-6 text-center text-slate-400">
                <i data-lucide="loader-2" class="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2"></i>
                <span>Cargando información de la sustancia...</span>
            </div>
        </div>
    `;

    modalEl.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    try {
        const [subRes, usersRes] = await Promise.all([
            fetch(`/api/substances/${substanceId}`).then(r => r.json()),
            fetch('/api/loans/registered-users').then(r => r.json())
        ]);

        if (subRes.status === 'error') {
            document.getElementById('substance-loan-modal-content').innerHTML = `
                <div class="text-red-500 font-bold p-4">${subRes.message}</div>
            `;
            return;
        }

        const substance = subRes.data;
        const users = usersRes.data || [];
        const availableStockUnits = (substance.stock_units !== null && substance.stock_units !== undefined && substance.stock_units > 0) ? substance.stock_units : Math.floor(substance.quantity || 1);

        const userOptions = users.map(u => {
            const isSelected = (u.username === state.user) ? 'selected' : '';
            return `<option value="${u.id}" data-name="${u.username}" data-role="${u.role}" ${isSelected}>${u.username} (${u.role})</option>`;
        }).join('');

        const contentDiv = document.getElementById('substance-loan-modal-content');
        contentDiv.innerHTML = `
            <form onsubmit="event.preventDefault(); submitSubstanceLoanRequest(${substance.id});" class="space-y-4 text-left">
                <div class="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 space-y-1 text-xs">
                    <div class="flex justify-between items-center">
                        <span class="font-extrabold text-amber-900 text-sm">${substance.name}</span>
                        <span class="text-3xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-bold">Stock: ${availableStockUnits} unidades</span>
                    </div>
                    ${substance.chemical_formula ? `<p class="text-amber-800 font-medium">Fórmula: <strong>${substance.chemical_formula}</strong></p>` : ''}
                    ${substance.location ? `<p class="text-amber-800 font-medium">Ubicación: <strong>${substance.location}</strong></p>` : ''}
                </div>

                <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 text-2xs text-amber-800 font-medium flex items-center gap-2">
                    <i data-lucide="clock" class="w-4 h-4 text-amber-600 shrink-0"></i>
                    <span>La solicitud quedará en estado <strong>Pendiente de Aprobación por Administrador</strong>. El conteo de tiempo iniciará cuando el Administrador apruebe el préstamo.</span>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Unidades a Solicitar (Stock Disponible: ${availableStockUnits}) *</label>
                    <div class="flex gap-2">
                        <input type="number" id="substance-loan-qty" min="1" max="${availableStockUnits}" value="1" step="1" required
                            class="flex-1 bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition">
                        <span class="bg-slate-100 border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-600 flex items-center shrink-0">
                            unidades
                        </span>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Responsable Solicitante *</label>
                    <input type="hidden" id="substance-loan-user-name" value="${state.user || 'Responsable'}">
                    <div class="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2">
                        <i data-lucide="user-check" class="w-4 h-4 text-emerald-600 shrink-0"></i>
                        <span>${state.user || 'Responsable'} (Sesión Iniciada)</span>
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tipo de Solicitante</label>
                    <input type="hidden" id="substance-loan-user-type" value="Responsable">
                    <div class="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        Responsable de Laboratorio
                    </div>
                </div>

                <div>
                    <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Motivo / Observaciones del Préstamo</label>
                    <textarea id="substance-loan-notes" rows="3" placeholder="Ej. Práctica #2 de Laboratorio de Química Orgánica..."
                        class="w-full bg-slate-50 border border-slate-300 p-3 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
                    <button type="button" onclick="closeSubstanceLoanModal()"
                        class="px-4 py-2.5 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-100 transition">
                        Cancelar
                    </button>
                    <button type="submit" id="btn-submit-substance-loan"
                        class="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition">
                        <i data-lucide="send" class="w-4 h-4"></i>
                        <span>Enviar Solicitud</span>
                    </button>
                </div>
            </form>
        `;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        document.getElementById('substance-loan-modal-content').innerHTML = `
            <div class="text-red-500 font-bold p-4">Error al cargar la información: ${err.message}</div>
        `;
    }
}

function closeSubstanceLoanModal() {
    const modalEl = document.getElementById('modal-request-substance-loan');
    if (modalEl) modalEl.classList.add('hidden');
}

async function submitSubstanceLoanRequest(substanceId) {
    const btn = document.getElementById('btn-submit-substance-loan');
    if (btn) btn.disabled = true;

    const qtyInput = document.getElementById('substance-loan-qty');
    const notesInput = document.getElementById('substance-loan-notes');

    const qty = parseInt(qtyInput?.value || '1', 10);
    if (isNaN(qty) || qty <= 0) {
        alert("Por favor ingrese un número entero de unidades mayor a 0.");
        if (btn) btn.disabled = false;
        return;
    }

    const borrowerName = state.user || 'Responsable';
    const borrowerType = 'Responsable';
    const notes = notesInput ? notesInput.value.trim() : '';

    try {
        const subRes = await fetch(`/api/substances/${substanceId}`).then(r => r.json());
        const substance = subRes.data || {};
        const availableStockUnits = (substance.stock_units !== null && substance.stock_units !== undefined && substance.stock_units > 0) ? substance.stock_units : Math.max(1, Math.floor(substance.quantity || 1));

        if (qty > availableStockUnits) {
            alert(`La cantidad solicitada (${qty} unidades) excede el stock disponible (${availableStockUnits} unidades).`);
            if (btn) btn.disabled = false;
            return;
        }

        const res = await fetch('/api/loans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                borrower_name: borrowerName,
                borrower_user_id: parseInt(borrowerUserId),
                borrower_type: borrowerType,
                items_list: [
                    {
                        id: substance.id || substanceId,
                        name: substance.name || 'Sustancia',
                        type: 'substance',
                        quantity: qty,
                        unit: substance.unit || 'g',
                        location: substance.location || '',
                        chemical_formula: substance.chemical_formula || ''
                    }
                ],
                notes: notes
            })
        });

        const data = await res.json();
        if (data.status === 'success') {
            closeSubstanceLoanModal();
            alert("✅ Solicitud de préstamo registrada exitosamente. Se ha enviado una notificación por correo a los administradores.");
            
            if (window._triggerSubstancesFetch) window._triggerSubstancesFetch();
            if (typeof loadLoansData === 'function') loadLoansData();
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("Error al enviar la solicitud de préstamo: " + e.message);
    } finally {
        if (btn) btn.disabled = false;
    }
}

// --- MÓDULO DE IMPRESIÓN Y DESCARGA MASIVA DE CÓDIGOS QR (SOLO ADMINISTRADOR) ---
let qrBatchModalState = {
    filterType: 'all', // 'all' | 'liquid' | 'solid' | 'gas'
    searchTerm: '',
    selectedIds: new Set()
};

window.openQRBatchModal = function() {
    if (!state.isLoggedIn || state.userRole !== 'admin') {
        alert('Esta función de impresión masiva de códigos QR está reservada exclusivamente para Administradores.');
        return;
    }

    const substances = state.substances || [];
    qrBatchModalState.selectedIds = new Set(substances.map(s => s.id));
    qrBatchModalState.searchTerm = '';
    qrBatchModalState.filterType = 'all';

    renderQRBatchModalDOM();
};

window.closeQRBatchModal = function() {
    const modalEl = document.getElementById('qr-batch-modal');
    if (modalEl) modalEl.remove();
};

window.setQRFilter = function(filterType) {
    qrBatchModalState.filterType = filterType;
    const substances = state.substances || [];
    let filtered = substances;
    if (filterType === 'liquid') {
        filtered = substances.filter(s => s.physical_state === 'Líquido');
    } else if (filterType === 'solid') {
        filtered = substances.filter(s => s.physical_state === 'Sólido');
    } else if (filterType === 'gas') {
        filtered = substances.filter(s => s.physical_state === 'Gaseoso');
    }
    qrBatchModalState.selectedIds = new Set(filtered.map(s => s.id));
    renderQRBatchModalDOM();
};

window.handleQRSearchInput = function(val) {
    qrBatchModalState.searchTerm = val || '';
    renderQRBatchModalDOM();
};

window.selectAllQRItems = function(selectVal) {
    const substances = getFilteredQRSubstances();
    if (selectVal) {
        substances.forEach(s => qrBatchModalState.selectedIds.add(s.id));
    } else {
        substances.forEach(s => qrBatchModalState.selectedIds.delete(s.id));
    }
    renderQRBatchModalDOM();
};

window.toggleQRItemSelection = function(id) {
    if (qrBatchModalState.selectedIds.has(id)) {
        qrBatchModalState.selectedIds.delete(id);
    } else {
        qrBatchModalState.selectedIds.add(id);
    }
    renderQRBatchModalDOM();
};

function getFilteredQRSubstances() {
    const substances = state.substances || [];
    const term = (qrBatchModalState.searchTerm || '').toLowerCase().trim();
    const type = qrBatchModalState.filterType;

    return substances.filter(s => {
        if (type === 'liquid' && s.physical_state !== 'Líquido') return false;
        if (type === 'solid' && s.physical_state !== 'Sólido') return false;
        if (type === 'gas' && s.physical_state !== 'Gaseoso') return false;

        if (term) {
            const matchName = (s.name || '').toLowerCase().includes(term);
            const matchCas = (s.cas_number || '').toLowerCase().includes(term);
            const matchFormula = (s.chemical_formula || '').toLowerCase().includes(term);
            const matchId = `LAB-SUB-${s.id}`.toLowerCase().includes(term);
            return matchName || matchCas || matchFormula || matchId;
        }
        return true;
    });
}

function renderQRBatchModalDOM() {
    let existingModal = document.getElementById('qr-batch-modal');
    if (!existingModal) {
        existingModal = document.createElement('div');
        existingModal.id = 'qr-batch-modal';
        document.body.appendChild(existingModal);
    }

    const allSubstances = state.substances || [];
    const liquidsCount = allSubstances.filter(s => s.physical_state === 'Líquido').length;
    const solidsCount = allSubstances.filter(s => s.physical_state === 'Sólido').length;

    const items = getFilteredQRSubstances();
    const selectedCount = qrBatchModalState.selectedIds.size;

    existingModal.className = 'fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print';
    existingModal.innerHTML = `
        <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <!-- Header Modal -->
            <div class="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
                        🖨️
                    </div>
                    <div>
                        <h3 class="text-lg font-extrabold text-white">Impresión y Descarga Masiva de Códigos QR</h3>
                        <p class="text-xs text-slate-300">Exclusivo Administrador: Filtra líquidos, todos los reactivos o selecciona uno específico</p>
                    </div>
                </div>
                <button type="button" onclick="closeQRBatchModal()" class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition font-bold text-sm">✕</button>
            </div>

            <!-- Toolbar Filtros Rápidos -->
            <div class="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between shrink-0">
                <div class="flex flex-wrap items-center gap-2">
                    <span class="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Filtro rápido:</span>
                    <button type="button" onclick="setQRFilter('liquid')" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition border ${qrBatchModalState.filterType === 'liquid' ? 'bg-cyan-600 text-white border-cyan-700 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}">
                        💧 Solo Líquidos (${liquidsCount})
                    </button>
                    <button type="button" onclick="setQRFilter('solid')" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition border ${qrBatchModalState.filterType === 'solid' ? 'bg-amber-600 text-white border-amber-700 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}">
                        📦 Solo Sólidos (${solidsCount})
                    </button>
                    <button type="button" onclick="setQRFilter('all')" class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition border ${qrBatchModalState.filterType === 'all' ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'}">
                        🧪 Todos (${allSubstances.length})
                    </button>
                </div>

                <div class="flex items-center gap-2 w-full md:w-auto">
                    <input id="qr-modal-search" type="text" value="${qrBatchModalState.searchTerm}" oninput="handleQRSearchInput(this.value)" placeholder="Buscar por nombre, CAS o ID..." class="bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-semibold outline-none focus:border-indigo-500 w-full md:w-52">
                    <button type="button" onclick="selectAllQRItems(true)" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition shrink-0">☑️ Marcar Visibles</button>
                    <button type="button" onclick="selectAllQRItems(false)" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition shrink-0">🎯 Desmarcar</button>
                </div>
            </div>

            <!-- Lista de Sustancias Seleccionables -->
            <div class="p-4 overflow-y-auto flex-1 space-y-2 max-h-[52vh] divide-y divide-slate-100">
                ${items.length === 0 ? `
                    <div class="py-12 text-center text-slate-400 font-semibold">No se encontraron reactivos con el filtro o búsqueda actual.</div>
                ` : items.map(s => {
                    const isChecked = qrBatchModalState.selectedIds.has(s.id);
                    const stateColor = s.physical_state === 'Líquido' ? 'bg-cyan-100 text-cyan-800' : (s.physical_state === 'Sólido' ? 'bg-amber-100 text-amber-800' : 'bg-purple-100 text-purple-800');
                    return `
                        <div class="pt-2.5 pb-2 flex items-center justify-between gap-4 hover:bg-slate-50 p-2 rounded-2xl transition">
                            <label class="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleQRItemSelection(${s.id})" class="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0">
                                ${s.qr_path ? `
                                    <img src="${s.qr_path}" class="w-12 h-12 rounded-lg border border-slate-200 bg-white object-contain p-0.5 shrink-0">
                                ` : `
                                    <div class="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">QR</div>
                                `}
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-extrabold text-slate-900 text-sm truncate">${s.name}</span>
                                        <span class="text-3xs font-mono px-2 py-0.5 rounded ${stateColor} font-bold">${s.physical_state || 'Genérico'}</span>
                                        ${s.substance_group ? `<span class="text-3xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">🏷️ ${s.substance_group}</span>` : ''}
                                    </div>
                                    <div class="text-xs text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
                                        <span>Fórmula: <strong class="text-slate-800">${s.chemical_formula || '-'}</strong></span>
                                        <span>CAS: <strong class="text-slate-800">${s.cas_number || '-'}</strong></span>
                                        <span>Stock: <strong class="text-indigo-600">${s.container_content || `${s.quantity} ${s.unit}`}</strong></span>
                                        <span class="text-3xs font-mono text-slate-400">LAB-SUB-${s.id}</span>
                                    </div>
                                </div>
                            </label>

                            <div class="flex items-center gap-2 shrink-0">
                                ${s.qr_path ? `
                                    <a href="${s.qr_path}" download="qr_${s.name.replace(/ /g, '_')}_LAB-SUB-${s.id}.png" class="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 font-bold rounded-xl text-xs transition flex items-center gap-1.5" title="Descargar código QR individual de este elemento">
                                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                        <span>QR Solo 1</span>
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Footer con Acciones de Impresión y Descargar -->
            <div class="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
                <div class="text-xs font-bold text-slate-600">
                    Incluidos en este ÚNICO PDF: <span class="text-indigo-600 font-extrabold text-sm">${selectedCount}</span> de ${allSubstances.length} reactivo(s)
                </div>

                <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button type="button" onclick="downloadSelectedQRPDF()" class="px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-md transition flex items-center gap-2 ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${selectedCount === 0 ? 'disabled' : ''}>
                        <i data-lucide="file-text" class="w-4 h-4 text-emerald-200"></i>
                        <span>📄 Descargar TODO en 1 Solo PDF (${selectedCount})</span>
                    </button>
                    <button type="button" onclick="printSelectedQRLabels()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}" ${selectedCount === 0 ? 'disabled' : ''}>
                        <i data-lucide="printer" class="w-4 h-4 text-amber-300"></i>
                        <span>🖨️ Imprimir Planilla en 1 Documento (${selectedCount})</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.downloadSelectedQRPDF = async function() {
    const allSubstances = state.substances || [];
    const selectedSubstances = allSubstances.filter(s => qrBatchModalState.selectedIds.has(s.id));

    if (selectedSubstances.length === 0) {
        alert('No has seleccionado ninguna sustancia para incluir en el documento PDF.');
        return;
    }

    const fileSuffix = qrBatchModalState.filterType === 'liquid' ? 'liquidos' : (qrBatchModalState.filterType === 'solid' ? 'solidos' : 'todos');
    const fileName = `planilla_unica_etiquetas_qr_${fileSuffix}_${new Date().toISOString().slice(0,10)}.pdf`;

    // Crear contenedor HTML unificado para el documento PDF único con fondo 100% blanco
    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '12px';
    pdfContainer.style.backgroundColor = '#ffffff';
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.color = '#0f172a';
    pdfContainer.style.fontFamily = 'sans-serif';
    pdfContainer.style.width = '100%';
    pdfContainer.style.boxSizing = 'border-box';

    const headerHtml = `
        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; background-color: #ffffff;">
            <h2 style="font-size: 15pt; font-weight: bold; margin: 0; color: #0f172a;">LABORATORIO DE QUÍMICA - PLANILLA UNIFICADA DE ETIQUETAS QR</h2>
            <p style="font-size: 8.5pt; margin: 3px 0 0 0; color: #475569;">Documento Único | Reactivos incluidos: ${selectedSubstances.length} | Filtro: ${qrBatchModalState.filterType.toUpperCase()} | Fecha: ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</p>
        </div>
    `;

    const labelGridHtml = `
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 100%; box-sizing: border-box; background-color: #ffffff;">
            ${selectedSubstances.map(s => `
                <div style="border: 1.5px dashed #475569; border-radius: 8px; padding: 8px; text-align: center; background-color: #ffffff; background: #ffffff; page-break-inside: avoid; break-inside: avoid; position: relative; box-sizing: border-box;">
                    <span style="position: absolute; top: 2px; right: 4px; font-size: 7pt; color: #94a3b8;">✂️</span>
                    
                    <!-- Nombre obligatorio de la sustancia -->
                    <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.name}</div>
                    
                    <div style="font-size: 8pt; font-weight: 700; color: #0284c7; margin-bottom: 3px;">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                    
                    ${s.qr_path ? `
                        <img src="${s.qr_path}" style="width: 100px; height: 100px; margin: 0 auto; display: block; object-fit: contain; background-color: #ffffff;">
                    ` : `
                        <div style="width: 100px; height: 100px; margin: 0 auto; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8.5pt; color: #999; background-color: #ffffff;">Sin QR</div>
                    `}
                    
                    <div style="font-size: 8.5pt; font-family: monospace; font-weight: bold; color: #1e293b; margin-top: 3px;">LAB-SUB-${s.id}</div>
                    <div style="font-size: 7.5pt; font-weight: bold; color: #15803d; margin-top: 1px;">Stock: ${s.container_content || `${s.quantity} ${s.unit}`}</div>
                    ${s.substance_group ? `<div style="font-size: 7pt; font-weight: bold; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">🏷️ ${s.substance_group}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;

    pdfContainer.innerHTML = headerHtml + labelGridHtml;

    // Generar UN SOLO documento PDF con todas las páginas necesarias
    if (window.html2pdf) {
        const opt = {
            margin:       [8, 8, 8, 8],
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'mm', format: 'letter', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
        };
        try {
            await window.html2pdf().set(opt).from(pdfContainer).save();
            return;
        } catch(e) {
            console.warn("Fallo con html2pdf, recurriendo a impresión PDF nativa:", e);
        }
    }

    // Fallback nativo: Abre la ventana de impresión unificada para guardar como 1 archivo PDF
    printSelectedQRLabels();
};

window.printSelectedQRLabels = function() {
    const allSubstances = state.substances || [];
    const selectedSubstances = allSubstances.filter(s => qrBatchModalState.selectedIds.has(s.id));

    if (selectedSubstances.length === 0) {
        alert('No has seleccionado ninguna sustancia para imprimir su código QR.');
        return;
    }

    let printArea = document.getElementById('qr-print-area');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'qr-print-area';
        document.body.appendChild(printArea);
    }

    const printHeaderHtml = `
        <div style="text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0f172a; padding-bottom: 6px; background-color: #ffffff;" class="no-print">
            <h2 style="font-size: 16pt; font-weight: bold; margin: 0; color: #0f172a;">LABORATORIO - PLANILLA DE ETIQUETAS QR PARA RECORTAR</h2>
            <p style="font-size: 9pt; margin: 2px 0 0 0; color: #475569;">Total de etiquetas juntas en esta planilla: ${selectedSubstances.length} | Impreso el ${new Date().toLocaleDateString('es-MX')} ${new Date().toLocaleTimeString('es-MX')}</p>
        </div>
    `;

    // Grilla compacta de 4 columnas para recortar y pegar fácilmente (quepan de 12 a 16 por hoja)
    const labelGridHtml = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; width: 100%; box-sizing: border-box; background-color: #ffffff; background: #ffffff;">
            ${selectedSubstances.map(s => `
                <div style="border: 1.5px dashed #475569; border-radius: 10px; padding: 8px; text-align: center; background-color: #ffffff; background: #ffffff; page-break-inside: avoid; position: relative; box-sizing: border-box;">
                    <span style="position: absolute; top: 2px; right: 4px; font-size: 7pt; color: #94a3b8;">✂️</span>
                    
                    <div style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 2px; line-height: 1.1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">${s.name}</div>
                    
                    <div style="font-size: 8pt; font-weight: 700; color: #0284c7; margin-bottom: 4px;">${s.chemical_formula || ''} ${s.cas_number ? `| CAS: ${s.cas_number}` : ''}</div>
                    
                    ${s.qr_path ? `
                        <img src="${s.qr_path}" style="width: 95px; height: 95px; margin: 0 auto; display: block; object-fit: contain; background-color: #ffffff;">
                    ` : `
                        <div style="width: 95px; height: 95px; margin: 0 auto; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #999; background-color: #ffffff;">Sin QR</div>
                    `}
                    
                    <div style="font-size: 8.5pt; font-family: monospace; font-weight: bold; color: #1e293b; margin-top: 3px;">LAB-SUB-${s.id}</div>
                    <div style="font-size: 7.5pt; font-weight: bold; color: #15803d; margin-top: 1px;">${s.container_content || `${s.quantity} ${s.unit}`}</div>
                    ${s.substance_group ? `<div style="font-size: 7pt; font-weight: bold; color: #64748b; margin-top: 2px; border-top: 1px dashed #cbd5e1; padding-top: 2px;">🏷️ ${s.substance_group}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;

    printArea.innerHTML = `
        <div style="padding: 10px; background-color: #ffffff; background: #ffffff;">
            ${printHeaderHtml}
            ${labelGridHtml}
        </div>
    `;

    document.body.classList.add('printing-qr-sheet');

    setTimeout(() => {
        window.print();
        setTimeout(() => {
            document.body.classList.remove('printing-qr-sheet');
        }, 1000);
    }, 250);
};
