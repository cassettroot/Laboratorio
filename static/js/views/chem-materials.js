async function renderChemicalMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="sticky -top-8 z-20 bg-slate-50/95 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between no-print shadow-xs">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full md:w-80">
                        <input id="search-materials" type="text" placeholder="🔍 Buscar ID, Descripción, Inventario, Serie, SEP..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="filter-status" class="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-brand-500 font-semibold text-slate-700">
                        <option value="">🛡️ -- Estado --</option>
                        <option value="Buenas Condiciones">Buenas Condiciones</option>
                        <option value="Nuevo">Nuevo</option>
                        <option value="Excelente">Excelente</option>
                        <option value="Bueno">Bueno</option>
                        <option value="Dañado">Dañado</option>
                        <option value="Roto">Roto / Incompleto</option>
                    </select>
                    <select id="sort-materials" class="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-brand-500 font-semibold text-slate-700">
                        <option value="id_asc">🆔 Orden: ID (Menor a Mayor)</option>
                        <option value="id_desc">🆔 Orden: ID (Mayor a Menor)</option>
                        <option value="name_asc">🔤 Orden: Descripción (A - Z)</option>
                        <option value="name_desc">🔤 Orden: Descripción (Z - A)</option>
                        <option value="inventory_asc">🏷️ Orden: No. Inventario</option>
                        <option value="serial_asc">🔢 Orden: No. Serie</option>
                        <option value="sep_asc">🏛️ Orden: No. SEP</option>
                    </select>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="exportTableToExcel('chemical_materials')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
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
                                <th class="py-4 px-4 text-center">ID Lab</th>
                                <th class="py-4 px-4 text-center">ID Excel</th>
                                <th class="py-4 px-4">Ubicación</th>
                                <th class="py-4 px-6">Descripción / Material</th>
                                <th class="py-4 px-4">No. Inventario</th>
                                <th class="py-4 px-4">No. Serie</th>
                                <th class="py-4 px-4">No. SEP</th>
                                <th class="py-4 px-4">Estado</th>
                                <th class="py-4 px-4 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="materials-table-body" class="divide-y divide-slate-100 text-slate-700 font-medium">
                            <tr>
                                <td colspan="9" class="py-12 text-center text-slate-400">Cargando materiales químicos...</td>
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
        const status = document.getElementById('filter-status').value;
        const body = document.getElementById('materials-table-body');

        try {
            const url = new URL('/api/chemical-materials', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (status) url.searchParams.append('status', status);

            const res = await fetch(url).then(r => r.json());
            let materialsList = res.data || [];

            const sortBy = document.getElementById('sort-materials').value;
            materialsList.sort((a, b) => {
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'id_desc') return b.id - a.id;
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'inventory_asc') return (a.inventory_number || '').localeCompare(b.inventory_number || '', 'es');
                if (sortBy === 'serial_asc') return (a.serial_number || '').localeCompare(b.serial_number || '', 'es');
                if (sortBy === 'sep_asc') return (a.no_sep || '').localeCompare(b.no_sep || '', 'es');
                return a.id - b.id;
            });

            state.chemMaterials = materialsList;

            if (state.chemMaterials.length === 0) {
                body.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-slate-400">No se encontraron materiales con los filtros aplicados.</td></tr>`;
                return;
            }

            const isLogged = state.isLoggedIn;

            body.innerHTML = state.chemMaterials.map(m => {
                let statusColor = 'bg-slate-100 text-slate-700';
                if (m.status === 'Excelente' || m.status === 'Nuevo' || m.status === 'Buenas Condiciones') statusColor = 'bg-emerald-50 text-emerald-700';
                if (m.status === 'Dañado' || m.status === 'Roto') statusColor = 'bg-red-50 text-red-700';
                if (m.status === 'Bueno') statusColor = 'bg-blue-50 text-blue-700';

                return `
                    <tr class="hover:bg-slate-50/50 transition">
                        <td class="py-4 px-4 text-center font-mono font-bold text-slate-500 text-xs">${m.id}</td>
                        <td class="py-4 px-4 text-center font-mono font-extrabold text-amber-700 text-xs">${m.original_id ? '#' + m.original_id : '-'}</td>
                        <td class="py-4 px-4 text-xs font-semibold text-slate-700 max-w-[180px] truncate" title="${m.location || ''}">${m.location || '-'}</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200/50 shrink-0">
                                    ${m.image_path ? `<img src="${m.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="droplet" class="w-4 h-4"></i>`}
                                </div>
                                <div>
                                    <a href="#/chemical-materials/${m.id}" class="text-sm font-bold text-slate-900 hover:text-brand-600 transition block">${m.name}</a>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-xs font-mono font-semibold text-amber-800">${m.inventory_number || '-'}</td>
                        <td class="py-4 px-4 text-xs font-mono font-semibold text-blue-800">${m.serial_number || '-'}</td>
                        <td class="py-4 px-4 text-xs font-mono font-semibold text-emerald-800">${m.no_sep || '-'}</td>
                        <td class="py-4 px-4">
                            <span class="px-2.5 py-0.5 rounded-md text-2xs font-bold ${statusColor}">${m.status || 'Buenas Condiciones'}</span>
                        </td>
                        <td class="py-4 px-4 no-print text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <a href="#/chemical-materials/${m.id}" class="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
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
            body.innerHTML = `<tr><td colspan="8" class="py-12 text-center text-red-500 font-bold">Error al cargar datos.</td></tr>`;
        }
    };

    document.getElementById('search-materials').addEventListener('input', fetchAndRender);
    document.getElementById('sort-materials').addEventListener('change', fetchAndRender);
    document.getElementById('filter-status').addEventListener('change', fetchAndRender);
    fetchAndRender();
}
