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
    return missing;
}

function toggleSubstancesFiltersPanel() {
    const panel = document.getElementById('substances-filters-panel');
    if (panel) {
        panel.classList.toggle('hidden');
    }
}

function resetSubstancesFilters() {
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
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="sticky -top-8 z-20 bg-slate-50/95 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/80 space-y-3 no-print shadow-xs">
                <!-- Fila Principal: Búsqueda y Botones -->
                <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
                    <div class="flex items-center gap-3 w-full md:w-auto flex-1 max-w-xl">
                        <div class="relative w-full">
                            <input id="search-substances" type="text" placeholder="Buscar por CAS, nombre, grupo o ubicación..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm font-medium text-slate-800 placeholder:text-slate-400">
                            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                        </div>
                        
                        <button type="button" id="btn-toggle-filters" onclick="toggleSubstancesFiltersPanel()" class="bg-white hover:bg-slate-100 border border-slate-300 font-semibold px-3.5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm shrink-0">
                            <i data-lucide="sliders-horizontal" class="w-4 h-4 text-brand-600"></i>
                            <span>Filtros y Orden</span>
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
                <div id="substances-filters-panel" class="hidden bg-white border border-slate-200 rounded-2xl p-4 shadow-lg animate-fade-in space-y-3">
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
                                <option value="name_asc">🔤 Nombre (A - Z)</option>
                                <option value="name_desc">🔤 Nombre (Z - A)</option>
                                <option value="cas_asc">🔢 Número CAS (A - Z)</option>
                                <option value="cas_desc">🔢 Número CAS (Z - A)</option>
                                <option value="quantity_desc">📦 Stock (Mayor a Menor)</option>
                                <option value="quantity_asc">📦 Stock (Menor a Mayor)</option>
                                <option value="id_desc">🆕 Registro (Más recientes)</option>
                                <option value="id_asc">⌛ Registro (Más antiguos)</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Agrupar por</label>
                            <select id="group-substances" class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
                                <option value="">-- Sin Agrupar --</option>
                                <option value="physical_state">📁 Estado Físico</option>
                                <option value="location">📍 Ubicación</option>
                                <option value="substance_group">🏷️ Grupo Químico</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Estado Físico</label>
                            <select id="filter-state" class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
                                <option value="">-- Todos --</option>
                                <option value="Sólido">Sólido</option>
                                <option value="Líquido">Líquido</option>
                                <option value="Gaseoso">Gaseoso</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Incompletos / Faltan Datos</label>
                            <select id="filter-completeness" class="w-full bg-amber-50/50 border border-amber-200 px-3 py-2 rounded-xl text-xs font-semibold text-amber-900 outline-none focus:border-brand-500">
                                <option value="">-- Todos los reactivos --</option>
                                <option value="incomplete">⚠️ Ver solo Incompletos</option>
                                <option value="missing_location">📍 Falta Ubicación</option>
                                <option value="missing_expiration">📅 Falta Caducidad</option>
                                <option value="missing_photo">📷 Falta Foto</option>
                                <option value="missing_formula">🧪 Falta Fórmula / CAS</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-3xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ubicación</label>
                            <input id="filter-location" type="text" placeholder="Ej. Estante 1..." class="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-brand-500">
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

        const search = document.getElementById('search-substances').value;
        const physical_state = document.getElementById('filter-state').value;
        const location = document.getElementById('filter-location').value;
        const sortVal = document.getElementById('sort-substances')?.value;
        const groupVal = document.getElementById('group-substances')?.value;
        const completenessVal = document.getElementById('filter-completeness')?.value;

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

            const completeness = document.getElementById('filter-completeness').value;
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
            }

            const sortBy = document.getElementById('sort-substances').value;
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

            const groupBy = document.getElementById('group-substances').value;

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
        } catch (err) {
            dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-red-500 font-bold">Error al cargar datos.</div>`;
        }
    };

    document.getElementById('search-substances').addEventListener('input', fetchAndRender);
    document.getElementById('sort-substances').addEventListener('change', fetchAndRender);
    document.getElementById('group-substances').addEventListener('change', fetchAndRender);
    document.getElementById('filter-state').addEventListener('change', fetchAndRender);
    document.getElementById('filter-completeness').addEventListener('change', fetchAndRender);
    document.getElementById('filter-location').addEventListener('input', fetchAndRender);

    fetchAndRender();
}

function renderSubstancesBlock(items, mode) {
    if (mode === 'list') {
        return `
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
                            ${items.map(s => {
                                const today = new Date();
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

                                let stateColor = 'bg-slate-100 text-slate-700';
                                if (s.physical_state === 'Líquido') stateColor = 'bg-blue-50 text-blue-700';
                                if (s.physical_state === 'Sólido') stateColor = 'bg-amber-50 text-amber-700';
                                if (s.physical_state === 'Gaseoso') stateColor = 'bg-purple-50 text-purple-700';

                                const missing = getMissingSubstanceFields(s);
                                const missingBadge = missing.length > 0 ? `
                                    <div class="mt-1 flex items-center gap-1">
                                        <span class="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-3xs font-bold" title="Faltan datos: ${missing.join(', ')}">
                                            ⚠️ Falta: ${missing.join(', ')}
                                        </span>
                                    </div>
                                ` : '';

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
                                                <a href="#/substances/${s.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Ver Ficha Detallada">
                                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                                </a>
                                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
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

                    let groupBadgeHtml = buildGroupBadgesHtml(s.substance_group);

                    return `
                        <div class="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col group relative">
                            <div class="relative w-full aspect-square bg-slate-50 border-b flex items-center justify-center text-slate-300 overflow-hidden shrink-0">
                                ${expBadge}
                                ${s.image_path ? `
                                    <img src="${s.image_path}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                                ` : `
                                    <i data-lucide="flask-conical" class="w-12 h-12 text-slate-300"></i>
                                `}
                                <div class="absolute bottom-3 left-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-3xs rounded-2xl p-2.5 flex justify-center items-center shadow-lg border border-white/10">
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
                                        <div class="flex justify-between"><span class="font-medium text-slate-400">Ubicación:</span><span class="font-semibold text-slate-700 truncate max-w-[140px]">${s.location || '-'}</span></div>
                                        <div class="flex justify-between"><span class="font-medium text-slate-400">Total Stock:</span><span class="font-bold text-slate-900">${s.quantity} ${s.unit}</span></div>
                                        ${(() => {
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
                                    <a href="#/substances/${s.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition" title="Ver Detalle">
                                        <i data-lucide="eye" class="w-4 h-4"></i>
                                    </a>
                                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
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
}
