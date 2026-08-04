async function renderChemicalMaterialsList(container) {
    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="sticky -top-8 z-20 bg-slate-50/95 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-8 sm:px-8 border-b border-slate-200/80 flex flex-col md:flex-row gap-4 items-center justify-between no-print shadow-xs">
                <div class="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div class="relative w-full md:w-64">
                        <input id="search-materials" type="text" placeholder="Buscar material (nombre, ubicación)..." class="w-full bg-white border border-slate-300 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:border-brand-500 outline-none transition shadow-sm">
                        <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5"></i>
                    </div>
                    <select id="sort-materials" class="bg-white border border-slate-300 px-3 py-2.5 rounded-xl text-sm outline-none transition shadow-sm focus:border-brand-500 font-semibold text-slate-700">
                        <option value="name_asc">🔤 Orden: Nombre (A - Z)</option>
                        <option value="name_desc">🔤 Orden: Nombre (Z - A)</option>
                        <option value="quantity_desc">📦 Orden: Stock (Mayor a Menor)</option>
                        <option value="quantity_asc">📦 Orden: Stock (Menor a Mayor)</option>
                        <option value="id_desc">🆕 Orden: Registro (Recientes)</option>
                        <option value="id_asc">⌛ Orden: Registro (Antiguos)</option>
                    </select>
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
                    ${(state.isLoggedIn && state.userRole === 'admin') ? `
                    <button onclick="exportTableToExcel('chemical_materials')" class="bg-white hover:bg-slate-50 border border-slate-300 font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition text-slate-700 shadow-sm">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>Exportar Excel</span>
                    </button>
                    ` : ''}
                    ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
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
            let materialsList = res.data || [];

            const sortBy = document.getElementById('sort-materials').value;
            materialsList.sort((a, b) => {
                if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'name_desc') return (b.name || '').localeCompare(a.name || '', 'es', { sensitivity: 'base' });
                if (sortBy === 'quantity_desc') return (b.quantity || 0) - (a.quantity || 0);
                if (sortBy === 'quantity_asc') return (a.quantity || 0) - (b.quantity || 0);
                if (sortBy === 'id_asc') return a.id - b.id;
                if (sortBy === 'id_desc') return b.id - a.id;
                return (a.name || '').localeCompare(b.name || '', 'es');
            });

            state.chemMaterials = materialsList;

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
                                ${(state.isLoggedIn && state.userActive === 1 && (state.userRole === 'admin' || state.userRole === 'responsable')) ? `
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
    document.getElementById('sort-materials').addEventListener('change', fetchAndRender);
    document.getElementById('filter-category').addEventListener('change', fetchAndRender);
    fetchAndRender();
}
