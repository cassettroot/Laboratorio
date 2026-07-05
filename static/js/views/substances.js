function buildGroupBadgesHtml(substance_group) {
    if (!substance_group) return '';
    const groups = substance_group.split(',').map(g => g.trim()).filter(Boolean);
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

async function renderSubstancesList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
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
                    <div class="flex border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white shrink-0">
                        <button onclick="setSubstancesViewMode('list')" id="btn-view-list" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Lista">
                            <i data-lucide="list" class="w-4 h-4"></i>
                        </button>
                        <button onclick="setSubstancesViewMode('grid')" id="btn-view-grid" class="px-3.5 py-2.5 transition flex items-center justify-center font-bold text-xs" title="Vista de Cuadrícula">
                            <i data-lucide="layout-grid" class="w-4 h-4"></i>
                        </button>
                    </div>

                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="exportTableToExcel('substances')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ` : ''}

                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
                    <button onclick="openAddModal('substances')" class="bg-brand-600 hover:bg-brand-700 font-bold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg shadow-brand-600/10">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Sustancia</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <div id="substances-data-container">
                <div class="py-12 text-center text-slate-400">Cargando sustancias químicas...</div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const search = document.getElementById('search-substances').value;
        const physical_state = document.getElementById('filter-state').value;
        const location = document.getElementById('filter-location').value;

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
            state.substances = res.data || [];

            if (state.substances.length === 0) {
                dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-slate-400">No se encontraron sustancias con los filtros aplicados.</div>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            if (state.substancesViewMode === 'list') {
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

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            dataContainer.innerHTML = `<div class="bg-white border rounded-3xl p-12 text-center text-red-500 font-bold">Error al cargar datos.</div>`;
        }
    };

    document.getElementById('search-substances').addEventListener('input', fetchAndRender);
    document.getElementById('filter-state').addEventListener('change', fetchAndRender);
    document.getElementById('filter-location').addEventListener('input', fetchAndRender);

    fetchAndRender();
}
