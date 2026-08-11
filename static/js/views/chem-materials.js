async function renderChemicalMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in text-white">
            <!-- Barra de Filtros y Búsqueda (Fila Compacta y Elegante) -->
            <div class="sticky -top-8 z-20 py-2 space-y-3 no-print flex flex-col md:flex-row gap-3 items-center justify-between">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1 max-w-3xl">
                    <div class="relative w-full md:w-80">
                        <input id="search-materials" type="text" placeholder="🔍 Buscar ID, Barras, Descripción, Inventario, Serie, SEP..." class="w-full bg-slate-900/80 border border-slate-700/80 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-teal-500 outline-none transition shadow-sm font-semibold text-white placeholder:text-slate-400">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="filter-status" class="bg-slate-900/80 border border-slate-700/80 px-3.5 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-teal-500 font-semibold text-white cursor-pointer">
                        <option value="">🛡️ -- Estado --</option>
                        <option value="Buenas Condiciones">Buenas Condiciones</option>
                        <option value="Nuevo">Nuevo</option>
                        <option value="Excelente">Excelente</option>
                        <option value="Bueno">Bueno</option>
                        <option value="Dañado">Dañado</option>
                        <option value="Roto">Roto / Incompleto</option>
                    </select>
                    <select id="sort-materials" class="bg-slate-900/80 border border-slate-700/80 px-3.5 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-teal-500 font-semibold text-white cursor-pointer">
                        <option value="id_desc" selected>🆔 Orden: Más Recientes Primero (ID Mayor)</option>
                        <option value="id_asc">🆔 Orden: ID (Menor a Mayor)</option>
                        <option value="name_asc">🔤 Orden: Descripción (A - Z)</option>
                        <option value="name_desc">🔤 Orden: Descripción (Z - A)</option>
                        <option value="inventory_asc">🏷️ Orden: No. Inventario</option>
                        <option value="serial_asc">🔢 Orden: No. Serie</option>
                        <option value="sep_asc">🏛️ Orden: No. SEP</option>
                    </select>
                </div>
                <div class="flex items-center gap-3 w-full md:w-auto justify-end">
                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="openQRBatchModal('chemical_materials')" class="bg-indigo-600 hover:bg-indigo-700 font-extrabold px-4 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-md shrink-0" title="Imprimir o Descargar Códigos QR de Materiales Químicos (Solo Admin)">
                        <i data-lucide="qr-code" class="w-4 h-4 text-amber-300"></i>
                        <span>🖨️ Códigos QR</span>
                    </button>
                    <button onclick="exportTableToExcel('chemical_materials')" class="bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 font-extrabold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-white shadow-sm">
                        <i data-lucide="download" class="w-4 h-4 text-teal-400"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                    <button onclick="openAddModal('chemical_materials')" class="bg-teal-600 hover:bg-teal-700 font-extrabold px-5 py-2.5 rounded-xl text-sm text-white flex items-center gap-2 transition shadow-lg">
                        <i data-lucide="plus" class="w-4 h-4"></i>
                        <span>Registrar Material</span>
                    </button>
                    ` : ''}
                </div>
            </div>

            <!-- Tabla de Datos Refinada (Diseño de Alta Fidelidad) -->
            <div class="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr class="bg-slate-950 border-b border-slate-800 text-slate-300 font-extrabold uppercase tracking-wider text-xs">
                                <th class="py-4 px-4 text-center w-16">ID Lab</th>
                                <th class="py-4 px-4 text-center w-20">ID Excel</th>
                                <th class="py-4 px-4">Ubicación</th>
                                <th class="py-4 px-6">Descripción / Material</th>
                                <th class="py-4 px-4">No. Inventario</th>
                                <th class="py-4 px-4">No. Serie</th>
                                <th class="py-4 px-4">No. SEP</th>
                                <th class="py-4 px-4">Estado</th>
                                <th class="py-4 px-4 no-print text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="materials-table-body" class="divide-y divide-slate-800/70 text-slate-200 font-medium">
                            <tr>
                                <td colspan="9" class="py-12 text-center text-slate-400 font-bold">Cargando materiales químicos...</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const fetchAndRender = async () => {
        const body = document.getElementById('materials-table-body');
        if (!body) return;

        try {
            const search = document.getElementById('search-materials').value;
            const status = document.getElementById('filter-status').value;

            const url = new URL('/api/chemical-materials', window.location.origin);
            if (search) url.searchParams.append('search', search);
            if (status) url.searchParams.append('status', status);

            const res = await fetch(url).then(r => r.json());
            let materialsList = res.data || [];

            const sortBy = document.getElementById('sort-materials').value;
            materialsList.sort((a, b) => {
                if (sortBy === 'id_desc') return b.id - a.id;
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'inventory_asc') return (a.inventory_number || '').localeCompare(b.inventory_number || '', 'es');
                if (sortBy === 'serial_asc') return (a.serial_number || '').localeCompare(b.serial_number || '', 'es');
                if (sortBy === 'sep_asc') return (a.no_sep || '').localeCompare(b.no_sep || '', 'es');
                return b.id - a.id;
            });

            state.chemMaterials = materialsList;

            if (state.chemMaterials.length === 0) {
                body.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-slate-400 font-bold">No se encontraron materiales con los filtros aplicados.</td></tr>`;
                return;
            }

            body.innerHTML = state.chemMaterials.map(m => {
                let statusBadge = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">Buenas Condiciones</span>`;
                const st = (m.status || '').toLowerCase();
                if (st.includes('excelente') || st.includes('nuevo')) {
                    statusBadge = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${m.status}</span>`;
                } else if (st.includes('dañado') || st.includes('roto') || st.includes('inoperativo')) {
                    statusBadge = `<span class="bg-rose-500/20 text-rose-400 border border-rose-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${m.status}</span>`;
                } else if (st.includes('bueno') || st.includes('regular') || st.includes('mantenimiento')) {
                    statusBadge = `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold px-3 py-1 rounded-lg text-2xs inline-block shadow-2xs">${m.status}</span>`;
                }

                return `
                    <tr class="hover:bg-slate-800/60 transition border-b border-slate-800/60">
                        <td class="py-4 px-4 text-center font-mono font-extrabold text-slate-800 text-xs">${m.id}</td>
                        <td class="py-4 px-4 text-center font-mono font-extrabold text-amber-700 text-xs">${m.original_id ? '#' + m.original_id + ' (PROVISIONAL)' : '-'}</td>
                        <td class="py-4 px-4 text-xs font-bold text-slate-700 uppercase max-w-[180px] truncate" title="${m.location || ''}">${m.location || '-'}</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shrink-0">
                                    ${m.image_path ? `<img src="${m.image_path}" class="w-full h-full object-cover">` : `<i data-lucide="droplet" class="w-4 h-4 text-teal-600"></i>`}
                                </div>
                                <div>
                                    <a href="#/chemical-materials/${m.id}" class="text-sm font-extrabold text-slate-900 hover:text-brand-600 transition block leading-snug">${m.name}</a>
                                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        ${m.capacity ? `<span class="text-3xs font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold">${m.capacity}</span>` : ''}
                                        ${m.barcode ? `<span class="text-3xs font-mono bg-teal-500/10 text-teal-400 border border-teal-500/30 px-1.5 py-0.5 rounded font-bold" title="Código de Barras EAN/UPC">📊 ${m.barcode}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-xs font-mono font-bold text-slate-800">${m.inventory_number || '-'}</td>
                        <td class="py-4 px-4 text-xs font-mono font-bold text-blue-800">${m.serial_number || '-'}</td>
                        <td class="py-4 px-4 text-xs font-mono font-bold text-emerald-800">${m.no_sep || '-'}</td>
                        <td class="py-4 px-4">
                            ${statusBadge}
                        </td>
                        <td class="py-4 px-4 no-print text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <a href="#/chemical-materials/${m.id}" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition shadow-2xs" title="Ver Ficha Detallada">
                                    <i data-lucide="eye" class="w-4 h-4"></i>
                                </a>
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'jefe' || state.userRole === 'responsable')) ? `
                                <button onclick="openEditModal('chemical_materials', ${m.id})" class="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition shadow-2xs" title="Editar Material">
                                    <i data-lucide="edit-3" class="w-4 h-4"></i>
                                </button>
                                <button onclick="deleteItem('chemical_materials', ${m.id})" class="p-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition shadow-2xs" title="Eliminar Material">
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
            body.innerHTML = `<tr><td colspan="9" class="py-12 text-center text-rose-400 font-bold">Error al cargar datos.</td></tr>`;
        }
    };

    document.getElementById('search-materials').addEventListener('input', fetchAndRender);
    document.getElementById('sort-materials').addEventListener('change', fetchAndRender);
    document.getElementById('filter-status').addEventListener('change', fetchAndRender);
    fetchAndRender();
}
